// File: src/routes/comments.js
// Generated: 2025-10-08 13:16:50 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_6ymjtsmq8tsr


const Comment = require('../models/Comment');


const Task = require('../models/Task');


const express = require('express');


const logger = require('../utils/logger');

const { auth } = require('../middleware/auth');

const { body, param } = require('express-validator');

const { validate } = require('../middleware/validator');


const router = express.Router();

/**
 * Validation rules for creating a comment
 */


const createCommentValidation = [
  body('taskId')
    .notEmpty()
    .withMessage('Task ID is required')
    .isMongoId()
    .withMessage('Invalid task ID'),
  body('content')
    .notEmpty()
    .withMessage('Comment content is required')
    .isLength({ min: 1, max: 5000 })
    .withMessage('Comment must be between 1 and 5000 characters')
    .trim(),
  body('parentCommentId')
    .optional()
    .isMongoId()
    .withMessage('Invalid parent comment ID')
];

/**
 * Validation rules for updating a comment
 */


const updateCommentValidation = [
  param('id')
    .notEmpty()
    .withMessage('Comment ID is required')
    .isMongoId()
    .withMessage('Invalid comment ID'),
  body('content')
    .notEmpty()
    .withMessage('Comment content is required')
    .isLength({ min: 1, max: 5000 })
    .withMessage('Comment must be between 1 and 5000 characters')
    .trim()
];

/**
 * Validation rules for comment ID parameter
 */


const commentIdValidation = [
  param('id')
    .notEmpty()
    .withMessage('Comment ID is required')
    .isMongoId()
    .withMessage('Invalid comment ID')
];

/**
 * Validation rules for task ID parameter
 */


const taskIdValidation = [
  param('taskId')
    .notEmpty()
    .withMessage('Task ID is required')
    .isMongoId()
    .withMessage('Invalid task ID')
];

/**
 * POST /api/comments
 * Create a new comment or reply
 */
router.post('/', auth, createCommentValidation, validate, async (req, res, next) => {
  try {
    const { taskId, content, parentCommentId } = req.body;
    const userId = req.userId;

    // Verify task exists
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // If this is a reply, verify parent comment exists and belongs to same task
    if (parentCommentId) {
      const parentComment = await Comment.findById(parentCommentId);
      if (!parentComment) {
        return res.status(404).json({
          success: false,
          error: 'Parent comment not found'
        });
      }
      if (parentComment.task.toString() !== taskId) {
        return res.status(400).json({
          success: false,
          error: 'Parent comment does not belong to this task'
        });
      }
    }

    // Create comment
    const comment = await Comment.create({
      task: taskId,
      author: userId,
      content,
      parentComment: parentCommentId || null
    });

    // Populate author details
    await comment.populate('author', 'name email avatar');

    logger.info('Created comment', {
      commentId: comment._id,
      taskId,
      userId,
      isReply: !!parentCommentId
    });

    res.status(201).json({
      success: true,
      data: comment,
      message: parentCommentId ? 'Reply added successfully' : 'Comment created successfully'
    });
  } catch (error) {
    logger.error('Failed to create comment', {
      error: error.message,
      userId: req.userId,
      taskId: req.body.taskId
    });
    next(error);
  }
});

/**
 * GET /api/comments/task/:taskId
 * Get all comments for a task (with nested replies)
 */
router.get('/task/:taskId', auth, taskIdValidation, validate, async (req, res, next) => {
  try {
    const { taskId } = req.params;

    // Verify task exists
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // Get all top-level comments (no parent)
    const comments = await Comment.find({
      task: taskId,
      parentComment: null,
      isDeleted: false
    })
      .populate('author', 'name email avatar')
      .sort({ createdAt: -1 });

    // Get all replies for these comments
    const commentIds = comments.map(c => c._id);
    const replies = await Comment.find({
      parentComment: { $in: commentIds },
      isDeleted: false
    })
      .populate('author', 'name email avatar')
      .sort({ createdAt: 1 });

    // Organize replies under their parent comments
    const commentsWithReplies = comments.map(comment => {
      const commentObj = comment.toObject();
      commentObj.replies = replies.filter(
        reply => reply.parentComment.toString() === comment._id.toString()
      );
      return commentObj;
    });

    logger.info('Fetched comments for task', {
      taskId,
      count: comments.length,
      repliesCount: replies.length
    });

    res.json({
      success: true,
      count: comments.length,
      data: commentsWithReplies
    });
  } catch (error) {
    logger.error('Failed to fetch comments', {
      error: error.message,
      taskId: req.params.taskId
    });
    next(error);
  }
});

