const { ApiError } = require('../utils/apiResponse');

/**
 * Validate product creation payload.
 */
function validateCreateProduct(body) {
  const { name, sku, category, basePrice, baseCost, unit, taxPercent, description, isRecurringEligible } = body;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    throw new ApiError('Product name must be at least 2 characters long.', 400, 'VALIDATION_ERROR');
  }

  if (!sku || typeof sku !== 'string' || !/^[A-Za-z0-9-_]{3,50}$/.test(sku.trim())) {
    throw new ApiError('SKU must be 3-50 characters alphanumeric with hyphens or underscores.', 400, 'VALIDATION_ERROR');
  }

  const ALLOWED_CATEGORIES = ['HARDWARE', 'SERVICES', 'SUBSCRIPTION'];
  const normCategory = (category || '').trim().toUpperCase();
  if (!normCategory || !ALLOWED_CATEGORIES.includes(normCategory)) {
    throw new ApiError('Product category must be exactly HARDWARE, SERVICES, or SUBSCRIPTION.', 400, 'VALIDATION_ERROR');
  }

  const numBasePrice = Number(basePrice);
  if (isNaN(numBasePrice) || numBasePrice < 0) {
    throw new ApiError('Base price must be a valid non-negative number.', 400, 'VALIDATION_ERROR');
  }

  const numBaseCost = baseCost !== undefined ? Number(baseCost) : 0;
  if (isNaN(numBaseCost) || numBaseCost < 0) {
    throw new ApiError('Base cost must be a valid non-negative number.', 400, 'VALIDATION_ERROR');
  }

  let numTax = 0;
  if (taxPercent !== undefined) {
    numTax = Number(taxPercent);
    if (isNaN(numTax) || numTax < 0 || numTax > 100) {
      throw new ApiError('Tax percent must be between 0 and 100.', 400, 'VALIDATION_ERROR');
    }
  }

  return {
    name: name.trim(),
    sku: sku.trim().toUpperCase(),
    category: category.trim(),
    basePrice: numBasePrice,
    baseCost: numBaseCost,
    unit: unit ? unit.trim().toUpperCase() : 'UNIT',
    taxPercent: numTax,
    description: description ? description.trim() : null,
    isRecurringEligible: Boolean(isRecurringEligible),
  };
}

/**
 * Validate product update payload.
 */
function validateUpdateProduct(body) {
  const updates = {};
  const { name, sku, category, basePrice, baseCost, unit, taxPercent, description, isRecurringEligible, isActive } = body;

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length < 2) {
      throw new ApiError('Product name must be at least 2 characters long.', 400, 'VALIDATION_ERROR');
    }
    updates.name = name.trim();
  }

  if (sku !== undefined) {
    if (typeof sku !== 'string' || !/^[A-Za-z0-9-_]{3,50}$/.test(sku.trim())) {
      throw new ApiError('SKU must be 3-50 characters alphanumeric with hyphens or underscores.', 400, 'VALIDATION_ERROR');
    }
    updates.sku = sku.trim().toUpperCase();
  }

  if (category !== undefined) {
    const ALLOWED_CATEGORIES = ['HARDWARE', 'SERVICES', 'SUBSCRIPTION'];
    const normCategory = (category || '').trim().toUpperCase();
    if (!ALLOWED_CATEGORIES.includes(normCategory)) {
      throw new ApiError('Product category must be exactly HARDWARE, SERVICES, or SUBSCRIPTION.', 400, 'VALIDATION_ERROR');
    }
    updates.category = normCategory;
  }

  if (basePrice !== undefined) {
    const num = Number(basePrice);
    if (isNaN(num) || num < 0) {
      throw new ApiError('Base price must be a non-negative number.', 400, 'VALIDATION_ERROR');
    }
    updates.basePrice = num;
  }

  if (baseCost !== undefined) {
    const num = Number(baseCost);
    if (isNaN(num) || num < 0) {
      throw new ApiError('Base cost must be a non-negative number.', 400, 'VALIDATION_ERROR');
    }
    updates.baseCost = num;
  }

  if (unit !== undefined) {
    updates.unit = unit.trim().toUpperCase();
  }

  if (taxPercent !== undefined) {
    const num = Number(taxPercent);
    if (isNaN(num) || num < 0 || num > 100) {
      throw new ApiError('Tax percent must be between 0 and 100.', 400, 'VALIDATION_ERROR');
    }
    updates.taxPercent = num;
  }

  if (description !== undefined) {
    updates.description = description ? description.trim() : null;
  }

  if (isRecurringEligible !== undefined) {
    updates.isRecurringEligible = Boolean(isRecurringEligible);
  }

  if (isActive !== undefined) {
    updates.isActive = Boolean(isActive);
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError('At least one field must be provided to update product.', 400, 'VALIDATION_ERROR');
  }

  return updates;
}

