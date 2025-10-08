// File: src/controllers/userController.js
// Generated: 2025-10-08 13:15:26 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_vxs7ijeswrsl


const Project = require('../models/Project');


const Task = require('../models/Task');


const Team = require('../models/Team');


const User = require('../models/User');


const logger = require('../utils/logger');

const { successResponse, errorResponse } = require('../utils/response');

/**
 * Get current user profile
 * @route GET /api/users/me
 * @access Private
 */
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId)
      .select('-password')
      .populate('teams', 'name description')
      .lean();

    if (!user) {
      logger.warn('User not found for profile', { userId: req.userId });
      return res.status(404).json(errorResponse('User not found'));
    }

    logger.info('User profile fetched', { userId: req.userId });
    res.json(successResponse(user, 'Profile fetched successfully'));
  } catch (error) {
    logger.error('Failed to fetch user profile', {
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Update current user profile
 * @route PUT /api/users/me
 * @access Private
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, email, bio, avatar, preferences } = req.body;

    // Check if email is being changed and if it's already taken
    if (email) {
      const existingUser = await User.findOne({
        email,
        _id: { $ne: req.userId }
      });

      if (existingUser) {
        return res.status(400).json(errorResponse('Email already in use'));
      }
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (bio !== undefined) updateData.bio = bio;
    if (avatar) updateData.avatar = avatar;
    if (preferences) updateData.preferences = preferences;

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json(errorResponse('User not found'));
    }

    logger.info('User profile updated', { userId: req.userId, updates: Object.keys(updateData) });
    res.json(successResponse(user, 'Profile updated successfully'));
  } catch (error) {
    logger.error('Failed to update user profile', {
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Change user password
 * @route PUT /api/users/me/password
 * @access Private
 */
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json(errorResponse('User not found'));
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      logger.warn('Invalid current password attempt', { userId: req.userId });
      return res.status(401).json(errorResponse('Current password is incorrect'));
    }

    // Update password
    user.password = newPassword;
    await user.save();

    logger.info('User password changed', { userId: req.userId });
    res.json(successResponse(null, 'Password changed successfully'));
  } catch (error) {
    logger.error('Failed to change password', {
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Get all users (admin/manager only)
 * @route GET /api/users
 * @access Private (Admin/Manager)
 */
exports.getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, role, status, sortBy = 'createdAt', order = 'desc' } = req.query;

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

    // Filter by status
    if (status) {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === 'desc' ? -1 : 1;

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(query)
    ]);

    logger.info('Users list fetched', {
      requestedBy: req.userId,
      count: users.length,
      total,
      filters: { search, role, status }
    });

    res.json(successResponse({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }, 'Users fetched successfully'));
  } catch (error) {
    logger.error('Failed to fetch users', {
      requestedBy: req.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Get user by ID
 * @route GET /api/users/:id
 * @access Private
 */
exports.getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .select('-password')
      .populate('teams', 'name description')
      .lean();

    if (!user) {
      return res.status(404).json(errorResponse('User not found'));
    }

    logger.info('User fetched by ID', { userId: id, requestedBy: req.userId });
    res.json(successResponse(user, 'User fetched successfully'));
  } catch (error) {
    logger.error('Failed to fetch user by ID', {
      userId: req.params.id,
      requestedBy: req.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Update user (admin only)
 * @route PUT /api/users/:id
 * @access Private (Admin)
 */
exports.updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, role, status, bio, avatar } = req.body;

    // Check if email is being changed and if it's already taken
    if (email) {
      const existingUser = await User.findOne({
        email,
        _id: { $ne: id }
      });

      if (existingUser) {
        return res.status(400).json(errorResponse('Email already in use'));
      }
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (status) updateData.status = status;
    if (bio !== undefined) updateData.bio = bio;
    if (avatar) updateData.avatar = avatar;

    const user = await User.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json(errorResponse('User not found'));
    }

    logger.info('User updated by admin', {
      userId: id,
      adminId: req.userId,
      updates: Object.keys(updateData)
    });

    res.json(successResponse(user, 'User updated successfully'));
  } catch (error) {
    logger.error('Failed to update user', {
      userId: req.params.id,
      adminId: req.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Delete user (admin only)
 * @route DELETE /api/users/:id
 * @access Private (Admin)
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (id === req.userId) {
      return res.status(400).json(errorResponse('Cannot delete your own account'));
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json(errorResponse('User not found'));
    }

    // Remove user from all teams
    await Team.updateMany(
      { members: id },
      { $pull: { members: id } }
    );

    // Reassign or delete user's tasks
    await Task.updateMany(
      { assignee: id },
      { $unset: { assignee: '' } }
    );

    // Delete user
    await User.findByIdAndDelete(id);

    logger.info('User deleted', {
      userId: id,
      deletedBy: req.userId
    });

    res.json(successResponse(null, 'User deleted successfully'));
  } catch (error) {
    logger.error('Failed to delete user', {
      userId: req.params.id,
      deletedBy: req.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Get user statistics
 * @route GET /api/users/:id/stats
 * @access Private
 */
exports.getUserStats = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json(errorResponse('User not found'));
    }

    const [teamCount, projectCount, taskStats] = await Promise.all([
      Team.countDocuments({ members: id }),
      Project.countDocuments({
        $or: [
          { owner: id },
          { members: id }
        ]
      }),
      Task.aggregate([
        { $match: { assignee: user._id } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const tasksByStatus = taskStats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});

    const stats = {
      teams: teamCount,
      projects: projectCount,
      tasks: {
        total: taskStats.reduce((sum, stat) => sum + stat.count, 0),
        todo: tasksByStatus.todo || 0,
        inProgress: tasksByStatus['in-progress'] || 0,
        completed: tasksByStatus.completed || 0,
        cancelled: tasksByStatus.cancelled || 0
      }
    };

    logger.info('User stats fetched', { userId: id, requestedBy: req.userId });
    res.json(successResponse(stats, 'User statistics fetched successfully'));
  } catch (error) {
    logger.error('Failed to fetch user stats', {
      userId: req.params.id,
      requestedBy: req.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Get user activity
 * @route GET /api/users/:id/activity
 * @access Private
 */
exports.getUserActivity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json(errorResponse('User not found'));
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get recent tasks assigned to user
    const tasks = await Task.find({ assignee: id })
      .select('title status priority project createdAt updatedAt')
      .populate('project', 'name')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Task.countDocuments({ assignee: id });

    logger.info('User activity fetched', {
      userId: id,
      requestedBy: req.userId,
      count: tasks.length
    });

    res.json(successResponse({
      activity: tasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }, 'User activity fetched successfully'));
  } catch (error) {
    logger.error('Failed to fetch user activity', {
      userId: req.params.id,
      requestedBy: req.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Search users
 * @route GET /api/users/search
 * @access Private
 */
exports.searchUsers = async (req, res, next) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json(errorResponse('Search query must be at least 2 characters'));
    }

    const users = await User.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ],
      status: 'active'
    })
      .select('name email avatar role')
      .limit(parseInt(limit))
      .lean();

    logger.info('Users searched', {
      query: q,
      requestedBy: req.userId,
      results: users.length
    });

    res.json(successResponse(users, 'Users found'));
  } catch (error) {
    logger.error('Failed to search users', {
      query: req.query.q,
      requestedBy: req.userId,
      error: error.message
    });
    next(error);
  }
};
