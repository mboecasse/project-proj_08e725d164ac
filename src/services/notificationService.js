// File: src/services/notificationService.js
// Generated: 2025-10-08 13:17:28 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_o6j9tygquliy


const Notification = require('../models/Notification');


const emailService = require('./emailService');


const logger = require('../utils/logger');


const socketService = require('./socketService');

/**
 * Notification types
 */


const NOTIFICATION_TYPES = {
  TASK_ASSIGNED: 'task_assigned',
  TASK_UPDATED: 'task_updated',
  TASK_COMPLETED: 'task_completed',
  TASK_DELETED: 'task_deleted',
  COMMENT_ADDED: 'comment_added',
  COMMENT_MENTIONED: 'comment_mentioned',
  FILE_UPLOADED: 'file_uploaded',
  SUBTASK_COMPLETED: 'subtask_completed',
  PROJECT_INVITATION: 'project_invitation',
  TEAM_INVITATION: 'team_invitation',
  DEADLINE_APPROACHING: 'deadline_approaching',
  DEADLINE_OVERDUE: 'deadline_overdue',
  ROLE_CHANGED: 'role_changed'
};

/**
 * Create and deliver a notification
 * @param {Object} notificationData - Notification data
 * @param {String} notificationData.recipient - User ID of recipient
 * @param {String} notificationData.type - Notification type
 * @param {String} notificationData.title - Notification title
 * @param {String} notificationData.message - Notification message
 * @param {Object} notificationData.data - Additional data
 * @param {String} notificationData.relatedModel - Related model name
 * @param {String} notificationData.relatedId - Related document ID
 * @param {String} notificationData.actionUrl - Action URL
 * @returns {Promise<Object>} Created notification
 */
exports.createNotification = async (notificationData) => {
  try {
    const {
      recipient,
      type,
      title,
      message,
      data = {},
      relatedModel,
      relatedId,
      actionUrl
    } = notificationData;

    // Validate required fields
    if (!recipient || !type || !title || !message) {
      throw new Error('Missing required notification fields');
    }

    // Create notification
    const notification = await Notification.create({
      recipient,
      type,
      title,
      message,
      data,
      relatedModel,
      relatedId,
      actionUrl,
      read: false,
      deliveredViaEmail: false,
      deliveredViaInApp: false
    });

    logger.info('Notification created', {
      notificationId: notification._id,
      recipient,
      type
    });

    // Deliver notification
    await this.deliverNotification(notification);

    return notification;
  } catch (error) {
    logger.error('Failed to create notification', {
      error: error.message,
      recipient: notificationData.recipient,
      type: notificationData.type
    });
    throw error;
  }
};

/**
 * Deliver notification via configured channels
 * @param {Object} notification - Notification document
 * @returns {Promise<Object>} Delivery status
 */
exports.deliverNotification = async (notification) => {
  try {
    const deliveryStatus = {
      inApp: false,
      email: false
    };

    // Populate recipient to get delivery preferences
    await notification.populate('recipient', 'email emailNotifications notificationPreferences');

    if (!notification.recipient) {
      logger.warn('Notification recipient not found', {
        notificationId: notification._id
      });
      return deliveryStatus;
    }

    // Deliver in-app notification via socket
    try {
      socketService.sendNotification(notification.recipient._id.toString(), {
        id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        actionUrl: notification.actionUrl,
        createdAt: notification.createdAt
      });

      notification.deliveredViaInApp = true;
      deliveryStatus.inApp = true;

      logger.info('In-app notification delivered', {
        notificationId: notification._id,
        recipient: notification.recipient._id
      });
    } catch (error) {
      logger.error('Failed to deliver in-app notification', {
        notificationId: notification._id,
        error: error.message
      });
    }

    // Deliver email notification if enabled
    if (this.shouldSendEmail(notification)) {
      try {
        await emailService.sendNotificationEmail(
          notification.recipient.email,
          notification.title,
          notification.message,
          notification.actionUrl,
          notification.type
        );

        notification.deliveredViaEmail = true;
        deliveryStatus.email = true;

        logger.info('Email notification delivered', {
          notificationId: notification._id,
          recipient: notification.recipient._id,
          email: notification.recipient.email
        });
      } catch (error) {
        logger.error('Failed to deliver email notification', {
          notificationId: notification._id,
          error: error.message
        });
      }
    }

    // Save delivery status
    await notification.save();

    return deliveryStatus;
  } catch (error) {
    logger.error('Failed to deliver notification', {
      notificationId: notification._id,
      error: error.message
    });
    throw error;
  }
};

