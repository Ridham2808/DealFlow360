/**
 * DealFlow360 — Customer Inbound Requests (RFQ) Internal API Routes
 * Handled by Sales Reps, Managers, and Admins to review customer requirements
 * and convert them directly into Quotation drafts.
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const prisma = require('../prisma/prisma');
const { success, error } = require('../utils/apiResponse');

// Apply auth to all customer request internal routes
router.use(authMiddleware);
router.use(requireRole(['SALES_REP', 'SALES_MANAGER', 'ADMIN', 'FINANCE']));

/**
 * GET /api/customer-requests
 * List customer requests with filtering
 */
router.get('/', async (req, res, next) => {
  try {
    const { status, customerId, search } = req.query;

    const where = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (customerId) {
      where.customerId = customerId;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { requestNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const requests = await prisma.customerRequest.findMany({
      where,
      include: {
        customer: {
          select: { id: true, name: true, email: true, tier: true },
        },
        requestedBy: {
          select: { id: true, name: true, email: true },
        },
        quotation: {
          select: { id: true, quoteNumber: true, status: true, grandTotal: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const pendingCount = await prisma.customerRequest.count({ where: { status: 'PENDING' } });

    return res.status(200).json(success({ requests, pendingCount }, 'Customer requests retrieved'));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/customer-requests/:id
 * Retrieve a specific customer request
 */
router.get('/:id', async (req, res, next) => {
  try {
    const item = await prisma.customerRequest.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        requestedBy: { select: { id: true, name: true, email: true } },
        quotation: {
          include: {
            lines: true,
          },
        },
      },
    });

    if (!item) {
      return res.status(404).json(error('Customer request not found', 404, 'NOT_FOUND'));
    }

    return res.status(200).json(success({ request: item }, 'Customer request details'));
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/customer-requests/:id/create-quotation
 * Converts a customer inbound request directly into a Draft Quotation!
 * Auto-creates quotation lines for catalog products matching request items.
 */
router.post('/:id/create-quotation', async (req, res, next) => {
  try {
    const requestId = req.params.id;

    const requestRecord = await prisma.customerRequest.findUnique({
      where: { id: requestId },
      include: { customer: true },
    });

    if (!requestRecord) {
      return res.status(404).json(error('Customer request not found', 404, 'NOT_FOUND'));
    }

    // Generate unique quote number
    const count = await prisma.quotation.count();
    const quoteNumber = `Q-${1000 + count + 1}`;

    // Look up matching catalog products for requested items
    const requestedItems = Array.isArray(requestRecord.items) ? requestRecord.items : [];
    const allProducts = await prisma.product.findMany({
      where: { isActive: true },
      include: { variants: true },
    });

    // Determine lines to create
    const linesToCreate = [];
    let subtotal = 0;
    let totalCost = 0;

    for (const item of requestedItems) {
      // Find matching product by name or sku
      const cleanName = (item.name || '').toLowerCase();
      const matchedProd = allProducts.find(
        (p) =>
          p.name.toLowerCase().includes(cleanName) ||
          cleanName.includes(p.name.toLowerCase()) ||
          p.sku.toLowerCase() === cleanName
      );

      const qty = parseInt(item.quantity, 10) || 1;
      const unitPrice = matchedProd ? Number(matchedProd.basePrice) : (Number(item.estimatedUnitPrice) || 100);
      const unitCost = matchedProd ? Number(matchedProd.baseCost) : Number((unitPrice * 0.7).toFixed(2));
      const lineSub = Number((unitPrice * qty).toFixed(2));
      const lineMargin = Number((lineSub - unitCost * qty).toFixed(2));

      subtotal += lineSub;
      totalCost += unitCost * qty;

      if (matchedProd) {
        linesToCreate.push({
          productId: matchedProd.id,
          variantId: matchedProd.variants?.[0]?.id || null,
          quantity: qty,
          unitPrice,
          unitCost,
          discountPercent: 0,
          lineDiscountLimit: 15,
          taxPercent: Number(matchedProd.taxPercent) || 0,
          lineSubtotal: lineSub,
          lineDiscountAmount: 0,
          lineMargin,
          isRecurring: matchedProd.isRecurringEligible || false,
          categorySnapshot: matchedProd.category || 'Hardware',
          productNameSnapshot: matchedProd.name,
        });
      } else {
        // Fallback to first hardware product or general product if not matched exactly
        const fallbackProd = allProducts[0];
        if (fallbackProd) {
          linesToCreate.push({
            productId: fallbackProd.id,
            quantity: qty,
            unitPrice,
            unitCost,
            discountPercent: 0,
            lineDiscountLimit: 15,
            taxPercent: 0,
            lineSubtotal: lineSub,
            lineDiscountAmount: 0,
            lineMargin,
            isRecurring: false,
            categorySnapshot: item.category || fallbackProd.category,
            productNameSnapshot: item.name || fallbackProd.name,
          });
        }
      }
    }

    const grandTotal = subtotal;
    const marginAmount = subtotal - totalCost;
    const marginPercentage = subtotal > 0 ? Number(((marginAmount / subtotal) * 100).toFixed(2)) : 0;

    // Create Quotation inside transaction and update request
    const result = await prisma.$transaction(async (tx) => {
      const quotation = await tx.quotation.create({
        data: {
          quoteNumber,
          customerId: requestRecord.customerId,
          ownerRepId: req.user.userId,
          status: 'DRAFT',
          currency: 'USD',
          subtotal,
          grandTotal,
          totalCost,
          marginAmount,
          marginPercentage,
          blendedRiskScore: 0,
          riskLevel: 'LOW',
          expirationDate: requestRecord.neededByDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          lines: {
            create: linesToCreate,
          },
        },
        include: {
          lines: true,
          customer: true,
        },
      });

      // Update customer request status to QUOTED and link quote
      await tx.customerRequest.update({
        where: { id: requestId },
        data: {
          status: 'QUOTED',
          quotationId: quotation.id,
        },
      });

      // Create Audit Log
      await tx.auditLog.create({
        data: {
          actorId: req.user.userId,
          action: 'CREATED_QUOTATION_FROM_CUSTOMER_REQUEST',
          targetId: quotation.id,
          targetType: 'Quotation',
          quotationId: quotation.id,
          reasonNote: `Quotation generated from inbound Customer Request ${requestRecord.requestNumber} ("${requestRecord.title}")`,
          afterStatus: 'DRAFT',
          meta: {
            customerRequestId: requestId,
            requestNumber: requestRecord.requestNumber,
          },
        },
      });

      return quotation;
    });

    return res.status(201).json(
      success(
        {
          quotation: result,
          quotationId: result.id,
          quoteNumber: result.quoteNumber,
        },
        `Quotation ${result.quoteNumber} created from request ${requestRecord.requestNumber}`
      )
    );
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/customer-requests/:id/status
 * Update request status (REVIEWED, DECLINED, PENDING)
 */
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    if (!['PENDING', 'REVIEWED', 'QUOTED', 'DECLINED'].includes(status)) {
      return res.status(400).json(error('Invalid status value', 400, 'VALIDATION_ERROR'));
    }

    const updated = await prisma.customerRequest.update({
      where: { id: req.params.id },
      data: {
        status,
        ...(notes ? { notes } : {}),
      },
      include: {
        customer: true,
        quotation: true,
      },
    });

    return res.status(200).json(success({ request: updated }, 'Customer request status updated'));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
