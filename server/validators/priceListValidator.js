const { ApiError } = require('../utils/apiResponse');

const VALID_TIERS = ['BRONZE', 'SILVER', 'GOLD'];

function validateCreatePriceList(body) {
  const { name, customerTier, currency, pricingRule, effectiveFrom, effectiveTo } = body;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    throw new ApiError('Price list name must be at least 2 characters long.', 400, 'VALIDATION_ERROR');
  }

  if (!customerTier || !VALID_TIERS.includes(customerTier.toUpperCase())) {
    throw new ApiError(`Customer tier must be one of: ${VALID_TIERS.join(', ')}`, 400, 'VALIDATION_ERROR');
  }

  const cleanCurrency = currency ? currency.trim().toUpperCase() : 'USD';
  if (cleanCurrency.length !== 3) {
    throw new ApiError('Currency must be a 3-letter ISO code (e.g. USD, EUR, INR).', 400, 'VALIDATION_ERROR');
  }

  let fromDate = null;
  let toDate = null;

  if (effectiveFrom) {
    fromDate = new Date(effectiveFrom);
    if (isNaN(fromDate.getTime())) {
      throw new ApiError('Invalid effectiveFrom date format.', 400, 'VALIDATION_ERROR');
    }
  }

  if (effectiveTo) {
    toDate = new Date(effectiveTo);
    if (isNaN(toDate.getTime())) {
      throw new ApiError('Invalid effectiveTo date format.', 400, 'VALIDATION_ERROR');
    }
    if (fromDate && toDate < fromDate) {
      throw new ApiError('effectiveTo date cannot be earlier than effectiveFrom date.', 400, 'VALIDATION_ERROR');
    }
  }

  return {
    name: name.trim(),
    customerTier: customerTier.toUpperCase(),
    currency: cleanCurrency,
    pricingRule: pricingRule ? pricingRule.trim() : null,
    effectiveFrom: fromDate,
    effectiveTo: toDate,
  };
}

function validateUpdatePriceList(body) {
  const updates = {};
  const { name, customerTier, currency, pricingRule, isActive, effectiveFrom, effectiveTo } = body;

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length < 2) {
      throw new ApiError('Price list name must be at least 2 characters long.', 400, 'VALIDATION_ERROR');
    }
    updates.name = name.trim();
  }

  if (customerTier !== undefined) {
    if (!VALID_TIERS.includes(customerTier.toUpperCase())) {
      throw new ApiError(`Customer tier must be one of: ${VALID_TIERS.join(', ')}`, 400, 'VALIDATION_ERROR');
    }
    updates.customerTier = customerTier.toUpperCase();
  }

  if (currency !== undefined) {
    const cleanCurrency = currency.trim().toUpperCase();
    if (cleanCurrency.length !== 3) {
      throw new ApiError('Currency must be a 3-letter ISO code.', 400, 'VALIDATION_ERROR');
    }
    updates.currency = cleanCurrency;
  }

  if (pricingRule !== undefined) {
    updates.pricingRule = pricingRule ? pricingRule.trim() : null;
  }

  if (isActive !== undefined) {
    updates.isActive = Boolean(isActive);
  }

  if (effectiveFrom !== undefined) {
    if (effectiveFrom === null) {
      updates.effectiveFrom = null;
    } else {
      const fromDate = new Date(effectiveFrom);
      if (isNaN(fromDate.getTime())) throw new ApiError('Invalid effectiveFrom date.', 400, 'VALIDATION_ERROR');
      updates.effectiveFrom = fromDate;
    }
  }

  if (effectiveTo !== undefined) {
    if (effectiveTo === null) {
      updates.effectiveTo = null;
    } else {
      const toDate = new Date(effectiveTo);
      if (isNaN(toDate.getTime())) throw new ApiError('Invalid effectiveTo date.', 400, 'VALIDATION_ERROR');
      updates.effectiveTo = toDate;
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError('At least one field must be provided to update price list.', 400, 'VALIDATION_ERROR');
  }

  return updates;
}

function validateCreatePriceListItem(body) {
  const { productId, variantId, unitPrice, minimumQuantity, effectiveFrom, effectiveTo } = body;

  if (!productId || typeof productId !== 'string') {
    throw new ApiError('Product ID is required for price list item.', 400, 'VALIDATION_ERROR');
  }

  const numPrice = Number(unitPrice);
  if (isNaN(numPrice) || numPrice < 0) {
    throw new ApiError('Unit price must be a non-negative number.', 400, 'VALIDATION_ERROR');
  }

  const numQty = minimumQuantity !== undefined ? parseInt(minimumQuantity, 10) : 1;
  if (isNaN(numQty) || numQty < 1) {
    throw new ApiError('Minimum quantity must be at least 1.', 400, 'VALIDATION_ERROR');
  }

  return {
    productId: productId.trim(),
    variantId: variantId ? variantId.trim() : null,
    unitPrice: numPrice,
    minimumQuantity: numQty,
    effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : null,
    effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
  };
}

function validateUpdatePriceListItem(body) {
  const updates = {};
  const { unitPrice, minimumQuantity, effectiveFrom, effectiveTo } = body;

  if (unitPrice !== undefined) {
    const num = Number(unitPrice);
    if (isNaN(num) || num < 0) throw new ApiError('Unit price must be a non-negative number.', 400, 'VALIDATION_ERROR');
    updates.unitPrice = num;
  }

  if (minimumQuantity !== undefined) {
    const qty = parseInt(minimumQuantity, 10);
    if (isNaN(qty) || qty < 1) throw new ApiError('Minimum quantity must be at least 1.', 400, 'VALIDATION_ERROR');
    updates.minimumQuantity = qty;
  }

  if (effectiveFrom !== undefined) {
    updates.effectiveFrom = effectiveFrom ? new Date(effectiveFrom) : null;
  }

  if (effectiveTo !== undefined) {
    updates.effectiveTo = effectiveTo ? new Date(effectiveTo) : null;
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError('At least one field must be provided to update item.', 400, 'VALIDATION_ERROR');
  }

  return updates;
}

module.exports = {
  validateCreatePriceList,
  validateUpdatePriceList,
  validateCreatePriceListItem,
  validateUpdatePriceListItem,
};
