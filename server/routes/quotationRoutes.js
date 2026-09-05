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
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        variants: { where: { isActive: true } },
      },
      orderBy: { name: 'asc' },
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
