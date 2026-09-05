const express = require('express');
const router = express.Router();
const quotationController = require('../controllers/quotationController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Internal authenticated users only
router.use(authMiddleware);
router.use(requireRole(['SALES_REP', 'SALES_MANAGER', 'FINANCE', 'ADMIN']));

// Sales Dashboard Metrics & Activity Feed
router.get('/dashboard-metrics', (req, res, next) => quotationController.getDashboardMetrics(req, res, next));

// Quotation CRUD
router.post('/', (req, res, next) => quotationController.createQuotation(req, res, next));
router.get('/', (req, res, next) => quotationController.listQuotations(req, res, next));
router.get('/:id', (req, res, next) => quotationController.getQuotationById(req, res, next));
router.patch('/:id', (req, res, next) => quotationController.updateQuotation(req, res, next));

// Line items mutations
router.patch('/:id/lines', (req, res, next) => quotationController.mutateLine(req, res, next));
router.delete('/:id/lines/:lineId', (req, res, next) => quotationController.deleteLine(req, res, next));

// Submission
router.post('/:id/submit-approval', (req, res, next) => quotationController.submitQuotation(req, res, next));

// Upsell suggestions
router.get('/:id/upsell-suggestions', (req, res, next) => quotationController.getUpsellSuggestions(req, res, next));

// Lookups for quotation creation & line item additions
router.get('/lookup/customers', async (req, res, next) => {
  try {
    const prisma = require('../prisma/prisma');
    const customers = await prisma.customer.findMany({
      where: { isActive: true },
      select: { id: true, name: true, tier: true, email: true },
      orderBy: { name: 'asc' },
    });
    const { success } = require('../utils/apiResponse');
    return res.status(200).json(success(customers));
  } catch (err) {
    next(err);
  }
});

router.get('/lookup/products', async (req, res, next) => {
  try {
    const prisma = require('../prisma/prisma');
    const rawProducts = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        variants: { where: { isActive: true } },
        stockLevels: true,
      },
      orderBy: { name: 'asc' },
    });

    const products = rawProducts.map((p) => {
      const cat = (p.category || '').toLowerCase();
      let itemType = 'PHYSICAL_PRODUCT';
      let billingType = 'One-Time';

      if (cat === 'services' || p.unit === 'HOURS') {
        itemType = 'SERVICE';
        billingType = 'One-Time (Service)';
      } else if (cat === 'warranty' || p.name.toLowerCase().includes('warranty')) {
        itemType = 'WARRANTY';
        billingType = 'Coverage';
      } else if (p.isRecurringEligible || cat === 'subscriptions') {
        itemType = 'SUBSCRIPTION';
        billingType = 'Recurring';
      }

      let availableStock = null;
      let stockStatus = null;

      if (itemType === 'PHYSICAL_PRODUCT') {
        availableStock = (p.stockLevels || []).reduce(
          (acc, s) => acc + Math.max(0, s.quantityOnHand - s.reserved),
          0
        );
        if (availableStock > 10) {
          stockStatus = 'IN_STOCK';
        } else if (availableStock > 0) {
          stockStatus = 'PARTIALLY_AVAILABLE';
        } else {
          stockStatus = 'OUT_OF_STOCK';
        }
      }

      return {
        ...p,
        itemType,
        billingType,
        availableStock,
        stockStatus,
      };
    });

    const { success } = require('../utils/apiResponse');
    return res.status(200).json(success(products));
  } catch (err) {
    next(err);
  }
});

router.get('/lookup/subscription-plans', async (req, res, next) => {
  try {
    const prisma = require('../prisma/prisma');
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    const { success } = require('../utils/apiResponse');
    return res.status(200).json(success(plans));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
