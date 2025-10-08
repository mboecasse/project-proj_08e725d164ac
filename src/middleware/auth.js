// File: src/middleware/auth.js
// Generated: 2025-10-08 13:15:17 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_4blknv5852cv


const User = require('../models/User');


const jwt = require('jsonwebtoken');


const jwtConfig = require('../config/jwt');


const logger = require('../utils/logger');

/**
 * Authentication middleware - Verifies JWT token and attaches user to request
 * Sets both req.user (full user object) and req.userId (MongoDB ID string)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */


const auth = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Authentication failed: No token provided', {
        ip: req.ip,
        path: req.path
      });
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please provide a valid token.'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, jwtConfig.accessSecret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        logger.warn('Authentication failed: Token expired', {
          ip: req.ip,
          path: req.path
        });
        return res.status(401).json({
          success: false,
          error: 'Token expired. Please login again.'
        });
      }

      if (error.name === 'JsonWebTokenError') {
        logger.warn('Authentication failed: Invalid token', {
          ip: req.ip,
          path: req.path,
          error: error.message
        });
        return res.status(401).json({
          success: false,
          error: 'Invalid token. Please login again.'
        });
      }

      throw error;
    }

    // Fetch user from database
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      logger.warn('Authentication failed: User not found', {
        userId: decoded.userId,
        ip: req.ip,
        path: req.path
      });
      return res.status(401).json({
        success: false,
        error: 'User not found. Please login again.'
      });
    }

    // Check if user is active
    if (user.status === 'inactive') {
      logger.warn('Authentication failed: User account inactive', {
        userId: user._id.toString(),
        ip: req.ip,
        path: req.path
      });
      return res.status(403).json({
        success: false,
        error: 'Account is inactive. Please contact support.'
      });
    }

    // Attach user to request - CRITICAL: Set both properties
    req.user = user;
    req.userId = user._id.toString(); // MongoDB ID as string

    logger.debug('Authentication successful', {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      path: req.path
    });

    next();
  } catch (error) {
    logger.error('Authentication middleware error', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      path: req.path
    });
    return res.status(500).json({
      success: false,
      error: 'Authentication failed. Please try again.'
    });
  }
};

/**
 * Optional authentication middleware - Attaches user if token is valid, but doesn't require it
 * Useful for routes that have different behavior for authenticated vs unauthenticated users
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */


const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // If no token, continue without authentication
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    // Try to verify token
    let decoded;
    try {
      decoded = jwt.verify(token, jwtConfig.accessSecret);
    } catch (error) {
      // Token invalid or expired - continue without authentication
      logger.debug('Optional auth: Invalid or expired token', {
        ip: req.ip,
        path: req.path
      });
      return next();
    }

    // Fetch user from database
    const user = await User.findById(decoded.userId).select('-password');

    if (user && user.status === 'active') {
      // Attach user to request
      req.user = user;
      req.userId = user._id.toString();

      logger.debug('Optional auth: User authenticated', {
        userId: user._id.toString(),
        path: req.path
      });
    }

    next();
  } catch (error) {
    logger.error('Optional authentication middleware error', {
      error: error.message,
      ip: req.ip,
      path: req.path
    });
    // Don't fail the request - continue without authentication
    next();
  }
};

/**
 * Role-based authorization middleware factory
 * Creates middleware that checks if authenticated user has required role(s)
 * @param {...string} allowedRoles - Roles that are allowed to access the route
 * @returns {Function} Express middleware function
 */


const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user || !req.userId) {
        logger.warn('Authorization failed: User not authenticated', {
          ip: req.ip,
          path: req.path
        });
        return res.status(401).json({
          success: false,
          error: 'Authentication required.'
        });
      }

      // Check if user has required role
      if (!allowedRoles.includes(req.user.role)) {
        logger.warn('Authorization failed: Insufficient permissions', {
          userId: req.userId,
          userRole: req.user.role,
          requiredRoles: allowedRoles,
          path: req.path
        });
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to access this resource.'
        });
      }

      logger.debug('Authorization successful', {
        userId: req.userId,
        role: req.user.role,
        path: req.path
      });

      next();
    } catch (error) {
      logger.error('Authorization middleware error', {
        error: error.message,
        userId: req.userId,
        path: req.path
      });
      return res.status(500).json({
        success: false,
        error: 'Authorization failed. Please try again.'
      });
    }
  };
};

/**
 * Middleware to check if user owns the resource
 * Compares req.userId with resource owner ID from params or body
 * @param {string} paramName - Name of parameter containing resource owner ID (default: 'userId')
 * @returns {Function} Express middleware function
 */


const checkOwnership = (paramName = 'userId') => {
  return (req, res, next) => {
    try {
      if (!req.user || !req.userId) {
        logger.warn('Ownership check failed: User not authenticated', {
          ip: req.ip,
          path: req.path
        });
        return res.status(401).json({
          success: false,
          error: 'Authentication required.'
        });
      }

      // Get resource owner ID from params or body
      const resourceOwnerId = req.params[paramName] || req.body[paramName];

      if (!resourceOwnerId) {
        logger.warn('Ownership check failed: No owner ID provided', {
          userId: req.userId,
          paramName,
          path: req.path
        });
        return res.status(400).json({
          success: false,
          error: 'Resource owner ID not provided.'
        });
      }

      // Allow admins to bypass ownership check
      if (req.user.role === 'admin') {
        logger.debug('Ownership check bypassed: Admin user', {
          userId: req.userId,
          path: req.path
        });
        return next();
      }

      // Check ownership
      if (req.userId !== resourceOwnerId.toString()) {
        logger.warn('Ownership check failed: User does not own resource', {
          userId: req.userId,
          resourceOwnerId: resourceOwnerId.toString(),
          path: req.path
        });
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to access this resource.'
        });
      }

      logger.debug('Ownership check successful', {
        userId: req.userId,
        path: req.path
      });

      next();
    } catch (error) {
      logger.error('Ownership check middleware error', {
        error: error.message,
        userId: req.userId,
        path: req.path
      });
      return res.status(500).json({
        success: false,
        error: 'Authorization failed. Please try again.'
      });
    }
  };
};

// Export middleware with alias for compatibility
module.exports = {
  auth,
  optionalAuth,
  authorize,
  checkOwnership,
  authenticate: auth // Alias for compatibility
};
