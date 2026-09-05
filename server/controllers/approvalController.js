const approvalService = require('../services/approvalService');
const { success } = require('../utils/apiResponse');

class ApprovalController {
  async submitQuotation(req, res, next) {
    try {
      const { id } = req.params;
      const result = await approvalService.submitQuotation(id, req.user);
      return res.status(200).json(success(result, 'Quotation submitted successfully.'));
    } catch (err) {
      next(err);
    }
  }

  async actionStep(req, res, next) {
    try {
      const { id } = req.params;
      const { action, notes, expectedVersion } = req.body;
      const result = await approvalService.actionApprovalStep({
        stepId: id,
        action,
        notes,
        actorUser: req.user,
        expectedVersion,
      });
      return res.status(200).json(success(result, `Approval step marked as ${action}.`));
    } catch (err) {
      next(err);
    }
  }

  async transitionQuotation(req, res, next) {
    try {
      const { id } = req.params;
      const { targetStatus, reason, expectedVersion } = req.body;
      const result = await approvalService.transitionQuotation({
        quotationId: id,
        targetStatus,
        reason,
        actorUser: req.user,
        expectedVersion,
      });
      return res.status(200).json(success(result, `Quotation transitioned to ${targetStatus}.`));
    } catch (err) {
      next(err);
    }
  }

  async listApprovals(req, res, next) {
    try {
      const result = await approvalService.listApprovals(req.query);
      return res.status(200).json(success(result));
    } catch (err) {
      next(err);
    }
  }

  async getApprovalDetail(req, res, next) {
    try {
      const { id } = req.params;
      const result = await approvalService.getApprovalDetail(id, req.user);
      return res.status(200).json(success(result));
    } catch (err) {
      next(err);
    }
  }

  async getApprovalStatus(req, res, next) {
    try {
      const { id } = req.params;
      const result = await approvalService.getQuotationApprovalStatus(id);
      return res.status(200).json(success(result));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ApprovalController();

