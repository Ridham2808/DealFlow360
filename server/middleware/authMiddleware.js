const { verifyToken, COOKIE_NAME } = require('../utils/tokenHelper');
const { ApiError } = require('../utils/apiResponse');
const userRepository = require('../repositories/userRepository');

/**
 * Authentication Middleware:
 * Verifies JWT token from HTTP-only cookie (or Bearer Authorization header fallback)
 * Fetches current user and attaches to req.user
 */
async function authMiddleware(req, res, next) {
  try {
    let token = req.cookies?.[COOKIE_NAME];

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new ApiError('Authentication required. Please sign in.', 401, 'UNAUTHORIZED');
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      throw new ApiError('Session expired or invalid token. Please sign in again.', 401, 'TOKEN_INVALID');
    }

    const user = await userRepository.findById(decoded.userId);
    if (!user || !user.isActive) {
      throw new ApiError('User account not found or deactivated.', 401, 'USER_INACTIVE');
    }

    // Attach validated user to request object
    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      customerId: user.customerId || null,
    };

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = authMiddleware;