/**
 * GET /api/comments/:id
 * Get a single comment by ID
 */
router.get('/:id', auth, commentIdValidation, validate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const comment = await Comment.findById(id)
      .populate('author', 'name email avatar')
      .populate('task', 'title');

    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }

    if (comment.isDeleted) {
      return res.status(404).json({
        success: false,
        error: 'Comment has been deleted'
      });
    }

    // Get replies if this is a parent comment
    let replies = [];
    if (!comment.parentComment) {
      replies = await Comment.find({
        parentComment: id,
        isDeleted: false
      })
        .populate('author', 'name email avatar')
        .sort({ createdAt: 1 });
    }

    const commentObj = comment.toObject();
    commentObj.replies = replies;

    logger.info('Fetched comment by ID', { commentId: id });

    res.json({
      success: true,
      data: commentObj
    });
  } catch (error) {
    logger.error('Failed to fetch comment', {
      error: error.message,
      commentId: req.params.id
    });
    next(error);
  }
});

/**
 * PUT /api/comments/:id
 * Update a comment
 */
router.put('/:id', auth, updateCommentValidation, validate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.userId;

    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }

    if (comment.isDeleted) {
      return res.status(404).json({
        success: false,
        error: 'Comment has been deleted'
      });
    }

    // Only author can update their comment
    if (comment.author.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to update this comment'
      });
    }

    // Update comment
    comment.content = content;
    comment.isEdited = true;
    comment.editedAt = Date.now();
    await comment.save();

    await comment.populate('author', 'name email avatar');

    logger.info('Updated comment', {
      commentId: id,
      userId
    });

    res.json({
      success: true,
      data: comment,
      message: 'Comment updated successfully'
    });
  } catch (error) {
    logger.error('Failed to update comment', {
      error: error.message,
      commentId: req.params.id,
      userId: req.userId
    });
    next(error);
  }
});

/**
 * DELETE /api/comments/:id
 * Delete a comment (soft delete)
 */
router.delete('/:id', auth, commentIdValidation, validate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }

    if (comment.isDeleted) {
      return res.status(404).json({
        success: false,
        error: 'Comment has already been deleted'
      });
    }

    // Only author can delete their comment
    if (comment.author.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to delete this comment'
      });
    }

    // Soft delete
    comment.isDeleted = true;
    comment.deletedAt = Date.now();
    await comment.save();

    // Also soft delete all replies
    await Comment.updateMany(
      { parentComment: id, isDeleted: false },
      { isDeleted: true, deletedAt: Date.now() }
    );

    logger.info('Deleted comment', {
      commentId: id,
      userId
    });

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete comment', {
      error: error.message,
      commentId: req.params.id,
      userId: req.userId
    });
    next(error);
  }
});

/**
 * GET /api/comments/:id/replies
 * Get all replies for a comment
 */
router.get('/:id/replies', auth, commentIdValidation, validate, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify parent comment exists
    const parentComment = await Comment.findById(id);
    if (!parentComment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }

    if (parentComment.isDeleted) {
      return res.status(404).json({
        success: false,
        error: 'Comment has been deleted'
      });
    }

    // Get all replies
    const replies = await Comment.find({
      parentComment: id,
      isDeleted: false
    })
      .populate('author', 'name email avatar')
      .sort({ createdAt: 1 });

    logger.info('Fetched replies for comment', {
      commentId: id,
      count: replies.length
    });

    res.json({
      success: true,
      count: replies.length,
      data: replies
    });
  } catch (error) {
    logger.error('Failed to fetch replies', {
      error: error.message,
      commentId: req.params.id
    });
    next(error);
  }
});

module.exports = router;
