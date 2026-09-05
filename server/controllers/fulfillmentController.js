const fulfillmentService = require('../services/fulfillmentService');
const { success } = require('../utils/apiResponse');

class FulfillmentController {
  async getOverview(req, res, next) {
    try {
      const result = await fulfillmentService.getFulfillmentOverview();
      return res.status(200).json(success(result));
    } catch (err) {
      next(err);
    }
  }

  async getWarehouseSplit(req, res, next) {
    try {
      const { quotationId } = req.params;
      const result = await fulfillmentService.calculateWarehouseSplit(quotationId);
      return res.status(200).json(success(result));
    } catch (err) {
      next(err);
    }
  }

  async acceptSplit(req, res, next) {
    try {
      const { quotationId } = req.params;
      const result = await fulfillmentService.acceptSuggestedSplit(quotationId, req.user.id);
      return res.status(200).json(success(result, 'Suggested warehouse split accepted and inventory reserved.'));
    } catch (err) {
      next(err);
    }
  }

  async manualOverride(req, res, next) {
    try {
      const { quotationId } = req.params;
      const { allocations } = req.body;
      const result = await fulfillmentService.applyManualOverride(quotationId, allocations, req.user.id);
      return res.status(200).json(success(result, 'Manual warehouse allocations applied successfully.'));
    } catch (err) {
      next(err);
    }
  }

  async consolidateBackorder(req, res, next) {
    try {
      const { quotationId } = req.params;
      const result = await fulfillmentService.consolidateBackorder(quotationId, req.user.id);
      return res.status(200).json(success(result, 'Backorder consolidation re-evaluated.'));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new FulfillmentController();
