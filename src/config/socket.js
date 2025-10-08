// File: src/config/socket.js
// Generated: 2025-10-08 13:14:50 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_wu0tf8oh2zhg


const jwt = require('jsonwebtoken');


const logger = require('../utils/logger');


const socketIo = require('socket.io');

/**
 * Socket.io server configuration and initialization
 * Handles real-time communication for notifications, activity updates, and collaborative features
 */


let io;

/**
 * Initialize Socket.io server
 * @param {Object} server - HTTP server instance
 * @returns {Object} Socket.io instance
 */


const initializeSocket = (server) => {
  try {
    io = socketIo(server, {
      cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    // Authentication middleware for socket connections
    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

        if (!token) {
          logger.warn('Socket connection attempted without token', { socketId: socket.id });
          return next(new Error('Authentication token required'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        socket.userId = decoded.userId;
        socket.user = decoded;

        logger.info('Socket authenticated', { userId: decoded.userId, socketId: socket.id });
        next();
      } catch (error) {
        logger.error('Socket authentication failed', { error: error.message, socketId: socket.id });
        next(new Error('Invalid authentication token'));
      }
    });

    // Connection event handler
    io.on('connection', (socket) => {
      logger.info('Client connected', { userId: socket.userId, socketId: socket.id });

      // Join user's personal room for targeted notifications
      socket.join(`user:${socket.userId}`);

      // Join team rooms
      socket.on('join:team', (teamId) => {
        try {
          socket.join(`team:${teamId}`);
          logger.info('User joined team room', { userId: socket.userId, teamId, socketId: socket.id });
        } catch (error) {
          logger.error('Failed to join team room', { userId: socket.userId, teamId, error: error.message });
        }
      });

      // Leave team rooms
      socket.on('leave:team', (teamId) => {
        try {
          socket.leave(`team:${teamId}`);
          logger.info('User left team room', { userId: socket.userId, teamId, socketId: socket.id });
        } catch (error) {
          logger.error('Failed to leave team room', { userId: socket.userId, teamId, error: error.message });
        }
      });

      // Join project rooms
      socket.on('join:project', (projectId) => {
        try {
          socket.join(`project:${projectId}`);
          logger.info('User joined project room', { userId: socket.userId, projectId, socketId: socket.id });
        } catch (error) {
          logger.error('Failed to join project room', { userId: socket.userId, projectId, error: error.message });
        }
      });

      // Leave project rooms
      socket.on('leave:project', (projectId) => {
        try {
          socket.leave(`project:${projectId}`);
          logger.info('User left project room', { userId: socket.userId, projectId, socketId: socket.id });
        } catch (error) {
          logger.error('Failed to leave project room', { userId: socket.userId, projectId, error: error.message });
        }
      });

      // Join task rooms for real-time collaboration
      socket.on('join:task', (taskId) => {
        try {
          socket.join(`task:${taskId}`);
          logger.info('User joined task room', { userId: socket.userId, taskId, socketId: socket.id });
        } catch (error) {
          logger.error('Failed to join task room', { userId: socket.userId, taskId, error: error.message });
        }
      });

      // Leave task rooms
      socket.on('leave:task', (taskId) => {
        try {
          socket.leave(`task:${taskId}`);
          logger.info('User left task room', { userId: socket.userId, taskId, socketId: socket.id });
        } catch (error) {
          logger.error('Failed to leave task room', { userId: socket.userId, taskId, error: error.message });
        }
      });

      // Handle typing indicators for comments
      socket.on('typing:start', ({ taskId, userName }) => {
        try {
          socket.to(`task:${taskId}`).emit('typing:user', { userId: socket.userId, userName, typing: true });
        } catch (error) {
          logger.error('Failed to broadcast typing start', { userId: socket.userId, taskId, error: error.message });
        }
      });

      socket.on('typing:stop', ({ taskId }) => {
        try {
          socket.to(`task:${taskId}`).emit('typing:user', { userId: socket.userId, typing: false });
        } catch (error) {
          logger.error('Failed to broadcast typing stop', { userId: socket.userId, taskId, error: error.message });
        }
      });

      // Handle user presence
      socket.on('presence:update', (status) => {
        try {
          socket.broadcast.emit('user:presence', { userId: socket.userId, status });
          logger.debug('User presence updated', { userId: socket.userId, status });
        } catch (error) {
          logger.error('Failed to update presence', { userId: socket.userId, error: error.message });
        }
      });

      // Disconnect event handler
      socket.on('disconnect', (reason) => {
        logger.info('Client disconnected', { userId: socket.userId, socketId: socket.id, reason });
        socket.broadcast.emit('user:presence', { userId: socket.userId, status: 'offline' });
      });

      // Error handler
      socket.on('error', (error) => {
        logger.error('Socket error', { userId: socket.userId, socketId: socket.id, error: error.message });
      });
    });

    logger.info('Socket.io server initialized successfully');
    return io;
  } catch (error) {
    logger.error('Failed to initialize Socket.io server', { error: error.message, stack: error.stack });
    throw error;
  }
};

/**
 * Get Socket.io instance
 * @returns {Object} Socket.io instance
 */


const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized. Call initializeSocket first.');
  }
  return io;
};

