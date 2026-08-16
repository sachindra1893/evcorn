/**
 * Enterprise Rate Limiting Middlewares (express-rate-limit)
 * Protects APIs against denial-of-service and brute-force attacks.
 */
const rateLimit = require('express-rate-limit');

const isTest = process.env.NODE_ENV === 'test';
/** Phase 4 load-test harness — never enable in production deploys. */
const isLoadTest = process.env.LOAD_TEST === '1' || process.env.DISABLE_API_RATE_LIMIT === '1';
const skipLimits = () => isLoadTest;

function rateLimitHandler(code, message, extra = {}) {
  return (req, res) => {
    res.status(429).json({
      success: false,
      requestId: req.id || req.headers['x-request-id'] || 'N/A',
      error: { code, message, ...extra }
    });
  };
}

/** Shared options — keep proxy validations on (Phase 6 security). */
const limiterBase = {
  skip: skipLimits,
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    trustProxy: true,
    xForwardedForHeader: true,
    default: true
  }
};

// Public Read API Limiter (300 requests per 15 minutes)
const apiLimiter = rateLimit({
  ...limiterBase,
  windowMs: 15 * 60 * 1000,
  max: 300,
  handler: rateLimitHandler('TOO_MANY_REQUESTS', 'Too many requests from this IP, please try again after 15 minutes.')
});

// Admin Auth Login Limiter (10 requests per 15 minutes - Brute Force Protection)
const authLimiter = rateLimit({
  ...limiterBase,
  windowMs: 15 * 60 * 1000,
  max: 10,
  handler: rateLimitHandler('TOO_MANY_LOGIN_ATTEMPTS', 'Too many failed login attempts. Account temporarily locked for 15 minutes.')
});

// Upload API Limiter (30 requests per 15 minutes)
const uploadLimiter = rateLimit({
  ...limiterBase,
  windowMs: 15 * 60 * 1000,
  max: 30,
  handler: rateLimitHandler('TOO_MANY_UPLOADS', 'Image upload rate limit exceeded. Please wait before uploading more media.')
});

// Comment Creation Limiter (5 requests per 1 minute per user/IP)
const commentPostLimiter = rateLimit({
  ...limiterBase,
  windowMs: 60 * 1000,
  max: 5,
  validate: {
    ...limiterBase.validate,
    keyGeneratorIpFallback: false
  },
  keyGenerator: (req) => {
    if (req.user && req.user.id) return `user_comment_${req.user.id}`;
    return req.ip || 'anonymous';
  },
  handler: rateLimitHandler('COMMENT_RATE_LIMIT_EXCEEDED', 'Comment rate limit exceeded. Maximum 5 comments per minute.')
});

module.exports = {
  apiLimiter,
  authLimiter,
  uploadLimiter,
  commentPostLimiter
};
