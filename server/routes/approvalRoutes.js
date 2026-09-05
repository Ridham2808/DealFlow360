const express = require('express');
const router = express.Router();
const approvalController = require('../controllers/approvalController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Base authentication required for all approval workflows
router.use(authMiddleware);

// Quotation Submission (Sales Rep or Admin)
router.post(
  '/quotations/:id/submit',
  requireRole(['SALES_REP', 'ADMIN']),
  (req, res, next) => approvalController.submitQuotation(req, res, next)
);

// Approval Step Actioning (Sales Manager, Finance, or Admin)
router.post(
  '/approvals/steps/:id/action',
  requireRole(['SALES_MANAGER', 'FINANCE', 'ADMIN']),
  (req, res, next) => approvalController.actionStep(req, res, next)
);

// Quotation Lifecycle Transition (e.g. APPROVED -> UNDER_NEGOTIATION)
router.post(
  '/quotations/:id/transition',
  requireRole(['SALES_REP', 'SALES_MANAGER', 'ADMIN']),
  (req, res, next) => approvalController.transitionQuotation(req, res, next)
);

// Get Full Approval Status & Audit Trail
router.get(
  '/quotations/:id/approval-status',
  (req, res, next) => approvalController.getApprovalStatus(req, res, next)
);

module.exports = router;
