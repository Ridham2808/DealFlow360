/**
 * DealFlow360 — Transactional Approval Service
 * Manages quotation submissions, risk enforcement, multi-step role approvals,
 * state machine transitions, optimistic locking, and append-only audit logging.
 */

const prisma = require('../prisma/prisma');
const { ApiError } = require('../utils/apiResponse');
const { calculateBlendedRisk, determineRequiredApprovalChain } = require('./riskScoreService');

class ApprovalService {
  /**
   * Submit a quotation for approval.
   * Re-reads lines, customer tier, discount rules, and approval rules from the DB.
   * Never trusts any client-provided risk evaluation.
   *
   * @param {string} quotationId ID of quotation
   * @param {Object} actorUser Current authenticated user { id, role }
   * @returns {Promise<Object>} Updated quotation with evaluated risk and approval steps
   */
  async submitQuotation(quotationId, actorUser) {
    return prisma.$transaction(async (tx) => {
      // 1. Fetch quotation with lines and customer
      const quote = await tx.quotation.findUnique({
        where: { id: quotationId },
        include: {
          customer: true,
          lines: {
            include: {
              product: true,
            },
          },
          approvalSteps: {
            orderBy: { stepOrder: 'asc' },
          },
        },
      });

      if (!quote) {
        throw new ApiError('Quotation not found.', 404, 'QUOTATION_NOT_FOUND');
      }

      // 2. Validate Allowed Submission State
      const allowedSubmissionStatuses = ['DRAFT', 'RETURNED'];
      if (!allowedSubmissionStatuses.includes(quote.status)) {
        throw new ApiError(
          `Quotation cannot be submitted from status '${quote.status}'. Only DRAFT or RETURNED quotations can be submitted.`,
          400,
          'INVALID_STATUS_TRANSITION'
        );
      }

      if (!quote.lines || quote.lines.length === 0) {
        throw new ApiError('Cannot submit quotation with no line items.', 400, 'EMPTY_QUOTATION');
      }

      // 3. Fetch Active Discount Rules and Approval Chain Configuration
      const [discountTiers, categoryCeilings, approvalRules] = await Promise.all([
        tx.discountTier.findMany({ where: { isActive: true } }),
        tx.categoryDiscountCeiling.findMany({ where: { isActive: true } }),
        tx.approvalChainRule.findMany({ where: { isActive: true }, orderBy: { orderIndex: 'asc' } }),
      ]);

      const customerTier = quote.customer?.tier || 'BRONZE';

      // 4. Calculate Pure Server-Side Blended Risk (Never trust client)
      const mappedLines = quote.lines.map((line) => ({
        id: line.id,
        lineId: line.id,
        productId: line.productId,
        productName: line.productNameSnapshot || line.product?.name || 'Item',
        category: line.categorySnapshot || line.product?.category || 'Hardware',
        unitPrice: Number(line.unitPrice),
        unitCost: Number(line.unitCost),
        quantity: Number(line.quantity),
        discountPercent: Number(line.discountPercent),
        lineSubtotal: Number(line.lineSubtotal),
      }));

      const riskResult = calculateBlendedRisk(mappedLines, customerTier, {
        discountTiers,
        categoryCeilings,
      });

      // 5. Determine Required Approval Steps
      const approvalChain = determineRequiredApprovalChain(riskResult, approvalRules);
      const previousStatus = quote.status;

      let nextQuotationStatus = 'PENDING_APPROVAL';
      let createdSteps = [];

      // Clean up previous inactive/pending steps if resubmitting from RETURNED
      if (quote.approvalSteps.length > 0) {
        await tx.approvalStep.deleteMany({
          where: { quotationId: quote.id },
        });
      }

      if (approvalChain.length === 0) {
        // No approval required: auto-approve immediately
        nextQuotationStatus = 'APPROVED';
      } else {
        // Create ordered ApprovalStep records
        createdSteps = await Promise.all(
          approvalChain.map((step) =>
            tx.approvalStep.create({
              data: {
                quotationId: quote.id,
                stepOrder: step.stepOrder,
                requiredRole: step.requiredRole,
                status: 'PENDING',
              },
            })
          )
        );
      }

      // 6. Update Quotation Status, Version, and Risk Snapshot
      const updatedQuote = await tx.quotation.update({
        where: { id: quote.id },
        data: {
          status: nextQuotationStatus,
          blendedRiskScore: Math.round(riskResult.score),
          riskLevel: riskResult.riskLevel,
          version: { increment: 1 },
        },
        include: {
          approvalSteps: {
            orderBy: { stepOrder: 'asc' },
          },
          customer: true,
        },
      });

      // 7. Append-Only Audit Log
      const reasonNote = nextQuotationStatus === 'APPROVED'
        ? 'Quotation auto-approved: all line discounts are within compliant ceilings.'
        : `Submitted for approval with blended risk score ${riskResult.score} (${riskResult.riskLevel}). Required steps: ${approvalChain.map((s) => s.requiredRole).join(' -> ')}.`;

      await tx.auditLog.create({
        data: {
          actorId: actorUser.id,
          action: nextQuotationStatus === 'APPROVED' ? 'QUOTATION_AUTO_APPROVED' : 'SUBMITTED_FOR_APPROVAL',
          quotationId: quote.id,
          targetId: quote.id,
          targetType: 'Quotation',
          beforeStatus: previousStatus,
          afterStatus: nextQuotationStatus,
          reasonNote,
          meta: {
            riskResult,
            approvalChain,
            version: updatedQuote.version,
          },
        },
      });

      return {
        quotation: updatedQuote,
        riskResult,
        approvalSteps: createdSteps,
      };
    });
  }

