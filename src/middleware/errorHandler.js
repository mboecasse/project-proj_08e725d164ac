// File: src/middleware/errorHandler.js
// Generated: 2025-10-08 13:14:55 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_qa4rbit0muxm


const logger = require('../utils/logger');


const {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError
} = require('../utils/errors');

/**
 * Global error handling middleware
 * Catches all errors and returns consistent error responses
 *
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */


const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.stack = err.stack;

  // Log error with context
  logger.error('Error occurred', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.userId || 'unauthenticated',
    body: req.body,
    params: req.params,
    query: req.query
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new NotFoundError(message);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    error = new ConflictError(message);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    error = new ValidationError(messages.join(', '));
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new AuthenticationError(message);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = new AuthenticationError(message);
  }

  // Handle custom error classes
  if (err instanceof ValidationError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      errors: err.errors
    });
  }

  if (err instanceof AuthenticationError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message
    });
  }

  if (err instanceof AuthorizationError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message
    });
  }

  if (err instanceof NotFoundError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message
    });
  }

  if (err instanceof ConflictError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message
    });
  }

  if (err instanceof DatabaseError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message
    });
  }

  // Default error response
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';

  // Don't expose internal error details in production
  if (process.env.NODE_ENV === 'production') {
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 500 ? 'Internal server error' : message
    });
  }

  // Include stack trace in development
  res.status(statusCode).json({
    success: false,
    error: message,
    stack: error.stack
  });
};

/**
 * Handle 404 errors for undefined routes
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */


const notFound = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

/**
 * Async handler wrapper to catch errors in async route handlers
 *
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware function
 */


const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  errorHandler,
  notFound,
  asyncHandler
};
