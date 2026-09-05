const priceListRepository = require('../repositories/priceListRepository');
const productRepository = require('../repositories/productRepository');
const auditService = require('./auditService');
const { ApiError } = require('../utils/apiResponse');

class PriceListService {
  async listPriceLists(filters) {
    return priceListRepository.findAll(filters);
  }

  async getPriceListById(id) {
    const list = await priceListRepository.findById(id);
    if (!list) {
      throw new ApiError('Price list not found.', 404, 'PRICE_LIST_NOT_FOUND');
    }
    return list;
  }

  async createPriceList(data, actorId) {
    const priceList = await priceListRepository.create(data);

    if (actorId) {
      auditService.log({
        actorId,
        action: 'CREATED_PRICE_LIST',
        targetId: priceList.id,
        targetType: 'PriceList',
        reasonNote: `Price list ${priceList.name} created for tier ${priceList.customerTier}.`,
        meta: { name: priceList.name, tier: priceList.customerTier, currency: priceList.currency },
      });
    }

    return priceList;
  }

  async updatePriceList(id, updates, actorId) {
    const existing = await this.getPriceListById(id);
    const updated = await priceListRepository.update(id, updates);

    if (actorId) {
      auditService.log({
        actorId,
        action: 'UPDATED_PRICE_LIST',
        targetId: updated.id,
        targetType: 'PriceList',
        reasonNote: `Price list ${updated.name} updated.`,
        meta: { changedFields: Object.keys(updates) },
      });
    }

    return updated;
  }

  async deletePriceList(id, actorId) {
    const existing = await this.getPriceListById(id);
    await priceListRepository.delete(id);

    if (actorId) {
      auditService.log({
        actorId,
        action: 'DELETED_PRICE_LIST',
        targetId: id,
        targetType: 'PriceList',
        reasonNote: `Price list ${existing.name} (${existing.customerTier}) deleted.`,
      });
    }

    return { message: 'Price list deleted successfully.' };
  }

  async addItem(priceListId, itemData, actorId) {
    await this.getPriceListById(priceListId);

    // Verify product exists
    const product = await productRepository.findById(itemData.productId);
    if (!product) {
      throw new ApiError('Product not found for price list item.', 404, 'PRODUCT_NOT_FOUND');
    }

    // Verify variant if provided
    if (itemData.variantId) {
      const variant = await productRepository.findVariantById(itemData.productId, itemData.variantId);
      if (!variant) {
        throw new ApiError('Product variant not found for this product.', 404, 'VARIANT_NOT_FOUND');
      }
    }

    const item = await priceListRepository.addItem(priceListId, itemData);

    if (actorId) {
      auditService.log({
        actorId,
        action: 'ADDED_PRICE_LIST_ITEM',
        targetId: item.id,
        targetType: 'PriceListItem',
        reasonNote: `Added item for product ${product.sku} at unit price $${item.unitPrice} to price list ${priceListId}.`,
        meta: { priceListId, productId: item.productId, unitPrice: item.unitPrice },
      });
    }

    return item;
  }

  async updateItem(priceListId, itemId, updates, actorId) {
    await this.getPriceListById(priceListId);
    const item = await priceListRepository.findItemById(itemId);
    if (!item || item.priceListId !== priceListId) {
      throw new ApiError('Price list item not found.', 404, 'ITEM_NOT_FOUND');
    }

    const updated = await priceListRepository.updateItem(itemId, updates);

    if (actorId) {
      auditService.log({
        actorId,
        action: 'UPDATED_PRICE_LIST_ITEM',
        targetId: itemId,
        targetType: 'PriceListItem',
        reasonNote: `Price list item ${itemId} updated.`,
        meta: { changedFields: Object.keys(updates) },
      });
    }

    return updated;
  }

  async deleteItem(priceListId, itemId, actorId) {
    await this.getPriceListById(priceListId);
    const item = await priceListRepository.findItemById(itemId);
    if (!item || item.priceListId !== priceListId) {
      throw new ApiError('Price list item not found.', 404, 'ITEM_NOT_FOUND');
    }

    await priceListRepository.deleteItem(itemId);

    if (actorId) {
      auditService.log({
        actorId,
        action: 'DELETED_PRICE_LIST_ITEM',
        targetId: itemId,
        targetType: 'PriceListItem',
        reasonNote: `Price list item ${itemId} deleted from price list ${priceListId}.`,
      });
    }

    return { message: 'Price list item deleted successfully.' };
  }
}

module.exports = new PriceListService();
