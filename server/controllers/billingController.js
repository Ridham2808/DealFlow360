const billingService = require('../services/billingService');
const { success } = require('../utils/apiResponse');

class BillingController {
  async generateBilling(req, res, next) {
    try {
      const { quotationId } = req.params;
      const result = await billingService.generateBilling(quotationId, req.user.id);
      return res.status(200).json(success(result, 'Hybrid billing successfully generated for quotation.'));
    } catch (err) {
      next(err);
    }
  }

  async listSubscriptions(req, res, next) {
    try {
      const result = await billingService.listSubscriptions(req.query);
      return res.status(200).json(success(result));
    } catch (err) {
      next(err);
    }
  }

  async getSubscriptionDetail(req, res, next) {
    try {
      const { id } = req.params;
      const result = await billingService.getSubscriptionDetail(id);
      return res.status(200).json(success(result));
    } catch (err) {
      next(err);
    }
  }

  async modifySubscription(req, res, next) {
    try {
      const { id } = req.params;
      const result = await billingService.modifySubscription(id, req.body, req.user.id);
      return res.status(200).json(success(result, 'Subscription modified with calculated proration.'));
    } catch (err) {
      next(err);
    }
  }

  async cancelSubscription(req, res, next) {
    try {
      const { id } = req.params;
      const { reason, immediate } = req.body;
      const result = await billingService.cancelSubscription(id, { reason, immediate }, req.user.id);
      return res.status(200).json(success(result, 'Subscription cancelled with credit/refund applied.'));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new BillingController();
