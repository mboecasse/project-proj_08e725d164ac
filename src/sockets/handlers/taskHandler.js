// File: src/sockets/handlers/taskHandler.js
// Generated: 2025-10-08 13:18:53 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_f4myxz4fo2es


const logger = require('../../utils/logger');


const taskService = require('../../services/taskService');

/**
 * Task Socket Event Handlers
 * Handles real-time task events and broadcasts updates
 */

/**
 * Initialize task event handlers for a socket connection
 * @param {Object} io - Socket.io server instance
 * @param {Object} socket - Socket connection instance
 */


const initializeTaskHandlers = (io, socket) => {
  const userId = socket.user._id.toString();

  /**
   * Join task room for real-time updates
   */
  socket.on('task:join', async (data) => {
    try {
      const { taskId } = data;

      if (!taskId) {
        socket.emit('task:error', {
          success: false,
          error: 'Task ID is required'
        });
        return;
      }

      // Verify user has access to task
      const task = await taskService.getTaskById(taskId, userId);

      if (!task) {
        socket.emit('task:error', {
          success: false,
          error: 'Task not found or access denied'
        });
        return;
      }

      // Join task-specific room
      const roomName = `task:${taskId}`;
      socket.join(roomName);

      logger.info('User joined task room', {
        userId,
        taskId,
        socketId: socket.id
      });

      socket.emit('task:joined', {
        success: true,
        taskId,
        message: 'Joined task room successfully'
      });
    } catch (error) {
      logger.error('Error joining task room', {
        userId,
        error: error.message,
        data
      });

      socket.emit('task:error', {
        success: false,
        error: 'Failed to join task room'
      });
    }
  });

  /**
   * Leave task room
   */
  socket.on('task:leave', async (data) => {
    try {
      const { taskId } = data;

      if (!taskId) {
        return;
      }

      const roomName = `task:${taskId}`;
      socket.leave(roomName);

      logger.info('User left task room', {
        userId,
        taskId,
        socketId: socket.id
      });

      socket.emit('task:left', {
        success: true,
        taskId,
        message: 'Left task room successfully'
      });
    } catch (error) {
      logger.error('Error leaving task room', {
        userId,
        error: error.message,
        data
      });
    }
  });

  /**
   * Task created event
   */
  socket.on('task:create', async (data) => {
    try {
      const { projectId, title, description, priority, dueDate, assignedTo, tags } = data;

      if (!projectId || !title) {
        socket.emit('task:error', {
          success: false,
          error: 'Project ID and title are required'
        });
        return;
      }

      const taskData = {
        projectId,
        title,
        description,
        priority,
        dueDate,
        assignedTo,
        tags,
        createdBy: userId
      };

      const task = await taskService.createTask(taskData, userId);

      // Broadcast to project room
      io.to(`project:${projectId}`).emit('task:created', {
        success: true,
        data: task,
        createdBy: userId
      });

      logger.info('Task created via socket', {
        userId,
        taskId: task._id,
        projectId
      });

      socket.emit('task:create:success', {
        success: true,
        data: task
      });
    } catch (error) {
      logger.error('Error creating task via socket', {
        userId,
        error: error.message,
        data
      });

      socket.emit('task:error', {
        success: false,
        error: error.message || 'Failed to create task'
      });
    }
  });

  /**
   * Task updated event
   */
  socket.on('task:update', async (data) => {
    try {
      const { taskId, updates } = data;

      if (!taskId) {
        socket.emit('task:error', {
          success: false,
          error: 'Task ID is required'
        });
        return;
      }

      const task = await taskService.updateTask(taskId, updates, userId);

      // Broadcast to task room
      io.to(`task:${taskId}`).emit('task:updated', {
        success: true,
        data: task,
        updatedBy: userId
      });

      // Also broadcast to project room
      io.to(`project:${task.projectId}`).emit('task:updated', {
        success: true,
        data: task,
        updatedBy: userId
      });

      logger.info('Task updated via socket', {
        userId,
        taskId,
        updates: Object.keys(updates)
      });

      socket.emit('task:update:success', {
        success: true,
        data: task
      });
    } catch (error) {
      logger.error('Error updating task via socket', {
        userId,
        error: error.message,
        data
      });

      socket.emit('task:error', {
        success: false,
        error: error.message || 'Failed to update task'
      });
    }
  });

  /**
   * Task status changed event
   */
  socket.on('task:status', async (data) => {
    try {
      const { taskId, status } = data;

      if (!taskId || !status) {
        socket.emit('task:error', {
          success: false,
          error: 'Task ID and status are required'
        });
        return;
      }

      const task = await taskService.updateTaskStatus(taskId, status, userId);

      // Broadcast to task room
      io.to(`task:${taskId}`).emit('task:status:changed', {
        success: true,
        data: task,
        changedBy: userId,
        oldStatus: data.oldStatus,
        newStatus: status
      });

      // Broadcast to project room
      io.to(`project:${task.projectId}`).emit('task:status:changed', {
        success: true,
        data: task,
        changedBy: userId
      });

      logger.info('Task status changed via socket', {
        userId,
        taskId,
        status
      });

      socket.emit('task:status:success', {
        success: true,
        data: task
      });
    } catch (error) {
      logger.error('Error changing task status via socket', {
        userId,
        error: error.message,
        data
      });

      socket.emit('task:error', {
        success: false,
        error: error.message || 'Failed to change task status'
      });
    }
  });

  /**
   * Task assigned event
   */
  socket.on('task:assign', async (data) => {
    try {
      const { taskId, assignedTo } = data;

      if (!taskId || !assignedTo) {
        socket.emit('task:error', {
          success: false,
          error: 'Task ID and assignee are required'
        });
        return;
      }

      const task = await taskService.assignTask(taskId, assignedTo, userId);

      // Broadcast to task room
      io.to(`task:${taskId}`).emit('task:assigned', {
        success: true,
        data: task,
        assignedBy: userId,
        assignedTo
      });

      // Broadcast to project room
      io.to(`project:${task.projectId}`).emit('task:assigned', {
        success: true,
        data: task,
        assignedBy: userId,
        assignedTo
      });

      // Notify assigned user
      io.to(`user:${assignedTo}`).emit('task:assigned:notification', {
        success: true,
        data: task,
        assignedBy: userId
      });

      logger.info('Task assigned via socket', {
        userId,
        taskId,
        assignedTo
      });

      socket.emit('task:assign:success', {
        success: true,
        data: task
      });
    } catch (error) {
      logger.error('Error assigning task via socket', {
        userId,
        error: error.message,
        data
      });

      socket.emit('task:error', {
        success: false,
        error: error.message || 'Failed to assign task'
      });
    }
  });

  /**
   * Task deleted event
   */
  socket.on('task:delete', async (data) => {
    try {
      const { taskId } = data;

      if (!taskId) {
        socket.emit('task:error', {
          success: false,
          error: 'Task ID is required'
        });
        return;
      }

      // Get task before deletion to access projectId
      const task = await taskService.getTaskById(taskId, userId);

      if (!task) {
        socket.emit('task:error', {
          success: false,
          error: 'Task not found or access denied'
        });
        return;
      }

      const projectId = task.projectId;

      await taskService.deleteTask(taskId, userId);

      // Broadcast to task room
      io.to(`task:${taskId}`).emit('task:deleted', {
        success: true,
        taskId,
        deletedBy: userId
      });

      // Broadcast to project room
      io.to(`project:${projectId}`).emit('task:deleted', {
        success: true,
        taskId,
        deletedBy: userId
      });

      logger.info('Task deleted via socket', {
        userId,
        taskId
      });

      socket.emit('task:delete:success', {
        success: true,
        taskId
      });
    } catch (error) {
      logger.error('Error deleting task via socket', {
        userId,
        error: error.message,
        data
      });

      socket.emit('task:error', {
        success: false,
        error: error.message || 'Failed to delete task'
      });
    }
  });

  /**
   * Task comment added event
   */
  socket.on('task:comment:add', async (data) => {
    try {
      const { taskId, content } = data;

      if (!taskId || !content) {
        socket.emit('task:error', {
          success: false,
          error: 'Task ID and comment content are required'
        });
        return;
      }

      const comment = await taskService.addComment(taskId, content, userId);

      // Broadcast to task room
      io.to(`task:${taskId}`).emit('task:comment:added', {
        success: true,
        data: comment,
        taskId,
        addedBy: userId
      });

      logger.info('Task comment added via socket', {
        userId,
        taskId,
        commentId: comment._id
      });

      socket.emit('task:comment:add:success', {
        success: true,
        data: comment
      });
    } catch (error) {
      logger.error('Error adding task comment via socket', {
        userId,
        error: error.message,
        data
      });

      socket.emit('task:error', {
        success: false,
        error: error.message || 'Failed to add comment'
      });
    }
  });

  /**
   * Task priority changed event
   */
  socket.on('task:priority', async (data) => {
    try {
      const { taskId, priority } = data;

      if (!taskId || !priority) {
        socket.emit('task:error', {
          success: false,
          error: 'Task ID and priority are required'
        });
        return;
      }

      const task = await taskService.updateTask(taskId, { priority }, userId);

      // Broadcast to task room
      io.to(`task:${taskId}`).emit('task:priority:changed', {
        success: true,
        data: task,
        changedBy: userId,
        newPriority: priority
      });

      // Broadcast to project room
      io.to(`project:${task.projectId}`).emit('task:priority:changed', {
        success: true,
        data: task,
        changedBy: userId
      });

      logger.info('Task priority changed via socket', {
        userId,
        taskId,
        priority
      });

      socket.emit('task:priority:success', {
        success: true,
        data: task
      });
    } catch (error) {
      logger.error('Error changing task priority via socket', {
        userId,
        error: error.message,
        data
      });

      socket.emit('task:error', {
        success: false,
        error: error.message || 'Failed to change task priority'
      });
    }
  });

  /**
   * Task typing indicator
   */
  socket.on('task:typing', (data) => {
    try {
      const { taskId, isTyping } = data;

      if (!taskId) {
        return;
      }

      // Broadcast typing status to task room (except sender)
      socket.to(`task:${taskId}`).emit('task:typing:update', {
        userId,
        taskId,
        isTyping,
        user: socket.user
      });
    } catch (error) {
      logger.error('Error handling task typing event', {
        userId,
        error: error.message,
        data
      });
    }
  });

  logger.info('Task handlers initialized', {
    userId,
    socketId: socket.id
  });
};

/**
 * Broadcast task event to specific rooms
 * @param {Object} io - Socket.io server instance
 * @param {String} event - Event name
 * @param {Object} data - Event data
 * @param {String} taskId - Task ID for room targeting
 * @param {String} projectId - Project ID for room targeting
 */


const broadcastTaskEvent = (io, event, data, taskId, projectId) => {
  try {
    if (taskId) {
      io.to(`task:${taskId}`).emit(event, data);
    }

    if (projectId) {
      io.to(`project:${projectId}`).emit(event, data);
    }

    logger.debug('Task event broadcasted', {
      event,
      taskId,
      projectId
    });
  } catch (error) {
    logger.error('Error broadcasting task event', {
      event,
      error: error.message,
      taskId,
      projectId
    });
  }
};

module.exports = {
  initializeTaskHandlers,
  broadcastTaskEvent
};
