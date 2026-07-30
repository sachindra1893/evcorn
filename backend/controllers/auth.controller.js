/**
 * Auth Controller (JWT issuance + audit trail)
 * Login compares ADMIN_PASSWORD with timing-safe equality; API auth is JWT-only.
 */
const crypto = require('crypto');
const config = require('../config/env');
const { generateToken } = require('../utils/auth.utils');
const logger = require('../utils/logger');
const { UnauthorizedError } = require('../errors/AppError');

function passwordsMatch(provided, expected) {
  if (typeof provided !== 'string' || typeof expected !== 'string') return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

class AuthController {
  async login(req, res, next) {
    try {
      const { password } = req.body;
      const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

      if (passwordsMatch(password, config.ADMIN_PASSWORD)) {
        const token = generateToken({ role: 'admin', ip: clientIp });
        logger.audit('ADMIN_LOGIN_SUCCESS', { ip: clientIp, userAgent: req.headers['user-agent'] });
        return res.json({
          success: true,
          token,
          expiresIn: config.JWT_EXPIRES_IN
        });
      }

      logger.audit('ADMIN_LOGIN_FAILED', { ip: clientIp, userAgent: req.headers['user-agent'] });
      throw new UnauthorizedError('Invalid Admin Password');
    } catch (err) {
      next(err);
    }
  }

  async logout(req, res, next) {
    try {
      logger.audit('ADMIN_LOGOUT', { ip: req.ip });
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