  /**
   * Action an approval step (APPROVED, REJECTED, RETURNED).
   * Enforces role authorization, sequential ordering (Manager before Finance),
   * non-empty rejection notes, optimistic locking, and append-only audit logging.
   *
   * @param {Object} params
   * @param {string} params.stepId ID of ApprovalStep
   * @param {string} params.action 'APPROVED' | 'REJECTED' | 'RETURNED'
   * @param {string} [params.notes] Mandatory for REJECTED and RETURNED
   * @param {Object} params.actorUser { id, role }
   * @param {number} [params.expectedVersion] For optimistic concurrency locking
   */
  async actionApprovalStep({ stepId, action, notes, actorUser, expectedVersion }) {
    const validActions = ['APPROVED', 'REJECTED', 'RETURNED'];
    if (!validActions.includes(action)) {
      throw new ApiError(`Invalid action '${action}'. Allowed: ${validActions.join(', ')}`, 400, 'INVALID_ACTION');
    }

    if ((action === 'REJECTED' || action === 'RETURNED') && (!notes || !notes.trim())) {
      throw new ApiError('A non-empty reason is required when rejecting or returning a quotation.', 400, 'REASON_REQUIRED');
    }

    return prisma.$transaction(async (tx) => {
      // 1. Fetch step with its quotation and full chain
      const step = await tx.approvalStep.findUnique({
        where: { id: stepId },
        include: {
          quotation: {
            include: {
              approvalSteps: {
                orderBy: { stepOrder: 'asc' },
              },
            },
          },
        },
      });

      if (!step) {
        throw new ApiError('Approval step not found.', 404, 'STEP_NOT_FOUND');
      }

      const quote = step.quotation;

      // 2. Prevent Double Decision
      if (step.status !== 'PENDING') {
        throw new ApiError(
          `This approval step has already been actioned as '${step.status}' and cannot be actioned again.`,
          400,
          'STEP_ALREADY_DECIDED'
        );
      }

      // 3. Prevent Self-Approval (Sales Rep cannot self-approve their own quotation)
      if (quote.ownerRepId === actorUser.id && actorUser.role !== 'ADMIN') {
        throw new ApiError(
          'Sales representatives are not permitted to approve or action their own quotations.',
          403,
          'SELF_APPROVAL_FORBIDDEN'
        );
      }

      // 4. Role Authorization Check (Admin can action any step)
      if (actorUser.role !== 'ADMIN' && actorUser.role !== step.requiredRole) {
        throw new ApiError(
          `Insufficient permissions: this step requires the '${step.requiredRole}' role, but your role is '${actorUser.role}'.`,
          403,
          'INSUFFICIENT_ROLE'
        );
      }

      // 5. Sequential Ordering Enforcement (e.g. Sales Manager step must be APPROVED before Finance step)
      const allSteps = quote.approvalSteps;
      const priorIncompleteSteps = allSteps.filter(
        (s) => s.stepOrder < step.stepOrder && s.status !== 'APPROVED'
      );
      if (priorIncompleteSteps.length > 0) {
        const blockingStep = priorIncompleteSteps[0];
        throw new ApiError(
          `Cannot action step ${step.stepOrder} (${step.requiredRole}) before step ${blockingStep.stepOrder} (${blockingStep.requiredRole}) has been approved.`,
          400,
          'OUT_OF_ORDER_APPROVAL'
        );
      }

      // 6. Optimistic Concurrency Locking
      if (expectedVersion !== undefined && expectedVersion !== null) {
        if (quote.version !== Number(expectedVersion)) {
          throw new ApiError(
            `Quotation was modified by another user (expected version ${expectedVersion}, current version ${quote.version}). Please refresh and try again.`,
            409,
            'CONCURRENCY_CONFLICT'
          );
        }
      }

      // 7. Action the Step
      const updatedStep = await tx.approvalStep.update({
        where: { id: step.id },
        data: {
          status: action,
          assignedUserId: actorUser.id,
          notes: notes ? notes.trim() : null,
          actionedAt: new Date(),
        },
      });

      // 8. Determine Next Quotation Status
      let nextQuotationStatus = quote.status;
      if (action === 'REJECTED') {
        nextQuotationStatus = 'REJECTED';
      } else if (action === 'RETURNED') {
        nextQuotationStatus = 'RETURNED';
      } else if (action === 'APPROVED') {
        // Check if all steps in the chain are now approved
        const remainingPending = allSteps.filter(
          (s) => s.id !== step.id && s.status === 'PENDING'
        );
        if (remainingPending.length === 0) {
          nextQuotationStatus = 'APPROVED';
        } else {
          // Keep in PENDING_APPROVAL until the next role acts
          nextQuotationStatus = 'PENDING_APPROVAL';
        }
      }

      // 9. Update Quotation Status and Increment Version
      const updatedQuote = await tx.quotation.update({
        where: { id: quote.id },
        data: {
          status: nextQuotationStatus,
          version: { increment: 1 },
        },
        include: {
          approvalSteps: {
            orderBy: { stepOrder: 'asc' },
            include: { assignedUser: true },
          },
        },
      });

      // 10. Append-Only Audit Log
      await tx.auditLog.create({
        data: {
          actorId: actorUser.id,
          action: `APPROVAL_STEP_${action}`,
          quotationId: quote.id,
          targetId: step.id,
          targetType: 'ApprovalStep',
          beforeStatus: quote.status,
          afterStatus: nextQuotationStatus,
          reasonNote: notes ? notes.trim() : `Step ${step.stepOrder} (${step.requiredRole}) marked as ${action}.`,
          meta: {
            stepId: step.id,
            stepOrder: step.stepOrder,
            requiredRole: step.requiredRole,
            action,
            version: updatedQuote.version,
          },
        },
      });

      const nextStep = updatedQuote.approvalSteps.find((s) => s.status === 'PENDING') || null;

      return {
        step: updatedStep,
        quotation: updatedQuote,
        nextStep,
      };
    });
  }

