const prisma = require('../prisma/prisma');

class DiscountRepository {
  async findAllTiers() {
    return prisma.discountTier.findMany({
      orderBy: { customerTier: 'asc' },
    });
  }

  async findTierById(id) {
    return prisma.discountTier.findUnique({
      where: { id },
    });
  }

  async updateTier(id, data) {
    return prisma.discountTier.update({
      where: { id },
      data,
    });
  }

  async findAllCeilings() {
    return prisma.categoryDiscountCeiling.findMany({
      orderBy: { category: 'asc' },
    });
  }

  async findCeilingById(id) {
    return prisma.categoryDiscountCeiling.findUnique({
      where: { id },
    });
  }

  async updateCeiling(id, data) {
    return prisma.categoryDiscountCeiling.update({
      where: { id },
      data,
    });
  }
}

module.exports = new DiscountRepository();
