const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const productController = require('../controllers/productController');
const priceListController = require('../controllers/priceListController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Base authentication required for all routes
router.use(authMiddleware);

// Helper role filters
const requireAdmin = requireRole(['ADMIN']);
const requireAdminOrManager = requireRole(['ADMIN', 'SALES_MANAGER']);

// ── Internal Users (ADMIN only) ─────────────────────────────────────────
router.get('/users',                      requireAdmin, (req, res, next) => adminController.listUsers(req, res, next));
router.post('/users',                     requireAdmin, (req, res, next) => adminController.createUser(req, res, next));
router.post('/users/:id/deactivate',      requireAdmin, (req, res, next) => adminController.deactivateUser(req, res, next));
router.post('/users/:id/reactivate',      requireAdmin, (req, res, next) => adminController.reactivateUser(req, res, next));
router.post('/users/:id/change-role',     requireAdmin, (req, res, next) => adminController.changeRole(req, res, next));
router.post('/users/:id/resend-invite',   requireAdmin, (req, res, next) => adminController.resendInvite(req, res, next));
router.post('/users/:id/reset-access',    requireAdmin, (req, res, next) => adminController.resetAccess(req, res, next));

// ── Customers (ADMIN only) ──────────────────────────────────────────────
router.get('/customers',                          requireAdmin, (req, res, next) => adminController.listCustomers(req, res, next));
router.post('/customers',                         requireAdmin, (req, res, next) => adminController.createCustomer(req, res, next));
router.patch('/customers/:id',                    requireAdmin, (req, res, next) => adminController.updateCustomer(req, res, next));
router.post('/customers/:id/deactivate',          requireAdmin, (req, res, next) => adminController.deactivateCustomer(req, res, next));
router.post('/customers/:id/send-portal-invite',  requireAdmin, (req, res, next) => adminController.sendPortalInvite(req, res, next));

// ── Products & Catalog ──────────────────────────────────────────────────
router.get('/products',                   requireAdminOrManager, (req, res, next) => productController.listProducts(req, res, next));
router.post('/products',                  requireAdmin,          (req, res, next) => productController.createProduct(req, res, next));
router.get('/products/:id',               requireAdminOrManager, (req, res, next) => productController.getProduct(req, res, next));
router.patch('/products/:id',              requireAdmin,          (req, res, next) => productController.updateProduct(req, res, next));
router.delete('/products/:id',            requireAdmin,          (req, res, next) => productController.deleteProduct(req, res, next));

// ── Product Variants ────────────────────────────────────────────────────
router.get('/products/:id/variants',                       requireAdminOrManager, (req, res, next) => productController.listVariants(req, res, next));
router.post('/products/:id/variants',                      requireAdmin,          (req, res, next) => productController.createVariant(req, res, next));
router.patch('/products/:id/variants/:variantId',          requireAdmin,          (req, res, next) => productController.updateVariant(req, res, next));
router.delete('/products/:id/variants/:variantId',         requireAdmin,          (req, res, next) => productController.deleteVariant(req, res, next));

// ── Price Lists & Items ─────────────────────────────────────────────────
router.get('/pricelists',                         requireAdminOrManager, (req, res, next) => priceListController.listPriceLists(req, res, next));
router.post('/pricelists',                        requireAdmin,          (req, res, next) => priceListController.createPriceList(req, res, next));
router.get('/pricelists/:id',                     requireAdminOrManager, (req, res, next) => priceListController.getPriceList(req, res, next));
router.patch('/pricelists/:id',                    requireAdmin,          (req, res, next) => priceListController.updatePriceList(req, res, next));
router.delete('/pricelists/:id',                  requireAdmin,          (req, res, next) => priceListController.deletePriceList(req, res, next));
router.post('/pricelists/:id/items',              requireAdmin,          (req, res, next) => priceListController.addItem(req, res, next));
router.patch('/pricelists/:id/items/:itemId',      requireAdmin,          (req, res, next) => priceListController.updateItem(req, res, next));
router.delete('/pricelists/:id/items/:itemId',     requireAdmin,          (req, res, next) => priceListController.deleteItem(req, res, next));

module.exports = router;
