/**
 * Auth Controller (Admin JWT + End-User Google OAuth 2.0)
 */
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const config = require('../config/env');
const User = require('../models/User');
const { generateToken, generateUserToken } = require('../utils/auth.utils');
const logger = require('../utils/logger');
const { UnauthorizedError } = require('../errors/AppError');

const googleClient = new OAuth2Client(config.GOOGLE_CLIENT_ID);

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

  async googleLogin(req, res, next) {
    try {
      const token = req.body ? (req.body.credential || req.body.token || req.body.idToken) : null;

      if (!token || typeof token !== 'string' || !token.trim()) {
        throw new UnauthorizedError('Google ID token is missing or invalid');
      }

      let payload;
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: token,
          audience: config.GOOGLE_CLIENT_ID
        });
        payload = ticket.getPayload();
      } catch (verifyErr) {
        logger.warn(`Google token verification failed: ${verifyErr.message}`);
        throw new UnauthorizedError(`Google token verification failed: ${verifyErr.message}`);
      }

      if (!payload || !payload.sub || !payload.email) {
        throw new UnauthorizedError('Google ID token payload is missing required fields');
      }

      // Find or create user in MongoDB
      let user = await User.findOne({ googleId: payload.sub });
      if (!user) {
        user = await User.create({
          googleId: payload.sub,
          email: payload.email,
          name: payload.name || payload.given_name || 'EVCorn User',
          avatarUrl: payload.picture || ''
        });
        logger.info(`Created new user via Google OAuth: ${user.email} (${user._id})`);
      } else {
        let updated = false;
        if (payload.name && user.name !== payload.name) {
          user.name = payload.name;
          updated = true;
        }
        if (payload.picture && user.avatarUrl !== payload.picture) {
          user.avatarUrl = payload.picture;
          updated = true;
        }
        if (updated) {
          await user.save();
        }
      }

      // Generate End-User Session JWT using USER_JWT_SECRET
      const sessionJwt = generateUserToken({
        id: user._id.toString(),
        googleId: user.googleId,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl
      });

      logger.audit('USER_GOOGLE_LOGIN_SUCCESS', {
        userId: user._id,
        email: user.email,
        ip: req.ip
      });

      return res.json({
        success: true,
        token: sessionJwt,
        user: {
          id: user._id,
          googleId: user.googleId,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          createdAt: user.createdAt
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async getCurrentUser(req, res, next) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        throw new UnauthorizedError('User not found');
      }
      res.json({
        success: true,
        user: {
          id: user._id,
          googleId: user.googleId,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          createdAt: user.createdAt
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
