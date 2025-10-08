// File: src/services/authService.js
// Generated: 2025-10-08 13:15:15 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_5pw2ch922t34


const RefreshToken = require('../models/RefreshToken');


const User = require('../models/User');


const bcrypt = require('bcryptjs');


const logger = require('../utils/logger');

const { generateAccessToken, generateRefreshToken, verifyToken } = require('../utils/token');

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @returns {Object} User data and tokens
 */
exports.register = async (userData) => {
  try {
    const { email, password, name, role } = userData;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const error = new Error('User with this email already exists');
      error.statusCode = 400;
      throw error;
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      email,
      password: hashedPassword,
      name,
      role: role || 'member'
    });

    logger.info('User registered successfully', { userId: user._id, email });

    // Generate tokens
    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Store refresh token
    await RefreshToken.create({
      token: refreshToken,
      userId: user._id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });

    return {
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      accessToken,
      refreshToken
    };
  } catch (error) {
    logger.error('Registration failed', { error: error.message, email: userData.email });
    throw error;
  }
};

/**
 * Login user
 * @param {Object} credentials - User login credentials
 * @returns {Object} User data and tokens
 */
exports.login = async (credentials) => {
  try {
    const { email, password } = credentials;

    // Find user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    // Check if user is active
    if (!user.isActive) {
      const error = new Error('Account is deactivated');
      error.statusCode = 403;
      throw error;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    logger.info('User logged in successfully', { userId: user._id, email });

    // Generate tokens
    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Store refresh token
    await RefreshToken.create({
      token: refreshToken,
      userId: user._id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });

    return {
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        lastLogin: user.lastLogin
      },
      accessToken,
      refreshToken
    };
  } catch (error) {
    logger.error('Login failed', { error: error.message, email: credentials.email });
    throw error;
  }
};

/**
 * Refresh access token
 * @param {string} refreshToken - Refresh token
 * @returns {Object} New access token and refresh token
 */
exports.refreshToken = async (refreshToken) => {
  try {
    // Verify refresh token
    const decoded = verifyToken(refreshToken, 'refresh');

    // Check if refresh token exists in database
    const storedToken = await RefreshToken.findOne({ token: refreshToken, userId: decoded.userId });
    if (!storedToken) {
      const error = new Error('Invalid refresh token');
      error.statusCode = 401;
      throw error;
    }

    // Check if token is expired
    if (storedToken.expiresAt < new Date()) {
      await RefreshToken.deleteOne({ _id: storedToken._id });
      const error = new Error('Refresh token expired');
      error.statusCode = 401;
      throw error;
    }

    // Check if token is revoked
    if (storedToken.isRevoked) {
      const error = new Error('Refresh token has been revoked');
      error.statusCode = 401;
      throw error;
    }

    // Get user
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      const error = new Error('User not found or inactive');
      error.statusCode = 401;
      throw error;
    }

    logger.info('Token refreshed successfully', { userId: user._id });

    // Generate new tokens
    const newAccessToken = generateAccessToken(user._id, user.role);
    const newRefreshToken = generateRefreshToken(user._id);

    // Revoke old refresh token
    storedToken.isRevoked = true;
    await storedToken.save();

    // Store new refresh token
    await RefreshToken.create({
      token: newRefreshToken,
      userId: user._id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    };
  } catch (error) {
    logger.error('Token refresh failed', { error: error.message });
    throw error;
  }
};

/**
 * Logout user
 * @param {string} refreshToken - Refresh token to revoke
 * @returns {boolean} Success status
 */
exports.logout = async (refreshToken) => {
  try {
    // Find and revoke refresh token
    const storedToken = await RefreshToken.findOne({ token: refreshToken });
    if (storedToken) {
      storedToken.isRevoked = true;
      await storedToken.save();
      logger.info('User logged out successfully', { userId: storedToken.userId });
    }

    return true;
  } catch (error) {
    logger.error('Logout failed', { error: error.message });
    throw error;
  }
};

/**
 * Revoke all refresh tokens for a user
 * @param {string} userId - User ID
 * @returns {boolean} Success status
 */
exports.revokeAllTokens = async (userId) => {
  try {
    await RefreshToken.updateMany(
      { userId, isRevoked: false },
      { isRevoked: true }
    );

    logger.info('All tokens revoked for user', { userId });
    return true;
  } catch (error) {
    logger.error('Failed to revoke all tokens', { error: error.message, userId });
    throw error;
  }
};

/**
 * Change user password
 * @param {string} userId - User ID
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {boolean} Success status
 */
exports.changePassword = async (userId, currentPassword, newPassword) => {
  try {
    // Get user with password
    const user = await User.findById(userId).select('+password');
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      const error = new Error('Current password is incorrect');
      error.statusCode = 401;
      throw error;
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    user.password = hashedPassword;
    await user.save();

    // Revoke all refresh tokens
    await this.revokeAllTokens(userId);

    logger.info('Password changed successfully', { userId });
    return true;
  } catch (error) {
    logger.error('Password change failed', { error: error.message, userId });
    throw error;
  }
};

/**
 * Verify user credentials
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Object} User data if valid
 */
exports.verifyCredentials = async (email, password) => {
  try {
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    return {
      _id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive
    };
  } catch (error) {
    logger.error('Credential verification failed', { error: error.message, email });
    throw error;
  }
};

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Object} User data
 */
exports.getUserById = async (userId) => {
  try {
    const user = await User.findById(userId).select('-password');
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    return user;
  } catch (error) {
    logger.error('Failed to get user by ID', { error: error.message, userId });
    throw error;
  }
};

/**
 * Clean up expired refresh tokens
 * @returns {number} Number of tokens deleted
 */
exports.cleanupExpiredTokens = async () => {
  try {
    const result = await RefreshToken.deleteMany({
      expiresAt: { $lt: new Date() }
    });

    logger.info('Expired tokens cleaned up', { count: result.deletedCount });
    return result.deletedCount;
  } catch (error) {
    logger.error('Failed to cleanup expired tokens', { error: error.message });
    throw error;
  }
};
