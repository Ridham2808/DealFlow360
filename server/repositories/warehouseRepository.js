const prisma = require('../prisma/prisma');

class WarehouseRepository {
  async findAll({ isActive } = {}) {
    const where = {};
    if (isActive !== undefined) {
      where.isActive = isActive === 'true' || isActive === true;
    }

    return prisma.warehouse.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { stockLevels: true },
        },
      },
    });
  }

  async findById(id) {
    return prisma.warehouse.findUnique({
      where: { id },
      include: {
        stockLevels: {
          include: { product: true },
        },
      },
    });
  }

  async findByName(name) {
    return prisma.warehouse.findUnique({
      where: { name },
    });
  }

  async create(data) {
    return prisma.warehouse.create({
      data,
    });
  }

  async update(id, data) {
    return prisma.warehouse.update({
      where: { id },
      data,
    });
  }

  async findStockByWarehouse(warehouseId) {
    return prisma.stockLevel.findMany({
      where: { warehouseId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            category: true,
            basePrice: true,
            unit: true,
          },
        },
      },
      orderBy: { product: { name: 'asc' } },
    });
  }

  async findStock(warehouseId, productId) {
    return prisma.stockLevel.findUnique({
      where: {
        warehouseId_productId: {
          warehouseId,
          productId,
        },
      },
      include: { product: true },
    });
  }

  async upsertStock(warehouseId, productId, data) {
    return prisma.stockLevel.upsert({
      where: {
        warehouseId_productId: {
          warehouseId,
          productId,
        },
      },
      create: {
        warehouseId,
        productId,
        quantityOnHand: data.quantityOnHand !== undefined ? data.quantityOnHand : 0,
        reserved: data.reserved !== undefined ? data.reserved : 0,
        replenishmentThreshold: data.replenishmentThreshold !== undefined ? data.replenishmentThreshold : 10,
      },
      update: data,
      include: { product: true },
    });
  }
}

module.exports = new WarehouseRepository();
