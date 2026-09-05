const warehouseService = require('../services/warehouseService');
const {
  validateCreateWarehouse,
  validateUpdateWarehouse,
  validateUpdateStock,
} = require('../validators/warehouseValidator');
const { success } = require('../utils/apiResponse');

class WarehouseController {
  async listWarehouses(req, res, next) {
    try {
      const { isActive } = req.query;
      const warehouses = await warehouseService.listWarehouses({ isActive });
      return res.status(200).json(success(warehouses));
    } catch (err) {
      next(err);
    }
  }

  async getWarehouse(req, res, next) {
    try {
      const { id } = req.params;
      const warehouse = await warehouseService.getWarehouseById(id);
      return res.status(200).json(success(warehouse));
    } catch (err) {
      next(err);
    }
  }

  async createWarehouse(req, res, next) {
    try {
      const validated = validateCreateWarehouse(req.body);
      const warehouse = await warehouseService.createWarehouse(validated, req.user.userId);
      return res.status(201).json(success(warehouse, 'Warehouse created successfully.'));
    } catch (err) {
      next(err);
    }
  }

  async updateWarehouse(req, res, next) {
    try {
      const { id } = req.params;
      const validated = validateUpdateWarehouse(req.body);
      const warehouse = await warehouseService.updateWarehouse(id, validated, req.user.userId);
      return res.status(200).json(success(warehouse, 'Warehouse updated successfully.'));
    } catch (err) {
      next(err);
    }
  }

  async getStock(req, res, next) {
    try {
      const { id } = req.params;
      const stock = await warehouseService.getWarehouseStock(id);
      return res.status(200).json(success(stock));
    } catch (err) {
      next(err);
    }
  }

  async updateStock(req, res, next) {
    try {
      const { id, productId } = req.params;
      const validated = validateUpdateStock(req.body);
      const stock = await warehouseService.updateStock(id, productId, validated, req.user.userId);
      return res.status(200).json(success(stock, 'Stock level updated successfully.'));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new WarehouseController();