  /**
   * Transition quotation lifecycle states (APPROVED -> UNDER_NEGOTIATION, etc.)
   */
  async transitionQuotation({ quotationId, targetStatus, reason, actorUser, expectedVersion }) {
    const allowedTransitions = {
      APPROVED: ['UNDER_NEGOTIATION', 'SENT_TO_CUSTOMER', 'CONFIRMED'],
      UNDER_NEGOTIATION: ['CONFIRMED', 'PENDING_APPROVAL', 'DRAFT'],
      CONFIRMED: ['CONVERTED_TO_ORDER'],
      RETURNED: ['DRAFT', 'PENDING_APPROVAL'],
    };

    return prisma.$transaction(async (tx) => {
      const quote = await tx.quotation.findUnique({
        where: { id: quotationId },
      });

      if (!quote) {
        throw new ApiError('Quotation not found.', 404, 'QUOTATION_NOT_FOUND');
      }

      const validNextStates = allowedTransitions[quote.status] || [];
      if (!validNextStates.includes(targetStatus)) {
        throw new ApiError(
          `Invalid status transition from '${quote.status}' to '${targetStatus}'. Allowed: ${validNextStates.join(', ') || 'None'}`,
          400,
          'INVALID_STATUS_TRANSITION'
        );
      }

      // Optimistic concurrency check
      if (expectedVersion !== undefined && expectedVersion !== null) {
        if (quote.version !== Number(expectedVersion)) {
          throw new ApiError(
            `Quotation modified concurrently (expected version ${expectedVersion}, current ${quote.version}).`,
            409,
            'CONCURRENCY_CONFLICT'
          );
        }
      }

      const previousStatus = quote.status;
      const updatedQuote = await tx.quotation.update({
        where: { id: quote.id },
        data: {
          status: targetStatus,
          version: { increment: 1 },
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: actorUser.id,
          action: `QUOTATION_TRANSITION_${targetStatus}`,
          quotationId: quote.id,
          targetId: quote.id,
          targetType: 'Quotation',
          beforeStatus: previousStatus,
          afterStatus: targetStatus,
          reasonNote: reason || `Quotation transitioned from ${previousStatus} to ${targetStatus}.`,
          meta: {
            previousStatus,
            targetStatus,
            version: updatedQuote.version,
          },
        },
      });

      return updatedQuote;
    });
  }

