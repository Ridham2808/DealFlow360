const prisma = require('../prisma/prisma');

class ProductRepository {
  async findAll({ category, search, isActive, page = 1, limit = 50 } = {}) {
    const where = {};

    if (isActive !== undefined) {
      where.isActive = isActive === 'true' || isActive === true;
    }

    if (category) {
      where.category = { equals: category, mode: 'insensitive' };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          variants: true,
          stockLevels: {
            include: { warehouse: true },
          },
        },
      }),
      prisma.product.count({ where }),
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
    return prisma.product.findUnique({
      where: { id },
      include: {
        variants: true,
        stockLevels: {
          include: { warehouse: true },
        },
      },
    });
  }

  async findBySku(sku) {
    return prisma.product.findUnique({
      where: { sku },
    });
  }

  async create(data) {
    return prisma.product.create({
      data,
      include: {
        variants: true,
      },
    });
  }

  async update(id, data) {
    return prisma.product.update({
      where: { id },
      data,
      include: {
        variants: true,
        stockLevels: true,
      },
    });
  }

  async softDelete(id) {
    return prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async findVariants(productId) {
    return prisma.productVariant.findMany({
      where: { productId },
      orderBy: { attributeName: 'asc' },
    });
  }

  async findVariantById(productId, variantId) {
    return prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    });
  }

  async createVariant(productId, data) {
    return prisma.productVariant.create({
      data: {
        ...data,
        productId,
      },
    });
  }

  async updateVariant(variantId, data) {
    return prisma.productVariant.update({
      where: { id: variantId },
      data,
    });
  }

  async deleteVariant(variantId) {
    return prisma.productVariant.delete({
      where: { id: variantId },
    });
  }
}

module.exports = new ProductRepository();
