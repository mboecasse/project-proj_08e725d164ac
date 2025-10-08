// File: src/sockets/handlers/commentHandler.js
// Generated: 2025-10-08 13:18:35 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_23hq1kgo18kx


const commentService = require('../../services/commentService');


const logger = require('../../utils/logger');

/**
 * Handle comment created event
 * Broadcasts new comment to all users in the task's project
 */


const handleCommentCreated = async (io, socket, data) => {
  try {
    const { taskId, content, parentId } = data;
    const userId = socket.userId;

    if (!taskId || !content) {
      socket.emit('comment:error', {
        success: false,
        error: 'Task ID and content are required'
      });
      return;
    }

    // Create comment via service
    const comment = await commentService.createComment({
      taskId,
      userId,
      content,
      parentId: parentId || null
    });

    // Broadcast to all users in the task's project room
    const projectRoom = `project:${comment.task.project}`;
    io.to(projectRoom).emit('comment:created', {
      success: true,
      data: comment
    });

    logger.info('Comment created via socket', {
      commentId: comment._id,
      taskId,
      userId,
      projectId: comment.task.project,
      hasParent: !!parentId
    });
  } catch (error) {
    logger.error('Failed to create comment via socket', {
      error: error.message,
      taskId: data.taskId,
      userId: socket.userId
    });

    socket.emit('comment:error', {
      success: false,
      error: error.message || 'Failed to create comment'
    });
  }
};

/**
 * Handle comment updated event
 * Broadcasts updated comment to all users in the task's project
 */


const handleCommentUpdated = async (io, socket, data) => {
  try {
    const { commentId, content } = data;
    const userId = socket.userId;

    if (!commentId || !content) {
      socket.emit('comment:error', {
        success: false,
        error: 'Comment ID and content are required'
      });
      return;
    }

    // Update comment via service
    const comment = await commentService.updateComment(commentId, userId, { content });

    // Broadcast to all users in the task's project room
    const projectRoom = `project:${comment.task.project}`;
    io.to(projectRoom).emit('comment:updated', {
      success: true,
      data: comment
    });

    logger.info('Comment updated via socket', {
      commentId,
      userId,
      projectId: comment.task.project
    });
  } catch (error) {
    logger.error('Failed to update comment via socket', {
      error: error.message,
      commentId: data.commentId,
      userId: socket.userId
    });

    socket.emit('comment:error', {
      success: false,
      error: error.message || 'Failed to update comment'
    });
  }
};

/**
 * Handle comment deleted event
 * Broadcasts deletion to all users in the task's project
 */


const handleCommentDeleted = async (io, socket, data) => {
  try {
    const { commentId } = data;
    const userId = socket.userId;

    if (!commentId) {
      socket.emit('comment:error', {
        success: false,
        error: 'Comment ID is required'
      });
      return;
    }

    // Delete comment via service (get project ID before deletion)
    const result = await commentService.deleteComment(commentId, userId);

    // Broadcast to all users in the task's project room
    const projectRoom = `project:${result.projectId}`;
    io.to(projectRoom).emit('comment:deleted', {
      success: true,
      data: {
        commentId,
        taskId: result.taskId
      }
    });

    logger.info('Comment deleted via socket', {
      commentId,
      userId,
      projectId: result.projectId
    });
  } catch (error) {
    logger.error('Failed to delete comment via socket', {
      error: error.message,
      commentId: data.commentId,
      userId: socket.userId
    });

    socket.emit('comment:error', {
      success: false,
      error: error.message || 'Failed to delete comment'
    });
  }
};

/**
 * Handle comment reaction added event
 * Broadcasts reaction to all users in the task's project
 */


const handleReactionAdded = async (io, socket, data) => {
  try {
    const { commentId, emoji } = data;
    const userId = socket.userId;

    if (!commentId || !emoji) {
      socket.emit('comment:error', {
        success: false,
        error: 'Comment ID and emoji are required'
      });
      return;
    }

    // Add reaction via service
    const comment = await commentService.addReaction(commentId, userId, emoji);

    // Broadcast to all users in the task's project room
    const projectRoom = `project:${comment.task.project}`;
    io.to(projectRoom).emit('comment:reaction:added', {
      success: true,
      data: {
        commentId,
        reactions: comment.reactions
      }
    });

    logger.info('Comment reaction added via socket', {
      commentId,
      userId,
      emoji,
      projectId: comment.task.project
    });
  } catch (error) {
    logger.error('Failed to add comment reaction via socket', {
      error: error.message,
      commentId: data.commentId,
      userId: socket.userId
    });

    socket.emit('comment:error', {
      success: false,
      error: error.message || 'Failed to add reaction'
    });
  }
};

/**
 * Handle comment reaction removed event
 * Broadcasts reaction removal to all users in the task's project
 */


const handleReactionRemoved = async (io, socket, data) => {
  try {
    const { commentId, emoji } = data;
    const userId = socket.userId;

    if (!commentId || !emoji) {
      socket.emit('comment:error', {
        success: false,
        error: 'Comment ID and emoji are required'
      });
      return;
    }

    // Remove reaction via service
    const comment = await commentService.removeReaction(commentId, userId, emoji);

    // Broadcast to all users in the task's project room
    const projectRoom = `project:${comment.task.project}`;
    io.to(projectRoom).emit('comment:reaction:removed', {
      success: true,
      data: {
        commentId,
        reactions: comment.reactions
      }
    });

    logger.info('Comment reaction removed via socket', {
      commentId,
      userId,
      emoji,
      projectId: comment.task.project
    });
  } catch (error) {
    logger.error('Failed to remove comment reaction via socket', {
      error: error.message,
      commentId: data.commentId,
      userId: socket.userId
    });

    socket.emit('comment:error', {
      success: false,
      error: error.message || 'Failed to remove reaction'
    });
  }
};

/**
 * Handle get task comments event
 * Sends all comments for a task to the requesting socket
 */


const handleGetTaskComments = async (io, socket, data) => {
  try {
    const { taskId } = data;

    if (!taskId) {
      socket.emit('comment:error', {
        success: false,
        error: 'Task ID is required'
      });
      return;
    }

    // Get comments via service
    const comments = await commentService.getTaskComments(taskId);

    socket.emit('comment:list', {
      success: true,
      data: comments
    });

    logger.info('Task comments retrieved via socket', {
      taskId,
      userId: socket.userId,
      count: comments.length
    });
  } catch (error) {
    logger.error('Failed to get task comments via socket', {
      error: error.message,
      taskId: data.taskId,
      userId: socket.userId
    });

    socket.emit('comment:error', {
      success: false,
      error: error.message || 'Failed to retrieve comments'
    });
  }
};

/**
 * Register all comment event handlers for a socket connection
 */


const registerCommentHandlers = (io, socket) => {
  socket.on('comment:create', (data) => handleCommentCreated(io, socket, data));
  socket.on('comment:update', (data) => handleCommentUpdated(io, socket, data));
  socket.on('comment:delete', (data) => handleCommentDeleted(io, socket, data));
  socket.on('comment:reaction:add', (data) => handleReactionAdded(io, socket, data));
  socket.on('comment:reaction:remove', (data) => handleReactionRemoved(io, socket, data));
  socket.on('comment:get', (data) => handleGetTaskComments(io, socket, data));

  logger.debug('Comment handlers registered', { socketId: socket.id, userId: socket.userId });
};

module.exports = {
  registerCommentHandlers,
  handleCommentCreated,
  handleCommentUpdated,
  handleCommentDeleted,
  handleReactionAdded,
  handleReactionRemoved,
  handleGetTaskComments
};
