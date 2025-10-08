// File: src/services/activityService.js
// Generated: 2025-10-08 13:15:37 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_4fxehv1uhe10


const Activity = require('../models/Activity');


const logger = require('../utils/logger');

/**
 * Activity Service
 * Handles activity logging and audit trail business logic
 */

/**
 * Log an activity
 * @param {Object} activityData - Activity data
 * @param {string} activityData.user - User ID who performed the action
 * @param {string} activityData.action - Action performed
 * @param {string} activityData.entityType - Type of entity (task, project, comment, etc.)
 * @param {string} activityData.entityId - ID of the entity
 * @param {Object} activityData.details - Additional details about the action
 * @param {string} activityData.ipAddress - IP address of the user
 * @param {string} activityData.userAgent - User agent string
 * @returns {Promise<Object>} Created activity log
 */
exports.logActivity = async (activityData) => {
  try {
    const {
      user,
      action,
      entityType,
      entityId,
      details = {},
      ipAddress,
      userAgent
    } = activityData;

    const activity = await Activity.create({
      user,
      action,
      entityType,
      entityId,
      details,
      ipAddress,
      userAgent
    });

    logger.info('Activity logged', {
      activityId: activity._id,
      user,
      action,
      entityType,
      entityId
    });

    return activity;
  } catch (error) {
    logger.error('Failed to log activity', {
      error: error.message,
      activityData
    });
    throw error;
  }
};

/**
 * Get activities with filters and pagination
 * @param {Object} filters - Filter criteria
 * @param {string} filters.user - Filter by user ID
 * @param {string} filters.entityType - Filter by entity type
 * @param {string} filters.entityId - Filter by entity ID
 * @param {string} filters.action - Filter by action
 * @param {Date} filters.startDate - Filter by start date
 * @param {Date} filters.endDate - Filter by end date
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise<Object>} Activities with pagination info
 */
exports.getActivities = async (filters = {}, page = 1, limit = 50) => {
  try {
    const query = {};

    if (filters.user) {
      query.user = filters.user;
    }

    if (filters.entityType) {
      query.entityType = filters.entityType;
    }

    if (filters.entityId) {
      query.entityId = filters.entityId;
    }

    if (filters.action) {
      query.action = filters.action;
    }

    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) {
        query.timestamp.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.timestamp.$lte = new Date(filters.endDate);
      }
    }

    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      Activity.find(query)
        .populate('user', 'name email')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Activity.countDocuments(query)
    ]);

    logger.info('Fetched activities', {
      filters,
      page,
      limit,
      count: activities.length,
      total
    });

    return {
      activities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    logger.error('Failed to fetch activities', {
      error: error.message,
      filters
    });
    throw error;
  }
};

/**
 * Get activity by ID
 * @param {string} activityId - Activity ID
 * @returns {Promise<Object>} Activity document
 */
