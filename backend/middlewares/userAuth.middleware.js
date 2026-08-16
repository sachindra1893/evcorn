/**
 * End-User JWT verification middleware.
 * Verifies USER_JWT_SECRET signed tokens on protected user endpoints.
 */
const { verifyUserToken } = require('../utils/auth.utils');
const { UnauthorizedError } = require('../errors/AppError');

function requireUserAuth(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const decoded = verifyUserToken(token);
    if (decoded && (decoded.role === 'user' || decoded.id)) {
      req.user = decoded;
      return next();
    }
  }

  next(new UnauthorizedError('Invalid or missing user authentication token'));
}

module.exports = {
  requireUserAuth
};
