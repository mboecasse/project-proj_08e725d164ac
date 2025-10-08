// File: src/validators/teamValidator.js
// Generated: 2025-10-08 13:15:08 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_6489hn3bn4v8


const { body, param } = require('express-validator');

/**
 * Validation rules for creating a team
 */


const createTeamValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Team name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Team name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Team name can only contain letters, numbers, spaces, hyphens, and underscores'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),

  body('members')
    .optional()
    .isArray()
    .withMessage('Members must be an array'),

  body('members.*.userId')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID format'),

  body('members.*.role')
    .optional()
    .isIn(['admin', 'manager', 'member'])
    .withMessage('Role must be admin, manager, or member')
];

/**
 * Validation rules for updating a team
 */


const updateTeamValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid team ID format'),

  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Team name cannot be empty')
    .isLength({ min: 2, max: 100 })
    .withMessage('Team name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Team name can only contain letters, numbers, spaces, hyphens, and underscores'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters')
];

/**
 * Validation rules for team ID parameter
 */


const teamIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid team ID format')
];

/**
 * Validation rules for adding a member to a team
 */


const addMemberValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid team ID format'),

  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isMongoId()
    .withMessage('Invalid user ID format'),

  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['admin', 'manager', 'member'])
    .withMessage('Role must be admin, manager, or member')
];

/**
 * Validation rules for updating a team member
 */


const updateMemberValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid team ID format'),

  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID format'),

  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['admin', 'manager', 'member'])
    .withMessage('Role must be admin, manager, or member')
];

/**
 * Validation rules for removing a team member
 */


const removeMemberValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid team ID format'),

  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID format')
];

/**
 * Validation rules for team member ID parameter
 */


const memberIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid team ID format'),

  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID format')
];

module.exports = {
  createTeamValidation,
  updateTeamValidation,
  teamIdValidation,
  addMemberValidation,
  updateMemberValidation,
  removeMemberValidation,
  memberIdValidation
};
