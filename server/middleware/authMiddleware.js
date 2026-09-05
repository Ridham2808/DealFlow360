const { verifyToken, COOKIE_NAME } = require('../utils/tokenHelper');
const { ApiError } = require('../utils/apiResponse');
const userRepository = require('../repositories/userRepository');

/**
 * Authentication Middleware (requireAuth):
 * Verifies JWT token from HTTP-only cookie (or Bearer Authorization header fallback)
 * Attaches user to req.user
 */
async function requireAuth(req, res, next) {
  try {
    let token = req.cookies?.[COOKIE_NAME];

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new ApiError('Authentication required. Missing token.', 401, 'UNAUTHORIZED');
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      throw new ApiError('Invalid or expired authentication token.', 401, 'TOKEN_INVALID');
    }

    const user = await userRepository.findById(decoded.userId);
    if (!user || !user.isActive) {
      throw new ApiError('User account not found or deactivated.', 401, 'USER_INACTIVE');
    }

    // Attach verified user identity
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      customerTier: user.customerTier,
      customerId: user.customerId || null,
    };

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = requireAuth;
module.exports.requireAuth = requireAuth;