/**
 * Check if email notification should be sent
 * @param {Object} notification - Notification document with populated recipient
 * @returns {Boolean} Should send email
 */
exports.shouldSendEmail = (notification) => {
  try {
    const recipient = notification.recipient;

    // Check if email notifications are globally enabled
    if (!recipient.emailNotifications) {
      return false;
    }

    // Check notification type preferences
    const preferences = recipient.notificationPreferences || {};

    switch (notification.type) {
      case NOTIFICATION_TYPES.TASK_ASSIGNED:
        return preferences.taskAssigned !== false;
      case NOTIFICATION_TYPES.TASK_UPDATED:
        return preferences.taskUpdated !== false;
      case NOTIFICATION_TYPES.TASK_COMPLETED:
        return preferences.taskCompleted !== false;
      case NOTIFICATION_TYPES.COMMENT_ADDED:
        return preferences.comments !== false;
      case NOTIFICATION_TYPES.COMMENT_MENTIONED:
        return preferences.mentions !== false;
      case NOTIFICATION_TYPES.DEADLINE_APPROACHING:
      case NOTIFICATION_TYPES.DEADLINE_OVERDUE:
        return preferences.deadlines !== false;
      case NOTIFICATION_TYPES.PROJECT_INVITATION:
      case NOTIFICATION_TYPES.TEAM_INVITATION:
        return preferences.invitations !== false;
      default:
        return true;
    }
  } catch (error) {
    logger.error('Error checking email notification preference', {
      notificationId: notification._id,
      error: error.message
    });
    return false;
  }
};

/**
 * Create task assignment notification
 * @param {String} recipientId - User ID of assignee
 * @param {Object} task - Task document
 * @param {String} assignedBy - User ID of assigner
 * @returns {Promise<Object>} Created notification
 */
exports.notifyTaskAssignment = async (recipientId, task, assignedBy) => {
  try {
    await task.populate('project', 'name');

    return await this.createNotification({
      recipient: recipientId,
      type: NOTIFICATION_TYPES.TASK_ASSIGNED,
      title: 'New Task Assigned',
      message: `You have been assigned to task "${task.title}" in project "${task.project.name}"`,
      data: {
        taskId: task._id,
        taskTitle: task.title,
        projectId: task.project._id,
        projectName: task.project.name,
        assignedBy
      },
      relatedModel: 'Task',
      relatedId: task._id,
      actionUrl: `/projects/${task.project._id}/tasks/${task._id}`
    });
  } catch (error) {
    logger.error('Failed to create task assignment notification', {
      recipientId,
      taskId: task._id,
      error: error.message
    });
    throw error;
  }
};

/**
 * Create comment mention notification
 * @param {String} recipientId - User ID of mentioned user
 * @param {Object} comment - Comment document
 * @param {String} mentionedBy - User ID of commenter
 * @returns {Promise<Object>} Created notification
 */
exports.notifyCommentMention = async (recipientId, comment, mentionedBy) => {
  try {
    await comment.populate('task', 'title project');
    await comment.populate('task.project', 'name');

    return await this.createNotification({
      recipient: recipientId,
      type: NOTIFICATION_TYPES.COMMENT_MENTIONED,
      title: 'You were mentioned',
      message: `You were mentioned in a comment on task "${comment.task.title}"`,
      data: {
        commentId: comment._id,
        taskId: comment.task._id,
        taskTitle: comment.task.title,
        projectId: comment.task.project._id,
        projectName: comment.task.project.name,
        mentionedBy
      },
      relatedModel: 'Comment',
      relatedId: comment._id,
      actionUrl: `/projects/${comment.task.project._id}/tasks/${comment.task._id}#comment-${comment._id}`
    });
  } catch (error) {
    logger.error('Failed to create comment mention notification', {
      recipientId,
      commentId: comment._id,
      error: error.message
    });
    throw error;
  }
};

