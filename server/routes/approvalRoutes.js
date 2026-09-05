const express = require('express');
const router = express.Router();
const approvalController = require('../controllers/approvalController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Base authentication required for all approval workflows
router.use(authMiddleware);

// Approval List (Pending only, status, owner, risk, search, pagination)
router.get(
  '/approvals',
  requireRole(['ADMIN', 'SALES_MANAGER', 'FINANCE', 'SALES_REP']),
  (req, res, next) => approvalController.listApprovals(req, res, next)
);

// Approval Detail for Screen #6 (Quote summary, customer tier, risk score, flagged lines, 4-node stepper, audit trail)
router.get(
  '/approvals/:id',
  requireRole(['ADMIN', 'SALES_MANAGER', 'FINANCE', 'SALES_REP']),
  (req, res, next) => approvalController.getApprovalDetail(req, res, next)
);

// Approval Step Actioning (Sales Manager, Finance, or Admin)
// Supported at both /approvals/:id/action and /approvals/steps/:id/action
router.post(
  '/approvals/:id/action',
  requireRole(['SALES_MANAGER', 'FINANCE', 'ADMIN']),
  (req, res, next) => approvalController.actionStep(req, res, next)
);

router.post(
  '/approvals/steps/:id/action',
  requireRole(['SALES_MANAGER', 'FINANCE', 'ADMIN']),
  (req, res, next) => approvalController.actionStep(req, res, next)
);

// Quotation Submission (Sales Rep or Admin)
router.post(
  '/quotations/:id/submit',
  requireRole(['SALES_REP', 'ADMIN']),
  (req, res, next) => approvalController.submitQuotation(req, res, next)
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
