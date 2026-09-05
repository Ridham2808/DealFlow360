const productRepository = require('../repositories/productRepository');
const prisma = require('../prisma/prisma');
const auditService = require('./auditService');
const { ApiError } = require('../utils/apiResponse');

class ProductService {
  async listProducts(filters) {
    return productRepository.findAll(filters);
  }

  async getProductById(id) {
    const product = await productRepository.findById(id);
    if (!product) {
      throw new ApiError('Product not found.', 404, 'PRODUCT_NOT_FOUND');
    }
    return product;
  }

  async createProduct(data, actorId) {
    // 1. Check SKU collision
    const existing = await productRepository.findBySku(data.sku);
    if (existing) {
      throw new ApiError(`Product SKU '${data.sku}' already exists.`, 409, 'SKU_ALREADY_EXISTS');
    }

    // 2. Margin warning / validation
    if (data.basePrice < data.baseCost) {
      // Allowed in B2B loss-leader strategies, but logged in metadata
    }

    const product = await productRepository.create(data);

    // 3. Audit trail
    if (actorId) {
      auditService.log({
        actorId,
        action: 'CREATED_PRODUCT',
        targetId: product.id,
        targetType: 'Product',
        reasonNote: `Product ${product.name} (${product.sku}) created by administrator.`,
        meta: { sku: product.sku, basePrice: product.basePrice, category: product.category },
      });
    }

    return product;
  }

  async updateProduct(id, updates, actorId) {
    const existing = await productRepository.findById(id);
    if (!existing) {
      throw new ApiError('Product not found.', 404, 'PRODUCT_NOT_FOUND');
    }

    if (updates.sku && updates.sku !== existing.sku) {
      const skuCheck = await productRepository.findBySku(updates.sku);
      if (skuCheck) {
        throw new ApiError(`Product SKU '${updates.sku}' already exists.`, 409, 'SKU_ALREADY_EXISTS');
      }
    }

    const updated = await productRepository.update(id, updates);

    if (actorId) {
      auditService.log({
        actorId,
        action: 'UPDATED_PRODUCT',
        targetId: updated.id,
        targetType: 'Product',
        reasonNote: `Product ${updated.sku} updated.`,
        meta: { changedFields: Object.keys(updates) },
      });
    }

    return updated;
  }

  async deleteProduct(id, actorId) {
    const existing = await productRepository.findById(id);
    if (!existing) {
      throw new ApiError('Product not found.', 404, 'PRODUCT_NOT_FOUND');
    }

    // Check if product has active inventory stock
    const activeStock = await prisma.stockLevel.findFirst({
      where: { productId: id, quantityOnHand: { gt: 0 } },
    });
    if (activeStock) {
      throw new ApiError(
        `Cannot delete product '${existing.sku}' because it has active inventory on hand in warehouse(s). Reduce stock or deactivate.`,
        409,
        'PRODUCT_HAS_STOCK_DEPENDENCY'
      );
    }

    // Check if product is referenced by existing quotation lines
    const quoteLineCount = await prisma.quotationLine.count({
      where: { productId: id },
    });

    const deactivated = await productRepository.softDelete(id);

    if (actorId) {
      auditService.log({
        actorId,
        action: 'DELETED_PRODUCT',
        targetId: id,
        targetType: 'Product',
        reasonNote: `Product ${existing.sku} soft-deleted. Referenced in ${quoteLineCount} quotation line(s).`,
        beforeStatus: 'ACTIVE',
        afterStatus: 'INACTIVE',
      });
    }

    return {
      ...deactivated,
      softDeleted: true,
      referencedQuotationsCount: quoteLineCount,
    };
  }

  async listVariants(productId) {
    await this.getProductById(productId);
    return productRepository.findVariants(productId);
  }

  async createVariant(productId, data, actorId) {
    const product = await this.getProductById(productId);

    // Check duplicate attribute or suffix for this product
    const existingVariants = await productRepository.findVariants(productId);
    const duplicateSuffix = existingVariants.some(
      (v) => v.skuSuffix.toUpperCase() === data.skuSuffix.toUpperCase()
    );
    if (duplicateSuffix) {
      throw new ApiError(
        `Variant SKU suffix '${data.skuSuffix}' already exists for this product.`,
        409,
        'VARIANT_SUFFIX_EXISTS'
      );
    }

    const variant = await productRepository.createVariant(productId, data);

    if (actorId) {
      auditService.log({
        actorId,
        action: 'CREATED_VARIANT',
        targetId: variant.id,
        targetType: 'ProductVariant',
        reasonNote: `Variant ${variant.attributeName}:${variant.attributeValue} added to product ${product.sku}`,
        meta: { productId, skuSuffix: variant.skuSuffix, extraPrice: variant.extraPrice },
      });
    }

    return variant;
  }

  async updateVariant(productId, variantId, updates, actorId) {
    await this.getProductById(productId);
    const variant = await productRepository.findVariantById(productId, variantId);
    if (!variant) {
      throw new ApiError('Product variant not found.', 404, 'VARIANT_NOT_FOUND');
    }

    if (updates.skuSuffix && updates.skuSuffix !== variant.skuSuffix) {
      const existingVariants = await productRepository.findVariants(productId);
      const duplicateSuffix = existingVariants.some(
        (v) => v.id !== variantId && v.skuSuffix.toUpperCase() === updates.skuSuffix.toUpperCase()
      );
      if (duplicateSuffix) {
        throw new ApiError(
          `Variant SKU suffix '${updates.skuSuffix}' already exists for this product.`,
          409,
          'VARIANT_SUFFIX_EXISTS'
        );
      }
    }

    const updated = await productRepository.updateVariant(variantId, updates);

    if (actorId) {
      auditService.log({
        actorId,
        action: 'UPDATED_VARIANT',
        targetId: variantId,
        targetType: 'ProductVariant',
        reasonNote: `Variant ${variantId} updated.`,
        meta: { productId, changedFields: Object.keys(updates) },
      });
    }

    return updated;
  }

  async deleteVariant(productId, variantId, actorId) {
    await this.getProductById(productId);
    const variant = await productRepository.findVariantById(productId, variantId);
    if (!variant) {
      throw new ApiError('Product variant not found.', 404, 'VARIANT_NOT_FOUND');
    }

    await productRepository.deleteVariant(variantId);

    if (actorId) {
      auditService.log({
        actorId,
        action: 'DELETED_VARIANT',
        targetId: variantId,
        targetType: 'ProductVariant',
        reasonNote: `Variant ${variantId} (${variant.skuSuffix}) deleted from product ${productId}.`,
      });
    }

    return { message: 'Variant deleted successfully.' };
  }
}

module.exports = new ProductService();
