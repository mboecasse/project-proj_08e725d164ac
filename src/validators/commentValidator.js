// File: src/validators/commentValidator.js
// Generated: 2025-10-08 13:15:09 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_ditavu22lct1


const { body, param } = require('express-validator');

/**
 * Validation rules for creating a comment
 */


const createCommentValidation = [
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Comment content is required')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Comment content must be between 1 and 2000 characters'),

  body('taskId')
    .notEmpty()
    .withMessage('Task ID is required')
    .isMongoId()
    .withMessage('Invalid task ID format')
];

/**
 * Validation rules for updating a comment
 */


const updateCommentValidation = [
  param('id')
    .notEmpty()
    .withMessage('Comment ID is required')
    .isMongoId()
    .withMessage('Invalid comment ID format'),

  body('content')
    .trim()
    .notEmpty()
    .withMessage('Comment content is required')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Comment content must be between 1 and 2000 characters')
];

/**
 * Validation rules for getting comments by task
 */


const getCommentsByTaskValidation = [
  param('taskId')
    .notEmpty()
    .withMessage('Task ID is required')
    .isMongoId()
    .withMessage('Invalid task ID format')
];

/**
 * Validation rules for getting a single comment
 */


const getCommentValidation = [
  param('id')
    .notEmpty()
    .withMessage('Comment ID is required')
    .isMongoId()
    .withMessage('Invalid comment ID format')
];

/**
 * Validation rules for deleting a comment
 */


const deleteCommentValidation = [
  param('id')
    .notEmpty()
    .withMessage('Comment ID is required')
    .isMongoId()
    .withMessage('Invalid comment ID format')
];

/**
 * Validation rules for adding a reply to a comment
 */


const addReplyValidation = [
  param('id')
    .notEmpty()
    .withMessage('Comment ID is required')
    .isMongoId()
    .withMessage('Invalid comment ID format'),

  body('content')
    .trim()
    .notEmpty()
    .withMessage('Reply content is required')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Reply content must be between 1 and 2000 characters')
];

/**
 * Validation rules for updating a reply
 */


const updateReplyValidation = [
  param('commentId')
    .notEmpty()
    .withMessage('Comment ID is required')
    .isMongoId()
    .withMessage('Invalid comment ID format'),

  param('replyId')
    .notEmpty()
    .withMessage('Reply ID is required')
    .isMongoId()
    .withMessage('Invalid reply ID format'),

  body('content')
    .trim()
    .notEmpty()
    .withMessage('Reply content is required')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Reply content must be between 1 and 2000 characters')
];

/**
 * Validation rules for deleting a reply
 */


const deleteReplyValidation = [
  param('commentId')
    .notEmpty()
    .withMessage('Comment ID is required')
    .isMongoId()
    .withMessage('Invalid comment ID format'),

  param('replyId')
    .notEmpty()
    .withMessage('Reply ID is required')
    .isMongoId()
    .withMessage('Invalid reply ID format')
];

module.exports = {
  createCommentValidation,
  updateCommentValidation,
  getCommentsByTaskValidation,
  getCommentValidation,
  deleteCommentValidation,
  addReplyValidation,
  updateReplyValidation,
  deleteReplyValidation
};
