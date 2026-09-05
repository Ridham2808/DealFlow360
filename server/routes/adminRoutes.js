const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const productController = require('../controllers/productController');
const priceListController = require('../controllers/priceListController');
const discountController = require('../controllers/discountController');
const approvalRuleController = require('../controllers/approvalRuleController');
const warehouseController = require('../controllers/warehouseController');
const pricingController = require('../controllers/pricingController');
const subscriptionPlanController = require('../controllers/subscriptionPlanController');
const upsellRuleController = require('../controllers/upsellRuleController');
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
router.patch('/users/:id',                requireAdmin, (req, res, next) => adminController.editUser(req, res, next));
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

// ── Discount Tiers & Category Ceilings ──────────────────────────────────
router.get('/discount-tiers',                      requireAdminOrManager, (req, res, next) => discountController.listTiers(req, res, next));
router.patch('/discount-tiers/:id',                 requireAdmin,          (req, res, next) => discountController.updateTier(req, res, next));
router.get('/category-ceilings',                   requireAdminOrManager, (req, res, next) => discountController.listCeilings(req, res, next));
router.patch('/category-ceilings/:id',              requireAdmin,          (req, res, next) => discountController.updateCeiling(req, res, next));

// ── Approval Chain Rules ────────────────────────────────────────────────
router.get('/approval-chain-rules',                requireAdminOrManager, (req, res, next) => approvalRuleController.listRules(req, res, next));
router.post('/approval-chain-rules/preview',        requireAdminOrManager, (req, res, next) => approvalRuleController.previewRouting(req, res, next));
router.patch('/approval-chain-rules/:id',           requireAdmin,          (req, res, next) => approvalRuleController.updateRule(req, res, next));

// ── Pricing Resolution ──────────────────────────────────────────────────
router.post('/pricing/resolve',                    requireAdminOrManager, (req, res, next) => pricingController.resolvePrice(req, res, next));

// ── Warehouses & Stock Levels ───────────────────────────────────────────
router.get('/warehouses',                          requireAdminOrManager, (req, res, next) => warehouseController.listWarehouses(req, res, next));
router.post('/warehouses',                         requireAdmin,          (req, res, next) => warehouseController.createWarehouse(req, res, next));
router.get('/warehouses/:id',                      requireAdminOrManager, (req, res, next) => warehouseController.getWarehouse(req, res, next));
router.patch('/warehouses/:id',                     requireAdmin,          (req, res, next) => warehouseController.updateWarehouse(req, res, next));
router.get('/warehouses/:id/stock',                requireAdminOrManager, (req, res, next) => warehouseController.getStock(req, res, next));
router.patch('/warehouses/:id/stock/:productId',    requireAdmin,          (req, res, next) => warehouseController.updateStock(req, res, next));

// ── Subscription Plans (ADMIN only) ─────────────────────────────────────
router.get('/subscription-plans',                  requireAdminOrManager, (req, res, next) => subscriptionPlanController.listPlans(req, res, next));
router.get('/subscription-plans/:id',              requireAdminOrManager, (req, res, next) => subscriptionPlanController.getPlanById(req, res, next));
router.post('/subscription-plans',                 requireAdmin,          (req, res, next) => subscriptionPlanController.createPlan(req, res, next));
router.patch('/subscription-plans/:id',            requireAdmin,          (req, res, next) => subscriptionPlanController.updatePlan(req, res, next));
router.delete('/subscription-plans/:id',           requireAdmin,          (req, res, next) => subscriptionPlanController.deletePlan(req, res, next));

// ── Upsell & Cross-Sell Rules (ADMIN only) ──────────────────────────────
router.get('/upsell-rules',                        requireAdminOrManager, (req, res, next) => upsellRuleController.listRules(req, res, next));
router.post('/upsell-rules',                       requireAdmin,          (req, res, next) => upsellRuleController.createRule(req, res, next));
router.patch('/upsell-rules/:id',                  requireAdmin,          (req, res, next) => upsellRuleController.updateRule(req, res, next));
router.delete('/upsell-rules/:id',                 requireAdmin,          (req, res, next) => upsellRuleController.deleteRule(req, res, next));

module.exports = router;