  /**
   * List quotations for approval workflow with filtering and pagination.
   */
  async listApprovals({ status, pendingOnly, ownerId, riskLevel, search, page = 1, limit = 50 }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(1000, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const where = {};

    if (pendingOnly === 'true' || pendingOnly === true) {
      where.status = 'PENDING_APPROVAL';
    } else if (status) {
      where.status = status;
    } else {
      where.status = {
        in: ['PENDING_APPROVAL', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'RETURNED', 'CONFIRMED'],
      };
    }

    if (ownerId) {
      where.ownerRepId = ownerId;
    }

    if (riskLevel) {
      where.riskLevel = riskLevel;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { quoteNumber: { contains: q, mode: 'insensitive' } },
        { customer: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.quotation.count({ where }),
      prisma.quotation.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { updatedAt: 'desc' },
        include: {
          customer: {
            select: { id: true, name: true, tier: true, email: true },
          },
          ownerRep: {
            select: { id: true, name: true, email: true, role: true },
          },
          approvalSteps: {
            orderBy: { stepOrder: 'asc' },
            include: {
              assignedUser: {
                select: { id: true, name: true, email: true, role: true },
              },
            },
          },
        },
      }),
    ]);

    const formatted = items.map((q) => {
      const pendingStep = q.approvalSteps.find((s) => s.status === 'PENDING') || null;
      return {
        id: q.id,
        quoteNumber: q.quoteNumber,
        status: q.status,
        version: q.version,
        blendedRiskScore: q.blendedRiskScore,
        riskLevel: q.riskLevel,
        grandTotal: Number(q.grandTotal),
        marginPercentage: Number(q.marginPercentage),
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
        customer: q.customer,
        ownerRep: q.ownerRep,
        pendingStep,
        totalSteps: q.approvalSteps.length,
        approvedSteps: q.approvalSteps.filter((s) => s.status === 'APPROVED').length,
      };
    });

