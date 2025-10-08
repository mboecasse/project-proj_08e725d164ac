// File: src/utils/errors.js
// Generated: 2025-10-08 13:14:37 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_w0h6i2tpjzrp

* All custom errors extend this class
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Bad Request Error (400)
 * Used for invalid input or malformed requests
 */
class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(message, 400);
    this.name = 'BadRequestError';
  }
}

/**
 * Unauthorized Error (401)
 * Used when authentication is required but not provided or invalid
 */
class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Forbidden Error (403)
 * Used when user is authenticated but lacks permissions
 */
class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

/**
 * Not Found Error (404)
 * Used when requested resource doesn't exist
 */
class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict Error (409)
 * Used when request conflicts with current state (e.g., duplicate resource)
 */
class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

/**
 * Validation Error (422)
 * Used for validation failures
 */
class ValidationError extends AppError {
  constructor(message = 'Validation failed', errors = []) {
    super(message, 422);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

/**
 * Internal Server Error (500)
 * Used for unexpected server errors
 */
class InternalServerError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, 500);
    this.name = 'InternalServerError';
  }
}

/**
 * Database Error (500)
 * Used for database operation failures
 */
class DatabaseError extends AppError {
  constructor(message = 'Database operation failed') {
    super(message, 500);
    this.name = 'DatabaseError';
  }
}

/**
 * Service Unavailable Error (503)
 * Used when service is temporarily unavailable
 */
class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable') {
    super(message, 503);
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * Rate Limit Error (429)
 * Used when rate limit is exceeded
 */
class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}

/**
 * Token Expired Error (401)
 * Used when JWT token has expired
 */
class TokenExpiredError extends AppError {
  constructor(message = 'Token has expired') {
    super(message, 401);
    this.name = 'TokenExpiredError';
  }
}

/**
 * Invalid Token Error (401)
 * Used when JWT token is invalid
 */
class InvalidTokenError extends AppError {
  constructor(message = 'Invalid token') {
    super(message, 401);
    this.name = 'InvalidTokenError';
  }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  InternalServerError,
  DatabaseError,
  ServiceUnavailableError,
  RateLimitError,
  TokenExpiredError,
  InvalidTokenError
};
