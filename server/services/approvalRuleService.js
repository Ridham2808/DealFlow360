const approvalRuleRepository = require('../repositories/approvalRuleRepository');
const discountRepository = require('../repositories/discountRepository');
const auditService = require('./auditService');
const { ApiError } = require('../utils/apiResponse');
const { calculateBlendedRisk, determineRequiredApprovalChain } = require('./riskScoreService');

const ALLOWED_APPROVAL_ROLES = ['SALES_REP', 'SALES_MANAGER', 'FINANCE', 'ADMIN'];

class ApprovalRuleService {
  async listRules() {
    return approvalRuleRepository.findAll();
  }

  async updateRule(id, updates, actorId) {
    const existing = await approvalRuleRepository.findById(id);
    if (!existing) {
      throw new ApiError('Approval chain rule not found.', 404, 'APPROVAL_RULE_NOT_FOUND');
    }

    // 1. Cross-validate min and max overage
    const finalMin = updates.minimumOverage !== undefined ? Number(updates.minimumOverage) : Number(existing.minimumOverage);
    const finalMax = updates.maximumOverage !== undefined ? Number(updates.maximumOverage) : Number(existing.maximumOverage);

    if (isNaN(finalMin) || finalMin < 0) {
      throw new ApiError('Minimum overage must be a non-negative number.', 400, 'VALIDATION_ERROR');
    }
    if (isNaN(finalMax) || finalMax < 0) {
      throw new ApiError('Maximum overage must be a non-negative number.', 400, 'VALIDATION_ERROR');
    }
    if (finalMax < finalMin) {
      throw new ApiError('Maximum overage cannot be less than minimum overage.', 400, 'VALIDATION_ERROR');
    }

    // 2. Validate Role
    const finalRole = updates.requiredRole || existing.requiredRole;
    if (!ALLOWED_APPROVAL_ROLES.includes(finalRole)) {
      throw new ApiError(
        `Invalid required role '${finalRole}'. Allowed roles: ${ALLOWED_APPROVAL_ROLES.join(', ')}`,
        400,
        'INVALID_ROLE'
      );
    }

    // 3. Validate orderIndex
    if (updates.orderIndex !== undefined) {
      const order = Number(updates.orderIndex);
      if (!Number.isInteger(order) || order < 1) {
        throw new ApiError('Order index must be a positive integer.', 400, 'VALIDATION_ERROR');
      }
    }

    // 4. Overlap & Contradiction Safeguard across all active rules
    const allRules = (await approvalRuleRepository.findAll()) || [];
    const otherActiveRules = Array.isArray(allRules) ? allRules.filter((r) => r.id !== id && r.isActive !== false) : [];

    for (const other of otherActiveRules) {
      const oMin = Number(other.minimumOverage);
      const oMax = Number(other.maximumOverage);
      // Disallow exact identical duplicate intervals
      if (oMin === finalMin && oMax === finalMax && other.requiredRole === finalRole) {
        throw new ApiError(
          `Contradictory configuration: identical active rule interval [${finalMin}%, ${finalMax}%] already exists for role '${finalRole}'.`,
          400,
          'DUPLICATE_RULE_INTERVAL'
        );
      }
    }

    const updated = await approvalRuleRepository.update(id, updates);

    if (actorId) {
      auditService.log({
        actorId,
        action: 'UPDATED_APPROVAL_CHAIN_RULE',
        targetId: id,
        targetType: 'ApprovalChainRule',
        reasonNote: `Approval rule for ${existing.requiredRole} (order ${existing.orderIndex}) updated.`,
        meta: {
          before: { min: existing.minimumOverage, max: existing.maximumOverage, role: existing.requiredRole, order: existing.orderIndex },
          after: { min: updated.minimumOverage, max: updated.maximumOverage, role: updated.requiredRole, order: updated.orderIndex },
        },
      });
    }

    return updated;
  }

  /**
   * Preview how a sample quotation or risk result routes through the active approval chain
   * without persisting or mutating any records.
   *
   * @param {Object} payload Sample data: { lines, customerTier } or { worstLineOverage, weightedOverage }
   * @returns {Promise<Object>} Evaluated risk and simulated approval chain
   */
  async previewRouting(payload = {}) {
    const { lines = [], customerTier = 'GOLD', worstLineOverage, weightedOverage } = payload;

    const [discountTiers, categoryCeilings, approvalRules] = await Promise.all([
      discountRepository.findAllTiers(),
      discountRepository.findAllCeilings(),
      approvalRuleRepository.findAll(),
    ]);

    let riskResult;
    if (lines.length > 0) {
      riskResult = calculateBlendedRisk(lines, customerTier, {
        discountTiers,
        categoryCeilings,
      });
    } else {
      // Direct sample overage simulation
      const worst = Number(worstLineOverage || 0);
      const weighted = Number(weightedOverage || 0);
      const score = Math.min(100, Math.round(worst * 4 + weighted * 3));
      let riskLevel = 'NONE';
      if (worst > 10 || score >= 60) riskLevel = 'HIGH';
      else if (worst > 0 || score >= 20) riskLevel = 'MEDIUM';
      else if (score > 0) riskLevel = 'LOW';

      riskResult = {
        score,
        riskLevel,
        anyLineOverLimit: worst > 0,
        worstLineOverage: worst,
        weightedOverage: weighted,
        totalDiscountedValue: 0,
        marginFloorViolation: false,
        requiredApprovalChain: [],
        flaggedLines: [],
      };
    }

    const requiredApprovalChain = determineRequiredApprovalChain(riskResult, approvalRules);

    return {
      riskResult,
      requiredApprovalChain,
      simulatedAt: new Date().toISOString(),
    };
  }
}

module.exports = new ApprovalRuleService();
