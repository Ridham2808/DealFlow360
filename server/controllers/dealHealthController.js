const dealHealthService = require('../services/dealHealthService');
const { success } = require('../utils/apiResponse');

class DealHealthController {
  async getDashboard(req, res, next) {
    try {
      const result = await dealHealthService.getDashboardData();
      return res.status(200).json(success(result));
    } catch (err) {
      next(err);
    }
  }

  async triggerScan(req, res, next) {
    try {
      const result = await dealHealthService.runAllScans(req.body);
      return res.status(200).json(success(result, 'Deal health scans completed successfully.'));
    } catch (err) {
      next(err);
    }
  }

  async escalateFlag(req, res, next) {
    try {
      const { id } = req.params;
      const result = await dealHealthService.escalateFlag(id, req.user.id);
      return res.status(200).json(success(result, 'Deal health flag escalated.'));
    } catch (err) {
      next(err);
    }
  }

  async nudgeRep(req, res, next) {
    try {
      const { id } = req.params;
      const result = await dealHealthService.nudgeRep(id, req.user.id);
      return res.status(200).json(success(result, result.message));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new DealHealthController();
