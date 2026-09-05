const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');
const { generateToken } = require('../utils/tokenHelper');
const { ApiError } = require('../utils/apiResponse');

class AuthService {
  /**
   * Register a new user
   */
  async register({ email, password, firstName, lastName, role = 'SALES_REP', companyName, phone }) {
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw new ApiError('An account with this email address already exists.', 409, 'EMAIL_EXISTS', { email });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    let customerId = null;
    if (role === 'CUSTOMER' && companyName) {
      const customer = await userRepository.findOrCreateCustomer({
        companyName,
        name: `${firstName} ${lastName}`,
        email,
        phone,
      });
      customerId = customer.id;
    }

    const user = await userRepository.create({
      email,
      passwordHash,
      firstName,
      lastName,
      role,
      phone: phone || null,
      customerId,
    });

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      customerId: user.customerId,
    });

    const userSafe = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      customerId: user.customerId,
      customer: user.customer,
      createdAt: user.createdAt,
    };

    return { user: userSafe, token };
  }

  /**
   * Authenticate user with email and password
   */
  async login(email, password) {
    const user = await userRepository.findByEmail(email);
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

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      customerId: user.customerId,
    });

    const userSafe = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      customerId: user.customerId,
      customer: user.customer,
    };

    return { user: userSafe, token };
  }

  /**
   * Get current user profile by ID
   */
  async getCurrentUser(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new ApiError('User not found.', 404, 'USER_NOT_FOUND');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      customerId: user.customerId,
      customer: user.customer,
    };
  }
}

module.exports = new AuthService();
