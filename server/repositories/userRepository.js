const prisma = require('../prisma/prisma');

class UserRepository {
  async findByEmail(email) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        customer: true,
      },
    });
  }

  async findById(id) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        customer: true,
      },
    });
  }

  async create(userData) {
    return prisma.user.create({
      data: {
        ...userData,
        email: userData.email.toLowerCase().trim(),
      },
      include: {
        customer: true,
      },
    });
  }

  async update(id, data) {
    return prisma.user.update({
      where: { id },
      data,
      include: {
        customer: true,
      },
    });
  }

  async findOrCreateCustomer(customerData) {
    let customer = await prisma.customer.findUnique({
      where: { email: customerData.email.toLowerCase().trim() },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: customerData.name || customerData.companyName,
          companyName: customerData.companyName,
          email: customerData.email.toLowerCase().trim(),
          phone: customerData.phone || null,
        },
      });
    }

    return customer;
  }
}

module.exports = new UserRepository();
