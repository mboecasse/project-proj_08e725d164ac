// File: src/routes/notifications.js
// Generated: 2025-10-08 13:16:51 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_ifmdwcns4qi1


const Notification = require('../models/Notification');


const express = require('express');


const logger = require('../utils/logger');

const { auth } = require('../middleware/auth');


const router = express.Router();

/**
 * GET /api/notifications
 * Get all notifications for authenticated user
 */
router.get('/', auth, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    const query = { userId: req.userId };
    if (unreadOnly === 'true') {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('relatedUser', 'name email')
      .lean();

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      userId: req.userId,
      read: false
    });

    logger.info('Fetched notifications', {
      userId: req.userId,
      count: notifications.length,
      unreadCount
    });

    res.json({
      success: true,
      data: notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      unreadCount
    });
  } catch (error) {
    logger.error('Failed to fetch notifications', {
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
});

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications
 */
router.get('/unread-count', auth, async (req, res, next) => {
  try {
    const unreadCount = await Notification.countDocuments({
      userId: req.userId,
      read: false
    });

    logger.info('Fetched unread notification count', {
      userId: req.userId,
      unreadCount
    });

    res.json({
      success: true,
      data: { unreadCount }
    });
  } catch (error) {
    logger.error('Failed to fetch unread count', {
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
});

/**
 * GET /api/notifications/:id
 * Get notification by ID
 */
router.get('/:id', auth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOne({
      _id: id,
      userId: req.userId
    })
      .populate('relatedUser', 'name email')
      .lean();

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    logger.info('Fetched notification by ID', {
      userId: req.userId,
      notificationId: id
    });

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    logger.error('Failed to fetch notification', {
      userId: req.userId,
      notificationId: req.params.id,
      error: error.message
    });
    next(error);
  }
});

/**
 * PUT /api/notifications/:id/read
 * Mark notification as read
 */
router.put('/:id/read', auth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: req.userId },
      { read: true, readAt: new Date() },
      { new: true }
    ).lean();

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    logger.info('Marked notification as read', {
      userId: req.userId,
      notificationId: id
    });

    res.json({
      success: true,
      data: notification,
      message: 'Notification marked as read'
    });
  } catch (error) {
    logger.error('Failed to mark notification as read', {
      userId: req.userId,
      notificationId: req.params.id,
      error: error.message
    });
    next(error);
  }
});

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read
 */
router.put('/read-all', auth, async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { userId: req.userId, read: false },
      { read: true, readAt: new Date() }
    );

    logger.info('Marked all notifications as read', {
      userId: req.userId,
      count: result.modifiedCount
    });

    res.json({
      success: true,
      data: { count: result.modifiedCount },
      message: 'All notifications marked as read'
    });
  } catch (error) {
    logger.error('Failed to mark all notifications as read', {
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete notification
 */
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOneAndDelete({
      _id: id,
      userId: req.userId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    logger.info('Deleted notification', {
      userId: req.userId,
      notificationId: id
    });

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete notification', {
      userId: req.userId,
      notificationId: req.params.id,
      error: error.message
    });
    next(error);
  }
});

/**
 * DELETE /api/notifications
 * Delete all read notifications
 */
router.delete('/', auth, async (req, res, next) => {
  try {
    const result = await Notification.deleteMany({
      userId: req.userId,
      read: true
    });

    logger.info('Deleted all read notifications', {
      userId: req.userId,
      count: result.deletedCount
    });

    res.json({
      success: true,
      data: { count: result.deletedCount },
      message: 'Read notifications deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete read notifications', {
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
});

module.exports = router;
