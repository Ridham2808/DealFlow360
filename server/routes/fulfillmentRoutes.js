const express = require('express');
const router = express.Router();
const fulfillmentController = require('../controllers/fulfillmentController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(authMiddleware);

// GET /api/fulfillment - Stock levels overview & orders awaiting fulfillment
router.get(
  '/',
  requireRole(['ADMIN', 'SALES_MANAGER', 'FINANCE', 'SALES_REP']),
  (req, res, next) => fulfillmentController.getOverview(req, res, next)
);

// GET /api/fulfillment/:quotationId - Recommended split and cost optimization
router.get(
  '/:quotationId',
  requireRole(['ADMIN', 'SALES_MANAGER', 'FINANCE', 'SALES_REP']),
  (req, res, next) => fulfillmentController.getWarehouseSplit(req, res, next)
);

// POST /api/fulfillment/:quotationId/accept - Accept suggested split and reserve stock
router.post(
  '/:quotationId/accept',
  requireRole(['ADMIN', 'SALES_MANAGER', 'FINANCE']),
  (req, res, next) => fulfillmentController.acceptSplit(req, res, next)
);

// POST /api/fulfillment/:quotationId/manual-override - Manual warehouse allocation
router.post(
  '/:quotationId/manual-override',
  requireRole(['ADMIN', 'SALES_MANAGER', 'FINANCE']),
  (req, res, next) => fulfillmentController.manualOverride(req, res, next)
);

// POST /api/fulfillment/:quotationId/consolidate-backorder - Re-evaluate and reserve backorders
router.post(
  '/:quotationId/consolidate-backorder',
  requireRole(['ADMIN', 'SALES_MANAGER', 'FINANCE']),
  (req, res, next) => fulfillmentController.consolidateBackorder(req, res, next)
);

module.exports = router;
