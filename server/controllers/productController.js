const productService = require('../services/productService');
const {
  validateCreateProduct,
  validateUpdateProduct,
  validateCreateVariant,
  validateUpdateVariant,
} = require('../validators/productValidator');
const { success } = require('../utils/apiResponse');

class ProductController {
  async listProducts(req, res, next) {
    try {
      const { category, search, isActive, page = 1, limit = 50 } = req.query;
      const result = await productService.listProducts({
        category,
        search,
        isActive,
        page: Number(page),
        limit: Number(limit),
      });
      return res.status(200).json(success(result));
    } catch (err) {
      next(err);
    }
  }

  async getProduct(req, res, next) {
    try {
      const { id } = req.params;
      const product = await productService.getProductById(id);
      return res.status(200).json(success(product));
    } catch (err) {
      next(err);
    }
  }

  async createProduct(req, res, next) {
    try {
      const validated = validateCreateProduct(req.body);
      const product = await productService.createProduct(validated, req.user.userId);
      return res.status(201).json(success(product, 'Product created successfully.'));
    } catch (err) {
      next(err);
    }
  }

  async updateProduct(req, res, next) {
    try {
      const { id } = req.params;
      const validated = validateUpdateProduct(req.body);
      const product = await productService.updateProduct(id, validated, req.user.userId);
      return res.status(200).json(success(product, 'Product updated successfully.'));
    } catch (err) {
      next(err);
    }
  }

  async deleteProduct(req, res, next) {
    try {
      const { id } = req.params;
      const product = await productService.deleteProduct(id, req.user.userId);
      return res.status(200).json(success(product, 'Product deleted successfully.'));
    } catch (err) {
      next(err);
    }
  }

  async listVariants(req, res, next) {
    try {
      const { id } = req.params;
      const variants = await productService.listVariants(id);
      return res.status(200).json(success(variants));
    } catch (err) {
      next(err);
    }
  }

  async createVariant(req, res, next) {
    try {
      const { id } = req.params;
      const validated = validateCreateVariant(req.body);
      const variant = await productService.createVariant(id, validated, req.user.userId);
      return res.status(201).json(success(variant, 'Variant created successfully.'));
    } catch (err) {
      next(err);
    }
  }

  async updateVariant(req, res, next) {
    try {
      const { id, variantId } = req.params;
      const validated = validateUpdateVariant(req.body);
      const variant = await productService.updateVariant(id, variantId, validated, req.user.userId);
      return res.status(200).json(success(variant, 'Variant updated successfully.'));
    } catch (err) {
      next(err);
    }
  }

  async deleteVariant(req, res, next) {
    try {
      const { id, variantId } = req.params;
      const result = await productService.deleteVariant(id, variantId, req.user.userId);
      return res.status(200).json(success(result, 'Variant deleted successfully.'));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ProductController();
