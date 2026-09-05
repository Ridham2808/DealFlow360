const bcrypt = require('bcryptjs');
const prisma = require('../prisma/prisma');
const userRepository = require('../repositories/userRepository');
const invitationService = require('./invitationService');
const auditService = require('./auditService');
const { generateToken } = require('../utils/tokenHelper');
const { ApiError } = require('../utils/apiResponse');

class AuthService {
  /**
   * PUBLIC SIGNUP IS DISABLED.
   * All user creation goes through Admin dashboard.
   * This method is kept only for seed script use (internal calls).
   * @internal
   */
  async _seedCreateUser({ name, email, password, role = 'SALES_REP', companyName, customerTier = 'BRONZE' }) {
    const cleanEmail = email.toLowerCase().trim();
    const existing = await userRepository.findByEmail(cleanEmail);
    if (existing) return existing; // idempotent for seed

    const passwordHash = await bcrypt.hash(password, 10);

    let customerId = null;
    let assignedTier = null;

    if (role === 'CUSTOMER') {
      assignedTier = customerTier || 'BRONZE';
      const customer = await userRepository.findOrCreateCustomer({
        name: companyName || name,
        email: cleanEmail,
        tier: assignedTier,
      });
      customerId = customer.id;
    }

    return userRepository.create({
      name,
      email:        cleanEmail,
      passwordHash,
      role,
      status:       'ACTIVE',
      customerTier: assignedTier,
      customerId,
      isActive:     true,
    });
  }

  /**
   * Accept an invitation — set password, activate user, issue JWT.
   * This is the ONLY way a new user can gain access.
   *
   * @param {string} rawToken   - token from invitation link/email
   * @param {string} password   - chosen password (min 8 chars)
   * @param {string} [name]     - optional display name override
   */
  async acceptInvitation({ rawToken, password, name }) {
    // 1. Validate token (throws on expired/used/not found)
    const invitation = await invitationService.validate(rawToken);

    // 2. Find the pending user
    const user = await prisma.user.findUnique({ where: { email: invitation.email } });
    if (!user) throw new ApiError('User record not found. Contact administrator.', 404, 'USER_NOT_FOUND');
    if (user.status === 'ACTIVE') {
      throw new ApiError('This account is already active. Please log in.', 409, 'ALREADY_ACTIVE');
    }
    if (user.status === 'DEACTIVATED') {
      throw new ApiError('This account has been deactivated. Contact an administrator.', 403, 'ACCOUNT_DEACTIVATED');
    }

    // 3. Hash password and activate
    const passwordHash = await bcrypt.hash(password, 10);
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        status:   'ACTIVE',
        isActive: true,
        ...(name ? { name } : {}),
      },
    });

    // 4. Consume token
    await invitationService.consume(rawToken);

    // 5. Audit
    auditService.log({
      actorId:    user.id,
      action:     'ACCEPTED_INVITATION',
      targetId:   invitation.id,
      targetType: 'Invitation',
      meta:       { role: user.role, email: user.email },
    });

    // 6. Issue JWT
    const token = generateToken({
      userId:     updated.id,
      role:       updated.role,
      customerId: updated.customerId,
    });

    return {
      user: this._safeUser(updated),
      token,
    };
  }

  /**
   * Validate an invitation token WITHOUT consuming it.
   * Used by frontend Step 1 to preview the invitation (role, invitedBy).
   */
  async previewInvitation(rawToken) {
    const inv = await invitationService.validate(rawToken);
    return {
      email:      inv.email,
      role:       inv.role,
      type:       inv.type,
      expiresAt:  inv.expiresAt,
      invitedBy:  inv.invitedBy?.name || 'Administrator',
    };
  }

  /**
   * Authenticate with email + password.
   */
  async login(email, password) {
    const cleanEmail = (email || '').toLowerCase().trim();
    const user = await userRepository.findByEmail(cleanEmail);

    // Generic error: do not reveal whether email exists
    if (!user) throw new ApiError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');

    if (user.status === 'INVITATION_PENDING') {
      throw new ApiError(
        'Your invitation has not been accepted yet. Check your email for the invitation link.',
        403,
        'INVITATION_NOT_ACCEPTED'
      );
    }
    if (user.status === 'DEACTIVATED' || !user.isActive) {
      throw new ApiError('This account has been deactivated. Contact an administrator.', 403, 'ACCOUNT_DEACTIVATED');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash || '');
    if (!isMatch) throw new ApiError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');

    const token = generateToken({
      userId:     user.id,
      role:       user.role,
      customerId: user.customerId,
    });

    return { user: this._safeUser(user), token };
  }

  /**
   * Return profile for authenticated user.
   */
  async getCurrentUser(userId) {
    const user = await userRepository.findById(userId);
    if (!user || !user.isActive) {
      throw new ApiError('User not found or deactivated.', 404, 'USER_NOT_FOUND');
    }
    return this._safeUser(user);
  }

  /**
   * Update profile for authenticated user (e.g. name).
   */
  async updateProfile(userId, { name }) {
    if (!name || !name.trim()) {
      throw new ApiError('Name is required.', 400, 'INVALID_NAME');
    }
    const user = await userRepository.findById(userId);
    if (!user || !user.isActive) {
      throw new ApiError('User not found or deactivated.', 404, 'USER_NOT_FOUND');
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { name: name.trim() },
      include: { customer: true },
    });

    auditService.log({
      actorId: userId,
      action: 'UPDATED_PROFILE',
      targetId: userId,
      targetType: 'User',
      reasonNote: `User updated profile name to "${name.trim()}"`,
    });

    return this._safeUser(updated);
  }

  _safeUser(user) {
    return {
      id:          user.id,
      name:        user.name,
      email:       user.email,
      role:        user.role,
      status:      user.status,
      customerTier: user.customerTier,
      customerId:  user.customerId,
      customer:    user.customer,
    };
  }
}

module.exports = new AuthService();
