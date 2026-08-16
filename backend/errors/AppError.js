/**
 * Centralized Application Error Classes
 */
class AppError extends Error {
  constructor(message, statusCode, errorCode = 'INTERNAL_SERVER_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'RESOURCE_NOT_FOUND');
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Invalid request payload', details = null) {
    super(message, 400, 'INVALID_REQUEST_PAYLOAD', details);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, 401, 'UNAUTHORIZED_ACCESS');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden access') {
    super(message, 403, 'FORBIDDEN_ACCESS');
  }
}

module.exports = {
  AppError,
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError
};
