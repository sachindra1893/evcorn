/**
 * Admin Password & JWT Verification Middleware
 * Supports both legacy header (x-admin-password) AND Bearer JWT token.
 */
const config = require('../config/env');
const { verifyToken } = require('../utils/auth.utils');
const logger = require('../utils/logger');
const { UnauthorizedError } = require('../errors/AppError');

function checkAdminAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const legacyPassword = req.headers['x-admin-password'];

  // 1. Check Bearer Token
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (decoded && decoded.role === 'admin') {
      req.user = decoded;
      return next();
    }
  }

  // 2. Check Legacy Admin Password Header (Backward Compatibility)
  if (legacyPassword === config.ADMIN_PASSWORD) {
    req.user = { role: 'admin', legacy: true };
    return next();
  }

  // Auth Failure
  logger.audit('UNAUTHORIZED_ACCESS_ATTEMPT', {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip || req.headers['x-forwarded-for']
  });
  next(new UnauthorizedError('Invalid or expired admin authentication credentials'));
}

module.exports = {
  checkAdminAuth
};
