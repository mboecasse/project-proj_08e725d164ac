// File: src/validators/projectValidator.js
// Generated: 2025-10-08 13:15:15 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_8tjz0vyfub46


const { body, param } = require('express-validator');

/**
 * Validation rules for creating a project
 */


const createProjectValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Project name is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Project name must be between 3 and 100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),

  body('status')
    .optional()
    .isIn(['planning', 'active', 'on-hold', 'completed', 'archived'])
    .withMessage('Invalid project status'),

  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority level'),

  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),

  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format')
    .custom((endDate, { req }) => {
      if (req.body.startDate && new Date(endDate) < new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),

  body('teamId')
    .notEmpty()
    .withMessage('Team ID is required')
    .isMongoId()
    .withMessage('Invalid team ID format'),

  body('members')
    .optional()
    .isArray()
    .withMessage('Members must be an array'),

  body('members.*.userId')
    .if(body('members').exists())
    .notEmpty()
    .withMessage('Member user ID is required')
    .isMongoId()
    .withMessage('Invalid user ID format'),

  body('members.*.role')
    .if(body('members').exists())
    .optional()
    .isIn(['manager', 'member'])
    .withMessage('Invalid member role'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),

  body('tags.*')
    .if(body('tags').exists())
    .trim()
    .notEmpty()
    .withMessage('Tag cannot be empty')
    .isLength({ max: 50 })
    .withMessage('Tag cannot exceed 50 characters')
];

/**
 * Validation rules for updating a project
 */


const updateProjectValidation = [
  param('id')
    .notEmpty()
    .withMessage('Project ID is required')
    .isMongoId()
    .withMessage('Invalid project ID format'),

  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Project name cannot be empty')
    .isLength({ min: 3, max: 100 })
    .withMessage('Project name must be between 3 and 100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),

  body('status')
    .optional()
    .isIn(['planning', 'active', 'on-hold', 'completed', 'archived'])
    .withMessage('Invalid project status'),

  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority level'),

  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),

  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format')
    .custom((endDate, { req }) => {
      if (req.body.startDate && new Date(endDate) < new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),

  body('tags.*')
    .if(body('tags').exists())
    .trim()
    .notEmpty()
    .withMessage('Tag cannot be empty')
    .isLength({ max: 50 })
    .withMessage('Tag cannot exceed 50 characters')
];

/**
 * Validation rules for getting project by ID
 */


const getProjectValidation = [
  param('id')
    .notEmpty()
    .withMessage('Project ID is required')
    .isMongoId()
    .withMessage('Invalid project ID format')
];

/**
 * Validation rules for deleting a project
 */


const deleteProjectValidation = [
  param('id')
    .notEmpty()
    .withMessage('Project ID is required')
    .isMongoId()
    .withMessage('Invalid project ID format')
];

/**
 * Validation rules for adding a member to project
 */


const addMemberValidation = [
  param('id')
    .notEmpty()
    .withMessage('Project ID is required')
    .isMongoId()
    .withMessage('Invalid project ID format'),

  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isMongoId()
    .withMessage('Invalid user ID format'),

  body('role')
    .optional()
    .isIn(['manager', 'member'])
    .withMessage('Invalid member role')
];

/**
 * Validation rules for removing a member from project
 */


const removeMemberValidation = [
  param('id')
    .notEmpty()
    .withMessage('Project ID is required')
    .isMongoId()
    .withMessage('Invalid project ID format'),

  param('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isMongoId()
    .withMessage('Invalid user ID format')
];

/**
 * Validation rules for updating member role
 */


const updateMemberRoleValidation = [
  param('id')
    .notEmpty()
    .withMessage('Project ID is required')
    .isMongoId()
    .withMessage('Invalid project ID format'),

  param('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isMongoId()
    .withMessage('Invalid user ID format'),

  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['manager', 'member'])
    .withMessage('Invalid member role')
];

/**
 * Validation rules for project statistics
 */


const getProjectStatsValidation = [
  param('id')
    .notEmpty()
    .withMessage('Project ID is required')
    .isMongoId()
    .withMessage('Invalid project ID format')
];

/**
 * Validation rules for project activity
 */


const getProjectActivityValidation = [
  param('id')
    .notEmpty()
    .withMessage('Project ID is required')
    .isMongoId()
    .withMessage('Invalid project ID format')
];

module.exports = {
  createProjectValidation,
  updateProjectValidation,
  getProjectValidation,
  deleteProjectValidation,
  addMemberValidation,
  removeMemberValidation,
  updateMemberRoleValidation,
  getProjectStatsValidation,
  getProjectActivityValidation
};
