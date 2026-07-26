/**
 * Enterprise Rate Limiting Middlewares (express-rate-limit)
 * Protects APIs against denial-of-service and brute-force attacks.
 */
const rateLimit = require('express-rate-limit');

// Public Read API Limiter (300 requests per 15 minutes)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests from this IP, please try again after 15 minutes.'
    }
  }
});

// Admin Auth Login Limiter (10 requests per 15 minutes - Brute Force Protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_LOGIN_ATTEMPTS',
      message: 'Too many failed login attempts. Account temporarily locked for 15 minutes.'
    }
  }
});

// Upload API Limiter (30 requests per 15 minutes)
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_UPLOADS',
      message: 'Image upload rate limit exceeded. Please wait before uploading more media.'
    }
  }
});

module.exports = {
  apiLimiter,
  authLimiter,
  uploadLimiter
};