/**
 * Validate product variant payload.
 */
function validateCreateVariant(body) {
  const { attributeName, attributeValue, extraPrice, skuSuffix } = body;

  if (!attributeName || typeof attributeName !== 'string' || attributeName.trim().length < 1) {
    throw new ApiError('Attribute name (e.g. Color, RAM, Storage) is required.', 400, 'VALIDATION_ERROR');
  }

  if (!attributeValue || typeof attributeValue !== 'string' || attributeValue.trim().length < 1) {
    throw new ApiError('Attribute value (e.g. 16GB, Space Gray) is required.', 400, 'VALIDATION_ERROR');
  }

  if (!skuSuffix || typeof skuSuffix !== 'string' || !/^[A-Za-z0-9-_]{1,20}$/.test(skuSuffix.trim())) {
    throw new ApiError('SKU suffix is required and must be alphanumeric with hyphens or underscores.', 400, 'VALIDATION_ERROR');
  }

  const numExtra = extraPrice !== undefined ? Number(extraPrice) : 0;
  if (isNaN(numExtra) || numExtra < 0) {
    throw new ApiError('Extra price must be a valid non-negative number.', 400, 'VALIDATION_ERROR');
  }

  return {
    attributeName: attributeName.trim(),
    attributeValue: attributeValue.trim(),
    skuSuffix: skuSuffix.trim().toUpperCase(),
    extraPrice: numExtra,
  };
}

function validateUpdateVariant(body) {
  const updates = {};
  const { attributeName, attributeValue, extraPrice, skuSuffix, isActive } = body;

  if (attributeName !== undefined) {
    if (typeof attributeName !== 'string' || attributeName.trim().length < 1) {
      throw new ApiError('Attribute name cannot be empty.', 400, 'VALIDATION_ERROR');
    }
    updates.attributeName = attributeName.trim();
  }

  if (attributeValue !== undefined) {
    if (typeof attributeValue !== 'string' || attributeValue.trim().length < 1) {
      throw new ApiError('Attribute value cannot be empty.', 400, 'VALIDATION_ERROR');
    }
    updates.attributeValue = attributeValue.trim();
  }

  if (skuSuffix !== undefined) {
    if (typeof skuSuffix !== 'string' || !/^[A-Za-z0-9-_]{1,20}$/.test(skuSuffix.trim())) {
      throw new ApiError('SKU suffix must be alphanumeric with hyphens or underscores.', 400, 'VALIDATION_ERROR');
    }
    updates.skuSuffix = skuSuffix.trim().toUpperCase();
  }

  if (extraPrice !== undefined) {
    const num = Number(extraPrice);
    if (isNaN(num) || num < 0) {
      throw new ApiError('Extra price must be a valid non-negative number.', 400, 'VALIDATION_ERROR');
    }
    updates.extraPrice = num;
  }

  if (isActive !== undefined) {
    updates.isActive = Boolean(isActive);
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError('At least one field must be provided to update variant.', 400, 'VALIDATION_ERROR');
  }

  return updates;
}

module.exports = {
  validateCreateProduct,
  validateUpdateProduct,
  validateCreateVariant,
  validateUpdateVariant,
};
