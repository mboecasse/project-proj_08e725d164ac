// File: src/services/commentService.js
// Generated: 2025-10-08 13:18:07 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_ljxvdgddoeiz


const Comment = require('../models/Comment');


const Task = require('../models/Task');


const logger = require('../utils/logger');


const mongoose = require('mongoose');


const notificationService = require('./notificationService');

/**
 * Create a new comment on a task
 * @param {string} taskId - Task ID
 * @param {string} userId - User ID creating the comment
 * @param {string} content - Comment content
 * @returns {Promise<Object>} Created comment
 */
exports.createComment = async (taskId, userId, content) => {
  try {
    // Validate task exists
    const task = await Task.findById(taskId).populate('assignedTo project');
    if (!task) {
      const error = new Error('Task not found');
      error.statusCode = 404;
      throw error;
    }

    // Create comment
    const comment = await Comment.create({
      task: taskId,
      author: userId,
      content,
      replies: []
    });

    // Populate author details
    await comment.populate('author', 'name email');

    // Update task's comment count
    await Task.findByIdAndUpdate(taskId, {
      $inc: { commentCount: 1 }
    });

    // Create notifications for task assignees (excluding comment author)
    const notificationRecipients = task.assignedTo
      .filter(assignee => assignee._id.toString() !== userId.toString())
      .map(assignee => assignee._id);

    if (notificationRecipients.length > 0) {
      await notificationService.createNotification({
        recipients: notificationRecipients,
        type: 'comment',
        title: 'New Comment',
        message: `New comment on task: ${task.title}`,
        relatedTask: taskId,
        relatedComment: comment._id,
        actionUrl: `/tasks/${taskId}#comment-${comment._id}`,
        createdBy: userId
      });
    }

    logger.info('Comment created', {
      commentId: comment._id,
      taskId,
      userId,
      recipientCount: notificationRecipients.length
    });

    return comment;
  } catch (error) {
    logger.error('Failed to create comment', {
      taskId,
      userId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Get all comments for a task
 * @param {string} taskId - Task ID
 * @param {Object} options - Query options (page, limit, sort)
 * @returns {Promise<Object>} Comments with pagination
 */
exports.getTaskComments = async (taskId, options = {}) => {
  try {
    const { page = 1, limit = 20, sort = '-createdAt' } = options;
    const skip = (page - 1) * limit;

    // Validate task exists
    const task = await Task.findById(taskId);
    if (!task) {
      const error = new Error('Task not found');
      error.statusCode = 404;
      throw error;
    }

    // Fetch comments with pagination
    const comments = await Comment.find({ task: taskId })
      .populate('author', 'name email avatar')
      .populate('replies.author', 'name email avatar')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count
    const total = await Comment.countDocuments({ task: taskId });

    logger.info('Fetched task comments', {
      taskId,
      count: comments.length,
      total,
      page
    });

    return {
      comments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    logger.error('Failed to fetch task comments', {
      taskId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Get a single comment by ID
 * @param {string} commentId - Comment ID
 * @returns {Promise<Object>} Comment
 */
exports.getCommentById = async (commentId) => {
  try {
    const comment = await Comment.findById(commentId)
      .populate('author', 'name email avatar')
      .populate('replies.author', 'name email avatar')
      .populate('task', 'title');

    if (!comment) {
      const error = new Error('Comment not found');
      error.statusCode = 404;
      throw error;
    }

    logger.info('Fetched comment by ID', { commentId });

    return comment;
  } catch (error) {
    logger.error('Failed to fetch comment', {
      commentId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Update a comment
 * @param {string} commentId - Comment ID
 * @param {string} userId - User ID updating the comment
 * @param {string} content - Updated content
 * @returns {Promise<Object>} Updated comment
 */
exports.updateComment = async (commentId, userId, content) => {
  try {
    const comment = await Comment.findById(commentId);

    if (!comment) {
      const error = new Error('Comment not found');
      error.statusCode = 404;
      throw error;
    }

    // Check if user is the author
    if (comment.author.toString() !== userId.toString()) {
      const error = new Error('Not authorized to update this comment');
      error.statusCode = 403;
      throw error;
    }

    // Update comment
    comment.content = content;
    comment.isEdited = true;
    await comment.save();

    // Populate author details
    await comment.populate('author', 'name email avatar');

    logger.info('Comment updated', { commentId, userId });

    return comment;
  } catch (error) {
    logger.error('Failed to update comment', {
      commentId,
      userId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Delete a comment
 * @param {string} commentId - Comment ID
 * @param {string} userId - User ID deleting the comment
 * @returns {Promise<void>}
 */
exports.deleteComment = async (commentId, userId) => {
  try {
    const comment = await Comment.findById(commentId);

    if (!comment) {
      const error = new Error('Comment not found');
      error.statusCode = 404;
      throw error;
    }

    // Check if user is the author
    if (comment.author.toString() !== userId.toString()) {
      const error = new Error('Not authorized to delete this comment');
      error.statusCode = 403;
      throw error;
    }

    const taskId = comment.task;

    // Delete comment
    await Comment.findByIdAndDelete(commentId);

    // Update task's comment count
    await Task.findByIdAndUpdate(taskId, {
      $inc: { commentCount: -1 }
    });

    logger.info('Comment deleted', { commentId, userId, taskId });
  } catch (error) {
    logger.error('Failed to delete comment', {
      commentId,
      userId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Add a reply to a comment
 * @param {string} commentId - Comment ID
 * @param {string} userId - User ID creating the reply
 * @param {string} content - Reply content
 * @returns {Promise<Object>} Updated comment with new reply
 */
exports.addReply = async (commentId, userId, content) => {
  try {
    const comment = await Comment.findById(commentId).populate('task author');

    if (!comment) {
      const error = new Error('Comment not found');
      error.statusCode = 404;
      throw error;
    }

    // Create reply object
    const reply = {
      _id: new mongoose.Types.ObjectId(),
      author: userId,
      content,
      createdAt: new Date()
    };

    // Add reply to comment
    comment.replies.push(reply);
    await comment.save();

    // Populate all author details
    await comment.populate('author', 'name email avatar');
    await comment.populate('replies.author', 'name email avatar');

    // Create notification for comment author (if not replying to own comment)
    if (comment.author._id.toString() !== userId.toString()) {
      await notificationService.createNotification({
        recipients: [comment.author._id],
        type: 'reply',
        title: 'New Reply',
        message: `New reply to your comment on task: ${comment.task.title}`,
        relatedTask: comment.task._id,
        relatedComment: comment._id,
        actionUrl: `/tasks/${comment.task._id}#comment-${comment._id}`,
        createdBy: userId
      });
    }

    logger.info('Reply added to comment', {
      commentId,
      replyId: reply._id,
      userId,
      taskId: comment.task._id
    });

    return comment;
  } catch (error) {
    logger.error('Failed to add reply', {
      commentId,
      userId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Update a reply
 * @param {string} commentId - Comment ID
 * @param {string} replyId - Reply ID
 * @param {string} userId - User ID updating the reply
 * @param {string} content - Updated content
 * @returns {Promise<Object>} Updated comment
 */
exports.updateReply = async (commentId, replyId, userId, content) => {
  try {
    const comment = await Comment.findById(commentId);

    if (!comment) {
      const error = new Error('Comment not found');
      error.statusCode = 404;
      throw error;
    }

    // Find reply
    const reply = comment.replies.id(replyId);
    if (!reply) {
      const error = new Error('Reply not found');
      error.statusCode = 404;
      throw error;
    }

    // Check if user is the author
    if (reply.author.toString() !== userId.toString()) {
      const error = new Error('Not authorized to update this reply');
      error.statusCode = 403;
      throw error;
    }

    // Update reply
    reply.content = content;
    reply.isEdited = true;
    await comment.save();

    // Populate author details
    await comment.populate('author', 'name email avatar');
    await comment.populate('replies.author', 'name email avatar');

    logger.info('Reply updated', { commentId, replyId, userId });

    return comment;
  } catch (error) {
    logger.error('Failed to update reply', {
      commentId,
      replyId,
      userId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Delete a reply
 * @param {string} commentId - Comment ID
 * @param {string} replyId - Reply ID
 * @param {string} userId - User ID deleting the reply
 * @returns {Promise<Object>} Updated comment
 */
exports.deleteReply = async (commentId, replyId, userId) => {
  try {
    const comment = await Comment.findById(commentId);

    if (!comment) {
      const error = new Error('Comment not found');
      error.statusCode = 404;
      throw error;
    }

    // Find reply
    const reply = comment.replies.id(replyId);
    if (!reply) {
      const error = new Error('Reply not found');
      error.statusCode = 404;
      throw error;
    }

    // Check if user is the author
    if (reply.author.toString() !== userId.toString()) {
      const error = new Error('Not authorized to delete this reply');
      error.statusCode = 403;
      throw error;
    }

    // Remove reply
    comment.replies.pull(replyId);
    await comment.save();

    // Populate author details
    await comment.populate('author', 'name email avatar');
    await comment.populate('replies.author', 'name email avatar');

    logger.info('Reply deleted', { commentId, replyId, userId });

    return comment;
  } catch (error) {
    logger.error('Failed to delete reply', {
      commentId,
      replyId,
      userId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Get user's recent comments
 * @param {string} userId - User ID
 * @param {number} limit - Number of comments to fetch
 * @returns {Promise<Array>} Recent comments
 */
exports.getUserRecentComments = async (userId, limit = 10) => {
  try {
    const comments = await Comment.find({ author: userId })
      .populate('task', 'title status')
      .sort('-createdAt')
      .limit(limit)
      .lean();

    logger.info('Fetched user recent comments', {
      userId,
      count: comments.length
    });

    return comments;
  } catch (error) {
    logger.error('Failed to fetch user recent comments', {
      userId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Search comments by content
 * @param {string} taskId - Task ID
 * @param {string} searchQuery - Search query
 * @returns {Promise<Array>} Matching comments
 */
exports.searchComments = async (taskId, searchQuery) => {
  try {
    const comments = await Comment.find({
      task: taskId,
      content: { $regex: searchQuery, $options: 'i' }
    })
      .populate('author', 'name email avatar')
      .sort('-createdAt')
      .lean();

    logger.info('Searched comments', {
      taskId,
      searchQuery,
      count: comments.length
    });

    return comments;
  } catch (error) {
    logger.error('Failed to search comments', {
      taskId,
      searchQuery,
      error: error.message
    });
    throw error;
  }
};

/**
 * Get comment statistics for a task
 * @param {string} taskId - Task ID
 * @returns {Promise<Object>} Comment statistics
 */
exports.getCommentStats = async (taskId) => {
  try {
    const stats = await Comment.aggregate([
      { $match: { task: new mongoose.Types.ObjectId(taskId) } },
      {
        $group: {
          _id: null,
          totalComments: { $sum: 1 },
          totalReplies: { $sum: { $size: '$replies' } },
          uniqueAuthors: { $addToSet: '$author' }
        }
      },
      {
        $project: {
          _id: 0,
          totalComments: 1,
          totalReplies: 1,
          uniqueAuthors: { $size: '$uniqueAuthors' }
        }
      }
    ]);

    const result = stats.length > 0 ? stats[0] : {
      totalComments: 0,
      totalReplies: 0,
      uniqueAuthors: 0
    };

    logger.info('Fetched comment stats', { taskId, stats: result });

    return result;
  } catch (error) {
    logger.error('Failed to fetch comment stats', {
      taskId,
      error: error.message
    });
    throw error;
  }
};
