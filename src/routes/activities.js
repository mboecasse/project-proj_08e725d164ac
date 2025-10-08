// File: src/routes/activities.js
// Generated: 2025-10-08 13:16:46 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_srbk5nbo7ffe


const Activity = require('../models/Activity');


const express = require('express');


const logger = require('../utils/logger');

const { auth } = require('../middleware/auth');

const { checkRole } = require('../middleware/rbac');

const { query, param } = require('express-validator');

const { validate } = require('../middleware/validator');


const router = express.Router();

/**
 * Validation rules for activity queries
 */


const activityQueryValidation = [
  query('entityType')
    .optional()
    .isIn(['task', 'project', 'team', 'comment', 'file', 'user'])
    .withMessage('Invalid entity type'),
  query('entityId')
    .optional()
    .isMongoId()
    .withMessage('Invalid entity ID'),
  query('userId')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID'),
  query('action')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Action must be a non-empty string'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

/**
 * Validation rules for entity ID parameter
 */


const entityIdValidation = [
  param('entityId')
    .isMongoId()
    .withMessage('Invalid entity ID')
];

/**
 * GET /api/activities
 * Get activity logs with filtering and pagination
 * @access Private (all authenticated users)
 */
router.get('/', auth, activityQueryValidation, validate, async (req, res, next) => {
  try {
    const {
      entityType,
      entityId,
      userId,
      action,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = req.query;

    // Build query filter
    const filter = {};

    if (entityType) {
      filter.entityType = entityType;
    }

    if (entityId) {
      filter.entityId = entityId;
    }

    if (userId) {
      filter.userId = userId;
    }

    if (action) {
      filter.action = action;
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

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query with pagination
    const [activities, total] = await Promise.all([
      Activity.find(filter)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Activity.countDocuments(filter)
    ]);

    logger.info('Fetched activity logs', {
      userId: req.userId,
      filter,
      count: activities.length,
      total
    });

    res.json({
      success: true,
      data: activities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Failed to fetch activity logs', {
      userId: req.userId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
});

/**
 * GET /api/activities/entity/:entityType/:entityId
 * Get activities for a specific entity
 * @access Private (all authenticated users)
 */
router.get('/entity/:entityType/:entityId', auth, entityIdValidation, validate, async (req, res, next) => {
  try {
    const { entityType, entityId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Validate entity type
    const validEntityTypes = ['task', 'project', 'team', 'comment', 'file', 'user'];
    if (!validEntityTypes.includes(entityType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid entity type'
      });
    }

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

    logger.info('Fetched entity activities', {
      userId: req.userId,
      entityType,
      entityId,
      count: activities.length
    });

    res.json({
      success: true,
      data: activities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Failed to fetch entity activities', {
      userId: req.userId,
      entityType: req.params.entityType,
      entityId: req.params.entityId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
});

/**
 * GET /api/activities/user/:userId
 * Get activities by a specific user
 * @access Private (all authenticated users can see their own, admins can see all)
 */
router.get('/user/:userId', auth, entityIdValidation, validate, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Users can only see their own activities unless they're admin
    if (userId !== req.userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only view your own activities.'
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [activities, total] = await Promise.all([
      Activity.find({ userId })
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Activity.countDocuments({ userId })
    ]);

    logger.info('Fetched user activities', {
      requesterId: req.userId,
      targetUserId: userId,
      count: activities.length
    });

    res.json({
      success: true,
      data: activities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Failed to fetch user activities', {
      requesterId: req.userId,
      targetUserId: req.params.userId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
});

/**
 * GET /api/activities/stats
 * Get activity statistics
 * @access Private (admin only)
 */
router.get('/stats', auth, checkRole(['admin']), async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        dateFilter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.createdAt.$lte = new Date(endDate);
      }
    }

    // Aggregate statistics
    const [
      totalActivities,
      activitiesByType,
      activitiesByAction,
      topUsers
    ] = await Promise.all([
      Activity.countDocuments(dateFilter),
      Activity.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$entityType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Activity.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Activity.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$userId', count: { $sum: 1 } } },
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
      ])
    ]);

    logger.info('Generated activity statistics', {
      userId: req.userId,
      totalActivities
    });

    res.json({
      success: true,
      data: {
        total: totalActivities,
        byType: activitiesByType,
        byAction: activitiesByAction,
        topUsers
      }
    });
  } catch (error) {
    logger.error('Failed to generate activity statistics', {
      userId: req.userId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
});

/**
 * DELETE /api/activities/cleanup
 * Delete old activity logs (admin only)
 * @access Private (admin only)
 */
router.delete('/cleanup', auth, checkRole(['admin']), async (req, res, next) => {
  try {
    const { olderThan } = req.query;

    if (!olderThan) {
      return res.status(400).json({
        success: false,
        error: 'olderThan parameter is required (e.g., 90 for 90 days)'
      });
    }

    const days = parseInt(olderThan);
    if (isNaN(days) || days < 1) {
      return res.status(400).json({
        success: false,
        error: 'olderThan must be a positive integer'
      });
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await Activity.deleteMany({
      createdAt: { $lt: cutoffDate }
    });

    logger.info('Cleaned up old activity logs', {
      userId: req.userId,
      cutoffDate,
      deletedCount: result.deletedCount
    });

    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} activity logs older than ${days} days`,
      data: {
        deletedCount: result.deletedCount,
        cutoffDate
      }
    });
  } catch (error) {
    logger.error('Failed to cleanup activity logs', {
      userId: req.userId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
});

module.exports = router;