exports.getActivityById = async (activityId) => {
  try {
    const activity = await Activity.findById(activityId)
      .populate('user', 'name email')
      .lean();

    if (!activity) {
      const error = new Error('Activity not found');
      error.statusCode = 404;
      throw error;
    }

    logger.info('Fetched activity by ID', { activityId });

    return activity;
  } catch (error) {
    logger.error('Failed to fetch activity', {
      activityId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Get user activity history
 * @param {string} userId - User ID
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise<Object>} User activities with pagination
 */
exports.getUserActivityHistory = async (userId, page = 1, limit = 50) => {
  try {
    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      Activity.find({ user: userId })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Activity.countDocuments({ user: userId })
    ]);

    logger.info('Fetched user activity history', {
      userId,
      page,
      limit,
      count: activities.length,
      total
    });

    return {
      activities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    logger.error('Failed to fetch user activity history', {
      userId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Get entity activity history
 * @param {string} entityType - Entity type
 * @param {string} entityId - Entity ID
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise<Object>} Entity activities with pagination
 */
exports.getEntityActivityHistory = async (entityType, entityId, page = 1, limit = 50) => {
  try {
    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      Activity.find({ entityType, entityId })
        .populate('user', 'name email')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Activity.countDocuments({ entityType, entityId })
    ]);

    logger.info('Fetched entity activity history', {
      entityType,
      entityId,
      page,
      limit,
      count: activities.length,
      total
    });

    return {
      activities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    logger.error('Failed to fetch entity activity history', {
      entityType,
      entityId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Get recent activities
 * @param {number} limit - Number of recent activities to fetch
 * @returns {Promise<Array>} Recent activities
 */
exports.getRecentActivities = async (limit = 20) => {
  try {
    const activities = await Activity.find()
      .populate('user', 'name email')
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    logger.info('Fetched recent activities', {
      limit,
      count: activities.length
    });

    return activities;
  } catch (error) {
    logger.error('Failed to fetch recent activities', {
      error: error.message
    });
    throw error;
  }
};

/**
 * Get activity statistics
 * @param {Object} filters - Filter criteria
 * @param {string} filters.user - Filter by user ID
 * @param {string} filters.entityType - Filter by entity type
 * @param {Date} filters.startDate - Filter by start date
 * @param {Date} filters.endDate - Filter by end date
 * @returns {Promise<Object>} Activity statistics
 */
exports.getActivityStatistics = async (filters = {}) => {
  try {
    const matchStage = {};

    if (filters.user) {
      matchStage.user = filters.user;
    }

    if (filters.entityType) {
      matchStage.entityType = filters.entityType;
    }

    if (filters.startDate || filters.endDate) {
      matchStage.timestamp = {};
      if (filters.startDate) {
        matchStage.timestamp.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        matchStage.timestamp.$lte = new Date(filters.endDate);
      }
    }

    const [actionStats, entityTypeStats, totalCount] = await Promise.all([
      Activity.aggregate([
        { $match: matchStage },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Activity.aggregate([
        { $match: matchStage },
        { $group: { _id: '$entityType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Activity.countDocuments(matchStage)
    ]);

    const statistics = {
      total: totalCount,
      byAction: actionStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      byEntityType: entityTypeStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {})
    };

    logger.info('Fetched activity statistics', {
      filters,
      total: totalCount
    });

    return statistics;
  } catch (error) {
    logger.error('Failed to fetch activity statistics', {
      error: error.message,
      filters
    });
    throw error;
  }
};

/**
 * Delete old activities
 * @param {number} daysToKeep - Number of days to keep activities
 * @returns {Promise<number>} Number of deleted activities
 */
exports.deleteOldActivities = async (daysToKeep = 90) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await Activity.deleteMany({
      timestamp: { $lt: cutoffDate }
    });

    logger.info('Deleted old activities', {
      daysToKeep,
      cutoffDate,
      deletedCount: result.deletedCount
    });

    return result.deletedCount;
  } catch (error) {
    logger.error('Failed to delete old activities', {
      error: error.message,
      daysToKeep
    });
    throw error;
  }
};

/**
 * Search activities
 * @param {string} searchTerm - Search term
 * @param {Object} filters - Additional filters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise<Object>} Search results with pagination
 */
exports.searchActivities = async (searchTerm, filters = {}, page = 1, limit = 50) => {
  try {
    const query = {
      $or: [
        { action: { $regex: searchTerm, $options: 'i' } },
        { entityType: { $regex: searchTerm, $options: 'i' } },
        { 'details.description': { $regex: searchTerm, $options: 'i' } }
      ]
    };

    if (filters.user) {
      query.user = filters.user;
    }

    if (filters.entityType) {
      query.entityType = filters.entityType;
    }

    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) {
        query.timestamp.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.timestamp.$lte = new Date(filters.endDate);
      }
    }

    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      Activity.find(query)
        .populate('user', 'name email')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Activity.countDocuments(query)
    ]);

    logger.info('Searched activities', {
      searchTerm,
      filters,
      page,
      limit,
      count: activities.length,
      total
    });

    return {
      activities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    logger.error('Failed to search activities', {
      searchTerm,
      error: error.message
    });
    throw error;
  }
};
