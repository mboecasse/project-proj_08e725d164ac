// File: src/sockets/handlers/notificationHandler.js
// Generated: 2025-10-08 13:15:31 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_nhh2ml3nenvb


const logger = require('../../utils/logger');

/**
 * Notification socket event handlers
 * Manages real-time notification events for users
 */

/**
 * Initialize notification handlers for a socket connection
 * @param {Object} io - Socket.io server instance
 * @param {Object} socket - Socket connection instance
 */


const initializeNotificationHandlers = (io, socket) => {
  logger.info('Initializing notification handlers', {
    socketId: socket.id,
    userId: socket.userId
  });

  /**
   * Join user's personal notification room
   */
  const joinNotificationRoom = () => {
    try {
      if (!socket.userId) {
        logger.warn('Cannot join notification room: userId not set', {
          socketId: socket.id
        });
        return;
      }

      const roomName = `notifications:${socket.userId}`;
      socket.join(roomName);

      logger.info('User joined notification room', {
        userId: socket.userId,
        roomName,
        socketId: socket.id
      });

      socket.emit('notification:joined', {
        success: true,
        room: roomName,
        message: 'Successfully joined notification room'
      });
    } catch (error) {
      logger.error('Failed to join notification room', {
        userId: socket.userId,
        socketId: socket.id,
        error: error.message
      });
      socket.emit('notification:error', {
        success: false,
        error: 'Failed to join notification room'
      });
    }
  };

  /**
   * Leave user's personal notification room
   */
  const leaveNotificationRoom = () => {
    try {
      if (!socket.userId) {
        return;
      }

      const roomName = `notifications:${socket.userId}`;
      socket.leave(roomName);

      logger.info('User left notification room', {
        userId: socket.userId,
        roomName,
        socketId: socket.id
      });
    } catch (error) {
      logger.error('Failed to leave notification room', {
        userId: socket.userId,
        socketId: socket.id,
        error: error.message
      });
    }
  };

  /**
   * Mark notification as read
   */
  const markNotificationRead = (data) => {
    try {
      const { notificationId } = data;

      if (!notificationId) {
        socket.emit('notification:error', {
          success: false,
          error: 'Notification ID is required'
        });
        return;
      }

      logger.info('Notification marked as read', {
        userId: socket.userId,
        notificationId,
        socketId: socket.id
      });

      socket.emit('notification:read', {
        success: true,
        notificationId,
        message: 'Notification marked as read'
      });

      // Broadcast to other user sessions
      const roomName = `notifications:${socket.userId}`;
      socket.to(roomName).emit('notification:read', {
        success: true,
        notificationId
      });
    } catch (error) {
      logger.error('Failed to mark notification as read', {
        userId: socket.userId,
        notificationId: data?.notificationId,
        socketId: socket.id,
        error: error.message
      });
      socket.emit('notification:error', {
        success: false,
        error: 'Failed to mark notification as read'
      });
    }
  };

  /**
   * Mark all notifications as read
   */
  const markAllNotificationsRead = () => {
    try {
      logger.info('All notifications marked as read', {
        userId: socket.userId,
        socketId: socket.id
      });

      socket.emit('notification:all_read', {
        success: true,
        message: 'All notifications marked as read'
      });

      // Broadcast to other user sessions
      const roomName = `notifications:${socket.userId}`;
      socket.to(roomName).emit('notification:all_read', {
        success: true
      });
    } catch (error) {
      logger.error('Failed to mark all notifications as read', {
        userId: socket.userId,
        socketId: socket.id,
        error: error.message
      });
      socket.emit('notification:error', {
        success: false,
        error: 'Failed to mark all notifications as read'
      });
    }
  };

  /**
   * Delete notification
   */
  const deleteNotification = (data) => {
    try {
      const { notificationId } = data;

      if (!notificationId) {
        socket.emit('notification:error', {
          success: false,
          error: 'Notification ID is required'
        });
        return;
      }

      logger.info('Notification deleted', {
        userId: socket.userId,
        notificationId,
        socketId: socket.id
      });

      socket.emit('notification:deleted', {
        success: true,
        notificationId,
        message: 'Notification deleted successfully'
      });

      // Broadcast to other user sessions
      const roomName = `notifications:${socket.userId}`;
      socket.to(roomName).emit('notification:deleted', {
        success: true,
        notificationId
      });
    } catch (error) {
      logger.error('Failed to delete notification', {
        userId: socket.userId,
        notificationId: data?.notificationId,
        socketId: socket.id,
        error: error.message
      });
      socket.emit('notification:error', {
        success: false,
        error: 'Failed to delete notification'
      });
    }
  };

  /**
   * Request notification count
   */
  const getNotificationCount = () => {
    try {
      logger.debug('Notification count requested', {
        userId: socket.userId,
        socketId: socket.id
      });

      // Emit event to trigger count fetch from database
      socket.emit('notification:count_requested', {
        success: true,
        userId: socket.userId
      });
    } catch (error) {
      logger.error('Failed to request notification count', {
        userId: socket.userId,
        socketId: socket.id,
        error: error.message
      });
      socket.emit('notification:error', {
        success: false,
        error: 'Failed to get notification count'
      });
    }
  };

  /**
   * Subscribe to specific notification types
   */
  const subscribeToNotifications = (data) => {
    try {
      const { types = [] } = data;

      if (!Array.isArray(types) || types.length === 0) {
        socket.emit('notification:error', {
          success: false,
          error: 'Notification types must be a non-empty array'
        });
        return;
      }

      // Join rooms for specific notification types
      types.forEach(type => {
        const roomName = `notifications:${socket.userId}:${type}`;
        socket.join(roomName);
      });

      logger.info('Subscribed to notification types', {
        userId: socket.userId,
        types,
        socketId: socket.id
      });

      socket.emit('notification:subscribed', {
        success: true,
        types,
        message: 'Successfully subscribed to notification types'
      });
    } catch (error) {
      logger.error('Failed to subscribe to notifications', {
        userId: socket.userId,
        types: data?.types,
        socketId: socket.id,
        error: error.message
      });
      socket.emit('notification:error', {
        success: false,
        error: 'Failed to subscribe to notification types'
      });
    }
  };

  /**
   * Unsubscribe from specific notification types
   */
  const unsubscribeFromNotifications = (data) => {
    try {
      const { types = [] } = data;

      if (!Array.isArray(types) || types.length === 0) {
        socket.emit('notification:error', {
          success: false,
          error: 'Notification types must be a non-empty array'
        });
        return;
      }

      // Leave rooms for specific notification types
      types.forEach(type => {
        const roomName = `notifications:${socket.userId}:${type}`;
        socket.leave(roomName);
      });

      logger.info('Unsubscribed from notification types', {
        userId: socket.userId,
        types,
        socketId: socket.id
      });

      socket.emit('notification:unsubscribed', {
        success: true,
        types,
        message: 'Successfully unsubscribed from notification types'
      });
    } catch (error) {
      logger.error('Failed to unsubscribe from notifications', {
        userId: socket.userId,
        types: data?.types,
        socketId: socket.id,
        error: error.message
      });
      socket.emit('notification:error', {
        success: false,
        error: 'Failed to unsubscribe from notification types'
      });
    }
  };

  // Register event handlers
  socket.on('notification:join', joinNotificationRoom);
  socket.on('notification:leave', leaveNotificationRoom);
  socket.on('notification:mark_read', markNotificationRead);
  socket.on('notification:mark_all_read', markAllNotificationsRead);
  socket.on('notification:delete', deleteNotification);
  socket.on('notification:get_count', getNotificationCount);
  socket.on('notification:subscribe', subscribeToNotifications);
  socket.on('notification:unsubscribe', unsubscribeFromNotifications);

  // Auto-join notification room on connection
  if (socket.userId) {
    joinNotificationRoom();
  }

  // Cleanup on disconnect
  socket.on('disconnect', () => {
    leaveNotificationRoom();
    logger.info('Notification handlers cleaned up on disconnect', {
      socketId: socket.id,
      userId: socket.userId
    });
  });
};

