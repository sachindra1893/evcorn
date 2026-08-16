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

function generateUserToken(payload = {}) {
  return jwt.sign({ ...payload, role: 'user' }, config.USER_JWT_SECRET, {
    expiresIn: '7d',
    algorithm: 'HS256'
  });
}

function verifyUserToken(token) {
  try {
    return jwt.verify(token, config.USER_JWT_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    return null;
  }
}

module.exports = {
  generateToken,
  verifyToken,
  generateUserToken,
  verifyUserToken
};
