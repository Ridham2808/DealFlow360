const prisma = require('../prisma/prisma');
const invitationService = require('./invitationService');
const auditService = require('./auditService');
const { ApiError } = require('../utils/apiResponse');

class AdminCustomerService {
  // ─── LIST ─────────────────────────────────────────────────────────

  async listCustomers({ tier, isActive, page = 1, limit = 20 } = {}) {
    const where = {
      ...(tier     ? { tier }     : {}),
      ...(typeof isActive === 'boolean' ? { isActive } : {}),
    };
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          users: { select: { id: true, name: true, email: true, status: true } },
        },
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customer.count({ where }),
    ]);
    return { customers, total, page, limit };
  }

  // ─── CREATE ───────────────────────────────────────────────────────

  /**
   * Admin creates a customer company record.
   * Does NOT automatically send portal invite — Admin calls sendPortalInvite separately.
   */
  async createCustomer({ name, email, tier = 'BRONZE', currency = 'INR', assignedRepId, adminId }) {
    const cleanEmail = email.toLowerCase().trim();
    const existing = await prisma.customer.findUnique({ where: { email: cleanEmail } });
    if (existing) throw new ApiError('A customer with this email already exists.', 409, 'EMAIL_EXISTS');

    const customer = await prisma.customer.create({
      data: {
        name,
        email:    cleanEmail,
        tier,
        isActive: true,
      },
    });

    auditService.log({
      actorId:    adminId,
      action:     'CREATED_CUSTOMER',
      targetId:   customer.id,
      targetType: 'Customer',
      meta:       { name, tier, currency },
    });

    return customer;
  }

  // ─── UPDATE ───────────────────────────────────────────────────────

  async updateCustomer(customerId, updates, adminId) {
    const customer = await this._findOrThrow(customerId);
    const allowedFields = ['name', 'tier', 'isActive'];
    const data = {};
    for (const key of allowedFields) {
      if (key in updates) data[key] = updates[key];
    }

    const updated = await prisma.customer.update({ where: { id: customerId }, data });

    auditService.log({
      actorId: adminId, action: 'UPDATED_CUSTOMER',
      targetId: customerId, targetType: 'Customer',
      meta: data,
    });

    return updated;
  }

  // ─── DEACTIVATE ───────────────────────────────────────────────────

  async deactivate(customerId, adminId) {
    const customer = await this._findOrThrow(customerId);
    const updated = await prisma.customer.update({
      where: { id: customerId },
      data:  { isActive: false },
    });

    // Also deactivate associated portal users
    await prisma.user.updateMany({
      where: { customerId, role: 'CUSTOMER' },
      data:  { isActive: false, status: 'DEACTIVATED' },
    });

    auditService.log({
      actorId: adminId, action: 'DEACTIVATED_CUSTOMER',
      targetId: customerId, targetType: 'Customer',
    });

    return updated;
  }

  // ─── SEND PORTAL INVITE ───────────────────────────────────────────

  /**
   * Create (or re-create) a customer portal user and send invitation.
   * Returns rawToken for Admin to share with customer contact.
   */
  async sendPortalInvite(customerId, contactEmail, contactName, adminId) {
    const customer = await this._findOrThrow(customerId);

    // Upsert portal user for this customer
    let portalUser = await prisma.user.findUnique({
      where: { email: contactEmail.toLowerCase().trim() },
    });

    if (!portalUser) {
      portalUser = await prisma.user.create({
        data: {
          name:         contactName,
          email:        contactEmail.toLowerCase().trim(),
          passwordHash: null,
          role:         'CUSTOMER',
          status:       'INVITATION_PENDING',
          isActive:     false,
          customerId,
          customerTier: customer.tier,
        },
      });
    } else if (portalUser.customerId !== customerId) {
      throw new ApiError('This email is already linked to a different customer.', 409, 'EMAIL_CONFLICT');
    }

    const { invitation, rawToken } = await invitationService.create({
      email:       contactEmail,
      role:        'CUSTOMER',
      type:        'CUSTOMER_PORTAL',
      invitedById: adminId,
      customerId,
    });

    // Update customer's portalUserId
    await prisma.customer.update({
      where: { id: customerId },
      data:  { portalUserId: portalUser.id },
    });

    auditService.log({
      actorId:    adminId,
      action:     'SENT_PORTAL_INVITE',
      targetId:   customerId,
      targetType: 'Customer',
      meta:       { portalUserId: portalUser.id, invitationId: invitation.id },
    });

    return {
      customer,
      portalUser: { id: portalUser.id, email: portalUser.email },
      rawToken,
      invitationId: invitation.id,
    };
  }

  // ─── HELPERS ─────────────────────────────────────────────────────

  async _findOrThrow(id) {
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new ApiError('Customer not found.', 404, 'CUSTOMER_NOT_FOUND');
    return customer;
  }
}

module.exports = new AdminCustomerService();
