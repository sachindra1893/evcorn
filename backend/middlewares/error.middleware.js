/**
 * Centralized Global Error Handling Middleware
 */
const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const errorCode = err.errorCode || 'INTERNAL_SERVER_ERROR';

  logger.error(`API Error [${statusCode}] [${errorCode}]: ${err.message}`, {
    url: req.originalUrl,
    method: req.method,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: err.message || 'Internal Server Error',
      details: err.details || null
    }
  });
}

module.exports = errorHandler;
