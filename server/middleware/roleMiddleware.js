const { ApiError } = require('../utils/apiResponse');

/**
 * Role-Based Access Control Middleware:
 * Supports requireRole(['ADMIN', 'SALES_MANAGER']) or requireRoles('ADMIN', 'SALES_MANAGER')
 * Never trusts any client-supplied role or customer ID.
 */
function requireRole(roles) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError('Authentication required.', 401, 'UNAUTHORIZED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ApiError(
          `Access forbidden. Requires one of roles: [${allowedRoles.join(', ')}]. Current role: ${req.user.role}`,
          403,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
}

function requireRoles(...allowedRoles) {
  return requireRole(allowedRoles);
}

function requireInternalUser(req, res, next) {
  if (!req.user) {
    return next(new ApiError('Authentication required.', 401, 'UNAUTHORIZED'));
  }
  if (req.user.role === 'CUSTOMER') {
    return next(new ApiError('Access restricted to internal personnel.', 403, 'INTERNAL_ONLY'));
  }
  next();
}

function requireCustomer(req, res, next) {
  if (!req.user) {
    return next(new ApiError('Authentication required.', 401, 'UNAUTHORIZED'));
  }
  if (req.user.role !== 'CUSTOMER') {
    return next(new ApiError('Access restricted to customer accounts.', 403, 'CUSTOMER_ONLY'));
  }
  next();
}

module.exports = {
  requireRole,
  requireRoles,
  requireInternalUser,
  requireCustomer,
};
