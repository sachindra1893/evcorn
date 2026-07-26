/**
 * Admin Password Verification Middleware
 */
const config = require('../config/env');
const { UnauthorizedError } = require('../errors/AppError');

function checkAdminAuth(req, res, next) {
  const password = req.headers['x-admin-password'];
  if (password === config.ADMIN_PASSWORD) {
    next();
  } else {
    next(new UnauthorizedError('Invalid admin password'));
  }
}

module.exports = {
  checkAdminAuth
};
