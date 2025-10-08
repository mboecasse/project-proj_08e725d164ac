// File: src/controllers/authController.js
// Generated: 2025-10-08 13:15:15 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_vqqg9a41eyqt


const User = require('../models/User');


const bcrypt = require('bcryptjs');


const jwt = require('jsonwebtoken');


const logger = require('../utils/logger');

const { sendResponse, sendError } = require('../utils/response');

/**
 * Generate JWT access token
 * @param {string} userId - User ID
 * @returns {string} JWT access token
 */


const generateAccessToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
  );
};

/**
 * Generate JWT refresh token
 * @param {string} userId - User ID
 * @returns {string} JWT refresh token
 */


const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );
};

/**
 * Register new user
 * POST /api/auth/register
 */
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      logger.warn('Registration attempt with existing email', { email });
      return sendError(res, 'User with this email already exists', 400);
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || 'member'
    });

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token to user
    user.refreshToken = refreshToken;
    await user.save();

    logger.info('User registered successfully', {
      userId: user._id,
      email: user.email,
      role: user.role
    });

    // Return user data without password
    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    };

    sendResponse(res, {
      user: userData,
      accessToken,
      refreshToken
    }, 'User registered successfully', 201);

  } catch (error) {
    logger.error('Registration failed', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      logger.warn('Login attempt with non-existent email', { email });
      return sendError(res, 'Invalid email or password', 401);
    }

    // Check if user is active
    if (!user.isActive) {
      logger.warn('Login attempt for inactive user', { userId: user._id, email });
      return sendError(res, 'Account is deactivated. Please contact support.', 403);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      logger.warn('Login attempt with invalid password', { userId: user._id, email });
      return sendError(res, 'Invalid email or password', 401);
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token to user
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    logger.info('User logged in successfully', {
      userId: user._id,
      email: user.email
    });

    // Return user data without password
    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      lastLogin: user.lastLogin
    };

    sendResponse(res, {
      user: userData,
      accessToken,
      refreshToken
    }, 'Login successful');

  } catch (error) {
    logger.error('Login failed', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return sendError(res, 'Refresh token is required', 400);
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      logger.warn('Invalid refresh token', { error: error.message });
      return sendError(res, 'Invalid or expired refresh token', 401);
    }

    // Find user and verify stored refresh token
    const user = await User.findById(decoded.userId);
    if (!user) {
      logger.warn('Refresh token for non-existent user', { userId: decoded.userId });
      return sendError(res, 'User not found', 404);
    }

    if (!user.isActive) {
      logger.warn('Refresh attempt for inactive user', { userId: user._id });
      return sendError(res, 'Account is deactivated', 403);
    }

    if (user.refreshToken !== refreshToken) {
      logger.warn('Refresh token mismatch', { userId: user._id });
      return sendError(res, 'Invalid refresh token', 401);
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    // Update refresh token
    user.refreshToken = newRefreshToken;
    await user.save();

    logger.info('Tokens refreshed successfully', { userId: user._id });

    sendResponse(res, {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    }, 'Tokens refreshed successfully');

  } catch (error) {
    logger.error('Token refresh failed', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Logout user
 * POST /api/auth/logout
 */
exports.logout = async (req, res, next) => {
  try {
    const userId = req.userId;

    // Clear refresh token from database
    const user = await User.findById(userId);
    if (user) {
      user.refreshToken = null;
      await user.save();
      logger.info('User logged out successfully', { userId });
    }

    sendResponse(res, null, 'Logout successful');

  } catch (error) {
    logger.error('Logout failed', {
      userId: req.userId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Get current user profile
 * GET /api/auth/me
 */
exports.getProfile = async (req, res, next) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId).select('-password -refreshToken');
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    logger.info('User profile fetched', { userId });

    sendResponse(res, user, 'Profile fetched successfully');

  } catch (error) {
    logger.error('Failed to fetch profile', {
      userId: req.userId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Update current user profile
 * PUT /api/auth/me
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { name, avatar } = req.body;

    const updates = {};
    if (name) updates.name = name;
    if (avatar) updates.avatar = avatar;

    const user = await User.findByIdAndUpdate(
      userId,
      updates,
      { new: true, runValidators: true }
    ).select('-password -refreshToken');

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    logger.info('User profile updated', { userId });

    sendResponse(res, user, 'Profile updated successfully');

  } catch (error) {
    logger.error('Failed to update profile', {
      userId: req.userId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Change password
 * PUT /api/auth/change-password
 */
exports.changePassword = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { currentPassword, newPassword } = req.body;

    // Find user with password
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      logger.warn('Password change attempt with invalid current password', { userId });
      return sendError(res, 'Current password is incorrect', 401);
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password and clear refresh token (force re-login)
    user.password = hashedPassword;
    user.refreshToken = null;
    await user.save();

    logger.info('Password changed successfully', { userId });

    sendResponse(res, null, 'Password changed successfully. Please login again.');

  } catch (error) {
    logger.error('Failed to change password', {
      userId: req.userId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};
