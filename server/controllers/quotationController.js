const quotationService = require('../services/quotationService');
const upsellService = require('../services/upsellService');
const { success } = require('../utils/apiResponse');

class QuotationController {
  async createQuotation(req, res, next) {
    try {
      const quote = await quotationService.createQuotation(req.body, req.user);
      return res.status(201).json(success(quote, 'Draft quotation created successfully.'));
    } catch (err) {
      next(err);
    }
  }

  async listQuotations(req, res, next) {
    try {
      const result = await quotationService.listQuotations(req.query, req.user);
      return res.status(200).json(success(result));
    } catch (err) {
      next(err);
    }
  }

  async getQuotationById(req, res, next) {
    try {
      const { id } = req.params;
      const result = await quotationService.getQuotationById(id, req.user);
      return res.status(200).json(success(result));
    } catch (err) {
      next(err);
    }
  }

  async updateQuotation(req, res, next) {
    try {
      const { id } = req.params;
      const quote = await quotationService.updateQuotation(id, req.body, req.user);
      return res.status(200).json(success(quote, 'Quotation updated successfully.'));
    } catch (err) {
      next(err);
    }
  }

  async mutateLine(req, res, next) {
    try {
      const { id } = req.params;
      const result = await quotationService.mutateLine(id, req.body, req.user);
      return res.status(200).json(success(result, 'Line item updated successfully.'));
    } catch (err) {
      next(err);
    }
  }

  async deleteLine(req, res, next) {
    try {
      const { id, lineId } = req.params;
      const { version } = req.query;
      const result = await quotationService.deleteLine(id, lineId, version ? parseInt(version, 10) : undefined, req.user);
      return res.status(200).json(success(result, 'Line item removed.'));
    } catch (err) {
      next(err);
    }
  }

  async submitQuotation(req, res, next) {
    try {
      const { id } = req.params;
      const result = await quotationService.submitQuotation(id, req.user);
      return res.status(200).json(success(result, 'Quotation submitted successfully.'));
    } catch (err) {
      next(err);
    }
  }

  async getUpsellSuggestions(req, res, next) {
    try {
      const { id } = req.params;
      const suggestions = await upsellService.getUpsellSuggestions(id);
      return res.status(200).json(success(suggestions));
    } catch (err) {
      next(err);
    }
  }

  async getDashboardMetrics(req, res, next) {
    try {
      const metrics = await quotationService.getDashboardMetrics(req.user);
      return res.status(200).json(success(metrics));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new QuotationController();
