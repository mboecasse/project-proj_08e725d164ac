// File: src/controllers/commentController.js
// Generated: 2025-10-08 13:15:15 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_q3xobmamdfvs


const Comment = require('../models/Comment');


const Task = require('../models/Task');


const logger = require('../utils/logger');

const { successResponse, errorResponse } = require('../utils/response');

/**
 * Get all comments for a task
 * @route GET /api/tasks/:taskId/comments
 */
exports.getComments = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { page = 1, limit = 50, sort = '-createdAt' } = req.query;

    // Verify task exists
    const task = await Task.findById(taskId);
    if (!task) {
      logger.warn('Task not found for comments fetch', { taskId, userId: req.userId });
      return errorResponse(res, 'Task not found', 404);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const comments = await Comment.find({ task: taskId })
      .populate('author', 'name email avatar')
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const total = await Comment.countDocuments({ task: taskId });

    logger.info('Fetched comments for task', {
      taskId,
      count: comments.length,
      total,
      userId: req.userId
    });

    return successResponse(res, {
      comments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    }, 'Comments fetched successfully');
  } catch (error) {
    logger.error('Failed to fetch comments', {
      taskId: req.params.taskId,
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Get single comment by ID
 * @route GET /api/comments/:id
 */
exports.getCommentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const comment = await Comment.findById(id)
      .populate('author', 'name email avatar')
      .populate('task', 'title')
      .lean();

    if (!comment) {
      logger.warn('Comment not found', { commentId: id, userId: req.userId });
      return errorResponse(res, 'Comment not found', 404);
    }

    logger.info('Fetched comment by ID', { commentId: id, userId: req.userId });

    return successResponse(res, comment, 'Comment fetched successfully');
  } catch (error) {
    logger.error('Failed to fetch comment', {
      commentId: req.params.id,
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Create new comment
 * @route POST /api/tasks/:taskId/comments
 */
exports.createComment = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { content } = req.body;

    // Verify task exists
    const task = await Task.findById(taskId);
    if (!task) {
      logger.warn('Task not found for comment creation', { taskId, userId: req.userId });
      return errorResponse(res, 'Task not found', 404);
    }

    // Create comment
    const comment = await Comment.create({
      task: taskId,
      author: req.userId,
      content
    });

    // Populate author details
    await comment.populate('author', 'name email avatar');

    // Update task's comment count and lastActivity
    await Task.findByIdAndUpdate(taskId, {
      $inc: { commentCount: 1 },
      lastActivity: new Date()
    });

    logger.info('Created new comment', {
      commentId: comment._id,
      taskId,
      userId: req.userId
    });

    return successResponse(res, comment, 'Comment created successfully', 201);
  } catch (error) {
    logger.error('Failed to create comment', {
      taskId: req.params.taskId,
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Update comment
 * @route PUT /api/comments/:id
 */
exports.updateComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    // Find comment
    const comment = await Comment.findById(id);
    if (!comment) {
      logger.warn('Comment not found for update', { commentId: id, userId: req.userId });
      return errorResponse(res, 'Comment not found', 404);
    }

    // Check if user is the author
    if (comment.author.toString() !== req.userId) {
      logger.warn('Unauthorized comment update attempt', {
        commentId: id,
        userId: req.userId,
        authorId: comment.author
      });
      return errorResponse(res, 'Not authorized to update this comment', 403);
    }

    // Update comment
    comment.content = content;
    comment.isEdited = true;
    await comment.save();

    // Populate author details
    await comment.populate('author', 'name email avatar');

    // Update task's lastActivity
    await Task.findByIdAndUpdate(comment.task, {
      lastActivity: new Date()
    });

    logger.info('Updated comment', { commentId: id, userId: req.userId });

    return successResponse(res, comment, 'Comment updated successfully');
  } catch (error) {
    logger.error('Failed to update comment', {
      commentId: req.params.id,
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Delete comment
 * @route DELETE /api/comments/:id
 */
exports.deleteComment = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find comment
    const comment = await Comment.findById(id);
    if (!comment) {
      logger.warn('Comment not found for deletion', { commentId: id, userId: req.userId });
      return errorResponse(res, 'Comment not found', 404);
    }

    // Check if user is the author or admin
    if (comment.author.toString() !== req.userId && req.user.role !== 'admin') {
      logger.warn('Unauthorized comment deletion attempt', {
        commentId: id,
        userId: req.userId,
        authorId: comment.author
      });
      return errorResponse(res, 'Not authorized to delete this comment', 403);
    }

    const taskId = comment.task;

    // Delete comment
    await Comment.findByIdAndDelete(id);

    // Update task's comment count and lastActivity
    await Task.findByIdAndUpdate(taskId, {
      $inc: { commentCount: -1 },
      lastActivity: new Date()
    });

    logger.info('Deleted comment', { commentId: id, taskId, userId: req.userId });

    return successResponse(res, null, 'Comment deleted successfully');
  } catch (error) {
    logger.error('Failed to delete comment', {
      commentId: req.params.id,
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Get user's comments
 * @route GET /api/users/:userId/comments
 */
exports.getUserComments = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, sort = '-createdAt' } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const comments = await Comment.find({ author: userId })
      .populate('task', 'title status')
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const total = await Comment.countDocuments({ author: userId });

    logger.info('Fetched user comments', {
      userId,
      count: comments.length,
      total,
      requesterId: req.userId
    });

    return successResponse(res, {
      comments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    }, 'User comments fetched successfully');
  } catch (error) {
    logger.error('Failed to fetch user comments', {
      userId: req.params.userId,
      requesterId: req.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Search comments
 * @route GET /api/comments/search
 */
exports.searchComments = async (req, res, next) => {
  try {
    const { q, taskId, authorId, page = 1, limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
      return errorResponse(res, 'Search query must be at least 2 characters', 400);
    }

    const query = {
      content: { $regex: q.trim(), $options: 'i' }
    };

    if (taskId) {
      query.task = taskId;
    }

    if (authorId) {
      query.author = authorId;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const comments = await Comment.find(query)
      .populate('author', 'name email avatar')
      .populate('task', 'title')
      .sort('-createdAt')
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const total = await Comment.countDocuments(query);

    logger.info('Searched comments', {
      query: q,
      count: comments.length,
      total,
      userId: req.userId
    });

    return successResponse(res, {
      comments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    }, 'Comments search completed');
  } catch (error) {
    logger.error('Failed to search comments', {
      query: req.query.q,
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
};
