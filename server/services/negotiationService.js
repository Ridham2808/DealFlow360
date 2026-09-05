/**
 * DealFlow360 — Customer Portal Negotiation & Automatic Re-Approval Service
 * Enforces strict customer data isolation, proposal recording, activity logging,
 * and automatic approval chain re-entry when negotiated terms exceed discount governance limits.
 */

const prisma = require('../prisma/prisma');
const { ApiError } = require('../utils/apiResponse');
const { calculateBlendedRisk, determineRequiredApprovalChain } = require('./riskScoreService');
const billingService = require('./billingService');

class NegotiationService {
  /**
   * Fetch a customer-safe quotation list for the authenticated customer account.
   */
  async getPortalQuotations(customerId) {
    if (!customerId) {
      throw new ApiError('Customer account not associated with this user.', 403, 'UNLINKED_CUSTOMER');
    }

    const quotations = await prisma.quotation.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        quoteNumber: true,
        currency: true,
        status: true,
        subtotal: true,
        discountTotal: true,
        taxTotal: true,
        grandTotal: true,
        createdAt: true,
        expirationDate: true,
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: { lines: true },
        },
      },
    });

    return quotations.map((q) => ({
      ...q,
      itemCount: q._count?.lines || 0,
    }));
  }

  /**
   * Fetch a single customer-safe quotation with line items and sanitized activity.
   * Internal cost, margins, limits, risk scores, warehouse data, and approval notes are stripped.
   */
  async getPortalQuotation(quotationId, customerId) {
    if (!customerId) {
      throw new ApiError('Customer account not associated with this user.', 403, 'UNLINKED_CUSTOMER');
    }

    const quote = await prisma.quotation.findFirst({
      where: {
        OR: [{ id: quotationId }, { quoteNumber: quotationId }],
        customerId,
      },
      include: {
        customer: {
          select: { id: true, name: true, email: true },
        },
        lines: {
          select: {
            id: true,
            productId: true,
            quantity: true,
            unitPrice: true,
            discountPercent: true,
            lineSubtotal: true,
            taxPercent: true,
            isRecurring: true,
            productNameSnapshot: true,
            categorySnapshot: true,
          },
        },
        auditLogs: {
          where: {
            action: {
              in: [
                'CUSTOMER_COMMENT',
                'COUNTER_DISCOUNT_PROPOSAL',
                'CUSTOMER_CONFIRMED_QUOTATION',
                'SENT_TO_CUSTOMER',
                'REENTER_APPROVAL_CHAIN',
              ],
            },
          },
          orderBy: { createdAt: 'desc' },
          include: {
            actor: {
              select: { id: true, name: true, role: true },
            },
          },
        },
      },
    });

    if (!quote) {
      throw new ApiError('Quotation not found or does not belong to your account.', 404, 'NOT_FOUND');
    }

    // Extract line comments and latest counter proposal from audit records
    const commentsByLine = {};
    let latestCounterProposal = null;

    quote.auditLogs.forEach((log) => {
      if (log.action === 'CUSTOMER_COMMENT' && log.targetId) {
        if (!commentsByLine[log.targetId]) commentsByLine[log.targetId] = [];
        commentsByLine[log.targetId].push({
          id: log.id,
          authorName: log.actor?.name || 'Customer',
          message: log.reasonNote,
          createdAt: log.createdAt,
          meta: log.meta,
        });
      } else if (log.action === 'COUNTER_DISCOUNT_PROPOSAL' && !latestCounterProposal) {
        latestCounterProposal = {
          id: log.id,
          requestedDiscountPercent: log.meta?.requestedDiscountPercent,
          requestedDeliveryDate: log.meta?.requestedDeliveryDate,
          reason: log.reasonNote,
          status: log.meta?.status || 'PROPOSED',
          createdAt: log.createdAt,
        };
      }
    });

    // Format safe lines
    const sanitizedLines = quote.lines.map((line) => ({
      id: line.id,
      productId: line.productId,
      productName: line.productNameSnapshot,
      category: line.categorySnapshot,
      quantity: line.quantity,
      unitPrice: Number(line.unitPrice),
      discountPercent: Number(line.discountPercent),
      lineSubtotal: Number(line.lineSubtotal),
      taxPercent: Number(line.taxPercent),
      isRecurring: line.isRecurring,
      comments: commentsByLine[line.id] || [],
    }));

    return {
      id: quote.id,
      quoteNumber: quote.quoteNumber,
      currency: quote.currency,
      status: quote.status,
      subtotal: Number(quote.subtotal),
      discountTotal: Number(quote.discountTotal),
      taxTotal: Number(quote.taxTotal),
      grandTotal: Number(quote.grandTotal),
      createdAt: quote.createdAt,
      expirationDate: quote.expirationDate,
      customer: quote.customer,
      lines: sanitizedLines,
      latestCounterProposal,
      activity: quote.auditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        actorName: log.actor?.name || 'System',
        actorRole: log.actor?.role,
        note: log.reasonNote,
        meta: log.meta,
        createdAt: log.createdAt,
      })),
    };
  }

  /**
   * Add a customer line comment or change request.
   */
  async addCustomerComment(quotationId, customerId, actorId, { lineId, message }) {
    if (!message || !message.trim()) {
      throw new ApiError('Comment message is required.', 400, 'EMPTY_MESSAGE');
    }

    const quote = await prisma.quotation.findFirst({
      where: {
        OR: [{ id: quotationId }, { quoteNumber: quotationId }],
        customerId,
      },
    });

    if (!quote) {
      throw new ApiError('Quotation not found or access denied.', 404, 'NOT_FOUND');
    }

    // Verify line belongs to quotation if lineId provided
    if (lineId) {
      const line = await prisma.quotationLine.findFirst({
        where: { id: lineId, quotationId: quote.id },
      });
      if (!line) {
        throw new ApiError('Quotation line not found on this quotation.', 404, 'LINE_NOT_FOUND');
      }
    }

    const commentLog = await prisma.auditLog.create({
      data: {
        actorId,
        action: 'CUSTOMER_COMMENT',
        targetId: lineId || quote.id,
        targetType: lineId ? 'QuotationLine' : 'Quotation',
        quotationId: quote.id,
        reasonNote: message.trim(),
        meta: {
          lineId: lineId || null,
          status: 'OPEN',
          response: null,
          timestamp: new Date().toISOString(),
        },
      },
      include: {
        actor: { select: { id: true, name: true, role: true } },
      },
    });

    // Mark as UNDER_NEGOTIATION if in DRAFT or SENT_TO_CUSTOMER
    if (quote.status === 'SENT_TO_CUSTOMER' || quote.status === 'DRAFT') {
      await prisma.quotation.update({
        where: { id: quote.id },
        data: { status: 'UNDER_NEGOTIATION' },
      });
    }

    return {
      id: commentLog.id,
      lineId: commentLog.targetId,
      authorName: commentLog.actor?.name || 'Customer',
      message: commentLog.reasonNote,
      createdAt: commentLog.createdAt,
      meta: commentLog.meta,
    };
  }

  /**
   * Record a customer counter-discount proposal.
   * Does NOT mutate the quote price directly.
   */
  async proposeCounterDiscount(quotationId, customerId, actorId, { requestedDiscountPercent, requestedDeliveryDate, reason }) {
    const discount = Number(requestedDiscountPercent);
    if (isNaN(discount) || discount < 0 || discount > 100) {
      throw new ApiError('Valid counter discount percentage (0-100) is required.', 400, 'INVALID_DISCOUNT');
    }

    const quote = await prisma.quotation.findFirst({
      where: {
        OR: [{ id: quotationId }, { quoteNumber: quotationId }],
        customerId,
      },
    });

    if (!quote) {
      throw new ApiError('Quotation not found or access denied.', 404, 'NOT_FOUND');
    }

    if (quote.status === 'CONFIRMED') {
      throw new ApiError('Cannot negotiate an already confirmed quotation.', 400, 'ALREADY_CONFIRMED');
    }

    const proposalLog = await prisma.auditLog.create({
      data: {
        actorId,
        action: 'COUNTER_DISCOUNT_PROPOSAL',
        targetId: quote.id,
        targetType: 'Quotation',
        quotationId: quote.id,
        reasonNote: reason?.trim() || `Customer proposed ${discount}% counter discount`,
        meta: {
          requestedDiscountPercent: discount,
          requestedDeliveryDate: requestedDeliveryDate || null,
          status: 'PROPOSED',
          currentDiscountTotal: Number(quote.discountTotal),
          timestamp: new Date().toISOString(),
        },
      },
      include: {
        actor: { select: { id: true, name: true, role: true } },
      },
    });

    await prisma.quotation.update({
      where: { id: quote.id },
      data: { status: 'UNDER_NEGOTIATION' },
    });

    return {
      id: proposalLog.id,
      requestedDiscountPercent: discount,
      requestedDeliveryDate: requestedDeliveryDate || null,
      reason: proposalLog.reasonNote,
      status: 'PROPOSED',
      createdAt: proposalLog.createdAt,
    };
  }

  /**
   * Confirms a negotiated quotation atomically.
   * - If within discount limits: transitions to CONFIRMED and triggers billing generation once.
   * - If exceeding thresholds: transitions to PENDING_APPROVAL and creates ordered approval chain.
   * - Prevents duplicate confirmations and duplicate billing.
   */
  async confirmNegotiatedQuotation(quotationId, customerId, actorId) {
    return prisma.$transaction(async (tx) => {
      // 1. Verify customer ownership
      const quote = await tx.quotation.findFirst({
        where: {
          OR: [{ id: quotationId }, { quoteNumber: quotationId }],
          customerId,
        },
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
          invoices: true,
          auditLogs: {
            where: { action: 'COUNTER_DISCOUNT_PROPOSAL' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!quote) {
        throw new ApiError('Quotation not found or does not belong to your account.', 404, 'NOT_FOUND');
      }

      // 2. Prevent duplicate confirmation
      if (quote.status === 'CONFIRMED' || quote.invoices.length > 0) {
        throw new ApiError('This quotation is already confirmed and billed.', 409, 'ALREADY_CONFIRMED');
      }

      if (!quote.lines || quote.lines.length === 0) {
        throw new ApiError('Cannot confirm a quotation with no items.', 400, 'EMPTY_QUOTATION');
      }

      // 3. Check if quotation was already APPROVED by internal management (re-approval complete)
      if (quote.status === 'APPROVED') {
        const confirmedQuote = await tx.quotation.update({
          where: { id: quote.id },
          data: {
            status: 'CONFIRMED',
            version: { increment: 1 },
          },
        });

        await tx.auditLog.create({
          data: {
            actorId,
            action: 'CUSTOMER_CONFIRMED_QUOTATION',
            targetId: quote.id,
            targetType: 'Quotation',
            quotationId: quote.id,
            reasonNote: 'Customer confirmed quotation following internal approval.',
            meta: {
              finalGrandTotal: Number(quote.grandTotal),
            },
          },
        });

        return {
          status: 'CONFIRMED',
          requiresApproval: false,
          reEnteredApproval: false,
          message: 'Quotation confirmed successfully! Billing and order processing initiated.',
          quotation: {
            id: confirmedQuote.id,
            quoteNumber: confirmedQuote.quoteNumber,
            status: confirmedQuote.status,
          },
        };
      }

      // Check for any active counter-discount proposal and evaluate terms
      const latestProposal = quote.auditLogs[0];
      const proposedDiscount = latestProposal?.meta?.requestedDiscountPercent != null
        ? Number(latestProposal.meta.requestedDiscountPercent)
        : null;

      // Fetch active discount rules and approval chain rules
      const [discountTiers, categoryCeilings, approvalRules] = await Promise.all([
        tx.discountTier.findMany({ where: { isActive: true } }),
        tx.categoryDiscountCeiling.findMany({ where: { isActive: true } }),
        tx.approvalChainRule.findMany({ where: { isActive: true }, orderBy: { orderIndex: 'asc' } }),
      ]);

      // If customer requested a higher counter-discount, apply it across lines to evaluate governance
      let linesToEvaluate = quote.lines;
      if (proposedDiscount != null && proposedDiscount > 0) {
        linesToEvaluate = quote.lines.map((l) => ({
          ...l,
          discountPercent: proposedDiscount,
        }));
      }

      // 4. Authoritative risk recalculation from current DB rules
      const riskEvaluation = calculateBlendedRisk(
        linesToEvaluate,
        quote.customer.tier,
        { discountTiers, categoryCeilings }
      );

      const requiredApprovalChain = determineRequiredApprovalChain(
        riskEvaluation,
        approvalRules
      );

      const requiresApproval =
        requiredApprovalChain.length > 0 ||
        riskEvaluation.riskLevel === 'HIGH' ||
        riskEvaluation.anyLineOverLimit;

      // 5A. Unsafe Terms -> Re-enter Approval Chain
      if (requiresApproval) {
        // If a proposed counter-discount was present, persist the updated line discounts
        if (proposedDiscount != null && proposedDiscount > 0) {
          for (const line of quote.lines) {
            const lineSubtotal = Number(line.unitPrice) * line.quantity * (1 - proposedDiscount / 100);
            await tx.quotationLine.update({
              where: { id: line.id },
              data: {
                discountPercent: proposedDiscount,
                lineSubtotal,
              },
            });
          }
        }

        // Close / invalidate previous approval steps if any exist
        if (quote.approvalSteps.length > 0) {
          await tx.approvalStep.updateMany({
            where: { quotationId: quote.id, status: 'PENDING' },
            data: { status: 'RETURNED', notes: 'Superseded by customer negotiation re-entry' },
          });
        }

        // Create new ordered approval chain
        const newSteps = [];
        for (const rule of requiredApprovalChain) {
          const step = await tx.approvalStep.create({
            data: {
              quotationId: quote.id,
              stepOrder: rule.orderIndex,
              requiredRole: rule.requiredRole,
              status: 'PENDING',
              notes: `Auto-generated due to customer counter-discount overage of +${(riskEvaluation.worstLineOverage || 0).toFixed(1)}pt`,
            },
          });
          newSteps.push(step);
        }

        const updatedQuote = await tx.quotation.update({
          where: { id: quote.id },
          data: {
            status: 'PENDING_APPROVAL',
            blendedRiskScore: Math.round(riskEvaluation.score || 0),
            riskLevel: riskEvaluation.riskLevel,
            version: { increment: 1 },
          },
        });

        await tx.auditLog.create({
          data: {
            actorId,
            action: 'REENTER_APPROVAL_CHAIN',
            targetId: quote.id,
            targetType: 'Quotation',
            quotationId: quote.id,
            reasonNote: `Quotation automatically re-entered approval flow. Terms exceed governance limits with maximum overage +${(riskEvaluation.worstLineOverage || 0).toFixed(1)}pt.`,
            meta: {
              maxLineDiscountOverage: riskEvaluation.worstLineOverage,
              blendedRiskScore: riskEvaluation.score,
              requiredStepsCount: newSteps.length,
              proposedDiscount,
            },
          },
        });

        return {
          status: 'PENDING_APPROVAL',
          requiresApproval: true,
          reEnteredApproval: true,
          message: 'Terms exceed discount governance thresholds. The quotation has automatically re-entered the approval flow.',
          quotation: {
            id: updatedQuote.id,
            quoteNumber: updatedQuote.quoteNumber,
            status: updatedQuote.status,
          },
        };
      }

      // 5B. Safe Terms -> Confirm and Trigger Billing Exactly Once
      const confirmedQuote = await tx.quotation.update({
        where: { id: quote.id },
        data: {
          status: 'CONFIRMED',
          version: { increment: 1 },
        },
      });

      await tx.auditLog.create({
        data: {
          actorId,
          action: 'CUSTOMER_CONFIRMED_QUOTATION',
          targetId: quote.id,
          targetType: 'Quotation',
          quotationId: quote.id,
          reasonNote: 'Customer confirmed negotiated quotation. Terms are within governance limits.',
          meta: {
            finalGrandTotal: Number(quote.grandTotal),
            blendedRiskScore: riskEvaluation.blendedRiskScore,
          },
        },
      });

      return {
        status: 'CONFIRMED',
        requiresApproval: false,
        reEnteredApproval: false,
        message: 'Quotation confirmed successfully! Billing and order processing initiated.',
        quotation: {
          id: confirmedQuote.id,
          quoteNumber: confirmedQuote.quoteNumber,
          status: confirmedQuote.status,
        },
      };
    }).then(async (result) => {
      // If confirmed, trigger billing generation outside transaction to avoid nested transactions
      if (result.status === 'CONFIRMED') {
        await billingService.generateBilling(result.quotation.id, actorId);
      }
      return result;
    });
  }

  /**
   * Fetch customer-safe activity timeline.
   */
  async getPortalActivity(quotationId, customerId) {
    const quote = await prisma.quotation.findFirst({
      where: {
        OR: [{ id: quotationId }, { quoteNumber: quotationId }],
        customerId,
      },
    });

    if (!quote) {
      throw new ApiError('Quotation not found or access denied.', 404, 'NOT_FOUND');
    }

    const activities = await prisma.auditLog.findMany({
      where: {
        quotationId: quote.id,
        action: {
          in: [
            'CUSTOMER_COMMENT',
            'COUNTER_DISCOUNT_PROPOSAL',
            'CUSTOMER_CONFIRMED_QUOTATION',
            'SENT_TO_CUSTOMER',
            'REENTER_APPROVAL_CHAIN',
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        actor: { select: { id: true, name: true, role: true } },
      },
    });

    return activities.map((log) => ({
      id: log.id,
      action: log.action,
      actorName: log.actor?.name || 'System',
      actorRole: log.actor?.role,
      message: log.reasonNote,
      meta: log.meta,
      createdAt: log.createdAt,
    }));
  }
}

module.exports = new NegotiationService();
