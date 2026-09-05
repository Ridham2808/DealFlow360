const { ApiError } = require('../utils/apiResponse');

/**
 * Role-Based Access Control Middleware:
 * Verifies that the authenticated user possesses one of the authorized roles.
 * Never trusts any client-supplied role or customer ID.
 */
function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError('Authentication required.', 401, 'UNAUTHORIZED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ApiError(
          `Access denied. Required role: [${allowedRoles.join(', ')}]. Current role: ${req.user.role}`,
          403,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
}

/**
 * Guard to ensure only internal employees (non-customers) have access.
 */
function requireInternalUser(req, res, next) {
  if (!req.user) {
    return next(new ApiError('Authentication required.', 401, 'UNAUTHORIZED'));
  }
  if (req.user.role === 'CUSTOMER') {
    return next(new ApiError('Access restricted to internal personnel.', 403, 'INTERNAL_ONLY'));
  }
  next();
}

/**
 * Guard to ensure customer portal access is limited to CUSTOMER role.
 */
function requireCustomer(req, res, next) {
  if (!req.user) {
    return next(new ApiError('Authentication required.', 401, 'UNAUTHORIZED'));
  }
  if (req.user.role !== 'CUSTOMER') {
    return next(new ApiError('Access restricted to verified customer accounts.', 403, 'CUSTOMER_ONLY'));
  }
  next();
}

module.exports = {
  requireRoles,
  requireInternalUser,
  requireCustomer,
};
