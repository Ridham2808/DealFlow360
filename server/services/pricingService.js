const prisma = require('../prisma/prisma');
const { ApiError } = require('../utils/apiResponse');

/**
 * Pricing Service — Decimal-safe pricing resolution engine for DealFlow360.
 * Implements customer-tier price lists, variant surcharges, and negative-price prevention.
 */
class PricingService {
  /**
   * Resolve unit price and line totals for a product given customer tier, currency, quantity, and optional variant.
   * 
   * @param {string} productId
   * @param {string} customerTier - 'BRONZE' | 'SILVER' | 'GOLD'
   * @param {string} currency     - 'USD' | 'EUR' | 'INR'
   * @param {number} quantity     - default 1
   * @param {string} [variantId]  - optional product variant ID
   * @returns {Promise<object>} Structured pricing result
   */
  async resolvePrice(productId, customerTier = 'BRONZE', currency = 'USD', quantity = 1, variantId = null) {
    if (!productId) {
      throw new ApiError('Product ID is required for price resolution.', 400, 'VALIDATION_ERROR');
    }

    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    const targetCurrency = (currency || 'USD').toUpperCase().trim();
    const targetTier = (customerTier || 'BRONZE').toUpperCase().trim();

    // 1. Fetch product
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        sku: true,
        category: true,
        basePrice: true,
        unit: true,
        taxPercent: true,
        isActive: true,
      },
    });

    if (!product) {
      throw new ApiError('Product not found.', 404, 'PRODUCT_NOT_FOUND');
    }

    if (!product.isActive) {
      throw new ApiError('Product is not active in the catalog.', 400, 'PRODUCT_INACTIVE');
    }

    const basePrice = Math.round(parseFloat(String(product.basePrice || 0)) * 100) / 100;

    // 2. Fetch variant surcharge if variantId is provided
    let variantSurcharge = 0;
    let variantInfo = null;

    if (variantId) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
      });

      if (!variant) {
        throw new ApiError('Product variant not found.', 404, 'VARIANT_NOT_FOUND');
      }

      if (variant.productId !== productId) {
        throw new ApiError('Variant does not belong to specified product.', 400, 'VARIANT_MISMATCH');
      }

      if (!variant.isActive) {
        throw new ApiError('Product variant is inactive.', 400, 'VARIANT_INACTIVE');
      }

      variantSurcharge = Math.max(0, Math.round(parseFloat(String(variant.extraPrice || 0)) * 100) / 100);
      variantInfo = {
        id: variant.id,
        attributeName: variant.attributeName,
        attributeValue: variant.attributeValue,
        skuSuffix: variant.skuSuffix,
        extraPrice: variantSurcharge,
      };
    }

    // 3. Resolve Price List for customerTier & currency
    let priceListAdjustment = 0;
    let effectivePriceListId = null;
    let source = 'BASE_PRICE';
    let appliedRule = null;

    // First, check if there is an active price list for this tier & currency with an override for this product
    let priceList = await prisma.priceList.findFirst({
      where: {
        customerTier: targetTier,
        currency: targetCurrency,
        isActive: true,
        items: {
          some: { productId },
        },
      },
      include: {
        items: {
          where: { productId },
        },
      },
    });

    // If no item-specific price list, fallback to general tier price list
    if (!priceList) {
      priceList = await prisma.priceList.findFirst({
        where: {
          customerTier: targetTier,
          currency: targetCurrency,
          isActive: true,
        },
        include: {
          items: {
            where: { productId },
          },
        },
        orderBy: { id: 'desc' },
      });
    }

    if (priceList) {
      effectivePriceListId = priceList.id;

      // Check for item-specific override in this price list
      if (priceList.items && priceList.items.length > 0) {
        const itemOverride = priceList.items[0];
        const rawVal = itemOverride.unitPrice != null ? itemOverride.unitPrice : itemOverride.customPrice;
        const overridePrice = parseFloat(String(rawVal || 0));
        const customPrice = Math.round(overridePrice * 100) / 100;
        priceListAdjustment = Math.round((customPrice - basePrice) * 100) / 100;
        source = 'PRICE_LIST_ITEM_OVERRIDE';
        appliedRule = {
          priceListId: priceList.id,
          priceListName: priceList.name,
          type: 'EXACT_PRICE',
          customPrice,
        };
      } else if (priceList.pricingRule) {
        const match = String(priceList.pricingRule).match(/(\d+(?:\.\d+)?)\s*%/);
        const pct = match ? parseFloat(match[1]) : 0;
        const isDiscount = /discount|off|markdown/i.test(priceList.pricingRule);
        const factor = isDiscount ? -1 : 1;
        priceListAdjustment = Math.round((basePrice * (factor * (pct / 100))) * 100) / 100;
        source = 'PRICE_LIST_TIER_RULE';
        appliedRule = {
          priceListId: priceList.id,
          priceListName: priceList.name,
          type: 'PERCENTAGE_RULE',
          adjustmentPercent: factor * pct,
        };
      }
    }

    if (isNaN(priceListAdjustment)) {
      priceListAdjustment = 0;
    }

    // 4. Calculate final unit price
    // Base + PriceListAdjustment + VariantSurcharge
    // CRITICAL: A price-list rule cannot create a negative final price
    let rawUnitPrice = basePrice + priceListAdjustment + variantSurcharge;
    const finalUnitPrice = Math.max(0, Math.round(rawUnitPrice * 100) / 100);

    const lineTotal = Math.round((finalUnitPrice * qty) * 100) / 100;
    const estimatedTax = Math.round((lineTotal * (Number(product.taxPercent || 0) / 100)) * 100) / 100;

    return {
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      category: product.category,
      unit: product.unit,
      currency: targetCurrency,
      customerTier: targetTier,
      basePrice,
      priceListAdjustment,
      variantSurcharge,
      finalUnitPrice,
      quantity: qty,
      lineTotal,
      taxPercent: Number(product.taxPercent || 0),
      estimatedTax,
      effectivePriceListId,
      source,
      appliedRule,
      variant: variantInfo,
      resolvedAt: new Date().toISOString(),
    };
  }
}

module.exports = new PricingService();
