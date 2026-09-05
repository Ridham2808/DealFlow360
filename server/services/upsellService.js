const prisma = require('../prisma/prisma');
const { ApiError } = require('../utils/apiResponse');

/**
 * Standardize decimal precision
 */
function round2(num) {
  return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
}

class UpsellService {
  /**
   * Compute ranked upsell and cross-sell suggestions for an active quotation.
   *
   * @param {string} quotationId
   * @returns {Promise<Array>} Ranked suggestions
   */
  async getUpsellSuggestions(quotationId) {
    const quote = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        customer: true,
        lines: {
          select: {
            productId: true,
          },
        },
      },
    });

    if (!quote) {
      throw new ApiError('Quotation not found.', 404, 'QUOTATION_NOT_FOUND');
    }

    const currentProductIds = new Set(quote.lines.map((l) => l.productId));

    // If quotation has no lines yet, recommend promoted products with high margins
    let rules = [];
    if (currentProductIds.size > 0) {
      rules = await prisma.upsellRule.findMany({
        where: {
          isActive: true,
          triggerProductId: { in: Array.from(currentProductIds) },
        },
        include: {
          triggerProduct: { select: { id: true, name: true } },
          suggestedProduct: {
            select: {
              id: true,
              name: true,
              sku: true,
              category: true,
              basePrice: true,
              baseCost: true,
              isActive: true,
            },
          },
        },
      });
    }

    // Also include general promoted items if fewer than 3 pairing suggestions
    if (rules.length < 3) {
      const promotedRules = await prisma.upsellRule.findMany({
        where: {
          isActive: true,
          isPromoted: true,
        },
        include: {
          triggerProduct: { select: { id: true, name: true } },
          suggestedProduct: {
            select: {
              id: true,
              name: true,
              sku: true,
              category: true,
              basePrice: true,
              baseCost: true,
              isActive: true,
            },
          },
        },
        take: 5,
      });

      // Merge avoiding duplicates by rule id
      const existingRuleIds = new Set(rules.map((r) => r.id));
      for (const pr of promotedRules) {
        if (!existingRuleIds.has(pr.id)) {
          rules.push(pr);
          existingRuleIds.add(pr.id);
        }
      }
    }

    const suggestions = [];
    const seenSuggestedProductIds = new Set();

    for (const rule of rules) {
      const sp = rule.suggestedProduct;
      if (!sp || !sp.isActive) continue;

      // Never recommend products already in the quotation
      if (currentProductIds.has(sp.id)) continue;

      // Avoid suggesting the exact same product multiple times across rules
      if (seenSuggestedProductIds.has(sp.id)) continue;
      seenSuggestedProductIds.add(sp.id);

      const price = round2(Number(sp.basePrice || 0));
      const cost = round2(Number(sp.baseCost || 0));
      const marginDelta = round2(price - cost);
      const marginPercent = price > 0 ? round2((marginDelta / price) * 100) : 0;
      const threshold = round2(Number(rule.minimumMarginThreshold || 0));

      // Filter out suggestions below minimum margin threshold
      if (marginPercent < threshold) continue;

      // Calculate ranking score:
      // Base score from margin delta, +25 boost if actively promoted, +10 for direct pairing
      const isDirectPairing = currentProductIds.has(rule.triggerProductId);
      let rankingScore = Math.round(marginDelta);
      if (rule.isPromoted) rankingScore += 25;
      if (isDirectPairing) rankingScore += 15;

      const promotionTag = rule.isPromoted
        ? 'High Margin Recommended'
        : isDirectPairing
        ? `Pairs well with ${rule.triggerProduct.name}`
        : 'Smart Add-on';

      const reason = isDirectPairing
        ? `Frequently purchased together with ${rule.triggerProduct.name}. Adds +$${marginDelta.toFixed(2)} deal margin.`
        : `High-value addition yielding ${marginPercent}% margin.`;

      suggestions.push({
        id: rule.id,
        productId: sp.id,
        productName: sp.name,
        sku: sp.sku,
        category: sp.category,
        unitPrice: price,
        unitCost: cost,
        marginDelta,
        marginPercent,
        promotionTag,
        reason,
        rankingScore,
      });
    }

    // Sort descending by ranking score
    suggestions.sort((a, b) => b.rankingScore - a.rankingScore);

    return suggestions;
  }

  // Admin CRUD
  async listRules() {
    return prisma.upsellRule.findMany({
      include: {
        triggerProduct: { select: { id: true, name: true, sku: true } },
        suggestedProduct: { select: { id: true, name: true, sku: true, basePrice: true } },
      },
      orderBy: { id: 'asc' },
    });
  }

  async createRule(data) {
    const { triggerProductId, suggestedProductId, minimumMarginThreshold, isPromoted, isActive } = data;

    if (!triggerProductId || !suggestedProductId) {
      throw new ApiError('triggerProductId and suggestedProductId are required.', 400, 'VALIDATION_ERROR');
    }

    if (triggerProductId === suggestedProductId) {
      throw new ApiError('A product cannot trigger an upsell for itself.', 400, 'VALIDATION_ERROR');
    }

    const [trigger, suggested] = await Promise.all([
      prisma.product.findUnique({ where: { id: triggerProductId } }),
      prisma.product.findUnique({ where: { id: suggestedProductId } }),
    ]);

    if (!trigger || !suggested) {
      throw new ApiError('Trigger or suggested product does not exist in catalog.', 404, 'PRODUCT_NOT_FOUND');
    }

    return prisma.upsellRule.create({
      data: {
        triggerProductId,
        suggestedProductId,
        minimumMarginThreshold: round2(minimumMarginThreshold || 0),
        isPromoted: isPromoted === true,
        isActive: isActive !== false,
      },
      include: {
        triggerProduct: { select: { id: true, name: true, sku: true } },
        suggestedProduct: { select: { id: true, name: true, sku: true, basePrice: true } },
      },
    });
  }

  async updateRule(id, updates) {
    const existing = await prisma.upsellRule.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError('Upsell rule not found.', 404, 'RULE_NOT_FOUND');
    }

    const data = {};
    if (updates.minimumMarginThreshold !== undefined) {
      data.minimumMarginThreshold = round2(updates.minimumMarginThreshold);
    }
    if (updates.isPromoted !== undefined) data.isPromoted = Boolean(updates.isPromoted);
    if (updates.isActive !== undefined) data.isActive = Boolean(updates.isActive);

    return prisma.upsellRule.update({
      where: { id },
      data,
      include: {
        triggerProduct: { select: { id: true, name: true, sku: true } },
        suggestedProduct: { select: { id: true, name: true, sku: true, basePrice: true } },
      },
    });
  }

  async deleteRule(id) {
    const existing = await prisma.upsellRule.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError('Upsell rule not found.', 404, 'RULE_NOT_FOUND');
    }

    await prisma.upsellRule.delete({ where: { id } });
    return { success: true, message: 'Upsell rule deleted successfully.' };
  }
}

module.exports = new UpsellService();
