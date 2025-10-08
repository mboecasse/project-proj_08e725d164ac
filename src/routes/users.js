// File: src/routes/users.js
// Generated: 2025-10-08 13:16:52 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_9zv5ivamhi7l


const User = require('../models/User');


const express = require('express');


const logger = require('../utils/logger');

const { auth } = require('../middleware/auth');

const { body, param } = require('express-validator');

const { validate } = require('../middleware/validator');


const router = express.Router();

/**
 * Validation rules for user profile update
 */


const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio must not exceed 500 characters'),
  body('avatar')
    .optional()
    .trim()
    .isURL()
    .withMessage('Avatar must be a valid URL')
];

/**
 * Validation rules for user ID parameter
 */


const userIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid user ID format')
];

/**
 * Validation rules for password change
 */


const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('confirmPassword')
    .notEmpty()
    .withMessage('Password confirmation is required')
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage('Passwords do not match')
];

/**
 * GET /api/users/profile
 * Get current user profile
 */
router.get('/profile', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId)
      .select('-password')
      .populate('teams', 'name description')
      .populate('projects', 'name description status');

    if (!user) {
      logger.warn('User profile not found', { userId: req.userId });
      return res.status(404).json({
        success: false,
        error: 'User profile not found'
      });
    }

    logger.info('User profile retrieved', { userId: req.userId });

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Error fetching user profile', {
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
});

/**
 * PUT /api/users/profile
 * Update current user profile
 */
router.put('/profile', auth, updateProfileValidation, validate, async (req, res, next) => {
  try {
    const { name, email, bio, avatar } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;
    if (avatar) updateData.avatar = avatar;

    // Check if email is being changed and if it's already taken
    if (email && email !== req.user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        logger.warn('Email already in use', {
          userId: req.userId,
          email
        });
        return res.status(400).json({
          success: false,
          error: 'Email address is already in use'
        });
      }
      updateData.email = email;
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      logger.warn('User not found for profile update', { userId: req.userId });
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    logger.info('User profile updated', {
      userId: req.userId,
      updatedFields: Object.keys(updateData)
    });

    res.json({
      success: true,
      data: user,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    logger.error('Error updating user profile', {
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
});

/**
 * PUT /api/users/password
 * Change user password
 */
router.put('/password', auth, changePasswordValidation, validate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.userId);

    if (!user) {
      logger.warn('User not found for password change', { userId: req.userId });
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      logger.warn('Invalid current password', { userId: req.userId });
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    logger.info('User password changed', { userId: req.userId });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Error changing password', {
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
});

/**
 * GET /api/users/:id
 * Get user by ID (public profile)
 */
router.get('/:id', auth, userIdValidation, validate, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -email')
      .populate('teams', 'name description')
      .populate('projects', 'name description status');

    if (!user) {
      logger.warn('User not found', { requestedUserId: req.params.id });
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    logger.info('User profile retrieved', {
      requestedUserId: req.params.id,
      requesterId: req.userId
    });

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Error fetching user', {
      requestedUserId: req.params.id,
      error: error.message
    });
    next(error);
  }
});

/**
 * GET /api/users
 * Search/list users (with pagination and filters)
 */
router.get('/', auth, async (req, res, next) => {
  try {
    const {
      search,
      role,
      page = 1,
      limit = 20,
      sortBy = 'name',
      order = 'asc'
    } = req.query;

    const query = {};

    // Search by name or email
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by role
    if (role) {
      query.role = role;
    }

    const sortOrder = order === 'desc' ? -1 : 1;
    const sortOptions = { [sortBy]: sortOrder };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);

    logger.info('Users list retrieved', {
      count: users.length,
      total,
      page,
      requesterId: req.userId
    });

    res.json({
      success: true,
      data: users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Error fetching users list', {
      requesterId: req.userId,
      error: error.message
    });
    next(error);
  }
});

/**
 * DELETE /api/users/profile
 * Delete current user account
 */
router.delete('/profile', auth, async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.userId);

    if (!user) {
      logger.warn('User not found for deletion', { userId: req.userId });
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    logger.info('User account deleted', { userId: req.userId });

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting user account', {
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
});

module.exports = router;