/**
 * Create deadline approaching notification
 * @param {String} recipientId - User ID
 * @param {Object} task - Task document
 * @returns {Promise<Object>} Created notification
 */
exports.notifyDeadlineApproaching = async (recipientId, task) => {
  try {
    await task.populate('project', 'name');

    const daysUntilDue = Math.ceil((new Date(task.dueDate) - new Date()) / (1000 * 60 * 60 * 24));

    return await this.createNotification({
      recipient: recipientId,
      type: NOTIFICATION_TYPES.DEADLINE_APPROACHING,
      title: 'Deadline Approaching',
      message: `Task "${task.title}" is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`,
      data: {
        taskId: task._id,
        taskTitle: task.title,
        projectId: task.project._id,
        projectName: task.project.name,
        dueDate: task.dueDate,
        daysUntilDue
      },
      relatedModel: 'Task',
      relatedId: task._id,
      actionUrl: `/projects/${task.project._id}/tasks/${task._id}`
    });
  } catch (error) {
    logger.error('Failed to create deadline approaching notification', {
      recipientId,
      taskId: task._id,
      error: error.message
    });
    throw error;
  }
};

/**
 * Create deadline overdue notification
 * @param {String} recipientId - User ID
 * @param {Object} task - Task document
 * @returns {Promise<Object>} Created notification
 */
exports.notifyDeadlineOverdue = async (recipientId, task) => {
  try {
    await task.populate('project', 'name');

    const daysOverdue = Math.ceil((new Date() - new Date(task.dueDate)) / (1000 * 60 * 60 * 24));

    return await this.createNotification({
      recipient: recipientId,
      type: NOTIFICATION_TYPES.DEADLINE_OVERDUE,
      title: 'Task Overdue',
      message: `Task "${task.title}" is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue`,
      data: {
        taskId: task._id,
        taskTitle: task.title,
        projectId: task.project._id,
        projectName: task.project.name,
        dueDate: task.dueDate,
        daysOverdue
      },
      relatedModel: 'Task',
      relatedId: task._id,
      actionUrl: `/projects/${task.project._id}/tasks/${task._id}`
    });
  } catch (error) {
    logger.error('Failed to create deadline overdue notification', {
      recipientId,
      taskId: task._id,
      error: error.message
    });
    throw error;
  }
};

/**
 * Mark notification as read
 * @param {String} notificationId - Notification ID
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Updated notification
 */
exports.markAsRead = async (notificationId, userId) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { read: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      throw new Error('Notification not found or unauthorized');
    }

    logger.info('Notification marked as read', {
      notificationId,
      userId
    });

    return notification;
  } catch (error) {
    logger.error('Failed to mark notification as read', {
      notificationId,
      userId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Mark all notifications as read for a user
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Update result
 */
exports.markAllAsRead = async (userId) => {
  try {
    const result = await Notification.updateMany(
      { recipient: userId, read: false },
      { read: true, readAt: new Date() }
    );

    logger.info('All notifications marked as read', {
      userId,
      count: result.modifiedCount
    });

    return result;
  } catch (error) {
    logger.error('Failed to mark all notifications as read', {
      userId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Get user notifications with pagination
 * @param {String} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Notifications and metadata
 */
exports.getUserNotifications = async (userId, options = {}) => {
  try {
    const {
      page = 1,
      limit = 20,
      unreadOnly = false,
      type = null
    } = options;

    const query = { recipient: userId };

    if (unreadOnly) {
      query.read = false;
    }

    if (type) {
      query.type = type;
    }

    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ recipient: userId, read: false })
    ]);

    logger.info('Fetched user notifications', {
      userId,
      count: notifications.length,
      total,
      unreadCount
    });

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      unreadCount
    };
  } catch (error) {
    logger.error('Failed to get user notifications', {
      userId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Delete notification
 * @param {String} notificationId - Notification ID
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Deleted notification
 */