/**
 * Emit notification to specific user
 * @param {string} userId - User ID
 * @param {Object} notification - Notification data
 */


const emitToUser = (userId, event, data) => {
  try {
    if (!io) {
      logger.warn('Socket.io not initialized, cannot emit to user', { userId, event });
      return;
    }
    io.to(`user:${userId}`).emit(event, data);
    logger.debug('Emitted event to user', { userId, event });
  } catch (error) {
    logger.error('Failed to emit to user', { userId, event, error: error.message });
  }
};

/**
 * Emit event to team room
 * @param {string} teamId - Team ID
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */


const emitToTeam = (teamId, event, data) => {
  try {
    if (!io) {
      logger.warn('Socket.io not initialized, cannot emit to team', { teamId, event });
      return;
    }
    io.to(`team:${teamId}`).emit(event, data);
    logger.debug('Emitted event to team', { teamId, event });
  } catch (error) {
    logger.error('Failed to emit to team', { teamId, event, error: error.message });
  }
};

/**
 * Emit event to project room
 * @param {string} projectId - Project ID
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */


const emitToProject = (projectId, event, data) => {
  try {
    if (!io) {
      logger.warn('Socket.io not initialized, cannot emit to project', { projectId, event });
      return;
    }
    io.to(`project:${projectId}`).emit(event, data);
    logger.debug('Emitted event to project', { projectId, event });
  } catch (error) {
    logger.error('Failed to emit to project', { projectId, event, error: error.message });
  }
};

/**
 * Emit event to task room
 * @param {string} taskId - Task ID
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */


const emitToTask = (taskId, event, data) => {
  try {
    if (!io) {
      logger.warn('Socket.io not initialized, cannot emit to task', { taskId, event });
      return;
    }
    io.to(`task:${taskId}`).emit(event, data);
    logger.debug('Emitted event to task', { taskId, event });
  } catch (error) {
    logger.error('Failed to emit to task', { taskId, event, error: error.message });
  }
};

/**
 * Emit notification to multiple users
 * @param {Array<string>} userIds - Array of user IDs
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */


const emitToUsers = (userIds, event, data) => {
  try {
    if (!io) {
      logger.warn('Socket.io not initialized, cannot emit to users', { userCount: userIds.length, event });
      return;
    }
    userIds.forEach(userId => {
      io.to(`user:${userId}`).emit(event, data);
    });
    logger.debug('Emitted event to multiple users', { userCount: userIds.length, event });
  } catch (error) {
    logger.error('Failed to emit to users', { userCount: userIds.length, event, error: error.message });
  }
};

module.exports = {
  initializeSocket,
  getIO,
  emitToUser,
  emitToTeam,
  emitToProject,
  emitToTask,
  emitToUsers
};
