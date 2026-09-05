const approvalRuleRepository = require('../repositories/approvalRuleRepository');
const auditService = require('./auditService');
const { ApiError } = require('../utils/apiResponse');

class ApprovalRuleService {
  async listRules() {
    return approvalRuleRepository.findAll();
  }

  async updateRule(id, updates, actorId) {
    const existing = await approvalRuleRepository.findById(id);
    if (!existing) {
      throw new ApiError('Approval chain rule not found.', 404, 'APPROVAL_RULE_NOT_FOUND');
    }

    // Cross-validate overage with existing if only one is updated
    const finalMin = updates.minimumOverage !== undefined ? updates.minimumOverage : Number(existing.minimumOverage);
    const finalMax = updates.maximumOverage !== undefined ? updates.maximumOverage : Number(existing.maximumOverage);

    if (finalMax < finalMin) {
      throw new ApiError('Maximum overage cannot be less than minimum overage.', 400, 'VALIDATION_ERROR');
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
          before: { min: existing.minimumOverage, max: existing.maximumOverage, role: existing.requiredRole },
          after: { min: updated.minimumOverage, max: updated.maximumOverage, role: updated.requiredRole },
        },
      });
    }

    return updated;
  }
}

module.exports = new ApprovalRuleService();
