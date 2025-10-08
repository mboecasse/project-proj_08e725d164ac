// File: src/services/socketService.js
// Generated: 2025-10-08 13:15:23 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_yxu0ycu16uu7


const logger = require('../utils/logger');

/**
 * Socket.io service for real-time event broadcasting
 * Handles all real-time notifications and updates across the application
 */
class SocketService {
  constructor() {
    this.io = null;
    this.userSockets = new Map(); // userId -> Set of socket IDs
    this.socketUsers = new Map(); // socket ID -> userId
  }

  /**
   * Initialize socket service with Socket.io instance
   * @param {Object} io - Socket.io server instance
   */
  initialize(io) {
    this.io = io;
    logger.info('Socket service initialized');
  }

  /**
   * Register a user's socket connection
   * @param {string} socketId - Socket connection ID
   * @param {string} userId - User ID
   */
  registerUser(socketId, userId) {
    try {
      // Add socket to user's socket set
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId).add(socketId);

      // Map socket to user
      this.socketUsers.set(socketId, userId);

      logger.info('User socket registered', { userId, socketId });
    } catch (error) {
      logger.error('Failed to register user socket', { userId, socketId, error: error.message });
    }
  }

  /**
   * Unregister a socket connection
   * @param {string} socketId - Socket connection ID
   */
  unregisterSocket(socketId) {
    try {
      const userId = this.socketUsers.get(socketId);

      if (userId) {
        // Remove socket from user's socket set
        const userSocketSet = this.userSockets.get(userId);
        if (userSocketSet) {
          userSocketSet.delete(socketId);

          // Remove user entry if no more sockets
          if (userSocketSet.size === 0) {
            this.userSockets.delete(userId);
          }
        }

        // Remove socket-user mapping
        this.socketUsers.delete(socketId);

        logger.info('Socket unregistered', { userId, socketId });
      }
    } catch (error) {
      logger.error('Failed to unregister socket', { socketId, error: error.message });
    }
  }

  /**
   * Get all socket IDs for a user
   * @param {string} userId - User ID
   * @returns {Array} Array of socket IDs
   */
  getUserSockets(userId) {
    const sockets = this.userSockets.get(userId);
    return sockets ? Array.from(sockets) : [];
  }

  /**
   * Check if user is online
   * @param {string} userId - User ID
   * @returns {boolean} True if user has active connections
   */
  isUserOnline(userId) {
    const sockets = this.userSockets.get(userId);
    return sockets && sockets.size > 0;
  }

  /**
   * Emit event to specific user
   * @param {string} userId - User ID
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  emitToUser(userId, event, data) {
    try {
      const socketIds = this.getUserSockets(userId);

      if (socketIds.length === 0) {
        logger.debug('User not online, skipping emit', { userId, event });
        return;
      }

      socketIds.forEach(socketId => {
        this.io.to(socketId).emit(event, data);
      });

      logger.debug('Event emitted to user', { userId, event, socketCount: socketIds.length });
    } catch (error) {
      logger.error('Failed to emit to user', { userId, event, error: error.message });
    }
  }

  /**
   * Emit event to multiple users
   * @param {Array} userIds - Array of user IDs
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  emitToUsers(userIds, event, data) {
    try {
      userIds.forEach(userId => {
        this.emitToUser(userId, event, data);
      });

      logger.debug('Event emitted to multiple users', { event, userCount: userIds.length });
    } catch (error) {
      logger.error('Failed to emit to users', { event, error: error.message });
    }
  }

  /**
   * Emit event to a room
   * @param {string} room - Room name
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  emitToRoom(room, event, data) {
    try {
      this.io.to(room).emit(event, data);
      logger.debug('Event emitted to room', { room, event });
    } catch (error) {
      logger.error('Failed to emit to room', { room, event, error: error.message });
    }
  }

  /**
   * Broadcast event to all connected clients
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  broadcast(event, data) {
    try {
      this.io.emit(event, data);
      logger.debug('Event broadcasted to all clients', { event });
    } catch (error) {
      logger.error('Failed to broadcast event', { event, error: error.message });
    }
  }

  /**
   * Join user to a room
   * @param {string} userId - User ID
   * @param {string} room - Room name
   */
  joinRoom(userId, room) {
    try {
      const socketIds = this.getUserSockets(userId);

      socketIds.forEach(socketId => {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.join(room);
        }
      });

      logger.debug('User joined room', { userId, room, socketCount: socketIds.length });
    } catch (error) {
      logger.error('Failed to join room', { userId, room, error: error.message });
    }
  }

  /**
   * Remove user from a room
   * @param {string} userId - User ID
   * @param {string} room - Room name
   */
  leaveRoom(userId, room) {
    try {
      const socketIds = this.getUserSockets(userId);

      socketIds.forEach(socketId => {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.leave(room);
        }
      });

      logger.debug('User left room', { userId, room, socketCount: socketIds.length });
    } catch (error) {
      logger.error('Failed to leave room', { userId, room, error: error.message });
    }
  }

  /**
   * Notify task assignment
   * @param {string} userId - Assigned user ID
   * @param {Object} task - Task object
   */
  notifyTaskAssignment(userId, task) {
    this.emitToUser(userId, 'task:assigned', {
      message: 'You have been assigned a new task',
      task
    });
  }

  /**
   * Notify task update
   * @param {Array} userIds - Array of user IDs to notify
   * @param {Object} task - Updated task object
   */
  notifyTaskUpdate(userIds, task) {
    this.emitToUsers(userIds, 'task:updated', {
      message: 'A task has been updated',
      task
    });
  }

  /**
   * Notify task deletion
   * @param {Array} userIds - Array of user IDs to notify
   * @param {string} taskId - Deleted task ID
   */
  notifyTaskDeletion(userIds, taskId) {
    this.emitToUsers(userIds, 'task:deleted', {
      message: 'A task has been deleted',
      taskId
    });
  }

  /**
   * Notify new comment
   * @param {Array} userIds - Array of user IDs to notify
   * @param {Object} comment - Comment object
   */
  notifyNewComment(userIds, comment) {
    this.emitToUsers(userIds, 'comment:new', {
      message: 'New comment added',
      comment
    });
  }

  /**
   * Notify project update
   * @param {string} projectId - Project ID
   * @param {Object} project - Updated project object
   */
  notifyProjectUpdate(projectId, project) {
    this.emitToRoom(`project:${projectId}`, 'project:updated', {
      message: 'Project has been updated',
      project
    });
  }

  /**
   * Notify team member added
   * @param {string} userId - New team member user ID
   * @param {Object} team - Team object
   */
  notifyTeamMemberAdded(userId, team) {
    this.emitToUser(userId, 'team:member_added', {
      message: 'You have been added to a team',
      team
    });
  }

  /**
   * Notify team member removed
   * @param {string} userId - Removed team member user ID
   * @param {string} teamId - Team ID
   */
  notifyTeamMemberRemoved(userId, teamId) {
    this.emitToUser(userId, 'team:member_removed', {
      message: 'You have been removed from a team',
      teamId
    });
  }

  /**
   * Notify file upload
   * @param {Array} userIds - Array of user IDs to notify
   * @param {Object} file - File object
   */
  notifyFileUpload(userIds, file) {
    this.emitToUsers(userIds, 'file:uploaded', {
      message: 'New file uploaded',
      file
    });
  }

  /**
   * Notify status change
   * @param {Array} userIds - Array of user IDs to notify
   * @param {Object} data - Status change data
   */
  notifyStatusChange(userIds, data) {
    this.emitToUsers(userIds, 'status:changed', {
      message: 'Status has been changed',
      ...data
    });
  }

  /**
   * Get online users count
   * @returns {number} Number of online users
   */
  getOnlineUsersCount() {
    return this.userSockets.size;
  }

  /**
   * Get all online user IDs
   * @returns {Array} Array of online user IDs
   */
  getOnlineUserIds() {
    return Array.from(this.userSockets.keys());
  }

  /**
   * Disconnect all sockets for a user
   * @param {string} userId - User ID
   */
  disconnectUser(userId) {
    try {
      const socketIds = this.getUserSockets(userId);

      socketIds.forEach(socketId => {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.disconnect(true);
        }
      });

      logger.info('User disconnected', { userId, socketCount: socketIds.length });
    } catch (error) {
      logger.error('Failed to disconnect user', { userId, error: error.message });
    }
  }
}

// Export singleton instance
module.exports = new SocketService();
