const pricingService = require('../services/pricingService');
const { success } = require('../utils/apiResponse');

class PricingController {
  async resolvePrice(req, res, next) {
    try {
      const { productId, customerTier, currency, quantity, variantId } = req.body;
      const result = await pricingService.resolvePrice(
        productId,
        customerTier,
        currency,
        quantity,
        variantId
      );
      return res.json(success(result, 'Price resolved successfully'));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PricingController();
