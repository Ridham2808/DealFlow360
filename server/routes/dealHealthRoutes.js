const express = require('express');
const router = express.Router();
const dealHealthController = require('../controllers/dealHealthController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(authMiddleware);

// GET /api/deal-health - Dashboard metrics and telemetry table
router.get(
  '/',
  requireRole(['ADMIN', 'SALES_MANAGER', 'FINANCE', 'SALES_REP']),
  (req, res, next) => dealHealthController.getDashboard(req, res, next)
);

// POST /api/deal-health/scan - Run all anomaly scans on-demand
router.post(
  '/scan',
  requireRole(['ADMIN', 'SALES_MANAGER']),
  (req, res, next) => dealHealthController.triggerScan(req, res, next)
);

// POST /api/deal-health/:id/escalate - Escalate flag priority with audit
router.post(
  '/:id/escalate',
  requireRole(['ADMIN', 'SALES_MANAGER', 'FINANCE']),
  (req, res, next) => dealHealthController.escalateFlag(req, res, next)
);

// POST /api/deal-health/:id/nudge - Nudge sales rep with audit
router.post(
  '/:id/nudge',
  requireRole(['ADMIN', 'SALES_MANAGER', 'FINANCE']),
  (req, res, next) => dealHealthController.nudgeRep(req, res, next)
);

module.exports = router;
