// File: src/jobs/notificationQueue.js
// Generated: 2025-10-08 13:18:01 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_qzug8ro0tpsq


const Bull = require('bull');


const logger = require('../utils/logger');


const notificationService = require('../services/notificationService');


const redisClient = require('../config/redis');

/**
 * Bull queue for processing notification jobs
 * Handles asynchronous notification delivery with retry logic
 */

// Create notification queue with Redis connection


const notificationQueue = new Bull('notifications', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: process.env.REDIS_DB || 0
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: true,
    removeOnFail: false
  }
});

/**
 * Process notification jobs
 * Handles different notification types and delivery methods
 */
notificationQueue.process(async (job) => {
  const { type, data } = job.data;

  try {
    logger.info('Processing notification job', {
      jobId: job.id,
      type,
      userId: data.userId,
      attempt: job.attemptsMade + 1
    });

    let result;

    switch (type) {
      case 'task_assigned':
        result = await notificationService.sendTaskAssignedNotification(data);
        break;

      case 'task_updated':
        result = await notificationService.sendTaskUpdatedNotification(data);
        break;

      case 'task_completed':
        result = await notificationService.sendTaskCompletedNotification(data);
        break;

      case 'comment_added':
        result = await notificationService.sendCommentAddedNotification(data);
        break;

      case 'mention':
        result = await notificationService.sendMentionNotification(data);
        break;

      case 'deadline_reminder':
        result = await notificationService.sendDeadlineReminderNotification(data);
        break;

      case 'team_invitation':
        result = await notificationService.sendTeamInvitationNotification(data);
        break;

      case 'project_update':
        result = await notificationService.sendProjectUpdateNotification(data);
        break;

      default:
        throw new Error(`Unknown notification type: ${type}`);
    }

    logger.info('Notification job completed successfully', {
      jobId: job.id,
      type,
      userId: data.userId,
      result
    });

    return result;
  } catch (error) {
    logger.error('Notification job failed', {
      jobId: job.id,
      type,
      userId: data.userId,
      attempt: job.attemptsMade + 1,
      error: error.message,
      stack: error.stack
    });

    throw error;
  }
});

/**
 * Handle job completion
 */
notificationQueue.on('completed', (job, result) => {
  logger.info('Notification job completed', {
    jobId: job.id,
    type: job.data.type,
    duration: Date.now() - job.timestamp
  });
});

/**
 * Handle job failure
 */
notificationQueue.on('failed', (job, error) => {
  logger.error('Notification job failed permanently', {
    jobId: job.id,
    type: job.data.type,
    attempts: job.attemptsMade,
    error: error.message
  });
});

/**
 * Handle job stalling
 */
notificationQueue.on('stalled', (job) => {
  logger.warn('Notification job stalled', {
    jobId: job.id,
    type: job.data.type
  });
});

/**
 * Handle queue errors
 */
notificationQueue.on('error', (error) => {
  logger.error('Notification queue error', {
    error: error.message,
    stack: error.stack
  });
});

/**
 * Add a notification job to the queue
 * @param {string} type - Notification type
 * @param {Object} data - Notification data
 * @param {Object} options - Job options (priority, delay, etc.)
 * @returns {Promise<Object>} Job object
 */


const addNotificationJob = async (type, data, options = {}) => {
  try {
    const job = await notificationQueue.add(
      { type, data },
      {
        priority: options.priority || 5,
        delay: options.delay || 0,
        attempts: options.attempts || 3,
        ...options
      }
    );

    logger.info('Notification job added to queue', {
      jobId: job.id,
      type,
      userId: data.userId,
      priority: options.priority || 5
    });

    return job;
  } catch (error) {
    logger.error('Failed to add notification job to queue', {
      type,
      userId: data.userId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Add multiple notification jobs in bulk
 * @param {Array} jobs - Array of job objects with type and data
 * @returns {Promise<Array>} Array of job objects
 */


const addBulkNotificationJobs = async (jobs) => {
  try {
    const bulkJobs = jobs.map((job) => ({
      data: { type: job.type, data: job.data },
      opts: {
        priority: job.priority || 5,
        delay: job.delay || 0,
        attempts: job.attempts || 3
      }
    }));

    const addedJobs = await notificationQueue.addBulk(bulkJobs);

    logger.info('Bulk notification jobs added to queue', {
      count: addedJobs.length
    });

    return addedJobs;
  } catch (error) {
    logger.error('Failed to add bulk notification jobs to queue', {
      count: jobs.length,
      error: error.message
    });
    throw error;
  }
};

/**
 * Get job by ID
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} Job object
 */


const getJob = async (jobId) => {
  try {
    const job = await notificationQueue.getJob(jobId);
    return job;
  } catch (error) {
    logger.error('Failed to get notification job', {
      jobId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Remove job by ID
 * @param {string} jobId - Job ID
 * @returns {Promise<void>}
 */


const removeJob = async (jobId) => {
  try {
    const job = await notificationQueue.getJob(jobId);
    if (job) {
      await job.remove();
      logger.info('Notification job removed', { jobId });
    }
  } catch (error) {
    logger.error('Failed to remove notification job', {
      jobId,
      error: error.message
    });
    throw error;
  }
};

/**
 * Get queue statistics
 * @returns {Promise<Object>} Queue statistics
 */


const getQueueStats = async () => {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      notificationQueue.getWaitingCount(),
      notificationQueue.getActiveCount(),
      notificationQueue.getCompletedCount(),
      notificationQueue.getFailedCount(),
      notificationQueue.getDelayedCount()
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed
    };
  } catch (error) {
    logger.error('Failed to get queue statistics', {
      error: error.message
    });
    throw error;
  }
};

/**
 * Clean old jobs from the queue
 * @param {number} grace - Grace period in milliseconds
 * @param {string} status - Job status (completed, failed)
 * @returns {Promise<Array>} Removed job IDs
 */


const cleanQueue = async (grace = 86400000, status = 'completed') => {
  try {
    const removed = await notificationQueue.clean(grace, status);
    logger.info('Queue cleaned', {
      status,
      grace,
      removed: removed.length
    });
    return removed;
  } catch (error) {
    logger.error('Failed to clean queue', {
      error: error.message
    });
    throw error;
  }
};

/**
 * Pause the queue
 * @returns {Promise<void>}
 */


const pauseQueue = async () => {
  try {
    await notificationQueue.pause();
    logger.info('Notification queue paused');
  } catch (error) {
    logger.error('Failed to pause queue', {
      error: error.message
    });
    throw error;
  }
};

/**
 * Resume the queue
 * @returns {Promise<void>}
 */


const resumeQueue = async () => {
  try {
    await notificationQueue.resume();
    logger.info('Notification queue resumed');
  } catch (error) {
    logger.error('Failed to resume queue', {
      error: error.message
    });
    throw error;
  }
};

/**
 * Close the queue gracefully
 * @returns {Promise<void>}
 */


const closeQueue = async () => {
  try {
    await notificationQueue.close();
    logger.info('Notification queue closed');
  } catch (error) {
    logger.error('Failed to close queue', {
      error: error.message
    });
    throw error;
  }
};

module.exports = {
  notificationQueue,
  addNotificationJob,
  addBulkNotificationJobs,
  getJob,
  removeJob,
  getQueueStats,
  cleanQueue,
  pauseQueue,
  resumeQueue,
  closeQueue
};
