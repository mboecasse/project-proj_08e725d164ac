// File: src/controllers/notificationController.js
// Generated: 2025-10-08 13:15:15 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_jmenp8r8oaus

    const User = require('../models/User');


const Notification = require('../models/Notification');


const logger = require('../utils/logger');

const { successResponse, errorResponse } = require('../utils/response');

/**
 * Get all notifications for the authenticated user
 * @route GET /api/notifications
 * @access Private
 */
exports.getNotifications = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    const query = { recipient: userId };
    if (unreadOnly === 'true') {
      query.read = false;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('sender', 'name email')
        .populate('task', 'title')
        .populate('project', 'name')
        .populate('comment', 'content')
        .lean(),
      Notification.countDocuments(query)
    ]);

    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      read: false
    });

    logger.info('Fetched notifications', {
      userId,
      count: notifications.length,
      unreadCount,
      page,
      limit
    });

    return successResponse(res, {
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      unreadCount
    }, 'Notifications retrieved successfully');
  } catch (error) {
    logger.error('Failed to fetch notifications', {
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Get notification by ID
 * @route GET /api/notifications/:id
 * @access Private
 */
exports.getNotificationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const notification = await Notification.findOne({
      _id: id,
      recipient: userId
    })
      .populate('sender', 'name email')
      .populate('task', 'title')
      .populate('project', 'name')
      .populate('comment', 'content')
      .lean();

    if (!notification) {
      logger.warn('Notification not found', { notificationId: id, userId });
      return errorResponse(res, 'Notification not found', 404);
    }

    logger.info('Fetched notification by ID', { notificationId: id, userId });

    return successResponse(res, notification, 'Notification retrieved successfully');
  } catch (error) {
    logger.error('Failed to fetch notification', {
      notificationId: req.params.id,
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Mark notification as read
 * @route PATCH /api/notifications/:id/read
 * @access Private
 */
exports.markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: userId },
      { read: true, readAt: new Date() },
      { new: true }
    )
      .populate('sender', 'name email')
      .populate('task', 'title')
      .populate('project', 'name')
      .lean();

    if (!notification) {
      logger.warn('Notification not found for marking as read', {
        notificationId: id,
        userId
      });
      return errorResponse(res, 'Notification not found', 404);
    }

    logger.info('Marked notification as read', { notificationId: id, userId });

    return successResponse(res, notification, 'Notification marked as read');
  } catch (error) {
    logger.error('Failed to mark notification as read', {
      notificationId: req.params.id,
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Mark notification as unread
 * @route PATCH /api/notifications/:id/unread
 * @access Private
 */
exports.markAsUnread = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: userId },
      { read: false, readAt: null },
      { new: true }
    )
      .populate('sender', 'name email')
      .populate('task', 'title')
      .populate('project', 'name')
      .lean();

    if (!notification) {
      logger.warn('Notification not found for marking as unread', {
        notificationId: id,
        userId
      });
      return errorResponse(res, 'Notification not found', 404);
    }

    logger.info('Marked notification as unread', { notificationId: id, userId });

    return successResponse(res, notification, 'Notification marked as unread');
  } catch (error) {
    logger.error('Failed to mark notification as unread', {
      notificationId: req.params.id,
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Mark all notifications as read
 * @route PATCH /api/notifications/read-all
 * @access Private
 */
exports.markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.userId;

    const result = await Notification.updateMany(
      { recipient: userId, read: false },
      { read: true, readAt: new Date() }
    );

    logger.info('Marked all notifications as read', {
      userId,
      modifiedCount: result.modifiedCount
    });

    return successResponse(
      res,
      { modifiedCount: result.modifiedCount },
      'All notifications marked as read'
    );
  } catch (error) {
    logger.error('Failed to mark all notifications as read', {
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Delete notification
 * @route DELETE /api/notifications/:id
 * @access Private
 */
exports.deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const notification = await Notification.findOneAndDelete({
      _id: id,
      recipient: userId
    });

    if (!notification) {
      logger.warn('Notification not found for deletion', {
        notificationId: id,
        userId
      });
      return errorResponse(res, 'Notification not found', 404);
    }

    logger.info('Deleted notification', { notificationId: id, userId });

    return successResponse(res, null, 'Notification deleted successfully');
  } catch (error) {
    logger.error('Failed to delete notification', {
      notificationId: req.params.id,
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Delete all read notifications
 * @route DELETE /api/notifications/read
 * @access Private
 */
exports.deleteAllRead = async (req, res, next) => {
  try {
    const userId = req.userId;

    const result = await Notification.deleteMany({
      recipient: userId,
      read: true
    });

    logger.info('Deleted all read notifications', {
      userId,
      deletedCount: result.deletedCount
    });

    return successResponse(
      res,
      { deletedCount: result.deletedCount },
      'All read notifications deleted successfully'
    );
  } catch (error) {
    logger.error('Failed to delete all read notifications', {
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Get unread notification count
 * @route GET /api/notifications/unread/count
 * @access Private
 */
exports.getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.userId;

    const count = await Notification.countDocuments({
      recipient: userId,
      read: false
    });

    logger.info('Fetched unread notification count', { userId, count });

    return successResponse(res, { count }, 'Unread count retrieved successfully');
  } catch (error) {
    logger.error('Failed to fetch unread notification count', {
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Get notification preferences for user
 * @route GET /api/notifications/preferences
 * @access Private
 */
exports.getPreferences = async (req, res, next) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId).select('notificationPreferences').lean();

    if (!user) {
      logger.warn('User not found for notification preferences', { userId });
      return errorResponse(res, 'User not found', 404);
    }

    const preferences = user.notificationPreferences || {
      email: true,
      push: true,
      taskAssigned: true,
      taskCompleted: true,
      commentAdded: true,
      mentionedInComment: true,
      projectInvite: true,
      deadlineReminder: true
    };

    logger.info('Fetched notification preferences', { userId });

    return successResponse(res, preferences, 'Preferences retrieved successfully');
  } catch (error) {
    logger.error('Failed to fetch notification preferences', {
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Update notification preferences
 * @route PUT /api/notifications/preferences
 * @access Private
 */
exports.updatePreferences = async (req, res, next) => {
  try {
    const userId = req.userId;
    const preferences = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { notificationPreferences: preferences },
      { new: true, runValidators: true }
    ).select('notificationPreferences');

    if (!user) {
      logger.warn('User not found for updating preferences', { userId });
      return errorResponse(res, 'User not found', 404);
    }

    logger.info('Updated notification preferences', { userId });

    return successResponse(
      res,
      user.notificationPreferences,
      'Preferences updated successfully'
    );
  } catch (error) {
    logger.error('Failed to update notification preferences', {
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
};
