const warehouseRepository = require('../repositories/warehouseRepository');
const productRepository = require('../repositories/productRepository');
const auditService = require('./auditService');
const { ApiError } = require('../utils/apiResponse');

class WarehouseService {
  async listWarehouses(filters) {
    return warehouseRepository.findAll(filters);
  }

  async getWarehouseById(id) {
    const warehouse = await warehouseRepository.findById(id);
    if (!warehouse) {
      throw new ApiError('Warehouse not found.', 404, 'WAREHOUSE_NOT_FOUND');
    }
    return warehouse;
  }

  async createWarehouse(data, actorId) {
    const existing = await warehouseRepository.findByName(data.name);
    if (existing) {
      throw new ApiError(`Warehouse '${data.name}' already exists.`, 409, 'WAREHOUSE_NAME_EXISTS');
    }

    const warehouse = await warehouseRepository.create(data);

    if (actorId) {
      auditService.log({
        actorId,
        action: 'CREATED_WAREHOUSE',
        targetId: warehouse.id,
        targetType: 'Warehouse',
        reasonNote: `Warehouse ${warehouse.name} in ${warehouse.location} created.`,
        meta: { name: warehouse.name, location: warehouse.location, weight: warehouse.shippingCostWeight },
      });
    }

    return warehouse;
  }

  async updateWarehouse(id, updates, actorId) {
    const existing = await this.getWarehouseById(id);

    if (updates.name && updates.name !== existing.name) {
      const nameCheck = await warehouseRepository.findByName(updates.name);
      if (nameCheck) {
        throw new ApiError(`Warehouse '${updates.name}' already exists.`, 409, 'WAREHOUSE_NAME_EXISTS');
      }
    }

    const updated = await warehouseRepository.update(id, updates);

    if (actorId) {
      auditService.log({
        actorId,
        action: 'UPDATED_WAREHOUSE',
        targetId: id,
        targetType: 'Warehouse',
        reasonNote: `Warehouse ${updated.name} updated.`,
        meta: { changedFields: Object.keys(updates) },
      });
    }

    return updated;
  }

  async getWarehouseStock(warehouseId) {
    await this.getWarehouseById(warehouseId);
    const stock = await warehouseRepository.findStockByWarehouse(warehouseId);

    return stock.map((s) => ({
      id: s.id,
      warehouseId: s.warehouseId,
      productId: s.productId,
      productName: s.product.name,
      sku: s.product.sku,
      category: s.product.category,
      unit: s.product.unit,
      quantityOnHand: s.quantityOnHand,
      reserved: s.reserved,
      available: Math.max(0, s.quantityOnHand - s.reserved),
      replenishmentThreshold: s.replenishmentThreshold,
      isLowStock: s.quantityOnHand - s.reserved <= s.replenishmentThreshold,
    }));
  }

  async updateStock(warehouseId, productId, updates, actorId) {
    const warehouse = await this.getWarehouseById(warehouseId);
    const product = await productRepository.findById(productId);
    if (!product) {
      throw new ApiError('Product not found for inventory update.', 404, 'PRODUCT_NOT_FOUND');
    }

    const currentStock = await warehouseRepository.findStock(warehouseId, productId);
    const finalOnHand = updates.quantityOnHand !== undefined ? updates.quantityOnHand : (currentStock ? currentStock.quantityOnHand : 0);
    const finalReserved = updates.reserved !== undefined ? updates.reserved : (currentStock ? currentStock.reserved : 0);

    if (finalReserved > finalOnHand) {
      throw new ApiError(
        `Reserved quantity (${finalReserved}) cannot exceed quantity on hand (${finalOnHand}).`,
        400,
        'INVALID_STOCK_ALLOCATION'
      );
    }

    const updated = await warehouseRepository.upsertStock(warehouseId, productId, updates);

    if (actorId) {
      auditService.log({
        actorId,
        action: 'UPDATED_STOCK_LEVEL',
        targetId: updated.id,
        targetType: 'StockLevel',
        reasonNote: `Adjusted inventory for ${product.sku} at warehouse ${warehouse.name} to OnHand: ${finalOnHand}, Reserved: ${finalReserved}.`,
        meta: { warehouseId, productId, sku: product.sku, quantityOnHand: finalOnHand, reserved: finalReserved },
      });
    }

    return {
      ...updated,
      available: Math.max(0, updated.quantityOnHand - updated.reserved),
      isLowStock: updated.quantityOnHand - updated.reserved <= updated.replenishmentThreshold,
    };
  }
}

module.exports = new WarehouseService();
