// File: src/middleware/validation.js
// Generated: 2025-10-08 13:14:53 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_tjgi0h4wbl25


const logger = require('../utils/logger');

const { body, param, query, validationResult } = require('express-validator');

/**
 * Validation middleware to check for validation errors
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */


const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value
    }));

    logger.warn('Validation failed', {
      path: req.path,
      method: req.method,
      errors: errorMessages,
      ip: req.ip
    });

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errorMessages
    });
  }

  next();
};

/**
 * User registration validation rules
 */


const registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number and special character'),

  body('role')
    .optional()
    .isIn(['admin', 'manager', 'member']).withMessage('Invalid role')
];

/**
 * User login validation rules
 */


const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
];

/**
 * Team creation validation rules
 */


const createTeamValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Team name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Team name must be between 2 and 100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),

  body('members')
    .optional()
    .isArray().withMessage('Members must be an array')
];

/**
 * Team update validation rules
 */


const updateTeamValidation = [
  param('id')
    .isMongoId().withMessage('Invalid team ID'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Team name must be between 2 and 100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters')
];

/**
 * Project creation validation rules
 */


const createProjectValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Project name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Project name must be between 2 and 100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),

  body('teamId')
    .notEmpty().withMessage('Team ID is required')
    .isMongoId().withMessage('Invalid team ID'),

  body('startDate')
    .optional()
    .isISO8601().withMessage('Invalid start date format'),

  body('endDate')
    .optional()
    .isISO8601().withMessage('Invalid end date format')
    .custom((value, { req }) => {
      if (req.body.startDate && new Date(value) < new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),

  body('status')
    .optional()
    .isIn(['planning', 'active', 'on-hold', 'completed', 'cancelled']).withMessage('Invalid status')
];

/**
 * Project update validation rules
 */


const updateProjectValidation = [
  param('id')
    .isMongoId().withMessage('Invalid project ID'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Project name must be between 2 and 100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),

  body('startDate')
    .optional()
    .isISO8601().withMessage('Invalid start date format'),

  body('endDate')
    .optional()
    .isISO8601().withMessage('Invalid end date format'),

  body('status')
    .optional()
    .isIn(['planning', 'active', 'on-hold', 'completed', 'cancelled']).withMessage('Invalid status')
];

/**
 * Task creation validation rules
 */


const createTaskValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Task title is required')
    .isLength({ min: 2, max: 200 }).withMessage('Title must be between 2 and 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),

  body('projectId')
    .notEmpty().withMessage('Project ID is required')
    .isMongoId().withMessage('Invalid project ID'),

  body('assignedTo')
    .optional()
    .isMongoId().withMessage('Invalid user ID'),

  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),

  body('status')
    .optional()
    .isIn(['todo', 'in-progress', 'review', 'done']).withMessage('Invalid status'),

  body('dueDate')
    .optional()
    .isISO8601().withMessage('Invalid due date format'),

  body('tags')
    .optional()
    .isArray().withMessage('Tags must be an array')
];

/**
 * Task update validation rules
 */


const updateTaskValidation = [
  param('id')
    .isMongoId().withMessage('Invalid task ID'),

  body('title')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 }).withMessage('Title must be between 2 and 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),

  body('assignedTo')
    .optional()
    .isMongoId().withMessage('Invalid user ID'),

  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),

  body('status')
    .optional()
    .isIn(['todo', 'in-progress', 'review', 'done']).withMessage('Invalid status'),

  body('dueDate')
    .optional()
    .isISO8601().withMessage('Invalid due date format')
];

/**
 * Subtask creation validation rules
 */


const createSubtaskValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Subtask title is required')
    .isLength({ min: 2, max: 200 }).withMessage('Title must be between 2 and 200 characters'),

  body('taskId')
    .notEmpty().withMessage('Task ID is required')
    .isMongoId().withMessage('Invalid task ID'),

  body('completed')
    .optional()
    .isBoolean().withMessage('Completed must be a boolean')
];

/**
 * Comment creation validation rules
 */


const createCommentValidation = [
  body('content')
    .trim()
    .notEmpty().withMessage('Comment content is required')
    .isLength({ min: 1, max: 2000 }).withMessage('Comment must be between 1 and 2000 characters'),

  body('taskId')
    .notEmpty().withMessage('Task ID is required')
    .isMongoId().withMessage('Invalid task ID')
];

/**
 * Comment update validation rules
 */


const updateCommentValidation = [
  param('id')
    .isMongoId().withMessage('Invalid comment ID'),

  body('content')
    .trim()
    .notEmpty().withMessage('Comment content is required')
    .isLength({ min: 1, max: 2000 }).withMessage('Comment must be between 1 and 2000 characters')
];

/**
 * MongoDB ID parameter validation
 */


const mongoIdValidation = [
  param('id')
    .isMongoId().withMessage('Invalid ID format')
];

/**
 * Pagination query validation
 */


const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

/**
 * User profile update validation rules
 */


const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),

  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),

  body('currentPassword')
    .optional()
    .notEmpty().withMessage('Current password is required when changing password'),

  body('newPassword')
    .optional()
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number and special character')
];

/**
 * Team member role update validation
 */


const updateMemberRoleValidation = [
  param('teamId')
    .isMongoId().withMessage('Invalid team ID'),

  param('userId')
    .isMongoId().withMessage('Invalid user ID'),

  body('role')
    .notEmpty().withMessage('Role is required')
    .isIn(['admin', 'manager', 'member']).withMessage('Invalid role')
];

/**
 * File upload validation (for attachment metadata)
 */


const fileUploadValidation = [
  body('taskId')
    .notEmpty().withMessage('Task ID is required')
    .isMongoId().withMessage('Invalid task ID'),

  body('fileName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 }).withMessage('File name must be between 1 and 255 characters')
];

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  createTeamValidation,
  updateTeamValidation,
  createProjectValidation,
  updateProjectValidation,
  createTaskValidation,
  updateTaskValidation,
  createSubtaskValidation,
  createCommentValidation,
  updateCommentValidation,
  mongoIdValidation,
  paginationValidation,
  updateProfileValidation,
  updateMemberRoleValidation,
  fileUploadValidation
};
