// File: src/controllers/activityController.js
// Generated: 2025-10-08 13:15:24 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_hyjlpck2mq71


const Activity = require('../models/Activity');


const logger = require('../utils/logger');

const { successResponse, errorResponse } = require('../utils/response');

/**
 * Get all activities with pagination and filtering
 * @route GET /api/activities
 * @access Private
 */
exports.getActivities = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      entityType,
      entityId,
      actionType,
      userId,
      startDate,
      endDate
    } = req.query;

    // Build filter object
    const filter = {};

    if (entityType) {
      filter.entityType = entityType;
    }

    if (entityId) {
      filter.entityId = entityId;
    }

    if (actionType) {
      filter.actionType = actionType;
    }

    if (userId) {
      filter.userId = userId;
    }

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [activities, total] = await Promise.all([
      Activity.find(filter)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Activity.countDocuments(filter)
    ]);

    logger.info('Fetched activities', {
      userId: req.userId,
      count: activities.length,
      total,
      page,
      filters: filter
    });

    res.json(
      successResponse(
        {
          activities,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        },
        'Activities fetched successfully'
      )
    );
  } catch (error) {
    logger.error('Failed to fetch activities', {
      userId: req.userId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Get activity by ID
 * @route GET /api/activities/:id
 * @access Private
 */
exports.getActivityById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const activity = await Activity.findById(id)
      .populate('userId', 'name email')
      .lean();

    if (!activity) {
      logger.warn('Activity not found', { activityId: id, userId: req.userId });
      return res.status(404).json(errorResponse('Activity not found'));
    }

    logger.info('Fetched activity by ID', {
      activityId: id,
      userId: req.userId
    });

    res.json(successResponse(activity, 'Activity fetched successfully'));
  } catch (error) {
    logger.error('Failed to fetch activity', {
      activityId: req.params.id,
      userId: req.userId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Get activities for a specific entity
 * @route GET /api/activities/entity/:entityType/:entityId
 * @access Private
 */
exports.getActivitiesByEntity = async (req, res, next) => {
  try {
    const { entityType, entityId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [activities, total] = await Promise.all([
      Activity.find({ entityType, entityId })
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Activity.countDocuments({ entityType, entityId })
    ]);

    logger.info('Fetched activities by entity', {
      entityType,
      entityId,
      userId: req.userId,
      count: activities.length,
      total
    });

    res.json(
      successResponse(
        {
          activities,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        },
        'Entity activities fetched successfully'
      )
    );
  } catch (error) {
    logger.error('Failed to fetch entity activities', {
      entityType: req.params.entityType,
      entityId: req.params.entityId,
      userId: req.userId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Get activities for a specific user
 * @route GET /api/activities/user/:userId
 * @access Private
 */
exports.getActivitiesByUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50, entityType, actionType } = req.query;

    const filter = { userId };

    if (entityType) {
      filter.entityType = entityType;
    }

    if (actionType) {
      filter.actionType = actionType;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [activities, total] = await Promise.all([
      Activity.find(filter)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Activity.countDocuments(filter)
    ]);

    logger.info('Fetched activities by user', {
      targetUserId: userId,
      requestUserId: req.userId,
      count: activities.length,
      total
    });

    res.json(
      successResponse(
        {
          activities,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        },
        'User activities fetched successfully'
      )
    );
  } catch (error) {
    logger.error('Failed to fetch user activities', {
      targetUserId: req.params.userId,
      requestUserId: req.userId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Get activity statistics
 * @route GET /api/activities/stats
 * @access Private
 */
exports.getActivityStats = async (req, res, next) => {
  try {
    const { startDate, endDate, entityType } = req.query;

    const matchStage = {};

    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) {
        matchStage.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        matchStage.createdAt.$lte = new Date(endDate);
      }
    }

    if (entityType) {
      matchStage.entityType = entityType;
    }

    const stats = await Activity.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            entityType: '$entityType',
            actionType: '$actionType'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.entityType',
          actions: {
            $push: {
              actionType: '$_id.actionType',
              count: '$count'
            }
          },
          total: { $sum: '$count' }
        }
      },
      { $sort: { total: -1 } }
    ]);

    const totalActivities = await Activity.countDocuments(matchStage);

    const topUsers = await Activity.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$userId',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          userId: '$_id',
          count: 1,
          name: '$user.name',
          email: '$user.email'
        }
      }
    ]);

    logger.info('Fetched activity statistics', {
      userId: req.userId,
      totalActivities,
      filters: matchStage
    });

    res.json(
      successResponse(
        {
          totalActivities,
          byEntityType: stats,
          topUsers
        },
        'Activity statistics fetched successfully'
      )
    );
  } catch (error) {
    logger.error('Failed to fetch activity statistics', {
      userId: req.userId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Delete activity by ID
 * @route DELETE /api/activities/:id
 * @access Private (Admin only)
 */
exports.deleteActivity = async (req, res, next) => {
  try {
    const { id } = req.params;

    const activity = await Activity.findByIdAndDelete(id);

    if (!activity) {
      logger.warn('Activity not found for deletion', {
        activityId: id,
        userId: req.userId
      });
      return res.status(404).json(errorResponse('Activity not found'));
    }

    logger.info('Deleted activity', {
      activityId: id,
      userId: req.userId,
      deletedActivity: {
        entityType: activity.entityType,
        actionType: activity.actionType
      }
    });

    res.json(successResponse(null, 'Activity deleted successfully'));
  } catch (error) {
    logger.error('Failed to delete activity', {
      activityId: req.params.id,
      userId: req.userId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Delete activities by entity
 * @route DELETE /api/activities/entity/:entityType/:entityId
 * @access Private (Admin only)
 */
exports.deleteActivitiesByEntity = async (req, res, next) => {
  try {
    const { entityType, entityId } = req.params;

    const result = await Activity.deleteMany({ entityType, entityId });

    logger.info('Deleted activities by entity', {
      entityType,
      entityId,
      userId: req.userId,
      deletedCount: result.deletedCount
    });

    res.json(
      successResponse(
        { deletedCount: result.deletedCount },
        `${result.deletedCount} activities deleted successfully`
      )
    );
  } catch (error) {
    logger.error('Failed to delete activities by entity', {
      entityType: req.params.entityType,
      entityId: req.params.entityId,
      userId: req.userId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Bulk delete activities
 * @route DELETE /api/activities/bulk
 * @access Private (Admin only)
 */
exports.bulkDeleteActivities = async (req, res, next) => {
  try {
    const { activityIds } = req.body;

    if (!activityIds || !Array.isArray(activityIds) || activityIds.length === 0) {
      return res.status(400).json(errorResponse('Activity IDs array is required'));
    }

    const result = await Activity.deleteMany({ _id: { $in: activityIds } });

    logger.info('Bulk deleted activities', {
      userId: req.userId,
      requestedCount: activityIds.length,
      deletedCount: result.deletedCount
    });

    res.json(
      successResponse(
        { deletedCount: result.deletedCount },
        `${result.deletedCount} activities deleted successfully`
      )
    );
  } catch (error) {
    logger.error('Failed to bulk delete activities', {
      userId: req.userId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};
