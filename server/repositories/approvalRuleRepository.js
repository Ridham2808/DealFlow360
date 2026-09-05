const prisma = require('../prisma/prisma');

class ApprovalRuleRepository {
  async findAll() {
    return prisma.approvalChainRule.findMany({
      orderBy: { orderIndex: 'asc' },
    });
  }

  async findById(id) {
    return prisma.approvalChainRule.findUnique({
      where: { id },
    });
  }

  async update(id, data) {
    return prisma.approvalChainRule.update({
      where: { id },
      data,
    });
  }
}

module.exports = new ApprovalRuleRepository();
