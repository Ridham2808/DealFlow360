const prisma = require('../prisma/prisma');
const { ApiError } = require('../utils/apiResponse');

/**
 * Days in standard billing cycles
 */
const CYCLE_DAYS = {
  MONTHLY: 30,
  QUARTERLY: 90,
  YEARLY: 365,
};

/**
 * Standardize numeric values with deterministic 2-decimal precision.
 * Avoids floating-point math issues.
 */
function round2(num) {
  return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
}

/**
 * Pure function: Calculate Proration for Subscription Plan Quantity/Tier adjustments.
 *
 * Formula:
 *   quantityDelta = newQty - oldQty
 *   dailyRate = planPrice / totalCycleDays
 *   proration = quantityDelta * dailyRate * daysRemainingInCycle
 *
 * @param {number} oldQty
 * @param {number} newQty
 * @param {number} planPrice - Total plan price for one full cycle
 * @param {string} billingCycle - 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
 * @param {number} daysRemainingInCycle
 * @returns {number} Prorated adjustment amount (positive for upgrade/addition, negative for downgrade/removal)
 */
function calculateProration(oldQty, newQty, planPrice, billingCycle, daysRemainingInCycle) {
  const oQty = parseInt(oldQty, 10);
  const nQty = parseInt(newQty, 10);
  const price = round2(planPrice);
  const cycle = (billingCycle || 'MONTHLY').toUpperCase();
  const days = Math.max(0, parseInt(daysRemainingInCycle, 10) || 0);

  if (isNaN(oQty) || isNaN(nQty) || isNaN(price) || price < 0) {
    throw new Error('Invalid parameters for proration calculation.');
  }

  const totalCycleDays = CYCLE_DAYS[cycle] || 30;
  const effectiveDaysRemaining = Math.min(days, totalCycleDays);
  const quantityDelta = nQty - oQty;

  // Exact daily rate per unit
  const dailyRatePerUnit = price / totalCycleDays;
  const rawProration = quantityDelta * dailyRatePerUnit * effectiveDaysRemaining;

  return round2(rawProration);
}

/**
 * Pure function: Calculate Cancellation Credit upon mid-cycle subscription termination.
 *
 * Formula:
 *   unusedPortion = planPrice * (daysRemainingInCycle / totalCycleDays)
 *   cancellationFee = unusedPortion * (cancellationFeePercent / 100)
 *   credit = max(0, unusedPortion - cancellationFee)
 *
 * @param {number} planPrice
 * @param {number} daysRemainingInCycle
 * @param {string} billingCycle
 * @param {number} [cancellationFeePercent=0]
 * @returns {number} Net credit refunded to customer
 */
function calculateCancellationCredit(planPrice, daysRemainingInCycle, billingCycle, cancellationFeePercent = 0) {
  const price = round2(planPrice);
  const cycle = (billingCycle || 'MONTHLY').toUpperCase();
  const days = Math.max(0, parseInt(daysRemainingInCycle, 10) || 0);
  const feePct = Math.max(0, Math.min(100, Number(cancellationFeePercent) || 0));

  if (isNaN(price) || price < 0) {
    throw new Error('Invalid plan price for cancellation credit.');
  }

  const totalCycleDays = CYCLE_DAYS[cycle] || 30;
  const effectiveDaysRemaining = Math.min(days, totalCycleDays);

  const unusedPortion = price * (effectiveDaysRemaining / totalCycleDays);
  const cancellationFee = unusedPortion * (feePct / 100);
  const netCredit = Math.max(0, unusedPortion - cancellationFee);

  return round2(netCredit);
}

/**
 * Pure function: Validate Plan Change rules (Allowed upgrades/downgrades).
 *
 * @param {Object} currentPlan
 * @param {Object} nextPlan
 * @returns {{ valid: boolean, reason?: string }}
 */
