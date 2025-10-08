// File: src/middleware/security.js
// Generated: 2025-10-08 13:14:33 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_v8q4y6kijyh9


const cors = require('cors');


const helmet = require('helmet');


const hpp = require('hpp');


const logger = require('../utils/logger');


const mongoSanitize = require('express-mongo-sanitize');


const xss = require('xss-clean');

/**
 * Configure CORS options
 * @returns {Object} CORS configuration
 */


const getCorsOptions = () => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:5173'];

  return {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        logger.warn('CORS blocked origin', { origin });
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  };
};

/**
 * Configure Helmet security headers
 * @returns {Object} Helmet configuration
 */


const getHelmetOptions = () => {
  return {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  };
};

/**
 * Apply security middleware to Express app
 * @param {Object} app - Express application instance
 */


const applySecurity = (app) => {
  try {
    // Helmet - Set security headers
    app.use(helmet(getHelmetOptions()));
    logger.info('Helmet security headers configured');

    // CORS - Cross-Origin Resource Sharing
    app.use(cors(getCorsOptions()));
    logger.info('CORS configured', {
      allowedOrigins: process.env.ALLOWED_ORIGINS || 'default origins'
    });

    // HPP - HTTP Parameter Pollution protection
    app.use(hpp());
    logger.info('HPP protection enabled');

    // XSS Clean - Sanitize user input to prevent XSS attacks
    app.use(xss());
    logger.info('XSS protection enabled');

    // Mongo Sanitize - Prevent NoSQL injection attacks
    app.use(mongoSanitize({
      replaceWith: '_',
      onSanitize: ({ req, key }) => {
        logger.warn('Sanitized NoSQL injection attempt', {
          key,
          ip: req.ip,
          path: req.path
        });
      }
    }));
    logger.info('MongoDB injection protection enabled');

    // Additional security headers
    app.use((req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
      next();
    });

    logger.info('All security middleware configured successfully');
  } catch (error) {
    logger.error('Failed to configure security middleware', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Security middleware for individual routes
 * Adds additional security checks and logging
 */


const securityMiddleware = (req, res, next) => {
  try {
    // Log suspicious patterns
    const suspiciousPatterns = [
      /(\$where|\$ne|\$gt|\$lt)/i,
      /(union|select|insert|update|delete|drop|create|alter)/i,
      /(<script|javascript:|onerror=|onload=)/i
    ];

    const checkString = JSON.stringify(req.body) + JSON.stringify(req.query) + JSON.stringify(req.params);

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(checkString)) {
        logger.warn('Suspicious request pattern detected', {
          ip: req.ip,
          path: req.path,
          method: req.method,
          userAgent: req.get('user-agent')
        });
        break;
      }
    }

    // Check for common attack headers
    const suspiciousHeaders = ['x-forwarded-host', 'x-original-url', 'x-rewrite-url'];
    for (const header of suspiciousHeaders) {
      if (req.get(header)) {
        logger.warn('Suspicious header detected', {
          header,
          value: req.get(header),
          ip: req.ip
        });
      }
    }

    next();
  } catch (error) {
    logger.error('Security middleware error', {
      error: error.message,
      path: req.path
    });
    next(error);
  }
};

/**
 * Content Security Policy violation reporter
 */


const cspViolationReporter = (req, res, next) => {
  if (req.path === '/api/csp-violation-report') {
    logger.warn('CSP Violation Report', {
      body: req.body,
      ip: req.ip
    });
    return res.status(204).end();
  }
  next();
};

module.exports = {
  applySecurity,
  securityMiddleware,
  cspViolationReporter,
  getCorsOptions,
  getHelmetOptions
};
