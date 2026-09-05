const discountRepository = require('../repositories/discountRepository');
const auditService = require('./auditService');
const { ApiError } = require('../utils/apiResponse');

class DiscountService {
  async listTiers() {
    return discountRepository.findAllTiers();
  }

  async updateTier(id, updates, actorId) {
    const existing = await discountRepository.findTierById(id);
    if (!existing) {
      throw new ApiError('Discount tier not found.', 404, 'DISCOUNT_TIER_NOT_FOUND');
    }

    if (updates.maxDiscountPercent !== undefined) {
      const discount = Number(updates.maxDiscountPercent);
      if (isNaN(discount) || discount < 0 || discount > 100) {
        throw new ApiError('Maximum discount percent must be a valid number between 0% and 100%.', 400, 'INVALID_DISCOUNT_PERCENT');
      }
    }

    const updated = await discountRepository.updateTier(id, updates);

    if (actorId) {
      auditService.log({
        actorId,
        action: 'UPDATED_DISCOUNT_TIER',
        targetId: id,
        targetType: 'DiscountTier',
        reasonNote: `Discount tier ${existing.customerTier} maxDiscountPercent changed from ${existing.maxDiscountPercent}% to ${updated.maxDiscountPercent}%.`,
        meta: { tier: existing.customerTier, before: existing.maxDiscountPercent, after: updated.maxDiscountPercent },
      });
    }

    return updated;
  }

  async listCeilings() {
    return discountRepository.findAllCeilings();
  }

  async updateCeiling(id, updates, actorId) {
    const existing = await discountRepository.findCeilingById(id);
    if (!existing) {
      throw new ApiError('Category discount ceiling not found.', 404, 'CATEGORY_CEILING_NOT_FOUND');
    }

    if (updates.maxDiscountPercent !== undefined) {
      const discount = Number(updates.maxDiscountPercent);
      if (isNaN(discount) || discount < 0 || discount > 100) {
        throw new ApiError('Maximum discount percent must be a valid number between 0% and 100%.', 400, 'INVALID_DISCOUNT_PERCENT');
      }
    }

    const updated = await discountRepository.updateCeiling(id, updates);

    if (actorId) {
      auditService.log({
        actorId,
        action: 'UPDATED_CATEGORY_CEILING',
        targetId: id,
        targetType: 'CategoryDiscountCeiling',
        reasonNote: `Category ceiling for '${existing.category}' changed from ${existing.maxDiscountPercent}% to ${updated.maxDiscountPercent}%.`,
        meta: { category: existing.category, before: existing.maxDiscountPercent, after: updated.maxDiscountPercent },
      });
    }

    return updated;
  }
}

module.exports = new DiscountService();
