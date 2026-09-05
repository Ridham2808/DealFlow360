const adminUserService = require('../services/adminUserService');
const adminCustomerService = require('../services/adminCustomerService');
const { success, error } = require('../utils/apiResponse');

class AdminController {
  // ═══════════════ USERS ═══════════════════════════════════════════

  async listUsers(req, res, next) {
    try {
      const { role, status, page = 1, limit = 20 } = req.query;
      const result = await adminUserService.listUsers({
        role, status,
        page: Number(page), limit: Number(limit),
      });
      return res.json(success(result));
    } catch (err) { next(err); }
  }

  async createUser(req, res, next) {
    try {
      const { name, email, role, team, sendInvite } = req.body;
      if (!name || !email || !role) {
        return res.status(400).json(error('name, email and role are required.', 400, 'VALIDATION_ERROR'));
      }
      const ALLOWED_ROLES = ['SALES_REP', 'SALES_MANAGER', 'FINANCE', 'ADMIN'];
      if (!ALLOWED_ROLES.includes(role)) {
        return res.status(400).json(error(`Role must be one of: ${ALLOWED_ROLES.join(', ')}`, 400, 'INVALID_ROLE'));
      }

      const result = await adminUserService.createAndInvite({
        name,
        email,
        role,
        team: team || 'Sales Operations',
        sendInvite: sendInvite !== false,
        invitedById: req.user.userId,
      });

      return res.status(201).json(success(result, 'User created and invitation generated.'));
    } catch (err) { next(err); }
  }

  async editUser(req, res, next) {
    try {
      const { name, role } = req.body;
      const user = await adminUserService.editUser(req.params.id, { name, role }, req.user.userId);
      return res.json(success({ user }, 'User details updated.'));
    } catch (err) { next(err); }
  }

  async deactivateUser(req, res, next) {
    try {
      const user = await adminUserService.deactivate(req.params.id, req.user.userId);
      return res.json(success({ user }, 'User deactivated.'));
    } catch (err) { next(err); }
  }

  async reactivateUser(req, res, next) {
    try {
      const user = await adminUserService.reactivate(req.params.id, req.user.userId);
      return res.json(success({ user }, 'User reactivated.'));
    } catch (err) { next(err); }
  }

  async changeRole(req, res, next) {
    try {
      const { role } = req.body;
      if (!role) return res.status(400).json(error('role is required.', 400, 'VALIDATION_ERROR'));
      const user = await adminUserService.changeRole(req.params.id, role, req.user.userId);
      return res.json(success({ user }, 'Role updated.'));
    } catch (err) { next(err); }
  }

  async resendInvite(req, res, next) {
    try {
      const result = await adminUserService.resendInvite(req.params.id, req.user.userId);
      return res.json(success(result, 'New invitation generated.'));
    } catch (err) { next(err); }
  }

  async resetAccess(req, res, next) {
    try {
      const result = await adminUserService.resetAccess(req.params.id, req.user.userId);
      return res.json(success(result, 'Access reset. New invitation generated.'));
    } catch (err) { next(err); }
  }

  // ═══════════════ CUSTOMERS ════════════════════════════════════════

  async listCustomers(req, res, next) {
    try {
      const { tier, isActive, page = 1, limit = 20 } = req.query;
      const result = await adminCustomerService.listCustomers({
        tier,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        page: Number(page), limit: Number(limit),
      });
      return res.json(success(result));
    } catch (err) { next(err); }
  }

  async createCustomer(req, res, next) {
    try {
      const { name, email, tier, currency, assignedRepId, contactName, contactEmail, sendPortalInvite } = req.body;
      if (!name || !email) {
        return res.status(400).json(error('name and email are required.', 400, 'VALIDATION_ERROR'));
      }
      const customer = await adminCustomerService.createCustomer({
        name,
        email,
        tier,
        currency,
        assignedRepId,
        contactName,
        contactEmail,
        sendPortalInvite: Boolean(sendPortalInvite),
        adminId: req.user.userId,
      });
      return res.status(201).json(success({ customer }, 'Customer created.'));
    } catch (err) { next(err); }
  }

  async updateCustomer(req, res, next) {
    try {
      const customer = await adminCustomerService.updateCustomer(req.params.id, req.body, req.user.userId);
      return res.json(success({ customer }, 'Customer updated.'));
    } catch (err) { next(err); }
  }

  async deactivateCustomer(req, res, next) {
    try {
      const customer = await adminCustomerService.deactivate(req.params.id, req.user.userId);
      return res.json(success({ customer }, 'Customer deactivated.'));
    } catch (err) { next(err); }
  }

  async sendPortalInvite(req, res, next) {
    try {
      const { contactEmail, contactName } = req.body;
      if (!contactEmail || !contactName) {
        return res.status(400).json(error('contactEmail and contactName are required.', 400, 'VALIDATION_ERROR'));
      }
      const result = await adminCustomerService.sendPortalInvite(
        req.params.id, contactEmail, contactName, req.user.userId
      );
      // rawToken returned (dev) — in production this is emailed to the customer
      return res.json(success(result, 'Portal invitation generated.'));
    } catch (err) { next(err); }
  }
}

module.exports = new AdminController();
