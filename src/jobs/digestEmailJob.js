// File: src/jobs/digestEmailJob.js
// Generated: 2025-10-08 13:17:17 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_hmuil6nk7uuo


const Notification = require('../models/Notification');


const User = require('../models/User');


const cron = require('node-cron');


const emailService = require('../services/emailService');


const logger = require('../utils/logger');

/**
 * Digest Email Job
 * Sends daily digest emails to users with unread notifications
 * Runs daily at 9:00 AM
 */
class DigestEmailJob {
  constructor() {
    this.cronExpression = '0 9 * * *'; // Daily at 9:00 AM
    this.isRunning = false;
    this.task = null;
  }

  /**
   * Start the digest email job
   */
  start() {
    try {
      this.task = cron.schedule(this.cronExpression, async () => {
        await this.execute();
      }, {
        scheduled: true,
        timezone: process.env.TIMEZONE || 'UTC'
      });

      logger.info('Digest email job started', {
        schedule: this.cronExpression,
        timezone: process.env.TIMEZONE || 'UTC'
      });
    } catch (error) {
      logger.error('Failed to start digest email job', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Stop the digest email job
   */
  stop() {
    try {
      if (this.task) {
        this.task.stop();
        this.task = null;
        logger.info('Digest email job stopped');
      }
    } catch (error) {
      logger.error('Failed to stop digest email job', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Execute the digest email job
   */
  async execute() {
    if (this.isRunning) {
      logger.warn('Digest email job already running, skipping execution');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('Starting digest email job execution');

      // Find users who want daily digest emails
      const users = await User.find({
        'preferences.emailNotifications': true,
        'preferences.digestFrequency': 'daily',
        isActive: true
      }).select('_id name email preferences');

      logger.info('Found users for digest emails', { count: users.length });

      let successCount = 0;
      let failureCount = 0;
      const errors = [];

      // Process each user
      for (const user of users) {
        try {
          await this.sendDigestEmail(user);
          successCount++;
        } catch (error) {
          failureCount++;
          errors.push({
            userId: user._id,
            email: user.email,
            error: error.message
          });
          logger.error('Failed to send digest email to user', {
            userId: user._id,
            email: user.email,
            error: error.message
          });
        }
      }

      const duration = Date.now() - startTime;

      logger.info('Digest email job completed', {
        totalUsers: users.length,
        successCount,
        failureCount,
        duration: `${duration}ms`,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      logger.error('Digest email job failed', {
        error: error.message,
        stack: error.stack
      });
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Send digest email to a specific user
   * @param {Object} user - User document
   */
  async sendDigestEmail(user) {
    try {
      // Get unread notifications from the last 24 hours
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const notifications = await Notification.find({
        recipient: user._id,
        read: false,
        createdAt: { $gte: twentyFourHoursAgo }
      })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('sender', 'name email')
        .populate('task', 'title')
        .populate('project', 'name')
        .lean();

      // Skip if no unread notifications
      if (notifications.length === 0) {
        logger.debug('No unread notifications for user, skipping digest', {
          userId: user._id,
          email: user.email
        });
        return;
      }

      // Group notifications by type
      const groupedNotifications = this.groupNotificationsByType(notifications);

      // Prepare email data
      const emailData = {
        userName: user.name,
        totalNotifications: notifications.length,
        notifications: groupedNotifications,
        dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`,
        unsubscribeUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings/notifications`
      };

      // Send digest email
      await emailService.sendDigestEmail(user.email, emailData);

      logger.info('Digest email sent successfully', {
        userId: user._id,
        email: user.email,
        notificationCount: notifications.length
      });
    } catch (error) {
      logger.error('Failed to send digest email', {
        userId: user._id,
        email: user.email,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Group notifications by type for better email presentation
   * @param {Array} notifications - Array of notification documents
   * @returns {Object} Grouped notifications
   */
  groupNotificationsByType(notifications) {
    const grouped = {
      taskAssigned: [],
      taskCompleted: [],
      taskCommented: [],
      taskDueSoon: [],
      projectInvite: [],
      mention: [],
      other: []
    };

    for (const notification of notifications) {
      const type = notification.type || 'other';

      const notificationData = {
        id: notification._id,
        message: notification.message,
        type: notification.type,
        createdAt: notification.createdAt,
        sender: notification.sender ? {
          name: notification.sender.name,
          email: notification.sender.email
        } : null,
        task: notification.task ? {
          id: notification.task._id,
          title: notification.task.title
        } : null,
        project: notification.project ? {
          id: notification.project._id,
          name: notification.project.name
        } : null
      };

      switch (type) {
        case 'task_assigned':
          grouped.taskAssigned.push(notificationData);
          break;
        case 'task_completed':
          grouped.taskCompleted.push(notificationData);
          break;
        case 'task_commented':
        case 'comment_added':
          grouped.taskCommented.push(notificationData);
          break;
        case 'task_due_soon':
        case 'task_overdue':
          grouped.taskDueSoon.push(notificationData);
          break;
        case 'project_invite':
        case 'team_invite':
          grouped.projectInvite.push(notificationData);
          break;
        case 'mention':
          grouped.mention.push(notificationData);
          break;
        default:
          grouped.other.push(notificationData);
      }
    }

    return grouped;
  }

  /**
   * Run the job immediately (for testing or manual trigger)
   */
  async runNow() {
    logger.info('Running digest email job manually');
    await this.execute();
  }

  /**
   * Get job status
   * @returns {Object} Job status information
   */
  getStatus() {
    return {
      isScheduled: this.task !== null,
      isRunning: this.isRunning,
      schedule: this.cronExpression,
      timezone: process.env.TIMEZONE || 'UTC'
    };
  }
}

// Create singleton instance


const digestEmailJob = new DigestEmailJob();

module.exports = digestEmailJob;
