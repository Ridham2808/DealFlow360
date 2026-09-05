/**
 * DealFlow360 — Pure Discount Risk Engine
 * Deterministic, DB-free risk scoring and approval routing calculations.
 */

class ConfigError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'ConfigError';
    this.code = 'CONFIG_ERROR';
    this.statusCode = 400;
    this.details = details;
  }
}

/**
 * Standardize numeric values with deterministic decimal precision (2 decimal places)
 */
function round2(num) {
  return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
}

/**
 * Calculate single line risk against customer tier and product category ceilings.
 * Stricter limit applies (min of customerTierLimit and categoryLimit).
 *
 * @param {Object} line Quotation line item
 * @param {string} customerTier Customer tier (BRONZE, SILVER, GOLD, etc.)
 * @param {Object} discountRules { discountTiers: Array, categoryCeilings: Array }
 * @returns {Object} Line risk evaluation
 */
function calculateLineRisk(line, customerTier, discountRules) {
  if (!discountRules || !Array.isArray(discountRules.discountTiers) || !Array.isArray(discountRules.categoryCeilings)) {
    throw new ConfigError('Invalid discount rules configuration provided.', { customerTier });
  }

  // 1. Resolve Customer Tier Limit
  const tierRule = discountRules.discountTiers.find(
    (t) => t.customerTier === customerTier && (t.isActive === undefined || t.isActive === true)
  );
  if (!tierRule) {
    throw new ConfigError(`Missing discount tier ceiling rule for customer tier '${customerTier}'.`, {
      customerTier,
      availableTiers: discountRules.discountTiers.map((t) => t.customerTier),
    });
  }
  const customerTierLimit = round2(Number(tierRule.maxDiscountPercent));

  // 2. Resolve Product Category Limit
  const categoryName = line.category || line.categorySnapshot || 'Uncategorized';
  const categoryRule = discountRules.categoryCeilings.find(
    (c) => c.category?.toLowerCase() === categoryName.toLowerCase() && (c.isActive === undefined || c.isActive === true)
  );
  if (!categoryRule) {
    throw new ConfigError(`Missing category discount ceiling rule for category '${categoryName}'.`, {
      category: categoryName,
      availableCategories: discountRules.categoryCeilings.map((c) => c.category),
    });
  }
  const categoryLimit = round2(Number(categoryRule.maxDiscountPercent));

  // 3. Stricter Limit Wins
  const effectiveLimit = Math.min(customerTierLimit, categoryLimit);
  const discountGiven = round2(Number(line.discountPercent || 0));
  const overBy = Math.max(0, round2(discountGiven - effectiveLimit));
  const isFlagged = overBy > 0;

  // 4. Determine Line Values & Margins
  const quantity = Number(line.quantity || 1);
  const unitPrice = Number(line.unitPrice || 0);
  const unitCost = Number(line.unitCost || 0);
  const lineSubtotal = round2(quantity * unitPrice);
  const lineDiscountAmount = round2(lineSubtotal * (discountGiven / 100));
  const lineNet = round2(lineSubtotal - lineDiscountAmount);
  const lineTotalCost = round2(quantity * unitCost);
  const lineMargin = round2(lineNet - lineTotalCost);
  const lineMarginPercent = lineNet > 0 ? round2((lineMargin / lineNet) * 100) : 0;

  let reason = 'Discount within compliant limits';
  if (isFlagged) {
    const stricterAuthority = categoryLimit < customerTierLimit
      ? `product category ceiling (${categoryLimit}%)`
      : categoryLimit > customerTierLimit
        ? `customer tier ceiling (${customerTierLimit}%)`
        : `shared category and tier ceiling (${effectiveLimit}%)`;
    reason = `Discount of ${discountGiven}% exceeds ${stricterAuthority} by ${overBy} percentage points.`;
  }

  return {
    lineId: line.id || line.lineId || 'unknown',
    productName: line.productName || line.productNameSnapshot || line.product?.name || 'Item',
    category: categoryName,
    discountGiven,
    customerTierLimit,
    categoryLimit,
    effectiveLimit,
    overBy,
    isFlagged,
    lineSubtotal,
    lineDiscountAmount,
    lineMargin,
    lineMarginPercent,
    reason,
  };
}

