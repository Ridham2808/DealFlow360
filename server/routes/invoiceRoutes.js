const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(authMiddleware);

// List invoices with Unpaid and Paid status pills
router.get(
  '/',
  requireRole(['ADMIN', 'FINANCE', 'SALES_MANAGER', 'SALES_REP']),
  (req, res, next) => invoiceController.listInvoices(req, res, next)
);

// Get invoice detail with 4-node stepper and payment history
router.get(
  '/:id',
  requireRole(['ADMIN', 'FINANCE', 'SALES_MANAGER', 'SALES_REP']),
  (req, res, next) => invoiceController.getInvoiceDetail(req, res, next)
);

// Record payment for invoice
router.post(
  '/:id/payment',
  requireRole(['ADMIN', 'FINANCE', 'SALES_MANAGER']),
  (req, res, next) => invoiceController.recordPayment(req, res, next)
);

// Download real invoice document
router.get(
  '/:id/download',
  requireRole(['ADMIN', 'FINANCE', 'SALES_MANAGER', 'SALES_REP']),
  (req, res, next) => invoiceController.downloadInvoice(req, res, next)
);

module.exports = router;
