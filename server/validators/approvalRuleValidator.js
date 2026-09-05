const { ApiError } = require('../utils/apiResponse');

const ALLOWED_APPROVAL_ROLES = ['SALES_MANAGER', 'FINANCE', 'ADMIN'];

function validateUpdateApprovalRule(body) {
  const updates = {};
  const { minimumOverage, maximumOverage, requiredRole, orderIndex, isActive } = body;

  if (minimumOverage !== undefined) {
    const numMin = Number(minimumOverage);
    if (isNaN(numMin) || numMin < 0) {
      throw new ApiError('Minimum overage must be a non-negative number.', 400, 'VALIDATION_ERROR');
    }
    updates.minimumOverage = numMin;
  }

  if (maximumOverage !== undefined) {
    const numMax = Number(maximumOverage);
    if (isNaN(numMax) || numMax < 0) {
      throw new ApiError('Maximum overage must be a non-negative number.', 400, 'VALIDATION_ERROR');
    }
    updates.maximumOverage = numMax;
  }

  if (updates.minimumOverage !== undefined && updates.maximumOverage !== undefined) {
    if (updates.maximumOverage < updates.minimumOverage) {
      throw new ApiError('Maximum overage cannot be less than minimum overage.', 400, 'VALIDATION_ERROR');
    }
  }

  if (requiredRole !== undefined) {
    if (!ALLOWED_APPROVAL_ROLES.includes(requiredRole.toUpperCase())) {
      throw new ApiError(`Required role must be one of: ${ALLOWED_APPROVAL_ROLES.join(', ')}`, 400, 'VALIDATION_ERROR');
    }
    updates.requiredRole = requiredRole.toUpperCase();
  }

  if (orderIndex !== undefined) {
    const numOrder = parseInt(orderIndex, 10);
    if (isNaN(numOrder) || numOrder < 1) {
      throw new ApiError('Order index must be a positive integer.', 400, 'VALIDATION_ERROR');
    }
    updates.orderIndex = numOrder;
  }

  if (isActive !== undefined) {
    updates.isActive = Boolean(isActive);
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError('At least one field must be provided to update approval chain rule.', 400, 'VALIDATION_ERROR');
  }

  return updates;
}

module.exports = {
  validateUpdateApprovalRule,
};
