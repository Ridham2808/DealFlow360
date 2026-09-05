const { ApiError } = require('../utils/apiResponse');

const VALID_ROLES = ['SALES_REP', 'SALES_MANAGER', 'FINANCE', 'ADMIN', 'CUSTOMER'];

function validateLoginInput(req, res, next) {
  const { email, password } = req.body || {};
  const errors = {};

  if (!email || typeof email !== 'string' || !email.trim()) {
    errors.email = 'Email address is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.email = 'Please provide a valid email address.';
  }

  if (!password || typeof password !== 'string') {
    errors.password = 'Password is required.';
  }

  if (Object.keys(errors).length > 0) {
    return next(new ApiError('Validation error', 400, 'VALIDATION_ERROR', errors));
  }

  next();
}

function validateSignupInput(req, res, next) {
  const { email, password, firstName, lastName, role, companyName } = req.body || {};
  const errors = {};

  if (!firstName || typeof firstName !== 'string' || !firstName.trim()) {
    errors.firstName = 'First name is required.';
  }

  if (!lastName || typeof lastName !== 'string' || !lastName.trim()) {
    errors.lastName = 'Last name is required.';
  }

  if (!email || typeof email !== 'string' || !email.trim()) {
    errors.email = 'Email address is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.email = 'Please provide a valid email address.';
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    errors.password = 'Password must be at least 8 characters long.';
  }

  if (role && !VALID_ROLES.includes(role)) {
    errors.role = `Invalid role. Allowed roles: ${VALID_ROLES.join(', ')}`;
  }

  if (role === 'CUSTOMER' && (!companyName || typeof companyName !== 'string' || !companyName.trim())) {
    errors.companyName = 'Company name is required for customer accounts.';
  }

  if (Object.keys(errors).length > 0) {
    return next(new ApiError('Validation error', 400, 'VALIDATION_ERROR', errors));
  }

  next();
}

module.exports = {
  validateLoginInput,
  validateSignupInput,
  VALID_ROLES,
};
