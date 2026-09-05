const { ApiError } = require('../utils/apiResponse');

function validateUpdateDiscountTier(body) {
  const updates = {};
  const { maxDiscountPercent, isActive } = body;

  if (maxDiscountPercent !== undefined) {
    const num = Number(maxDiscountPercent);
    if (isNaN(num) || num < 0 || num > 100) {
      throw new ApiError('Max discount percent must be a number between 0 and 100.', 400, 'VALIDATION_ERROR');
    }
    updates.maxDiscountPercent = num;
  }

  if (isActive !== undefined) {
    updates.isActive = Boolean(isActive);
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError('At least one field must be provided to update discount tier.', 400, 'VALIDATION_ERROR');
  }

  return updates;
}

function validateUpdateCategoryCeiling(body) {
  const updates = {};
  const { maxDiscountPercent, isActive } = body;

  if (maxDiscountPercent !== undefined) {
    const num = Number(maxDiscountPercent);
    if (isNaN(num) || num < 0 || num > 100) {
      throw new ApiError('Max discount percent must be a number between 0 and 100.', 400, 'VALIDATION_ERROR');
    }
    updates.maxDiscountPercent = num;
  }

  if (isActive !== undefined) {
    updates.isActive = Boolean(isActive);
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError('At least one field must be provided to update category ceiling.', 400, 'VALIDATION_ERROR');
  }

  return updates;
}

module.exports = {
  validateUpdateDiscountTier,
  validateUpdateCategoryCeiling,
};