/**
 * Calculate blended risk across all quotation lines with weighted aggregation and margin sensitivity.
 *
 * @param {Array} quotationLines Array of quote lines
 * @param {string} customerTier Customer tier (BRONZE, SILVER, GOLD)
 * @param {Object} discountRules { discountTiers, categoryCeilings }
 * @param {Object} [options] Custom rule weights and floor configurations
 * @returns {Object} Blended risk assessment result
 */
function calculateBlendedRisk(quotationLines = [], customerTier, discountRules, options = {}) {
  const {
    marginFloorPercent = 15.0,     // Default margin floor minimum
    singleLineWeight = 4.0,        // Sensitivity to worst single line overage
    weightedOverageWeight = 3.0,   // Sensitivity to overall volume-weighted overage
    multiLineAccumulator = 5.0,    // Penalty for multiple overages spread across lines
    marginFloorPenalty = 35.0,     // Penalty for dipping below acceptable margin floor
  } = options;

  if (!quotationLines || quotationLines.length === 0) {
    return {
      score: 0,
      riskLevel: 'NONE',
      anyLineOverLimit: false,
      worstLineOverage: 0,
      weightedOverage: 0,
      totalDiscountedValue: 0,
      marginFloorViolation: false,
      requiredApprovalChain: [],
      flaggedLines: [],
    };
  }

  let totalSubtotal = 0;
  let totalWeightedOverageSum = 0;
  let totalDiscountedValue = 0;
  let totalNetRevenue = 0;
  let totalCost = 0;
  let worstLineOverage = 0;
  const evaluatedLines = [];
  const flaggedLines = [];

  for (const line of quotationLines) {
    const evaluated = calculateLineRisk(line, customerTier, discountRules);
    evaluatedLines.push(evaluated);

    totalSubtotal += evaluated.lineSubtotal;
    totalDiscountedValue += evaluated.lineDiscountAmount;
    totalNetRevenue += (evaluated.lineSubtotal - evaluated.lineDiscountAmount);
    totalCost += (Number(line.quantity || 1) * Number(line.unitCost || 0));

    if (evaluated.overBy > worstLineOverage) {
      worstLineOverage = evaluated.overBy;
    }

    if (evaluated.isFlagged) {
      flaggedLines.push(evaluated);
    }
  }

  // Calculate volume-weighted overage across total quote value
  for (const evaluated of evaluatedLines) {
    const weightFraction = totalSubtotal > 0 ? evaluated.lineSubtotal / totalSubtotal : 0;
    totalWeightedOverageSum += (evaluated.overBy * weightFraction);
    // Relative contribution to the quote's risk
    evaluated.contribution = round2(evaluated.overBy * weightFraction);
  }

  const weightedOverage = round2(totalWeightedOverageSum);
  worstLineOverage = round2(worstLineOverage);
  totalDiscountedValue = round2(totalDiscountedValue);

  // Overall margin check
  const overallMargin = totalNetRevenue - totalCost;
  const overallMarginPercent = totalNetRevenue > 0 ? round2((overallMargin / totalNetRevenue) * 100) : 0;
  const anyLineMarginFloorBreach = evaluatedLines.some(
    (l) => l.lineMarginPercent < marginFloorPercent && l.discountGiven > 0
  );
  const marginFloorViolation = overallMarginPercent < marginFloorPercent || anyLineMarginFloorBreach;

  // Composite Blended Score Calculation
  const anyLineOverLimit = flaggedLines.length > 0;
  let rawScore = 0;

  if (anyLineOverLimit || marginFloorViolation) {
    // 1. Worst line component
    rawScore += worstLineOverage * singleLineWeight;
    // 2. Weighted aggregate overage component
    rawScore += weightedOverage * weightedOverageWeight;
    // 3. Multi-line aggregation component (several lines over by 2-3 points accumulate!)
    if (flaggedLines.length > 1) {
      rawScore += (flaggedLines.length - 1) * multiLineAccumulator;
    }
    // 4. Margin floor violation component
    if (marginFloorViolation) {
      rawScore += marginFloorPenalty;
    }
  }

  // Bound score to 0 - 100
  const score = round2(Math.min(100, Math.max(0, rawScore)));

  // Determine Risk Level: NONE | LOW | MEDIUM | HIGH
  let riskLevel = 'NONE';
  if (anyLineOverLimit || marginFloorViolation || score > 0) {
    if (worstLineOverage > 10 || score >= 60 || (marginFloorViolation && score >= 40)) {
      riskLevel = 'HIGH';
    } else if (worstLineOverage > 0 || score >= 20 || flaggedLines.length >= 2) {
      riskLevel = 'MEDIUM';
    } else {
      riskLevel = 'LOW';
    }
  }

  return {
    score,
    riskLevel,
    anyLineOverLimit,
    worstLineOverage,
    weightedOverage,
    totalDiscountedValue,
    marginFloorViolation,
    requiredApprovalChain: [], // populating via determineRequiredApprovalChain
    flaggedLines: flaggedLines.map((f) => ({
      lineId: f.lineId,
      productName: f.productName,
      category: f.category,
      discountGiven: f.discountGiven,
      customerTierLimit: f.customerTierLimit,
      categoryLimit: f.categoryLimit,
      effectiveLimit: f.effectiveLimit,
      overBy: f.overBy,
      contribution: f.contribution,
      reason: f.reason,
    })),
  };
}

