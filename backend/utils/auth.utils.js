/**
 * JWT Authentication & Token Management Utility
 */
const jwt = require('jsonwebtoken');
const config = require('../config/env');

function generateToken(payload = { role: 'admin' }) {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
    algorithm: 'HS256'
  });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, config.JWT_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    return null;
  }
}

module.exports = {
  generateToken,
  verifyToken
};
