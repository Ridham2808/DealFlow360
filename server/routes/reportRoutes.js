/**
 * DealFlow360 — Reporting & Export Routes
 * Serves live operational analytics and real PDF/XLSX downloads with proper Content-Disposition.
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const reportService = require('../services/reportService');
const { success } = require('../utils/apiResponse');

// Restrict reports to authenticated internal staff
router.use(authMiddleware);
router.use(requireRole(['SALES_REP', 'SALES_MANAGER', 'FINANCE', 'ADMIN']));

/**
 * GET /api/reports/summary
 * Returns aggregated KPIs, top products, approval telemetry, and reference data.
 */
router.get('/summary', async (req, res, next) => {
  try {
    const filters = {
      period: req.query.period,
      salesRepId: req.query.salesRepId,
      approvalStatus: req.query.approvalStatus,
      productCategory: req.query.productCategory,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };

    const summary = await reportService.getSummary(filters);
    return res.status(200).json(success(summary, 'Report summary loaded'));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reports/export
 * Downloads genuine PDF or XLSX binary files generated server-side.
 */
router.get('/export', async (req, res, next) => {
  try {
    const format = (req.query.format || 'pdf').toLowerCase();
    const filters = {
      period: req.query.period,
      salesRepId: req.query.salesRepId,
      approvalStatus: req.query.approvalStatus,
      productCategory: req.query.productCategory,
    };

    const timestamp = new Date().toISOString().slice(0, 10);

    if (format === 'xlsx' || format === 'xls') {
      const buffer = await reportService.generateXlsxReport(filters);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="dealflow360-report-${timestamp}.xlsx"`);
      return res.send(buffer);
    }

    // Default: PDF format
    const buffer = await reportService.generatePdfReport(filters);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="dealflow360-report-${timestamp}.pdf"`);
    return res.send(buffer);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
