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

  async findCustomerByEmail(email) {
    return prisma.customer.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
  }

  async findCustomerById(id) {
    return prisma.customer.findUnique({
      where: { id },
    });
  }

  async findOrCreateCustomer({ name, email, tier = 'BRONZE' }) {
    let customer = await prisma.customer.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name,
          email: email.toLowerCase().trim(),
          tier,
        },
      });
    }

    return customer;
  }
}

module.exports = new UserRepository();
