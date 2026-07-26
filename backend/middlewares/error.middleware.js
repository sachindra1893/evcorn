/**
 * Centralized Global Error Handling Middleware with Request ID & Classification Guards
 */
const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const errorCode = err.errorCode || (err.isOperational ? 'OPERATIONAL_ERROR' : 'INTERNAL_SERVER_ERROR');
  const reqId = req.id || 'N/A';

  logger.error(`API Error [${statusCode}] [${errorCode}] [reqId:${reqId}]: ${err.message}`, {
    reqId,
    url: req.originalUrl,
    method: req.method,
    isOperational: err.isOperational || false,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  res.status(statusCode).json({
    success: false,
    requestId: reqId,
    error: {
      code: errorCode,
      message: process.env.NODE_ENV === 'production' && statusCode === 500
        ? 'An unexpected server error occurred. Please contact support.'
        : err.message || 'Internal Server Error',
      details: err.details || null
    }
  });
}

module.exports = errorHandler;
