const approvalRuleService = require('../services/approvalRuleService');
const { validateUpdateApprovalRule } = require('../validators/approvalRuleValidator');
const { success } = require('../utils/apiResponse');

class ApprovalRuleController {
  async listRules(req, res, next) {
    try {
      const rules = await approvalRuleService.listRules();
      return res.status(200).json(success(rules));
    } catch (err) {
      next(err);
    }
  }

  async updateRule(req, res, next) {
    try {
      const { id } = req.params;
      const validated = validateUpdateApprovalRule(req.body);
      const rule = await approvalRuleService.updateRule(id, validated, req.user.userId);
      return res.status(200).json(success(rule, 'Approval chain rule updated successfully.'));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ApprovalRuleController();
