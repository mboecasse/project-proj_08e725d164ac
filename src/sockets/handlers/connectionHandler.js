// File: src/sockets/handlers/connectionHandler.js
// Generated: 2025-10-08 13:15:12 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_p6huxlbw05qi


const User = require('../../models/User');


const logger = require('../../utils/logger');

/**
 * Store for active socket connections
 * Maps userId to array of socket IDs (for multiple devices/tabs)
 */


const activeConnections = new Map();

/**
 * Handle new socket connection
 * @param {Object} io - Socket.io server instance
 * @param {Object} socket - Socket instance
 */


const handleConnection = async (io, socket) => {
  try {
    const userId = socket.userId;
    const userEmail = socket.userEmail;

    logger.info('Socket connection established', {
      socketId: socket.id,
      userId,
      userEmail,
      ip: socket.handshake.address
    });

    // Add socket to active connections
    if (!activeConnections.has(userId)) {
      activeConnections.set(userId, []);
    }
    activeConnections.get(userId).push(socket.id);

    // Join user's personal room for targeted notifications
    socket.join(`user:${userId}`);

    // Update user's online status in database
    try {
      await User.findByIdAndUpdate(userId, {
        isOnline: true,
        lastSeen: new Date()
      });

      // Notify other users about online status
      socket.broadcast.emit('user:online', {
        userId,
        timestamp: new Date()
      });

      logger.info('User marked as online', { userId, socketId: socket.id });
    } catch (error) {
      logger.error('Failed to update user online status', {
        userId,
        socketId: socket.id,
        error: error.message
      });
    }

    // Send connection acknowledgment to client
    socket.emit('connection:success', {
      socketId: socket.id,
      userId,
      timestamp: new Date(),
      message: 'Connected to real-time server'
    });

    // Get count of active connections for this user
    const connectionCount = activeConnections.get(userId).length;
    logger.info('Active connections for user', {
      userId,
      connectionCount,
      socketIds: activeConnections.get(userId)
    });

  } catch (error) {
    logger.error('Error handling socket connection', {
      socketId: socket.id,
      userId: socket.userId,
      error: error.message,
      stack: error.stack
    });

    // Emit error to client
    socket.emit('connection:error', {
      message: 'Failed to establish connection',
      timestamp: new Date()
    });
  }
};

/**
 * Handle socket disconnection
 * @param {Object} io - Socket.io server instance
 * @param {Object} socket - Socket instance
 */


const handleDisconnection = async (io, socket) => {
  try {
    const userId = socket.userId;
    const userEmail = socket.userEmail;

    logger.info('Socket disconnection initiated', {
      socketId: socket.id,
      userId,
      userEmail
    });

    // Remove socket from active connections
    if (activeConnections.has(userId)) {
      const sockets = activeConnections.get(userId);
      const index = sockets.indexOf(socket.id);

      if (index > -1) {
        sockets.splice(index, 1);
      }

      // If no more active connections for this user, mark as offline
      if (sockets.length === 0) {
        activeConnections.delete(userId);

        // Update user's offline status in database
        try {
          await User.findByIdAndUpdate(userId, {
            isOnline: false,
            lastSeen: new Date()
          });

          // Notify other users about offline status
          socket.broadcast.emit('user:offline', {
            userId,
            timestamp: new Date()
          });

          logger.info('User marked as offline', { userId, socketId: socket.id });
        } catch (error) {
          logger.error('Failed to update user offline status', {
            userId,
            socketId: socket.id,
            error: error.message
          });
        }
      } else {
        logger.info('User still has active connections', {
          userId,
          remainingConnections: sockets.length,
          socketIds: sockets
        });
      }
    }

    // Leave all rooms
    socket.rooms.forEach(room => {
      socket.leave(room);
    });

    logger.info('Socket disconnected successfully', {
      socketId: socket.id,
      userId
    });

  } catch (error) {
    logger.error('Error handling socket disconnection', {
      socketId: socket.id,
      userId: socket.userId,
      error: error.message,
      stack: error.stack
    });
  }
};

/**
 * Get active socket IDs for a user
 * @param {String} userId - User ID
 * @returns {Array} Array of socket IDs
 */


const getUserSockets = (userId) => {
  return activeConnections.get(userId) || [];
};

/**
 * Check if user is online
 * @param {String} userId - User ID
 * @returns {Boolean} True if user has active connections
 */


const isUserOnline = (userId) => {
  return activeConnections.has(userId) && activeConnections.get(userId).length > 0;
};

/**
 * Get count of online users
 * @returns {Number} Number of online users
 */


const getOnlineUserCount = () => {
  return activeConnections.size;
};

/**
 * Get all online user IDs
 * @returns {Array} Array of user IDs
 */


const getOnlineUsers = () => {
  return Array.from(activeConnections.keys());
};

/**
 * Disconnect all sockets for a user
 * @param {Object} io - Socket.io server instance
 * @param {String} userId - User ID
 */


const disconnectUser = (io, userId) => {
  const sockets = getUserSockets(userId);

  sockets.forEach(socketId => {
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
      socket.disconnect(true);
      logger.info('Forcefully disconnected socket', { socketId, userId });
    }
  });

  activeConnections.delete(userId);
};

module.exports = {
  handleConnection,
  handleDisconnection,
  getUserSockets,
  isUserOnline,
  getOnlineUserCount,
  getOnlineUsers,
  disconnectUser,
  activeConnections
};
