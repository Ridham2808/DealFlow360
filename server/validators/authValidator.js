const { ApiError } = require('../utils/apiResponse');

const ALLOWED_PUBLIC_ROLES = ['SALES_REP', 'CUSTOMER'];
const ALL_ROLES = ['SALES_REP', 'SALES_MANAGER', 'FINANCE', 'ADMIN', 'CUSTOMER'];

// Password strength requirement: at least 8 characters, at least one letter, and at least one number
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateLoginInput(req, res, next) {
  const { email, password } = req.body || {};
  const errors = {};

  if (!email || typeof email !== 'string' || !email.trim()) {
    errors.email = 'Email address is required.';
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.email = 'Please provide a valid email address format.';
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
  const { name, email, password, role, companyName, inviteCode } = req.body || {};
  const errors = {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    errors.name = 'Full name is required.';
  }

  if (!email || typeof email !== 'string' || !email.trim()) {
    errors.email = 'Email address is required.';
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.email = 'Please provide a valid work email format.';
  }

  if (!password || typeof password !== 'string') {
    errors.password = 'Password is required.';
  } else if (!PASSWORD_REGEX.test(password)) {
    errors.password = 'Password must be at least 8 characters long and contain both letters and numbers.';
  }

  const requestedRole = role || 'SALES_REP';

  if (!ALL_ROLES.includes(requestedRole)) {
    errors.role = `Invalid role specified. Allowed: ${ALL_ROLES.join(', ')}`;
  } else if (!ALLOWED_PUBLIC_ROLES.includes(requestedRole)) {
    // Restricted roles (ADMIN, FINANCE, SALES_MANAGER) require an internal admin invitation code for signup
    const validInviteCode = process.env.INTERNAL_INVITE_CODE || 'DEMO_INTERNAL_2026';
    if (inviteCode !== validInviteCode) {
      errors.role = `Direct public registration as ${requestedRole} is restricted. Provide a valid internal invite code or register as SALES_REP or CUSTOMER.`;
    }
  }

  if (requestedRole === 'CUSTOMER' && (!companyName || typeof companyName !== 'string' || !companyName.trim())) {
    errors.companyName = 'Customer organization / company name is required for customer accounts.';
  }

  if (Object.keys(errors).length > 0) {
    return next(new ApiError('Validation error', 400, 'VALIDATION_ERROR', errors));
  }

  next();
}

module.exports = {
  validateLoginInput,
  validateSignupInput,
  ALLOWED_PUBLIC_ROLES,
  ALL_ROLES,
};
