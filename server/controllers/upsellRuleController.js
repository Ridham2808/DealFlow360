const upsellService = require('../services/upsellService');
const { success } = require('../utils/apiResponse');

class UpsellRuleController {
  async listRules(req, res, next) {
    try {
      const rules = await upsellService.listRules();
      return res.status(200).json(success(rules));
    } catch (err) {
      next(err);
    }
  }

  async createRule(req, res, next) {
    try {
      const rule = await upsellService.createRule(req.body);
      return res.status(201).json(success(rule, 'Upsell rule created successfully.'));
    } catch (err) {
      next(err);
    }
  }

  async updateRule(req, res, next) {
    try {
      const { id } = req.params;
      const rule = await upsellService.updateRule(id, req.body);
      return res.status(200).json(success(rule, 'Upsell rule updated successfully.'));
    } catch (err) {
      next(err);
    }
  }

  async deleteRule(req, res, next) {
    try {
      const { id } = req.params;
      const result = await upsellService.deleteRule(id);
      return res.status(200).json(success(result));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new UpsellRuleController();
