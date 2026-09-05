const discountService = require('../services/discountService');
const {
  validateUpdateDiscountTier,
  validateUpdateCategoryCeiling,
} = require('../validators/discountValidator');
const { success } = require('../utils/apiResponse');

class DiscountController {
  async listTiers(req, res, next) {
    try {
      const tiers = await discountService.listTiers();
      return res.status(200).json(success(tiers));
    } catch (err) {
      next(err);
    }
  }

  async updateTier(req, res, next) {
    try {
      const { id } = req.params;
      const validated = validateUpdateDiscountTier(req.body);
      const tier = await discountService.updateTier(id, validated, req.user.userId);
      return res.status(200).json(success(tier, 'Discount tier updated successfully.'));
    } catch (err) {
      next(err);
    }
  }

  async listCeilings(req, res, next) {
    try {
      const ceilings = await discountService.listCeilings();
      return res.status(200).json(success(ceilings));
    } catch (err) {
      next(err);
    }
  }

  async updateCeiling(req, res, next) {
    try {
      const { id } = req.params;
      const validated = validateUpdateCategoryCeiling(req.body);
      const ceiling = await discountService.updateCeiling(id, validated, req.user.userId);
      return res.status(200).json(success(ceiling, 'Category discount ceiling updated successfully.'));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new DiscountController();
