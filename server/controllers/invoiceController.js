const billingService = require('../services/billingService');
const { success } = require('../utils/apiResponse');

class InvoiceController {
  async listInvoices(req, res, next) {
    try {
      const result = await billingService.listInvoices(req.query);
      return res.status(200).json(success(result));
    } catch (err) {
      next(err);
    }
  }

  async getInvoiceDetail(req, res, next) {
    try {
      const { id } = req.params;
      const result = await billingService.getInvoiceDetail(id);
      return res.status(200).json(success(result));
    } catch (err) {
      next(err);
    }
  }

  async recordPayment(req, res, next) {
    try {
      const { id } = req.params;
      const { amount, paymentMethod, reference } = req.body;
      const result = await billingService.recordPayment(id, { amount, paymentMethod, reference }, req.user.id);
      return res.status(200).json(success(result, 'Payment recorded successfully.'));
    } catch (err) {
      next(err);
    }
  }

  async downloadInvoice(req, res, next) {
    try {
      const { id } = req.params;
      const result = await billingService.generateInvoiceDownload(id);
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="Invoice-${result.invoiceNumber}.txt"`);
      return res.send(result.documentText);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new InvoiceController();
