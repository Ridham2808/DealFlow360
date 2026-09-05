const subscriptionService = require('../services/subscriptionService');
const { success } = require('../utils/apiResponse');

class SubscriptionPlanController {
  async listPlans(req, res, next) {
    try {
      const plans = await subscriptionService.listPlans();
      return res.status(200).json(success(plans));
    } catch (err) {
      next(err);
    }
  }

  async getPlanById(req, res, next) {
    try {
      const { id } = req.params;
      const plan = await subscriptionService.getPlanById(id);
      return res.status(200).json(success(plan));
    } catch (err) {
      next(err);
    }
  }

  async createPlan(req, res, next) {
    try {
      const plan = await subscriptionService.createPlan(req.body);
      return res.status(201).json(success(plan, 'Subscription plan created successfully.'));
    } catch (err) {
      next(err);
    }
  }

  async updatePlan(req, res, next) {
    try {
      const { id } = req.params;
      const plan = await subscriptionService.updatePlan(id, req.body);
      return res.status(200).json(success(plan, 'Subscription plan updated successfully.'));
    } catch (err) {
      next(err);
    }
  }

  async deletePlan(req, res, next) {
    try {
      const { id } = req.params;
      const result = await subscriptionService.deletePlan(id);
      return res.status(200).json(success(result));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new SubscriptionPlanController();