    return {
      items: formatted,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  /**
   * Get rich approval detail for a quotation matching Mockup Screen #6.
   */
  async getApprovalDetail(quotationId, currentUser = {}) {
    // Lookup by ID or quoteNumber
    const quote = await prisma.quotation.findFirst({
      where: {
        OR: [{ id: quotationId }, { quoteNumber: quotationId }],
      },
      include: {
        customer: true,
        ownerRep: {
          select: { id: true, name: true, email: true, role: true },
        },
        lines: {
          include: {
            product: true,
          },
          orderBy: { id: 'asc' },
        },
        approvalSteps: {
          orderBy: { stepOrder: 'asc' },
          include: {
            assignedUser: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          include: {
            actor: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
      },
    });

    if (!quote) {
      throw new ApiError('Quotation not found.', 404, 'QUOTATION_NOT_FOUND');
    }

    // Identify active pending step
    const activeStep = quote.approvalSteps.find((s) => s.status === 'PENDING') || null;

    // Calculate Why This Quote Was Flagged table items
    // Columns: Line, Discount Given, Limit Allowed, Over By
    const flaggedLines = quote.lines
      .filter((line) => Number(line.discountPercent) > Number(line.lineDiscountLimit))
      .map((line) => {
        const discountGiven = Number(line.discountPercent);
        const limitAllowed = Number(line.lineDiscountLimit);
        const overBy = Number((discountGiven - limitAllowed).toFixed(2));
        return {
          lineId: line.id,
          line: line.productNameSnapshot || line.product?.name || 'Item',
          category: line.categorySnapshot || line.product?.category || 'Hardware',
          discountGiven,
          limitAllowed,
          overBy,
        };
      });

    // Four-node stepper: Submitted -> Sales Manager -> Finance -> Confirmed
    const salesManagerStep = quote.approvalSteps.find((s) => s.requiredRole === 'SALES_MANAGER');
    const financeStep = quote.approvalSteps.find((s) => s.requiredRole === 'FINANCE');

    const stepper = [
      {
        node: 'SUBMITTED',
        label: 'Submitted',
        status: quote.status !== 'DRAFT' ? 'COMPLETED' : 'PENDING',
        actionedAt: quote.createdAt,
        user: quote.ownerRep?.name || 'Sales Rep',
      },
      {
        node: 'SALES_MANAGER',
        label: 'Sales Manager',
        status: salesManagerStep ? salesManagerStep.status : (quote.status === 'APPROVED' || quote.status === 'CONFIRMED' ? 'SKIPPED' : 'PENDING'),
        actionedAt: salesManagerStep?.actionedAt || null,
        user: salesManagerStep?.assignedUser?.name || null,
        requiredRole: 'SALES_MANAGER',
      },
      {
        node: 'FINANCE',
        label: 'Finance',
        status: financeStep ? financeStep.status : (quote.status === 'APPROVED' || quote.status === 'CONFIRMED' ? 'SKIPPED' : 'PENDING'),
        actionedAt: financeStep?.actionedAt || null,
        user: financeStep?.assignedUser?.name || null,
        requiredRole: 'FINANCE',
      },
      {
        node: 'CONFIRMED',
        label: 'Confirmed',
        status: ['CONFIRMED', 'CONVERTED_TO_ORDER'].includes(quote.status)
          ? 'COMPLETED'
          : quote.status === 'APPROVED'
          ? 'READY'
          : 'PENDING',
        actionedAt: null,
      },
    ];

    // Allowed actions for current user
    let canApprove = false;
    let canReject = false;
    let canReturn = false;
    const isOwner = quote.ownerRepId === currentUser.id;

    if (activeStep) {
      if (currentUser.role === 'ADMIN') {
        canApprove = true;
        canReject = true;
        canReturn = true;
      } else if (currentUser.role === activeStep.requiredRole && !isOwner) {
        canApprove = true;
        canReject = true;
        canReturn = true;
      }
    }

    // Audit Table: User, Action, Date, Note
    const auditTable = quote.auditLogs.map((log) => ({
      id: log.id,
      user: log.actor?.name || 'System',
      userEmail: log.actor?.email,
      role: log.actor?.role,
      action: log.action,
      date: log.createdAt,
      note: log.reasonNote || '-',
    }));

    return {
      quotation: {
        id: quote.id,
        quoteNumber: quote.quoteNumber,
        status: quote.status,
        version: quote.version,
        blendedRiskScore: quote.blendedRiskScore,
        riskLevel: quote.riskLevel,
        grandTotal: Number(quote.grandTotal),
        marginPercentage: Number(quote.marginPercentage),
        createdAt: quote.createdAt,
        updatedAt: quote.updatedAt,
      },
      customer: {
        id: quote.customer?.id,
        name: quote.customer?.name,
        tier: quote.customer?.tier,
        email: quote.customer?.email,
      },
      ownerRep: quote.ownerRep,
      whyFlagged: flaggedLines,
      stepper,
      approvalSteps: quote.approvalSteps,
      activeStep,
      auditTable,
      allowedActions: {
        canApprove,
        canReject,
        canReturn,
        activeStepId: activeStep?.id || null,
        requiredRole: activeStep?.requiredRole || null,
        isOwner,
      },
    };
  }

  /**
   * Fetch full approval status, chain, risk evaluation, and audit trail for a quotation.
   *
   * @param {string} quotationId
   * @returns {Promise<Object>}
   */
  async getQuotationApprovalStatus(quotationId) {
    const quote = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        customer: true,
        ownerRep: {
          select: { id: true, name: true, email: true, role: true },
        },
        lines: {
          include: {
            product: true,
          },
        },
        approvalSteps: {
          orderBy: { stepOrder: 'asc' },
          include: {
            assignedUser: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          include: {
            actor: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
      },
    });

    if (!quote) {
      throw new ApiError('Quotation not found.', 404, 'QUOTATION_NOT_FOUND');
    }

    // Re-evaluate current risk rules for visualization
    const [discountTiers, categoryCeilings] = await Promise.all([
      prisma.discountTier.findMany({ where: { isActive: true } }),
      prisma.categoryDiscountCeiling.findMany({ where: { isActive: true } }),
    ]);

    const mappedLines = quote.lines.map((line) => ({
      id: line.id,
      lineId: line.id,
      productName: line.productNameSnapshot || line.product?.name,
      category: line.categorySnapshot || line.product?.category || 'Hardware',
      unitPrice: Number(line.unitPrice),
      unitCost: Number(line.unitCost),
      quantity: Number(line.quantity),
      discountPercent: Number(line.discountPercent),
      lineSubtotal: Number(line.lineSubtotal),
    }));

    const riskEvaluation = calculateBlendedRisk(mappedLines, quote.customer?.tier || 'BRONZE', {
      discountTiers,
      categoryCeilings,
    });

    // Identify active pending step
    const activeStep = quote.approvalSteps.find((s) => s.status === 'PENDING') || null;

    return {
      quotation: {
        id: quote.id,
        quoteNumber: quote.quoteNumber,
        status: quote.status,
        version: quote.version,
        blendedRiskScore: quote.blendedRiskScore,
        riskLevel: quote.riskLevel,
        grandTotal: Number(quote.grandTotal),
        marginPercentage: Number(quote.marginPercentage),
        createdAt: quote.createdAt,
        updatedAt: quote.updatedAt,
      },
      activeStep,
      approvalSteps: quote.approvalSteps,
      riskEvaluation,
      auditTimeline: quote.auditLogs,
    };
  }
}

module.exports = new ApprovalService();

