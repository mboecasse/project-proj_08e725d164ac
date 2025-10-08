// File: src/validators/taskValidator.js
// Generated: 2025-10-08 13:15:29 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_2illsgjeraka


const { body, param, query } = require('express-validator');

/**
 * Validation rules for creating a task
 */


const createTaskValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Task title is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Task title must be between 3 and 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must not exceed 2000 characters'),

  body('project')
    .notEmpty()
    .withMessage('Project ID is required')
    .isMongoId()
    .withMessage('Invalid project ID format'),

  body('assignedTo')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID format for assignedTo'),

  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be one of: low, medium, high, urgent'),

  body('status')
    .optional()
    .isIn(['todo', 'in_progress', 'review', 'completed', 'cancelled'])
    .withMessage('Status must be one of: todo, in_progress, review, completed, cancelled'),

  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid ISO 8601 date')
    .custom((value) => {
      const dueDate = new Date(value);
      const now = new Date();
      if (dueDate < now) {
        throw new Error('Due date cannot be in the past');
      }
      return true;
    }),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),

  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters'),

  body('estimatedHours')
    .optional()
    .isFloat({ min: 0, max: 1000 })
    .withMessage('Estimated hours must be between 0 and 1000'),

  body('parentTask')
    .optional()
    .isMongoId()
    .withMessage('Invalid parent task ID format')
];

/**
 * Validation rules for updating a task
 */


const updateTaskValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid task ID format'),

  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Task title cannot be empty')
    .isLength({ min: 3, max: 200 })
    .withMessage('Task title must be between 3 and 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must not exceed 2000 characters'),

  body('assignedTo')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID format for assignedTo'),

  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be one of: low, medium, high, urgent'),

  body('status')
    .optional()
    .isIn(['todo', 'in_progress', 'review', 'completed', 'cancelled'])
    .withMessage('Status must be one of: todo, in_progress, review, completed, cancelled'),

  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid ISO 8601 date'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),

  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters'),

  body('estimatedHours')
    .optional()
    .isFloat({ min: 0, max: 1000 })
    .withMessage('Estimated hours must be between 0 and 1000'),

  body('actualHours')
    .optional()
    .isFloat({ min: 0, max: 1000 })
    .withMessage('Actual hours must be between 0 and 1000'),

  body('completedAt')
    .optional()
    .isISO8601()
    .withMessage('Completed date must be a valid ISO 8601 date')
];

/**
 * Validation rules for getting task by ID
 */


const getTaskByIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid task ID format')
];

/**
 * Validation rules for deleting a task
 */


const deleteTaskValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid task ID format')
];

/**
 * Validation rules for querying tasks
 */


const getTasksValidation = [
  query('project')
    .optional()
    .isMongoId()
    .withMessage('Invalid project ID format'),

  query('assignedTo')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID format'),

  query('status')
    .optional()
    .isIn(['todo', 'in_progress', 'review', 'completed', 'cancelled'])
    .withMessage('Status must be one of: todo, in_progress, review, completed, cancelled'),

  query('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be one of: low, medium, high, urgent'),

  query('dueBefore')
    .optional()
    .isISO8601()
    .withMessage('Due before date must be a valid ISO 8601 date'),

  query('dueAfter')
    .optional()
    .isISO8601()
    .withMessage('Due after date must be a valid ISO 8601 date'),

  query('tags')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        return true;
      }
      if (Array.isArray(value)) {
        return value.every(tag => typeof tag === 'string');
      }
      return false;
    })
    .withMessage('Tags must be a string or array of strings'),

  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'dueDate', 'priority', 'title'])
    .withMessage('Sort by must be one of: createdAt, updatedAt, dueDate, priority, title'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

/**
 * Validation rules for adding a comment to a task
 */


const addCommentValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid task ID format'),

  body('content')
    .trim()
    .notEmpty()
    .withMessage('Comment content is required')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment must be between 1 and 1000 characters')
];

/**
 * Validation rules for updating task status
 */


const updateTaskStatusValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid task ID format'),

  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['todo', 'in_progress', 'review', 'completed', 'cancelled'])
    .withMessage('Status must be one of: todo, in_progress, review, completed, cancelled')
];

/**
 * Validation rules for assigning a task
 */


const assignTaskValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid task ID format'),

  body('assignedTo')
    .notEmpty()
    .withMessage('User ID is required')
    .isMongoId()
    .withMessage('Invalid user ID format')
];

/**
 * Validation rules for adding subtask
 */


const addSubtaskValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid task ID format'),

  body('title')
    .trim()
    .notEmpty()
    .withMessage('Subtask title is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Subtask title must be between 3 and 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters')
];

/**
 * Validation rules for updating subtask
 */


const updateSubtaskValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid task ID format'),

  param('subtaskId')
    .isMongoId()
    .withMessage('Invalid subtask ID format'),

  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Subtask title cannot be empty')
    .isLength({ min: 3, max: 200 })
    .withMessage('Subtask title must be between 3 and 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),

  body('completed')
    .optional()
    .isBoolean()
    .withMessage('Completed must be a boolean value')
];

/**
 * Validation rules for deleting subtask
 */


const deleteSubtaskValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid task ID format'),

  param('subtaskId')
    .isMongoId()
    .withMessage('Invalid subtask ID format')
];

/**
 * Validation rules for bulk task operations
 */


const bulkUpdateTasksValidation = [
  body('taskIds')
    .isArray({ min: 1 })
    .withMessage('Task IDs must be a non-empty array'),

  body('taskIds.*')
    .isMongoId()
    .withMessage('Each task ID must be a valid MongoDB ID'),

  body('updates')
    .notEmpty()
    .withMessage('Updates object is required')
    .isObject()
    .withMessage('Updates must be an object'),

  body('updates.status')
    .optional()
    .isIn(['todo', 'in_progress', 'review', 'completed', 'cancelled'])
    .withMessage('Status must be one of: todo, in_progress, review, completed, cancelled'),

  body('updates.priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be one of: low, medium, high, urgent'),

  body('updates.assignedTo')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID format for assignedTo')
];

module.exports = {
  createTaskValidation,
  updateTaskValidation,
  getTaskByIdValidation,
  deleteTaskValidation,
  getTasksValidation,
  addCommentValidation,
  updateTaskStatusValidation,
  assignTaskValidation,
  addSubtaskValidation,
  updateSubtaskValidation,
  deleteSubtaskValidation,
  bulkUpdateTasksValidation
};
