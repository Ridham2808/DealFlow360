const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');
const { generateToken } = require('../utils/tokenHelper');
const { ApiError } = require('../utils/apiResponse');

class AuthService {
  /**
   * Register a new user
   */
  async register({ name, email, password, role = 'SALES_REP', companyName, customerTier = 'BRONZE' }) {
    const cleanEmail = email.toLowerCase().trim();
    const existing = await userRepository.findByEmail(cleanEmail);
    if (existing) {
      throw new ApiError('An account with this email address already exists.', 409, 'EMAIL_EXISTS', { email: cleanEmail });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

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

    const user = await userRepository.create({
      name,
      email: cleanEmail,
      passwordHash,
      role,
      customerTier: assignedTier,
      customerId,
      isActive: true,
    });

    // Issue signed JWT containing only minimum identity claims
    const token = generateToken({
      userId: user.id,
      role: user.role,
      customerId: user.customerId,
    });

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      customerTier: user.customerTier,
      customerId: user.customerId,
      customer: user.customer,
      createdAt: user.createdAt,
    };

    return { user: safeUser, token };
  }

  /**
   * Authenticate user with email and password.
   * Security Rule: Invalid credentials must not reveal whether an email exists.
   */
  async login(email, password) {
    const cleanEmail = (email || '').toLowerCase().trim();
    const user = await userRepository.findByEmail(cleanEmail);

    // Generic error message for both non-existent user and bad password
    if (!user) {
      throw new ApiError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw new ApiError('This account has been deactivated. Contact an administrator.', 403, 'ACCOUNT_DEACTIVATED');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new ApiError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    // Minimum identity claims
    const token = generateToken({
      userId: user.id,
      role: user.role,
      customerId: user.customerId,
    });

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      customerTier: user.customerTier,
      customerId: user.customerId,
      customer: user.customer,
    };

    return { user: safeUser, token };
  }

  /**
   * Return profile for authenticated user
   */
  async getCurrentUser(userId) {
    const user = await userRepository.findById(userId);
    if (!user || !user.isActive) {
      throw new ApiError('User not found or deactivated.', 404, 'USER_NOT_FOUND');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      customerTier: user.customerTier,
      customerId: user.customerId,
      customer: user.customer,
    };
  }
}

module.exports = new AuthService();