/**
 * Determine required ordered approval chain based on evaluated risk and active approval chain rules.
 * Enforces sequential role escalation (e.g. Sales Manager before Finance).
 *
 * @param {Object} riskResult Result from calculateBlendedRisk
 * @param {Array} approvalChainRules Active approval chain rules sorted from DB
 * @returns {Array} Ordered approval chain steps
 */
function determineRequiredApprovalChain(riskResult, approvalChainRules = []) {
  if (!riskResult || (riskResult.riskLevel === 'NONE' && !riskResult.anyLineOverLimit)) {
    riskResult.requiredApprovalChain = [];
    return [];
  }

  // Active rules sorted by orderIndex
  const activeRules = approvalChainRules
    .filter((r) => r.isActive !== false)
    .sort((a, b) => (Number(a.orderIndex) || 0) - (Number(b.orderIndex) || 0));

  if (activeRules.length === 0) {
    riskResult.requiredApprovalChain = [];
    return [];
  }

  const overageToCheck = Math.max(riskResult.worstLineOverage, riskResult.weightedOverage);

  // Find the highest escalation rule triggered
  let highestTriggeredRule = null;
  for (const rule of activeRules) {
    const minOverage = Number(rule.minimumOverage);
    const maxOverage = Number(rule.maximumOverage);

    // Rule matches if overage is in [min, max], or if overage exceeds min and rule is maximum bracket
    if (overageToCheck >= minOverage && (overageToCheck <= maxOverage || maxOverage >= 100)) {
      highestTriggeredRule = rule;
    }
  }

  // If no specific bracket triggered but quote is flagged or margin violated, default to manager approval
  if (!highestTriggeredRule && (riskResult.anyLineOverLimit || riskResult.marginFloorViolation)) {
    highestTriggeredRule = activeRules.find((r) => r.requiredRole === 'SALES_MANAGER') || activeRules[0];
  }

  if (!highestTriggeredRule || highestTriggeredRule.requiredRole === 'SALES_REP') {
    // No escalation beyond rep needed
    riskResult.requiredApprovalChain = [];
    return [];
  }

  // Sequential chain: include all rules up to highestTriggeredRule.orderIndex
  // (e.g. if Finance at orderIndex 3 is triggered, Sales Manager at orderIndex 2 is included before Finance)
  const requiredRules = activeRules.filter(
    (r) =>
      r.requiredRole !== 'SALES_REP' &&
      Number(r.orderIndex) <= Number(highestTriggeredRule.orderIndex)
  );

  // Build sequential step objects with 1-based stepOrder
  const approvalChain = requiredRules.map((r, index) => ({
    stepOrder: index + 1,
    requiredRole: r.requiredRole,
    ruleId: r.id,
    orderIndex: r.orderIndex,
    minimumOverage: Number(r.minimumOverage),
    maximumOverage: Number(r.maximumOverage),
  }));

  riskResult.requiredApprovalChain = approvalChain;
  return approvalChain;
}

module.exports = {
  ConfigError,
  round2,
  calculateLineRisk,
  calculateBlendedRisk,
  determineRequiredApprovalChain,
};
