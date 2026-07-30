/**
 * Centralized Global Error Handling Middleware with Request ID & Classification Guards
 */
const logger = require('../utils/logger');
const config = require('../config/env');

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || err.status || 500;
  let errorCode = err.errorCode || 'INTERNAL_SERVER_ERROR';
  let clientMessage = err.message;

  // Express body-parser / raw-body oversized payload → clean 413 (Phase 7)
  if (statusCode === 413 || err.type === 'entity.too.large') {
    errorCode = 'PAYLOAD_TOO_LARGE';
    clientMessage = 'Request payload exceeds the allowed size limit.';
  }

  const reqId = req.id || req.headers['x-request-id'] || 'N/A';

  // Log non-operational (unexpected) errors or 500s as system errors.
  // Operational 4xx are already captured by requestLogger access logs — avoid duplicate logging.
  if (statusCode >= 500 || !err.isOperational) {
    logger.error(`API Error [${statusCode}] [${errorCode}]: ${err.message}`, {
      requestId: reqId,
      reqId,
      url: req.originalUrl || req.url,
      method: req.method,
      status: statusCode,
      code: errorCode,
      eventType: 'http_failure',
      kind: statusCode >= 500 ? 'backend_5xx' : 'unknown',
      what: err.message,
      where: req.originalUrl || req.url,
      why: errorCode,
      stack: config.NODE_ENV === 'development' ? err.stack : undefined,
      isOperational: err.isOperational
    });
  }

  // Response payload
  const responsePayload = {
    success: false,
    requestId: reqId,
    error: {
      code: errorCode,
      message: (statusCode >= 500 && config.NODE_ENV === 'production') 
        ? 'An internal server error occurred. Please try again later.' 
        : clientMessage
    }
  };

  // Only expose details in non-production
  if (config.NODE_ENV !== 'production' && err.details) {
    responsePayload.error.details = err.details;
  }

  res.status(statusCode).json(responsePayload);
};

module.exports = errorHandler;
