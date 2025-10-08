// File: src/middleware/rateLimit.js
// Generated: 2025-10-08 13:14:53 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_z1qlfkxrac4o


const RedisStore = require('rate-limit-redis');


const logger = require('../utils/logger');


const rateLimit = require('express-rate-limit');


const redisClient = require('../config/redis');

/**
 * Create rate limiter with Redis store
 * @param {Object} options - Rate limit options
 * @returns {Function} Rate limit middleware
 */


const createRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // Limit each IP to 100 requests per windowMs
    message = 'Too many requests from this IP, please try again later',
    standardHeaders = true,
    legacyHeaders = false,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = (req) => req.ip,
    handler = (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        method: req.method
      });
      res.status(429).json({
        success: false,
        error: message
      });
    }
  } = options;

  try {
    return rateLimit({
      windowMs,
      max,
      message,
      standardHeaders,
      legacyHeaders,
      skipSuccessfulRequests,
      skipFailedRequests,
      keyGenerator,
      handler,
      store: new RedisStore({
        client: redisClient,
        prefix: 'rl:',
        sendCommand: (...args) => redisClient.sendCommand(args)
      })
    });
  } catch (error) {
    logger.error('Failed to create rate limiter with Redis store', {
      error: error.message
    });

    // Fallback to memory store if Redis fails
    logger.warn('Falling back to memory store for rate limiting');
    return rateLimit({
      windowMs,
      max,
      message,
      standardHeaders,
      legacyHeaders,
      skipSuccessfulRequests,
      skipFailedRequests,
      keyGenerator,
      handler
    });
  }
};

/**
 * General API rate limiter
 * 100 requests per 15 minutes
 */


const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later'
});

/**
 * Strict rate limiter for authentication routes
 * 5 requests per 15 minutes
 */


const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts, please try again later',
  skipSuccessfulRequests: true
});

/**
 * Rate limiter for password reset requests
 * 3 requests per hour
 */


const passwordResetLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: 'Too many password reset requests, please try again later'
});

/**
 * Rate limiter for file upload routes
 * 20 requests per hour
 */


const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: 'Too many upload requests, please try again later'
});

/**
 * Rate limiter for email sending
 * 10 requests per hour
 */


const emailLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many email requests, please try again later'
});

/**
 * Flexible rate limiter for specific routes
 * 50 requests per 15 minutes
 */


const moderateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Too many requests, please try again later'
});

/**
 * Strict rate limiter for sensitive operations
 * 10 requests per 15 minutes
 */


const strictLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many requests for this operation, please try again later'
});

/**
 * Rate limiter for public endpoints
 * 200 requests per 15 minutes
 */


const publicLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'Too many requests, please try again later'
});

/**
 * Custom rate limiter factory for specific needs
 * @param {number} windowMs - Time window in milliseconds
 * @param {number} max - Maximum number of requests
 * @param {string} message - Custom error message
 * @returns {Function} Rate limit middleware
 */


const customLimiter = (windowMs, max, message) => {
  return createRateLimiter({ windowMs, max, message });
};

module.exports = {
  createRateLimiter,
  apiLimiter,
  authLimiter,
  passwordResetLimiter,
  uploadLimiter,
  emailLimiter,
  moderateLimiter,
  strictLimiter,
  publicLimiter,
  customLimiter
};
