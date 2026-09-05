const bcrypt = require('bcryptjs');
const prisma = require('../prisma/prisma');
const invitationService = require('./invitationService');
const auditService = require('./auditService');
const { ApiError } = require('../utils/apiResponse');

// Roles that cannot be self-assigned via public signup
const PRIVILEGED_ROLES = ['SALES_REP', 'SALES_MANAGER', 'FINANCE', 'ADMIN', 'CUSTOMER'];

class AdminUserService {
  // ─── LIST ─────────────────────────────────────────────────────────

  /**
   * Paginated list of internal (non-CUSTOMER) users.
   */
  async listUsers({ role, status, page = 1, limit = 20 } = {}) {
    const where = {
      role: { not: 'CUSTOMER' },
      ...(role   ? { role }   : {}),
      ...(status ? { status } : {}),
    };
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, name: true, email: true, role: true,
          status: true, isActive: true, createdAt: true,
        },
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);
    return { users, total, page, limit };
  }

  // ─── CREATE & INVITE ──────────────────────────────────────────────

  /**
   * Admin creates an internal user + sends invitation.
   * Returns { user, rawToken } — rawToken for Admin to share (or email).
   */
  async createAndInvite({ name, email, role, invitedById }) {
    this._assertNotPublicAdminCreation(role, invitedById);

    const cleanEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) throw new ApiError('An account with this email already exists.', 409, 'EMAIL_EXISTS');

    // Create user in INVITATION_PENDING state — no password yet
    const user = await prisma.user.create({
      data: {
        name,
        email:        cleanEmail,
        passwordHash: null, // set when invitation accepted
        role,
        status:       'INVITATION_PENDING',
        isActive:     false, // not active until accepted
      },
    });

    const { invitation, rawToken } = await invitationService.create({
      email:       cleanEmail,
      role,
      type:        'INTERNAL_USER',
      invitedById,
    });

    auditService.log({
      actorId:    invitedById,
      action:     'CREATED_USER',
      targetId:   user.id,
      targetType: 'User',
      meta:       { role, invitationId: invitation.id },
    });

    return {
      user:     this._safeUser(user),
      rawToken, // surface to Admin; would normally be emailed
      invitationId: invitation.id,
    };
  }

  // ─── DEACTIVATE / REACTIVATE ──────────────────────────────────────

  async deactivate(targetId, adminId) {
    const user = await this._findOrThrow(targetId);
    if (user.role === 'ADMIN') await this._guardLastAdmin(targetId);

    const updated = await prisma.user.update({
      where: { id: targetId },
      data:  { isActive: false, status: 'DEACTIVATED' },
    });

    auditService.log({
      actorId: adminId, action: 'DEACTIVATED_USER',
      targetId, targetType: 'User',
      beforeStatus: user.status, afterStatus: 'DEACTIVATED',
    });

    return this._safeUser(updated);
  }

  async reactivate(targetId, adminId) {
    const user = await this._findOrThrow(targetId);
    const updated = await prisma.user.update({
      where: { id: targetId },
      data:  { isActive: true, status: 'ACTIVE' },
    });

    auditService.log({
      actorId: adminId, action: 'REACTIVATED_USER',
      targetId, targetType: 'User',
      beforeStatus: user.status, afterStatus: 'ACTIVE',
    });

    return this._safeUser(updated);
  }

  // ─── ROLE CHANGE ──────────────────────────────────────────────────

  async changeRole(targetId, newRole, adminId) {
    const user = await this._findOrThrow(targetId);
    if (user.role === 'ADMIN') await this._guardLastAdmin(targetId);

    const updated = await prisma.user.update({
      where: { id: targetId },
      data:  { role: newRole },
    });

    auditService.log({
      actorId: adminId, action: 'CHANGED_ROLE',
      targetId, targetType: 'User',
      meta: { from: user.role, to: newRole },
    });

    return this._safeUser(updated);
  }

  // ─── RESEND / RESET ACCESS ────────────────────────────────────────

  async resendInvite(targetId, adminId) {
    const user = await this._findOrThrow(targetId);
    const { rawToken, invitation } = await invitationService.resend({
      email:       user.email,
      role:        user.role,
      type:        'INTERNAL_USER',
      invitedById: adminId,
    });

    auditService.log({
      actorId: adminId, action: 'RESENT_INVITATION',
      targetId, targetType: 'User',
      meta: { invitationId: invitation.id },
    });

    return { rawToken, invitationId: invitation.id };
  }

  async resetAccess(targetId, adminId) {
    // Deactivate user, then issue fresh invite
    await this.deactivate(targetId, adminId);
    await prisma.user.update({
      where: { id: targetId },
      data:  { passwordHash: null, status: 'INVITATION_PENDING', isActive: false },
    });
    return this.resendInvite(targetId, adminId);
  }

  // ─── HELPERS ─────────────────────────────────────────────────────

  async _findOrThrow(id) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new ApiError('User not found.', 404, 'USER_NOT_FOUND');
    return user;
  }

  async _guardLastAdmin(excludeId) {
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN', isActive: true, id: { not: excludeId } },
    });
    if (adminCount === 0) {
      throw new ApiError(
        'Cannot perform this action — at least one active ADMIN must remain.',
        409,
        'LAST_ADMIN_GUARD'
      );
    }
  }

  _assertNotPublicAdminCreation(role, invitedById) {
    // Role validation is done at route level (requireRole ADMIN),
    // but we double-check ADMIN role creation here for defence in depth.
    if (role === 'ADMIN' && !invitedById) {
      throw new ApiError('ADMIN accounts can only be created by an existing Admin.', 403, 'FORBIDDEN');
    }
  }

  _safeUser(user) {
    return {
      id:        user.id,
      name:      user.name,
      email:     user.email,
      role:      user.role,
      status:    user.status,
      isActive:  user.isActive,
      createdAt: user.createdAt,
    };
  }
}

module.exports = new AdminUserService();
