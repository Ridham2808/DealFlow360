const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateLoginInput } = require('../validators/authValidator');
const authMiddleware = require('../middleware/authMiddleware');

// ── Public endpoints ─────────────────────────────────────────────────
router.post('/login',  validateLoginInput, (req, res, next) => authController.login(req, res, next));
router.post('/logout', (req, res)         => authController.logout(req, res));

// POST /signup — permanently disabled, returns 403
router.post('/signup', (req, res) => authController.signup(req, res));

// Invitation flow (public — requires valid token, not auth session)
router.post('/invitation/validate', (req, res, next) => authController.validateInvitation(req, res, next));
router.post('/invitation/accept',   (req, res, next) => authController.acceptInvitation(req, res, next));

// ── Authenticated session ────────────────────────────────────────────
router.get('/me', authMiddleware, (req, res, next) => authController.getMe(req, res, next));
router.patch('/profile', authMiddleware, (req, res, next) => authController.updateProfile(req, res, next));

module.exports = router;
