/**
 * Enterprise Rate Limiting Middlewares (express-rate-limit)
 * Protects APIs against denial-of-service and brute-force attacks.
 */
const rateLimit = require('express-rate-limit');

const isTest = process.env.NODE_ENV === 'test';
/** Phase 4 load-test harness — never enable in production deploys. */
const isLoadTest = process.env.LOAD_TEST === '1' || process.env.DISABLE_API_RATE_LIMIT === '1';
const skipLimits = () => isTest || isLoadTest;

// Builds a rate-limit `handler` (instead of a static `message`) so the JSON
// body can include the per-request `requestId`, matching the envelope shape
// produced by the central error middleware for every other failure type.
function rateLimitHandler(code, message, extra = {}) {
  return (req, res) => {
    res.status(429).json({
      success: false,
      requestId: req.id || req.headers['x-request-id'] || 'N/A',
      error: { code, message, ...extra }
    });
  };
}

// Public Read API Limiter (300 requests per 15 minutes)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  skip: skipLimits,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('TOO_MANY_REQUESTS', 'Too many requests from this IP, please try again after 15 minutes.')
});

// Admin Auth Login Limiter (10 requests per 15 minutes - Brute Force Protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skip: skipLimits,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('TOO_MANY_LOGIN_ATTEMPTS', 'Too many failed login attempts. Account temporarily locked for 15 minutes.')
});

// Upload API Limiter (30 requests per 15 minutes)
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  skip: skipLimits,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('TOO_MANY_UPLOADS', 'Image upload rate limit exceeded. Please wait before uploading more media.')
});

module.exports = {
  apiLimiter,
  authLimiter,
  uploadLimiter
};