function validatePlanChange(currentPlan, nextPlan) {
  if (!currentPlan || !nextPlan) {
    return { valid: false, reason: 'Current and destination plans are required.' };
  }

  if (currentPlan.id === nextPlan.id) {
    return { valid: false, reason: 'Destination plan is identical to current plan.' };
  }

  if (nextPlan.isActive === false) {
    return { valid: false, reason: 'Destination plan is inactive and cannot be selected.' };
  }

  return { valid: true };
}

/**
 * Subscription Service with Plan Admin CRUD
 */
class SubscriptionService {
  // Expose pure functions
  calculateProration = calculateProration;
  calculateCancellationCredit = calculateCancellationCredit;
  validatePlanChange = validatePlanChange;

  async listPlans() {
    return prisma.subscriptionPlan.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async getPlanById(id) {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id },
    });
    if (!plan) {
      throw new ApiError('Subscription plan not found.', 404, 'PLAN_NOT_FOUND');
    }
    return plan;
  }

  async createPlan(data) {
    const { name, billingCycle, price, prorationRule, cancellationRule, isActive } = data;
    if (!name || !billingCycle || price === undefined) {
      throw new ApiError('Plan name, billingCycle, and price are required.', 400, 'VALIDATION_ERROR');
    }

    const validCycles = ['MONTHLY', 'QUARTERLY', 'YEARLY'];
    const cycle = billingCycle.toUpperCase();
    if (!validCycles.includes(cycle)) {
      throw new ApiError(`Billing cycle must be one of: ${validCycles.join(', ')}`, 400, 'VALIDATION_ERROR');
    }

    const numPrice = round2(price);
    if (numPrice < 0) {
      throw new ApiError('Plan price cannot be negative.', 400, 'VALIDATION_ERROR');
    }

    return prisma.subscriptionPlan.create({
      data: {
        name: name.trim(),
        billingCycle: cycle,
        price: numPrice,
        prorationRule: prorationRule || null,
        cancellationRule: cancellationRule || null,
        isActive: isActive !== false,
      },
    });
  }

  async updatePlan(id, updates) {
    const existing = await prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError('Subscription plan not found.', 404, 'PLAN_NOT_FOUND');
    }

    const data = {};
    if (updates.name !== undefined) data.name = updates.name.trim();
    if (updates.billingCycle !== undefined) {
      const cycle = updates.billingCycle.toUpperCase();
      const validCycles = ['MONTHLY', 'QUARTERLY', 'YEARLY'];
      if (!validCycles.includes(cycle)) {
        throw new ApiError(`Billing cycle must be one of: ${validCycles.join(', ')}`, 400, 'VALIDATION_ERROR');
      }
      data.billingCycle = cycle;
    }
    if (updates.price !== undefined) {
      const numPrice = round2(updates.price);
      if (numPrice < 0) {
        throw new ApiError('Plan price cannot be negative.', 400, 'VALIDATION_ERROR');
      }
      data.price = numPrice;
    }
    if (updates.prorationRule !== undefined) data.prorationRule = updates.prorationRule;
    if (updates.cancellationRule !== undefined) data.cancellationRule = updates.cancellationRule;
    if (updates.isActive !== undefined) data.isActive = Boolean(updates.isActive);

    return prisma.subscriptionPlan.update({
      where: { id },
      data,
    });
  }

  async deletePlan(id) {
    const existing = await prisma.subscriptionPlan.findUnique({
      where: { id },
      include: {
        quotationLines: { select: { id: true }, take: 1 },
      },
    });

    if (!existing) {
      throw new ApiError('Subscription plan not found.', 404, 'PLAN_NOT_FOUND');
    }

    if (existing.quotationLines && existing.quotationLines.length > 0) {
      throw new ApiError(
        'Cannot delete subscription plan that is referenced by active quotation lines. Deactivate the plan instead.',
        409,
        'CONFLICT_ERROR'
      );
    }

    await prisma.subscriptionPlan.delete({ where: { id } });
    return { success: true, message: 'Subscription plan deleted successfully.' };
  }
}

module.exports = new SubscriptionService();
