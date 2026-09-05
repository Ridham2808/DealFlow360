/**
 * DealFlow360 — Customer Portal API Routes
 * Enforces requireAuth and requireRole(['CUSTOMER']), resolving customer identity
 * strictly from server authentication, never from client-provided query/body parameters.
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const prisma = require('../prisma/prisma');
const negotiationService = require('../services/negotiationService');
const { success, error } = require('../utils/apiResponse');

// Apply Customer Role Guard across all portal routes
router.use(authMiddleware);
router.use(requireRole(['CUSTOMER']));

/**
 * Middleware to strictly resolve authenticated customerId from DB/Session.
 */
async function resolveCustomer(req, res, next) {
  try {
    let customerId = req.user?.customerId;
    if (!customerId) {
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { customerId: true, email: true },
      });
      customerId = user?.customerId;
      if (!customerId && user?.email) {
        const cust = await prisma.customer.findFirst({
          where: { email: user.email },
        });
        customerId = cust?.id;
      }
    }

    if (!customerId) {
      return res.status(403).json(
        error('Your account is not linked to a customer record.', 403, 'UNLINKED_CUSTOMER')
      );
    }

    req.customerId = customerId;
    next();
  } catch (err) {
    next(err);
  }
}

router.use(resolveCustomer);

/**
 * GET /api/portal/quotations/me
 * Returns quotations scoped strictly to authenticated customer.
 */
router.get('/quotations/me', async (req, res, next) => {
  try {
    const quotations = await negotiationService.getPortalQuotations(req.customerId);
    return res.status(200).json(success({ quotations }, 'Customer quotations loaded'));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/portal/quotations/:id
 * Returns sanitized quotation details without internal cost, margins, limits, or risk.
 */
router.get('/quotations/:id', async (req, res, next) => {
  try {
    const quotation = await negotiationService.getPortalQuotation(req.params.id, req.customerId);
    return res.status(200).json(success({ quotation }, 'Quotation loaded'));
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/portal/quotations/:id/comment
 * Submit line-item comment or request.
 */
router.post('/quotations/:id/comment', async (req, res, next) => {
  try {
    const { lineId, message } = req.body;
    const comment = await negotiationService.addCustomerComment(
      req.params.id,
      req.customerId,
      req.user.userId,
      { lineId, message }
    );
    return res.status(201).json(success({ comment }, 'Comment added successfully'));
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/portal/quotations/:id/counter-discount
 * Propose counter-discount terms.
 */
router.post('/quotations/:id/counter-discount', async (req, res, next) => {
  try {
    const { requestedDiscountPercent, requestedDeliveryDate, reason } = req.body;
    const proposal = await negotiationService.proposeCounterDiscount(
      req.params.id,
      req.customerId,
      req.user.userId,
      { requestedDiscountPercent, requestedDeliveryDate, reason }
    );
    return res.status(200).json(success({ proposal }, 'Counter-discount proposal recorded'));
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/portal/quotations/:id/confirm
 * Customer final confirmation of quotation terms.
 * If terms exceed discount governance limits, quote automatically re-enters approval chain.
 */
router.post('/quotations/:id/confirm', async (req, res, next) => {
  try {
    const result = await negotiationService.confirmNegotiatedQuotation(
      req.params.id,
      req.customerId,
      req.user.userId
    );
    return res.status(200).json(success(result, result.message));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/portal/quotations/:id/activity
 * Customer-safe activity timeline.
 */
router.get('/quotations/:id/activity', async (req, res, next) => {
  try {
    const activity = await negotiationService.getPortalActivity(req.params.id, req.customerId);
    return res.status(200).json(success({ activity }, 'Timeline loaded'));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/portal/catalog
 * Public catalog view for customer quote requests (safe fields only)
 */
router.get('/catalog', async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        sku: true,
        category: true,
        basePrice: true,
        description: true,
        isRecurringEligible: true,
      },
      orderBy: { category: 'asc' },
    });
    return res.status(200).json(success({ products }, 'Catalog loaded'));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/portal/requests
 * List quote requests submitted by this customer
 */
router.get('/requests', async (req, res, next) => {
  try {
    const requests = await prisma.customerRequest.findMany({
      where: { customerId: req.customerId },
      include: {
        quotation: {
          select: { id: true, quoteNumber: true, status: true, grandTotal: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json(success({ requests }, 'Customer requests loaded'));
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/portal/requests
 * Submit a new quote request (RFQ) from customer to sales team
 */
router.post('/requests', async (req, res, next) => {
  try {
    const { title, notes, targetBudget, neededByDate, items } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json(error('Please provide a title or project description for your request.', 400, 'VALIDATION_ERROR'));
    }

    const cleanItems = Array.isArray(items) && items.length > 0 ? items : [
      { name: title.trim(), quantity: 1, category: 'Hardware', notes: notes || '' }
    ];

    const count = await prisma.customerRequest.count();
    const requestNumber = `REQ-${1000 + count + 1}`;

    const newRequest = await prisma.customerRequest.create({
      data: {
        requestNumber,
        customerId: req.customerId,
        requestedById: req.user.userId,
        title: title.trim(),
        notes: notes ? notes.trim() : null,
        targetBudget: targetBudget ? parseFloat(targetBudget) : null,
        neededByDate: neededByDate ? new Date(neededByDate) : null,
        items: cleanItems,
        status: 'PENDING',
      },
      include: {
        customer: { select: { id: true, name: true, tier: true } },
      },
    });

    return res.status(201).json(
      success(
        { request: newRequest },
        `Your quote request (${newRequest.requestNumber}) has been sent to your sales representative.`
      )
    );
  } catch (err) {
    next(err);
  }
});

module.exports = router;
