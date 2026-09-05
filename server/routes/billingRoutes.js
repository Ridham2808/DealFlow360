const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(authMiddleware);

// Generate hybrid billing for quotation (ONE_TIME invoice + recurring BillingSchedules)
router.post(
  '/quotations/:quotationId/generate',
  requireRole(['ADMIN', 'FINANCE', 'SALES_MANAGER']),
  (req, res, next) => billingController.generateBilling(req, res, next)
);

// Subscriptions List
router.get(
  '/subscriptions',
  requireRole(['ADMIN', 'FINANCE', 'SALES_MANAGER', 'SALES_REP']),
  (req, res, next) => billingController.listSubscriptions(req, res, next)
);

// Subscription Detail
router.get(
  '/subscriptions/:id',
  requireRole(['ADMIN', 'FINANCE', 'SALES_MANAGER', 'SALES_REP']),
  (req, res, next) => billingController.getSubscriptionDetail(req, res, next)
);

// Modify Subscription Mid-Cycle with Proration
router.patch(
  '/subscriptions/:id',
  requireRole(['ADMIN', 'FINANCE', 'SALES_MANAGER']),
  (req, res, next) => billingController.modifySubscription(req, res, next)
);

// Cancel Subscription with Calculated Credit / Refund
router.post(
  '/subscriptions/:id/cancel',
  requireRole(['ADMIN', 'FINANCE', 'SALES_MANAGER']),
  (req, res, next) => billingController.cancelSubscription(req, res, next)
);

module.exports = router;
