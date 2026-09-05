const { ApiError } = require('../utils/apiResponse');

function validateCreateWarehouse(body) {
  const { name, location, shippingCostWeight } = body;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    throw new ApiError('Warehouse name must be at least 2 characters long.', 400, 'VALIDATION_ERROR');
  }

  if (!location || typeof location !== 'string' || location.trim().length < 2) {
    throw new ApiError('Warehouse location is required.', 400, 'VALIDATION_ERROR');
  }

  let numWeight = 1.0;
  if (shippingCostWeight !== undefined) {
    numWeight = Number(shippingCostWeight);
    if (isNaN(numWeight) || numWeight <= 0) {
      throw new ApiError('Shipping cost weight must be a positive number.', 400, 'VALIDATION_ERROR');
    }
  }

  return {
    name: name.trim(),
    location: location.trim(),
    shippingCostWeight: numWeight,
  };
}

function validateUpdateWarehouse(body) {
  const updates = {};
  const { name, location, shippingCostWeight, isActive } = body;

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length < 2) {
      throw new ApiError('Warehouse name must be at least 2 characters long.', 400, 'VALIDATION_ERROR');
    }
    updates.name = name.trim();
  }

  if (location !== undefined) {
    if (typeof location !== 'string' || location.trim().length < 2) {
      throw new ApiError('Warehouse location cannot be empty.', 400, 'VALIDATION_ERROR');
    }
    updates.location = location.trim();
  }

  if (shippingCostWeight !== undefined) {
    const numWeight = Number(shippingCostWeight);
    if (isNaN(numWeight) || numWeight <= 0) {
      throw new ApiError('Shipping cost weight must be a positive number.', 400, 'VALIDATION_ERROR');
    }
    updates.shippingCostWeight = numWeight;
  }

  if (isActive !== undefined) {
    updates.isActive = Boolean(isActive);
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError('At least one field must be provided to update warehouse.', 400, 'VALIDATION_ERROR');
  }

  return updates;
}

function validateUpdateStock(body) {
  const updates = {};
  const { quantityOnHand, reserved, replenishmentThreshold } = body;

  if (quantityOnHand !== undefined) {
    const qty = parseInt(quantityOnHand, 10);
    if (isNaN(qty) || qty < 0) {
      throw new ApiError('Quantity on hand must be a non-negative integer.', 400, 'VALIDATION_ERROR');
    }
    updates.quantityOnHand = qty;
  }

  if (reserved !== undefined) {
    const res = parseInt(reserved, 10);
    if (isNaN(res) || res < 0) {
      throw new ApiError('Reserved quantity must be a non-negative integer.', 400, 'VALIDATION_ERROR');
    }
    updates.reserved = res;
  }

  if (replenishmentThreshold !== undefined) {
    const threshold = parseInt(replenishmentThreshold, 10);
    if (isNaN(threshold) || threshold < 0) {
      throw new ApiError('Replenishment threshold must be a non-negative integer.', 400, 'VALIDATION_ERROR');
    }
    updates.replenishmentThreshold = threshold;
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError('At least one field must be provided to update stock level.', 400, 'VALIDATION_ERROR');
  }

  return updates;
}

module.exports = {
  validateCreateWarehouse,
  validateUpdateWarehouse,
  validateUpdateStock,
};
