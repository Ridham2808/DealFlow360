const prisma = require('../prisma/prisma');
const { ApiError } = require('../utils/apiResponse');
const pricingService = require('./pricingService');
const { calculateBlendedRisk, calculateLineRisk } = require('./riskScoreService');
const approvalService = require('./approvalService');
const auditService = require('./auditService');

function round2(num) {
  return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
}

class QuotationService {
  /**
   * Helper: Generate sequential Quote Number like Q-1044
   */
  async _generateQuoteNumber() {
    const count = await prisma.quotation.count();
    const nextNum = 1000 + count + 1;
    let quoteNum = `Q-${nextNum}`;

    // Verify uniqueness
    const exists = await prisma.quotation.findUnique({ where: { quoteNumber: quoteNum } });
    if (exists) {
      quoteNum = `Q-${nextNum}-${Math.floor(100 + Math.random() * 900)}`;
    }
    return quoteNum;
  }

  /**
   * Helper: Recompute entire quotation totals, line margins, and blended risk
   */
  async _recomputeQuotation(tx, quotationId) {
    const quote = await tx.quotation.findUnique({
      where: { id: quotationId },
      include: {
        customer: true,
        lines: {
          include: {
            product: true,
            variant: true,
            subscriptionPlan: true,
          },
          orderBy: { id: 'asc' },
        },
      },
    });

    if (!quote) {
      throw new ApiError('Quotation not found.', 404, 'QUOTATION_NOT_FOUND');
    }

    const [discountTiers, categoryCeilings] = await Promise.all([
      tx.discountTier.findMany({ where: { isActive: true } }),
      tx.categoryDiscountCeiling.findMany({ where: { isActive: true } }),
    ]);

    const discountRules = { discountTiers, categoryCeilings };
    const customerTier = quote.customer?.tier || 'BRONZE';

    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    let totalCost = 0;

    const evaluatedLinesForRisk = [];

    // Recalculate each line's numbers and limit
    for (const line of quote.lines) {
      const qty = Number(line.quantity || 1);
      const uPrice = Number(line.unitPrice || 0);
      const uCost = Number(line.unitCost || 0);
      const discPct = Number(line.discountPercent || 0);
      const taxPct = Number(line.taxPercent || 0);

      const lineSubtotal = round2(qty * uPrice);
      const lineDiscAmount = round2(lineSubtotal * (discPct / 100));
      const lineNet = round2(lineSubtotal - lineDiscAmount);
      const lineTax = round2(lineNet * (taxPct / 100));
      const lineCost = round2(qty * uCost);
      const lineMargin = round2(lineNet - lineCost);

      // Line risk calculation
      const lineRisk = calculateLineRisk(
        {
          ...line,
          category: line.categorySnapshot || line.product?.category,
        },
        customerTier,
        discountRules
      );

      // Update line record if changed
      await tx.quotationLine.update({
        where: { id: line.id },
        data: {
          lineSubtotal,
          lineDiscountAmount: lineDiscAmount,
          lineMargin,
          lineDiscountLimit: lineRisk.effectiveLimit,
        },
      });

      subtotal += lineSubtotal;
      discountTotal += lineDiscAmount;
      taxTotal += lineTax;
      totalCost += lineCost;

      evaluatedLinesForRisk.push({
        ...line,
        category: line.categorySnapshot || line.product?.category,
        lineSubtotal,
        lineDiscountAmount: lineDiscAmount,
        lineMargin,
      });
    }

    subtotal = round2(subtotal);
    discountTotal = round2(discountTotal);
    taxTotal = round2(taxTotal);
    totalCost = round2(totalCost);

    const netRevenue = round2(subtotal - discountTotal);
    const grandTotal = round2(netRevenue + taxTotal);
    const marginAmount = round2(netRevenue - totalCost);
    const marginPercentage = netRevenue > 0 ? round2((marginAmount / netRevenue) * 100) : 0;

    // Run blended risk engine
    const riskResult = calculateBlendedRisk(evaluatedLinesForRisk, customerTier, discountRules);

    const updatedQuote = await tx.quotation.update({
      where: { id: quotationId },
      data: {
        subtotal,
        discountTotal,
        taxTotal,
        grandTotal,
        totalCost,
        marginAmount,
        marginPercentage,
        blendedRiskScore: riskResult.score,
        riskLevel: riskResult.riskLevel,
        version: { increment: 1 },
      },
      include: {
        customer: true,
        lines: {
          include: {
            product: true,
            variant: true,
            subscriptionPlan: true,
          },
          orderBy: { id: 'asc' },
        },
        approvalSteps: {
          orderBy: { stepOrder: 'asc' },
        },
      },
    });

    return {
      quotation: updatedQuote,
      riskResult,
    };
  }

