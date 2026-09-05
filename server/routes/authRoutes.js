const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateLoginInput, validateSignupInput } = require('../validators/authValidator');
const authMiddleware = require('../middleware/authMiddleware');

// Public endpoints
router.post('/signup', validateSignupInput, (req, res, next) => authController.signup(req, res, next));
router.post('/login', validateLoginInput, (req, res, next) => authController.login(req, res, next));
router.post('/logout', (req, res) => authController.logout(req, res));

// Authenticated session endpoint
router.get('/me', authMiddleware, (req, res, next) => authController.getMe(req, res, next));

module.exports = router;
