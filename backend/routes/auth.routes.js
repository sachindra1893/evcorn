/**
 * Auth Routes Definition (Secured with Rate Limiting)
 */
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authLimiter } = require('../middlewares/rateLimit.middleware');
const { checkAdminAuth } = require('../middlewares/auth.middleware');

router.post('/login', authLimiter, authController.login);
router.post('/logout', checkAdminAuth, authController.logout);

module.exports = router;
