const prisma = require('../prisma/prisma');

class PriceListRepository {
  async findAll({ customerTier, isActive, page = 1, limit = 50 } = {}) {
    const where = {};

    if (customerTier) {
      where.customerTier = customerTier.toUpperCase();
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true' || isActive === true;
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.priceList.findMany({
        where,
        skip,
        take: limit,
        orderBy: { customerTier: 'asc' },
        include: {
          items: {
            include: {
              product: true,
              variant: true,
            },
          },
        },
      }),
      prisma.priceList.count({ where }),
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id) {
    return prisma.priceList.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });
  }

  async create(data) {
    return prisma.priceList.create({
      data,
      include: {
        items: true,
      },
    });
  }

  async update(id, data) {
    return prisma.priceList.update({
      where: { id },
      data,
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });
  }

  async delete(id) {
    return prisma.priceList.delete({
      where: { id },
    });
  }

  async findItemById(itemId) {
    return prisma.priceListItem.findUnique({
      where: { id: itemId },
      include: { product: true },
    });
  }

  async addItem(priceListId, data) {
    return prisma.priceListItem.create({
      data: {
        ...data,
        priceListId,
      },
      include: {
        product: true,
        variant: true,
      },
    });
  }

  async updateItem(itemId, data) {
    return prisma.priceListItem.update({
      where: { id: itemId },
      data,
      include: {
        product: true,
        variant: true,
      },
    });
  }

  async deleteItem(itemId) {
    return prisma.priceListItem.delete({
      where: { id: itemId },
    });
  }
}

module.exports = new PriceListRepository();
