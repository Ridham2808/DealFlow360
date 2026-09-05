const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// All admin routes require authentication + ADMIN role
router.use(authMiddleware);
router.use(requireRole(['ADMIN']));

// ── Internal Users ───────────────────────────────────────────────────
router.get('/users',                      (req, res, next) => adminController.listUsers(req, res, next));
router.post('/users',                     (req, res, next) => adminController.createUser(req, res, next));
router.post('/users/:id/deactivate',      (req, res, next) => adminController.deactivateUser(req, res, next));
router.post('/users/:id/reactivate',      (req, res, next) => adminController.reactivateUser(req, res, next));
router.post('/users/:id/change-role',     (req, res, next) => adminController.changeRole(req, res, next));
router.post('/users/:id/resend-invite',   (req, res, next) => adminController.resendInvite(req, res, next));
router.post('/users/:id/reset-access',    (req, res, next) => adminController.resetAccess(req, res, next));

// ── Customers ────────────────────────────────────────────────────────
router.get('/customers',                          (req, res, next) => adminController.listCustomers(req, res, next));
router.post('/customers',                         (req, res, next) => adminController.createCustomer(req, res, next));
router.patch('/customers/:id',                    (req, res, next) => adminController.updateCustomer(req, res, next));
router.post('/customers/:id/deactivate',          (req, res, next) => adminController.deactivateCustomer(req, res, next));
router.post('/customers/:id/send-portal-invite',  (req, res, next) => adminController.sendPortalInvite(req, res, next));

module.exports = router;