/**
 * Send notification to specific user
 * @param {Object} io - Socket.io server instance
 * @param {String} userId - Target user ID
 * @param {Object} notification - Notification data
 */


const sendNotificationToUser = (io, userId, notification) => {
  try {
    const roomName = `notifications:${userId}`;

    io.to(roomName).emit('notification:new', {
      success: true,
      data: notification
    });

    logger.info('Notification sent to user', {
      userId,
      notificationId: notification._id,
      type: notification.type
    });
  } catch (error) {
    logger.error('Failed to send notification to user', {
      userId,
      notificationId: notification?._id,
      error: error.message
    });
  }
};

/**
 * Send notification to multiple users
 * @param {Object} io - Socket.io server instance
 * @param {Array} userIds - Array of target user IDs
 * @param {Object} notification - Notification data
 */


const sendNotificationToUsers = (io, userIds, notification) => {
  try {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      logger.warn('Invalid userIds array for bulk notification', { userIds });
      return;
    }

    userIds.forEach(userId => {
      sendNotificationToUser(io, userId, notification);
    });

    logger.info('Notification sent to multiple users', {
      userCount: userIds.length,
      notificationId: notification._id,
      type: notification.type
    });
  } catch (error) {
    logger.error('Failed to send notification to multiple users', {
      userCount: userIds?.length,
      notificationId: notification?._id,
      error: error.message
    });
  }
};

/**
 * Broadcast notification count update to user
 * @param {Object} io - Socket.io server instance
 * @param {String} userId - Target user ID
 * @param {Number} unreadCount - Unread notification count
 */


const broadcastNotificationCount = (io, userId, unreadCount) => {
  try {
    const roomName = `notifications:${userId}`;

    io.to(roomName).emit('notification:count_update', {
      success: true,
      unreadCount
    });

    logger.debug('Notification count broadcasted', {
      userId,
      unreadCount
    });
  } catch (error) {
    logger.error('Failed to broadcast notification count', {
      userId,
      unreadCount,
      error: error.message
    });
  }
};

module.exports = {
  initializeNotificationHandlers,
  sendNotificationToUser,
  sendNotificationToUsers,
  broadcastNotificationCount
};
