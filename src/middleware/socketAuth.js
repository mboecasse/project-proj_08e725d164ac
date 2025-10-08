// File: src/middleware/socketAuth.js
// Generated: 2025-10-08 13:14:51 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_ydkac7u6c7tp


const config = require('../config/jwt');


const jwt = require('jsonwebtoken');


const logger = require('../utils/logger');

/**
 * Socket.io authentication middleware
 * Verifies JWT token from socket handshake and attaches user info
 *
 * Usage in Socket.io server:
 * io.use(socketAuth);
 *
 * Token can be provided in:
 * - socket.handshake.auth.token
 * - socket.handshake.headers.authorization (Bearer token)
 * - socket.handshake.query.token
 */


const socketAuth = async (socket, next) => {
  try {
    // Extract token from various sources
    let token = null;

    // 1. Check auth object (recommended)
    if (socket.handshake.auth && socket.handshake.auth.token) {
      token = socket.handshake.auth.token;
    }
    // 2. Check Authorization header
    else if (socket.handshake.headers && socket.handshake.headers.authorization) {
      const authHeader = socket.handshake.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    // 3. Check query parameters (fallback, less secure)
    else if (socket.handshake.query && socket.handshake.query.token) {
      token = socket.handshake.query.token;
    }

    // No token provided
    if (!token) {
      logger.warn('Socket connection attempt without token', {
        socketId: socket.id,
        ip: socket.handshake.address
      });
      return next(new Error('Authentication token required'));
    }

    // Verify token
    const decoded = jwt.verify(token, config.accessSecret);

    if (!decoded || !decoded.userId) {
      logger.warn('Socket connection with invalid token payload', {
        socketId: socket.id,
        ip: socket.handshake.address
      });
      return next(new Error('Invalid token payload'));
    }

    // Attach user info to socket
    socket.userId = decoded.userId;
    socket.user = {
      _id: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    logger.info('Socket authenticated successfully', {
      socketId: socket.id,
      userId: decoded.userId,
      ip: socket.handshake.address
    });

    next();
  } catch (error) {
    // Handle specific JWT errors
    if (error.name === 'TokenExpiredError') {
      logger.warn('Socket connection with expired token', {
        socketId: socket.id,
        ip: socket.handshake.address,
        expiredAt: error.expiredAt
      });
      return next(new Error('Token expired'));
    }

    if (error.name === 'JsonWebTokenError') {
      logger.warn('Socket connection with invalid token', {
        socketId: socket.id,
        ip: socket.handshake.address,
        error: error.message
      });
      return next(new Error('Invalid token'));
    }

    if (error.name === 'NotBeforeError') {
      logger.warn('Socket connection with token used before valid', {
        socketId: socket.id,
        ip: socket.handshake.address,
        date: error.date
      });
      return next(new Error('Token not yet valid'));
    }

    // Generic error
    logger.error('Socket authentication error', {
      socketId: socket.id,
      ip: socket.handshake.address,
      error: error.message,
      stack: error.stack
    });
    return next(new Error('Authentication failed'));
  }
};

/**
 * Optional socket authentication middleware
 * Allows connection without token but attaches user info if token is valid
 * Useful for public channels that enhance experience for authenticated users
 */


const optionalSocketAuth = async (socket, next) => {
  try {
    // Extract token from various sources
    let token = null;

    if (socket.handshake.auth && socket.handshake.auth.token) {
      token = socket.handshake.auth.token;
    } else if (socket.handshake.headers && socket.handshake.headers.authorization) {
      const authHeader = socket.handshake.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    } else if (socket.handshake.query && socket.handshake.query.token) {
      token = socket.handshake.query.token;
    }

    // No token - allow connection as guest
    if (!token) {
      socket.userId = null;
      socket.user = null;
      socket.isGuest = true;

      logger.info('Guest socket connected', {
        socketId: socket.id,
        ip: socket.handshake.address
      });

      return next();
    }

    // Token provided - verify it
    try {
      const decoded = jwt.verify(token, config.accessSecret);

      if (decoded && decoded.userId) {
        socket.userId = decoded.userId;
        socket.user = {
          _id: decoded.userId,
          email: decoded.email,
          role: decoded.role
        };
        socket.isGuest = false;

        logger.info('Authenticated socket connected', {
          socketId: socket.id,
          userId: decoded.userId,
          ip: socket.handshake.address
        });
      } else {
        // Invalid payload - treat as guest
        socket.userId = null;
        socket.user = null;
        socket.isGuest = true;

        logger.warn('Socket with invalid token payload, treating as guest', {
          socketId: socket.id,
          ip: socket.handshake.address
        });
      }
    } catch (tokenError) {
      // Token verification failed - treat as guest
      socket.userId = null;
      socket.user = null;
      socket.isGuest = true;

      logger.warn('Socket with invalid token, treating as guest', {
        socketId: socket.id,
        ip: socket.handshake.address,
        error: tokenError.message
      });
    }

    next();
  } catch (error) {
    // Unexpected error - log but allow connection as guest
    logger.error('Optional socket authentication error, allowing as guest', {
      socketId: socket.id,
      ip: socket.handshake.address,
      error: error.message,
      stack: error.stack
    });

    socket.userId = null;
    socket.user = null;
    socket.isGuest = true;

    next();
  }
};

/**
 * Middleware to require authenticated socket
 * Use this in socket event handlers to ensure user is authenticated
 *
 * Usage:
 * socket.on('someEvent', requireAuth((socket, data) => {
 *   // socket.userId is guaranteed to exist
 * }));
 */


const requireAuth = (handler) => {
  return async (socket, ...args) => {
    if (!socket.userId) {
      logger.warn('Unauthorized socket event attempt', {
        socketId: socket.id,
        event: handler.name,
        ip: socket.handshake.address
      });

      socket.emit('error', {
        success: false,
        error: 'Authentication required for this action'
      });

      return;
    }

    try {
      await handler(socket, ...args);
    } catch (error) {
      logger.error('Socket event handler error', {
        socketId: socket.id,
        userId: socket.userId,
        event: handler.name,
        error: error.message,
        stack: error.stack
      });

      socket.emit('error', {
        success: false,
        error: 'An error occurred processing your request'
      });
    }
  };
};

/**
 * Middleware to check if socket user has specific role
 *
 * Usage:
 * socket.on('adminEvent', requireRole('admin')((socket, data) => {
 *   // socket.user.role is guaranteed to be 'admin'
 * }));
 */


const requireRole = (...allowedRoles) => {
  return (handler) => {
    return async (socket, ...args) => {
      if (!socket.userId || !socket.user) {
        logger.warn('Unauthorized socket event attempt - no user', {
          socketId: socket.id,
          event: handler.name,
          ip: socket.handshake.address
        });

        socket.emit('error', {
          success: false,
          error: 'Authentication required for this action'
        });

        return;
      }

      if (!allowedRoles.includes(socket.user.role)) {
        logger.warn('Forbidden socket event attempt - insufficient role', {
          socketId: socket.id,
          userId: socket.userId,
          userRole: socket.user.role,
          requiredRoles: allowedRoles,
          event: handler.name
        });

        socket.emit('error', {
          success: false,
          error: 'Insufficient permissions for this action'
        });

        return;
      }

      try {
        await handler(socket, ...args);
      } catch (error) {
        logger.error('Socket event handler error', {
          socketId: socket.id,
          userId: socket.userId,
          event: handler.name,
          error: error.message,
          stack: error.stack
        });

        socket.emit('error', {
          success: false,
          error: 'An error occurred processing your request'
        });
      }
    };
  };
};

module.exports = {
  socketAuth,
  optionalSocketAuth,
  requireAuth,
  requireRole
};
