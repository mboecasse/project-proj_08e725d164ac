// File: src/services/userService.js
// Generated: 2025-10-08 13:15:25 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_qwrjtec4j3sm


const User = require('../models/User');


const bcrypt = require('bcryptjs');


const logger = require('../utils/logger');

/**
 * User Service
 * Handles all user-related business logic
 */

/**
 * Get all users with optional filtering and pagination
 * @param {Object} filters - Filter criteria (role, status, etc.)
 * @param {Object} options - Pagination options (page, limit, sort)
 * @returns {Promise<Object>} Users list with pagination info
 */
exports.getAllUsers = async (filters = {}, options = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = '-createdAt',
      select = '-password'
    } = options;

    const query = {};

    // Apply filters
    if (filters.role) {
      query.role = filters.role;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(query)
        .select(select)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query)
    ]);

    logger.info('Fetched users', {
      count: users.length,
      total,
      page,
      filters
    });

    return {
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    logger.error('Failed to fetch users', {
      error: error.message,
      filters,
      options
    });
    throw error;
  }
};

/**
 * Get user by ID
 * @param {String} userId - User ID
 * @param {String} select - Fields to select
 * @returns {Promise<Object>} User object
 */
exports.getUserById = async (userId, select = '-password') => {
  try {
    const user = await User.findById(userId).select(select).lean();

    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    logger.info('Fetched user by ID', { userId });

    return user;
  } catch (error) {
    logger.error('Failed to fetch user by ID', {
      userId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Get user by email
 * @param {String} email - User email
 * @param {String} select - Fields to select
 * @returns {Promise<Object>} User object
 */
exports.getUserByEmail = async (email, select = '-password') => {
  try {
    const user = await User.findOne({ email: email.toLowerCase() })
      .select(select)
      .lean();

    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    logger.info('Fetched user by email', { email });

    return user;
  } catch (error) {
    logger.error('Failed to fetch user by email', {
      email,
      error: error.message
    });
    throw error;
  }
};

/**
 * Create new user
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Created user object
 */
exports.createUser = async (userData) => {
  try {
    const { name, email, password, role = 'member' } = userData;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      const error = new Error('User with this email already exists');
      error.statusCode = 400;
      throw error;
    }

    // Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role,
      status: 'active'
    });

    logger.info('Created new user', {
      userId: user._id,
      email: user.email,
      role: user.role
    });

    // Return user without password
    const userObject = user.toObject();
    delete userObject.password;

    return userObject;
  } catch (error) {
    logger.error('Failed to create user', {
      email: userData.email,
      error: error.message
    });
    throw error;
  }
};

/**
 * Update user
 * @param {String} userId - User ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated user object
 */
exports.updateUser = async (userId, updates) => {
  try {
    // Remove fields that shouldn't be updated directly
    const allowedUpdates = { ...updates };
    delete allowedUpdates.password;
    delete allowedUpdates.email;
    delete allowedUpdates._id;

    // Normalize email if present
    if (updates.email) {
      allowedUpdates.email = updates.email.toLowerCase();
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: allowedUpdates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    logger.info('Updated user', {
      userId,
      updatedFields: Object.keys(allowedUpdates)
    });

    return user.toObject();
  } catch (error) {
    logger.error('Failed to update user', {
      userId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Update user password
 * @param {String} userId - User ID
 * @param {String} currentPassword - Current password
 * @param {String} newPassword - New password
 * @returns {Promise<Boolean>} Success status
 */
exports.updatePassword = async (userId, currentPassword, newPassword) => {
  try {
    const user = await User.findById(userId).select('+password');

    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      const error = new Error('Current password is incorrect');
      error.statusCode = 401;
      throw error;
    }

    // Update password
    user.password = newPassword;
    await user.save();

    logger.info('Updated user password', { userId });

    return true;
  } catch (error) {
    logger.error('Failed to update password', {
      userId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Update user role
 * @param {String} userId - User ID
 * @param {String} newRole - New role (admin/manager/member)
 * @returns {Promise<Object>} Updated user object
 */
exports.updateUserRole = async (userId, newRole) => {
  try {
    const validRoles = ['admin', 'manager', 'member'];
    if (!validRoles.includes(newRole)) {
      const error = new Error('Invalid role');
      error.statusCode = 400;
      throw error;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { role: newRole } },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    logger.info('Updated user role', {
      userId,
      newRole
    });

    return user.toObject();
  } catch (error) {
    logger.error('Failed to update user role', {
      userId,
      newRole,
      error: error.message
    });
    throw error;
  }
};

/**
 * Update user status
 * @param {String} userId - User ID
 * @param {String} status - New status (active/inactive/suspended)
 * @returns {Promise<Object>} Updated user object
 */
exports.updateUserStatus = async (userId, status) => {
  try {
    const validStatuses = ['active', 'inactive', 'suspended'];
    if (!validStatuses.includes(status)) {
      const error = new Error('Invalid status');
      error.statusCode = 400;
      throw error;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { status } },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    logger.info('Updated user status', {
      userId,
      status
    });

    return user.toObject();
  } catch (error) {
    logger.error('Failed to update user status', {
      userId,
      status,
      error: error.message
    });
    throw error;
  }
};

/**
 * Delete user
 * @param {String} userId - User ID
 * @returns {Promise<Boolean>} Success status
 */
exports.deleteUser = async (userId) => {
  try {
    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    logger.info('Deleted user', {
      userId,
      email: user.email
    });

    return true;
  } catch (error) {
    logger.error('Failed to delete user', {
      userId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Get user statistics
 * @param {String} userId - User ID
 * @returns {Promise<Object>} User statistics
 */
exports.getUserStats = async (userId) => {
  try {
    const user = await User.findById(userId).select('-password');

    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    // This will be extended when task/project models are available
    const stats = {
      userId: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    };

    logger.info('Fetched user stats', { userId });

    return stats;
  } catch (error) {
    logger.error('Failed to fetch user stats', {
      userId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Search users
 * @param {String} searchTerm - Search term
 * @param {Object} options - Search options
 * @returns {Promise<Array>} Matching users
 */
exports.searchUsers = async (searchTerm, options = {}) => {
  try {
    const { limit = 10, role, status } = options;

    const query = {
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } }
      ]
    };

    if (role) {
      query.role = role;
    }

    if (status) {
      query.status = status;
    }

    const users = await User.find(query)
      .select('-password')
      .limit(limit)
      .lean();

    logger.info('Searched users', {
      searchTerm,
      count: users.length
    });

    return users;
  } catch (error) {
    logger.error('Failed to search users', {
      searchTerm,
      error: error.message
    });
    throw error;
  }
};

/**
 * Update last login timestamp
 * @param {String} userId - User ID
 * @returns {Promise<Boolean>} Success status
 */
exports.updateLastLogin = async (userId) => {
  try {
    await User.findByIdAndUpdate(userId, {
      $set: { lastLogin: new Date() }
    });

    logger.info('Updated last login', { userId });

    return true;
  } catch (error) {
    logger.error('Failed to update last login', {
      userId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Check if user exists by email
 * @param {String} email - Email to check
 * @returns {Promise<Boolean>} Existence status
 */
exports.userExistsByEmail = async (email) => {
  try {
    const user = await User.findOne({ email: email.toLowerCase() }).select('_id');
    return !!user;
  } catch (error) {
    logger.error('Failed to check user existence', {
      email,
      error: error.message
    });
    throw error;
  }
};

/**
 * Get users by role
 * @param {String} role - User role
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Users with specified role
 */
exports.getUsersByRole = async (role, options = {}) => {
  try {
    const { limit = 100, select = '-password' } = options;

    const users = await User.find({ role })
      .select(select)
      .limit(limit)
      .lean();

    logger.info('Fetched users by role', {
      role,
      count: users.length
    });

    return users;
  } catch (error) {
    logger.error('Failed to fetch users by role', {
      role,
      error: error.message
    });
    throw error;
  }
};

/**
 * Bulk update users
 * @param {Array} userIds - Array of user IDs
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Update result
 */
exports.bulkUpdateUsers = async (userIds, updates) => {
  try {
    // Remove fields that shouldn't be updated
    const allowedUpdates = { ...updates };
    delete allowedUpdates.password;
    delete allowedUpdates.email;
    delete allowedUpdates._id;

    const result = await User.updateMany(
      { _id: { $in: userIds } },
      { $set: allowedUpdates },
      { runValidators: true }
    );

    logger.info('Bulk updated users', {
      count: result.modifiedCount,
      userIds: userIds.length
    });

    return {
      matched: result.matchedCount,
      modified: result.modifiedCount
    };
  } catch (error) {
    logger.error('Failed to bulk update users', {
      userCount: userIds.length,
      error: error.message
    });
    throw error;
  }
};