  /**
   * 1. Create a draft quotation
   */
  async createQuotation(data, actorUser) {
    const { customerId, expirationDate, currency = 'USD' } = data;
    if (!customerId) {
      throw new ApiError('Customer ID is required to create a quotation.', 400, 'VALIDATION_ERROR');
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      throw new ApiError('Customer not found.', 404, 'CUSTOMER_NOT_FOUND');
    }

    const quoteNumber = await this._generateQuoteNumber();
    const ownerRepId = actorUser.userId || actorUser.id;

    const newQuote = await prisma.quotation.create({
      data: {
        quoteNumber,
        customerId,
        ownerRepId,
        currency: currency.toUpperCase(),
        status: 'DRAFT',
        version: 1,
        expirationDate: expirationDate ? new Date(expirationDate) : null,
      },
      include: {
        customer: true,
        lines: true,
      },
    });

    auditService.log({
      actorId: ownerRepId,
      action: 'CREATED_QUOTATION',
      targetId: newQuote.id,
      targetType: 'Quotation',
      quotationId: newQuote.id,
      reasonNote: `Draft quotation ${newQuote.quoteNumber} created for ${customer.name}.`,
    });

    return newQuote;
  }

  /**
   * 2. List quotations with search, filters, pagination, and role scoping
   */
  async listQuotations(filters = {}, actorUser) {
    const {
      status,
      customerId,
      ownerRepId,
      search,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = filters;

    const where = {};

    // Role Scoping: Sales rep sees their own quotations by default unless manager/admin
    const isRestrictedRep = actorUser.role === 'SALES_REP';
    if (isRestrictedRep) {
      where.ownerRepId = actorUser.userId || actorUser.id;
    } else if (ownerRepId) {
      where.ownerRepId = ownerRepId;
    }

    if (status) {
      where.status = status;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (search) {
      const q = search.trim();
      where.OR = [
        { quoteNumber: { contains: q, mode: 'insensitive' } },
        { customer: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [total, items] = await Promise.all([
      prisma.quotation.count({ where }),
      prisma.quotation.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, tier: true, email: true } },
          ownerRep: { select: { id: true, name: true, email: true } },
          lines: {
            select: { id: true, productNameSnapshot: true, quantity: true, lineSubtotal: true },
          },
          approvalSteps: {
            select: { id: true, stepOrder: true, requiredRole: true, status: true },
            orderBy: { stepOrder: 'asc' },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limitNum,
      }),
    ]);

    return {
      items,
      quotations: items,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * 3. Get Authoritative Quotation by ID
   */
  async getQuotationById(id, actorUser) {
    const quote = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        ownerRep: { select: { id: true, name: true, email: true } },
        lines: {
          include: {
            product: true,
            variant: true,
            subscriptionPlan: true,
          },
          orderBy: { id: 'asc' },
        },
        approvalSteps: {
          include: {
            assignedUser: { select: { id: true, name: true, email: true } },
          },
          orderBy: { stepOrder: 'asc' },
        },
        auditLogs: {
          include: {
            actor: { select: { id: true, name: true, role: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!quote) {
      throw new ApiError('Quotation not found.', 404, 'QUOTATION_NOT_FOUND');
    }

    // Role check: sales rep can only access own quote unless manager/admin
    if (actorUser.role === 'SALES_REP' && quote.ownerRepId !== (actorUser.userId || actorUser.id)) {
      throw new ApiError('You do not have permission to access this quotation.', 403, 'FORBIDDEN');
    }

    // Run live blended risk calculation to provide evaluation details
    const [discountTiers, categoryCeilings] = await Promise.all([
      prisma.discountTier.findMany({ where: { isActive: true } }),
      prisma.categoryDiscountCeiling.findMany({ where: { isActive: true } }),
    ]);

    const riskEvaluation = calculateBlendedRisk(
      quote.lines.map((l) => ({
        ...l,
        category: l.categorySnapshot || l.product?.category,
      })),
      quote.customer?.tier || 'BRONZE',
      { discountTiers, categoryCeilings }
    );

    return {
      ...quote,
      riskEvaluation,
    };
  }

  /**
   * 4. Update Quotation Metadata (with optimistic concurrency check)
   */
  async updateQuotation(id, updates, actorUser) {
    const existing = await prisma.quotation.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!existing) {
      throw new ApiError('Quotation not found.', 404, 'QUOTATION_NOT_FOUND');
    }

    // Optimistic Concurrency Check
    if (updates.version !== undefined && updates.version !== existing.version) {
      throw new ApiError(
        'Quotation has been modified by another action. Please reload the latest version before saving.',
        409,
        'STALE_VERSION_ERROR'
      );
    }

    // Block modifications if quotation is in terminal status
    if (['CONFIRMED', 'CANCELLED'].includes(existing.status)) {
      throw new ApiError(`Cannot modify quotation in '${existing.status}' status.`, 400, 'IMMUTABLE_STATUS');
    }

    const data = {
      version: { increment: 1 },
    };

    if (updates.customerId && updates.customerId !== existing.customerId) {
      const newCustomer = await prisma.customer.findUnique({ where: { id: updates.customerId } });
      if (!newCustomer) throw new ApiError('Selected customer not found.', 404, 'CUSTOMER_NOT_FOUND');
      data.customerId = updates.customerId;
    }

    if (updates.expirationDate !== undefined) {
      data.expirationDate = updates.expirationDate ? new Date(updates.expirationDate) : null;
    }

    if (updates.currency) {
      data.currency = updates.currency.toUpperCase();
    }

    const updated = await prisma.quotation.update({
      where: { id },
      data,
      include: {
        customer: true,
        lines: {
          include: { product: true, variant: true, subscriptionPlan: true },
        },
      },
    });

    // If customer changed, recompute prices and limits for all lines
    if (updates.customerId && updates.customerId !== existing.customerId) {
      return (await this._recomputeQuotation(prisma, id)).quotation;
    }

    return updated;
  }

  /**
   * 5. Add or Update Line Item (with authoritative server pricing & risk recalculation)
   */
  async mutateLine(quotationId, lineData, actorUser) {
    const { lineId, productId, variantId, quantity = 1, discountPercent = 0, subscriptionPlanId, version } = lineData;

    return prisma.$transaction(async (tx) => {
      const quote = await tx.quotation.findUnique({
        where: { id: quotationId },
        include: { customer: true },
      });

      if (!quote) {
        throw new ApiError('Quotation not found.', 404, 'QUOTATION_NOT_FOUND');
      }

      // Concurrency check
      if (version !== undefined && version !== quote.version) {
        throw new ApiError(
          'Quotation was modified by another request. Reload required.',
          409,
          'STALE_VERSION_ERROR'
        );
      }

      // Check allowed mutation statuses
      if (!['DRAFT', 'UNDER_NEGOTIATION', 'RETURNED'].includes(quote.status)) {
        throw new ApiError(`Cannot edit lines on a quotation in '${quote.status}' status.`, 400, 'IMMUTABLE_STATUS');
      }

      const parsedQty = Math.max(1, parseInt(quantity, 10) || 1);
      const parsedDiscount = Math.max(0, Math.min(100, round2(discountPercent)));

      if (lineId) {
        // --- UPDATE EXISTING LINE ---
        const existingLine = await tx.quotationLine.findUnique({ where: { id: lineId } });
        if (!existingLine || existingLine.quotationId !== quotationId) {
          throw new ApiError('Line item not found on this quotation.', 404, 'LINE_NOT_FOUND');
        }

        // Re-resolve price if quantity or variant changed
        let unitPrice = Number(existingLine.unitPrice);
        let unitCost = Number(existingLine.unitCost);

        if (existingLine.quantity !== parsedQty || existingLine.variantId !== (variantId || null)) {
          const resolved = await pricingService.resolvePrice(
            existingLine.productId,
            quote.customer?.tier || 'BRONZE',
            quote.currency,
            parsedQty,
            variantId || null
          );
          unitPrice = resolved.finalUnitPrice;
          unitCost = Number(existingLine.unitCost);
        }

        await tx.quotationLine.update({
          where: { id: lineId },
          data: {
            quantity: parsedQty,
            unitPrice,
            unitCost,
            discountPercent: parsedDiscount,
            variantId: variantId || null,
            subscriptionPlanId: subscriptionPlanId || null,
            isRecurring: Boolean(subscriptionPlanId),
          },
        });
      } else {
        // --- ADD NEW LINE ---
        if (!productId) {
          throw new ApiError('Product ID is required to add line item.', 400, 'VALIDATION_ERROR');
        }

        const product = await tx.product.findUnique({ where: { id: productId } });
        if (!product || !product.isActive) {
          throw new ApiError('Product is not active or available in catalog.', 404, 'PRODUCT_NOT_FOUND');
        }

        // Resolve unit price
        const resolved = await pricingService.resolvePrice(
          productId,
          quote.customer?.tier || 'BRONZE',
          quote.currency,
          parsedQty,
          variantId || null
        );

        await tx.quotationLine.create({
          data: {
            quotationId,
            productId,
            variantId: variantId || null,
            quantity: parsedQty,
            unitPrice: resolved.finalUnitPrice,
            unitCost: round2(Number(product.baseCost || 0)),
            discountPercent: parsedDiscount,
            taxPercent: round2(Number(product.taxPercent || 0)),
            lineSubtotal: round2(parsedQty * resolved.finalUnitPrice),
            lineDiscountAmount: round2(parsedQty * resolved.finalUnitPrice * (parsedDiscount / 100)),
            lineMargin: 0,
            productNameSnapshot: product.name,
            categorySnapshot: product.category,
            subscriptionPlanId: subscriptionPlanId || null,
            isRecurring: Boolean(subscriptionPlanId || product.isRecurringEligible),
          },
        });
      }

      // Recompute entire quote
      const result = await this._recomputeQuotation(tx, quotationId);
      return { ...result.quotation, riskResult: result.riskResult };
    });
  }

  /**
   * 6. Delete Line Item
   */
  async deleteLine(quotationId, lineId, version, actorUser) {
    return prisma.$transaction(async (tx) => {
      const quote = await tx.quotation.findUnique({ where: { id: quotationId } });
      if (!quote) throw new ApiError('Quotation not found.', 404, 'QUOTATION_NOT_FOUND');

      if (version !== undefined && version !== quote.version) {
        throw new ApiError('Quotation modified concurrently. Please reload.', 409, 'STALE_VERSION_ERROR');
      }

      if (!['DRAFT', 'UNDER_NEGOTIATION', 'RETURNED'].includes(quote.status)) {
        throw new ApiError(`Cannot delete lines on a quotation in '${quote.status}' status.`, 400, 'IMMUTABLE_STATUS');
      }

      const line = await tx.quotationLine.findUnique({ where: { id: lineId } });
      if (!line || line.quotationId !== quotationId) {
        throw new ApiError('Line item not found on this quotation.', 404, 'LINE_NOT_FOUND');
      }

      await tx.quotationLine.delete({ where: { id: lineId } });

      const result = await this._recomputeQuotation(tx, quotationId);
      return { ...result.quotation, riskResult: result.riskResult };
    });
  }

  /**
   * 7. Submit Quotation for Approval or Direct Confirmation
   */
  async submitQuotation(quotationId, actorUser) {
    const quote = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        customer: true,
        lines: true,
      },
    });

    if (!quote) throw new ApiError('Quotation not found.', 404, 'QUOTATION_NOT_FOUND');

    if (!quote.lines || quote.lines.length === 0) {
      throw new ApiError('Cannot submit quotation with no line items.', 400, 'EMPTY_QUOTATION');
    }

    // If blended risk is NONE, auto-approve / confirm quote
    if (quote.riskLevel === 'NONE' || quote.blendedRiskScore === 0) {
      const confirmed = await prisma.quotation.update({
        where: { id: quotationId },
        data: {
          status: 'APPROVED',
          version: { increment: 1 },
        },
        include: {
          customer: true,
          lines: true,
        },
      });

      auditService.log({
        actorId: actorUser.userId || actorUser.id,
        action: 'AUTO_APPROVED_QUOTATION',
        targetId: quotationId,
        targetType: 'Quotation',
        quotationId,
        reasonNote: 'Zero overage quotation auto-approved directly without manager escalation.',
      });

      return {
        quotation: confirmed,
        status: 'APPROVED',
        message: 'Quotation within compliant limits auto-approved directly.',
      };
    }

    // Otherwise delegate to approvalService for multi-step approval creation
    const result = await approvalService.submitQuotation(quotationId, actorUser);
    return { ...result.quotation, ...result };
  }

  /**
   * 8. Sales Dashboard Operational Metrics & Recent Activity Feed
   */
  async getDashboardMetrics(actorUser) {
    const isRep = actorUser.role === 'SALES_REP';
    const repFilter = isRep ? { ownerRepId: actorUser.userId || actorUser.id } : {};

    const [pendingApprovalsCount, openQuotationsCount, atRiskDealsCount, recentActivities, recentQuotes] =
      await Promise.all([
        prisma.quotation.count({
          where: {
            status: 'PENDING_APPROVAL',
            ...repFilter,
          },
        }),
        prisma.quotation.count({
          where: {
            status: { in: ['DRAFT', 'UNDER_NEGOTIATION'] },
            ...repFilter,
          },
        }),
        prisma.quotation.count({
          where: {
            riskLevel: 'HIGH',
            ...repFilter,
          },
        }),
        prisma.auditLog.findMany({
          where: repFilter.ownerRepId ? { quotation: { ownerRepId: repFilter.ownerRepId } } : {},
          include: {
            actor: { select: { id: true, name: true, role: true } },
            quotation: { select: { id: true, quoteNumber: true, customer: { select: { name: true } } } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        prisma.quotation.findMany({
          where: repFilter,
          include: {
            customer: { select: { name: true } },
          },
          orderBy: { updatedAt: 'desc' },
          take: 5,
        }),
      ]);

    return {
      metrics: {
        pendingApprovals: {
          count: pendingApprovalsCount,
          subtext: `${pendingApprovalsCount} quotation${pendingApprovalsCount === 1 ? '' : 's'} waiting`,
        },
        openQuotations: {
          count: openQuotationsCount,
          subtext: 'Active pipeline in draft & negotiation',
        },
        atRiskDeals: {
          count: atRiskDealsCount,
          subtext: 'Flagged by Deal Health limits',
        },
      },
      recentActivities,
      recentQuotes,
    };
  }
}

module.exports = new QuotationService();
