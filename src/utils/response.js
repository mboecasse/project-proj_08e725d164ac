// File: src/utils/response.js
// Generated: 2025-10-08 13:14:43 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_oijz7esiohl3


const logger = require('./logger');

/**
 * Send success response
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @param {Object} meta - Additional metadata (pagination, etc.)
 */


const sendSuccess = (res, statusCode = 200, data = null, message = 'Success', meta = null) => {
  const response = {
    success: true,
    message
  };

  if (data !== null) {
    response.data = data;
  }

  if (meta !== null) {
    response.meta = meta;
  }

  logger.debug('Sending success response', { statusCode, message });

  return res.status(statusCode).json(response);
};

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} error - Error message
 * @param {Array} errors - Validation errors array
 */


const sendError = (res, statusCode = 500, error = 'Internal server error', errors = null) => {
  const response = {
    success: false,
    error
  };

  if (errors !== null && Array.isArray(errors)) {
    response.errors = errors;
  }

  logger.debug('Sending error response', { statusCode, error });

  return res.status(statusCode).json(response);
};

/**
 * Send paginated response
 * @param {Object} res - Express response object
 * @param {Array} data - Array of items
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @param {string} message - Success message
 */


const sendPaginated = (res, data, page, limit, total, message = 'Success') => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  const meta = {
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages,
      hasNextPage,
      hasPrevPage,
      nextPage: hasNextPage ? page + 1 : null,
      prevPage: hasPrevPage ? page - 1 : null
    }
  };

  logger.debug('Sending paginated response', { page, limit, total, totalPages });

  return sendSuccess(res, 200, data, message, meta);
};

/**
 * Send created response (201)
 * @param {Object} res - Express response object
 * @param {*} data - Created resource data
 * @param {string} message - Success message
 */


const sendCreated = (res, data, message = 'Resource created successfully') => {
  return sendSuccess(res, 201, data, message);
};

/**
 * Send no content response (204)
 * @param {Object} res - Express response object
 */


const sendNoContent = (res) => {
  logger.debug('Sending no content response');
  return res.status(204).send();
};

/**
 * Send bad request response (400)
 * @param {Object} res - Express response object
 * @param {string} error - Error message
 * @param {Array} errors - Validation errors
 */


const sendBadRequest = (res, error = 'Bad request', errors = null) => {
  return sendError(res, 400, error, errors);
};

/**
 * Send unauthorized response (401)
 * @param {Object} res - Express response object
 * @param {string} error - Error message
 */


const sendUnauthorized = (res, error = 'Unauthorized access') => {
  return sendError(res, 401, error);
};

/**
 * Send forbidden response (403)
 * @param {Object} res - Express response object
 * @param {string} error - Error message
 */


const sendForbidden = (res, error = 'Access forbidden') => {
  return sendError(res, 403, error);
};

/**
 * Send not found response (404)
 * @param {Object} res - Express response object
 * @param {string} error - Error message
 */


const sendNotFound = (res, error = 'Resource not found') => {
  return sendError(res, 404, error);
};

/**
 * Send conflict response (409)
 * @param {Object} res - Express response object
 * @param {string} error - Error message
 */


const sendConflict = (res, error = 'Resource conflict') => {
  return sendError(res, 409, error);
};

/**
 * Send validation error response (422)
 * @param {Object} res - Express response object
 * @param {Array} errors - Array of validation errors
 * @param {string} error - Error message
 */


const sendValidationError = (res, errors, error = 'Validation failed') => {
  return sendError(res, 422, error, errors);
};

/**
 * Send internal server error response (500)
 * @param {Object} res - Express response object
 * @param {string} error - Error message
 */


const sendServerError = (res, error = 'Internal server error') => {
  return sendError(res, 500, error);
};

/**
 * Send service unavailable response (503)
 * @param {Object} res - Express response object
 * @param {string} error - Error message
 */


const sendServiceUnavailable = (res, error = 'Service temporarily unavailable') => {
  return sendError(res, 503, error);
};

module.exports = {
  sendSuccess,
  sendError,
  sendPaginated,
  sendCreated,
  sendNoContent,
  sendBadRequest,
  sendUnauthorized,
  sendForbidden,
  sendNotFound,
  sendConflict,
  sendValidationError,
  sendServerError,
  sendServiceUnavailable
};
