/**
 * Auth Routes Definition (Secured with Rate Limiting)
 */
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authLimiter } = require('../middlewares/rateLimit.middleware');
const { checkAdminAuth } = require('../middlewares/auth.middleware');
const { requireUserAuth } = require('../middlewares/userAuth.middleware');

// Admin Auth
router.post('/login', authLimiter, authController.login);
router.post('/logout', checkAdminAuth, authController.logout);

// End-User Google OAuth
router.post('/google', authLimiter, authController.googleLogin);
router.get('/me', requireUserAuth, authController.getCurrentUser);

module.exports = router;
