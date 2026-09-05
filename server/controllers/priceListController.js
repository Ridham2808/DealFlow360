const priceListService = require('../services/priceListService');
const {
  validateCreatePriceList,
  validateUpdatePriceList,
  validateCreatePriceListItem,
  validateUpdatePriceListItem,
} = require('../validators/priceListValidator');
const { success } = require('../utils/apiResponse');

class PriceListController {
  async listPriceLists(req, res, next) {
    try {
      const { customerTier, isActive, page = 1, limit = 50 } = req.query;
      const result = await priceListService.listPriceLists({
        customerTier,
        isActive,
        page: Number(page),
        limit: Number(limit),
      });
      return res.status(200).json(success(result));
    } catch (err) {
      next(err);
    }
  }

  async getPriceList(req, res, next) {
    try {
      const { id } = req.params;
      const priceList = await priceListService.getPriceListById(id);
      return res.status(200).json(success(priceList));
    } catch (err) {
      next(err);
    }
  }

  async createPriceList(req, res, next) {
    try {
      const validated = validateCreatePriceList(req.body);
      const priceList = await priceListService.createPriceList(validated, req.user.userId);
      return res.status(201).json(success(priceList, 'Price list created successfully.'));
    } catch (err) {
      next(err);
    }
  }

  async updatePriceList(req, res, next) {
    try {
      const { id } = req.params;
      const validated = validateUpdatePriceList(req.body);
      const priceList = await priceListService.updatePriceList(id, validated, req.user.userId);
      return res.status(200).json(success(priceList, 'Price list updated successfully.'));
    } catch (err) {
      next(err);
    }
  }

  async deletePriceList(req, res, next) {
    try {
      const { id } = req.params;
      const result = await priceListService.deletePriceList(id, req.user.userId);
      return res.status(200).json(success(result, 'Price list deleted successfully.'));
    } catch (err) {
      next(err);
    }
  }

  async addItem(req, res, next) {
    try {
      const { id } = req.params;
      const validated = validateCreatePriceListItem(req.body);
      const item = await priceListService.addItem(id, validated, req.user.userId);
      return res.status(201).json(success(item, 'Price list item added successfully.'));
    } catch (err) {
      next(err);
    }
  }

  async updateItem(req, res, next) {
    try {
      const { id, itemId } = req.params;
      const validated = validateUpdatePriceListItem(req.body);
      const item = await priceListService.updateItem(id, itemId, validated, req.user.userId);
      return res.status(200).json(success(item, 'Price list item updated successfully.'));
    } catch (err) {
      next(err);
    }
  }

  async deleteItem(req, res, next) {
    try {
      const { id, itemId } = req.params;
      const result = await priceListService.deleteItem(id, itemId, req.user.userId);
      return res.status(200).json(success(result, 'Price list item deleted successfully.'));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PriceListController();
