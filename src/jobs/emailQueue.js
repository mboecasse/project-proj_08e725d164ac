// File: src/jobs/emailQueue.js
// Generated: 2025-10-08 13:16:50 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_0hh0l05ld4o9


const Queue = require('bull');


const emailService = require('../services/emailService');


const logger = require('../utils/logger');


const redisClient = require('../config/redis');

/**
 * Email Queue Configuration
 * Processes email sending jobs asynchronously
 */


const emailQueue = new Queue('email', {
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
    removeOnComplete: 100,
    removeOnFail: 50
  }
});

/**
 * Process email jobs
 */
emailQueue.process(async (job) => {
  const { to, subject, template, context, attachments } = job.data;

  try {
    logger.info('Processing email job', {
      jobId: job.id,
      to,
      subject,
      template,
      attempt: job.attemptsMade + 1
    });

    // Send email using email service
    const result = await emailService.sendEmail({
      to,
      subject,
      template,
      context,
      attachments
    });

    logger.info('Email sent successfully', {
      jobId: job.id,
      to,
      subject,
      messageId: result.messageId
    });

    return {
      success: true,
      messageId: result.messageId,
      to,
      subject
    };
  } catch (error) {
    logger.error('Failed to send email', {
      jobId: job.id,
      to,
      subject,
      attempt: job.attemptsMade + 1,
      error: error.message,
      stack: error.stack
    });

    // Throw error to trigger retry
    throw error;
  }
});

/**
 * Queue event handlers
 */

// Job completed successfully
emailQueue.on('completed', (job, result) => {
  logger.info('Email job completed', {
    jobId: job.id,
    to: job.data.to,
    subject: job.data.subject,
    result
  });
});

// Job failed after all retries
emailQueue.on('failed', (job, error) => {
  logger.error('Email job failed permanently', {
    jobId: job.id,
    to: job.data.to,
    subject: job.data.subject,
    attempts: job.attemptsMade,
    error: error.message
  });
});

// Job is waiting to be processed
emailQueue.on('waiting', (jobId) => {
  logger.debug('Email job waiting', { jobId });
});

// Job started processing
emailQueue.on('active', (job) => {
  logger.debug('Email job active', {
    jobId: job.id,
    to: job.data.to,
    subject: job.data.subject
  });
});

// Job stalled (worker crashed or took too long)
emailQueue.on('stalled', (job) => {
  logger.warn('Email job stalled', {
    jobId: job.id,
    to: job.data.to,
    subject: job.data.subject
  });
});

// Queue error
emailQueue.on('error', (error) => {
  logger.error('Email queue error', {
    error: error.message,
    stack: error.stack
  });
});

/**
 * Add email to queue
 * @param {Object} emailData - Email data
 * @param {string} emailData.to - Recipient email
 * @param {string} emailData.subject - Email subject
 * @param {string} emailData.template - Template name
 * @param {Object} emailData.context - Template context data
 * @param {Array} emailData.attachments - Email attachments (optional)
 * @param {Object} options - Job options (optional)
 * @returns {Promise<Object>} Job object
 */


const addEmailJob = async (emailData, options = {}) => {
  try {
    const { to, subject, template, context, attachments } = emailData;

    // Validate required fields
    if (!to || !subject || !template) {
      throw new Error('Missing required email fields: to, subject, template');
    }

    // Add job to queue
    const job = await emailQueue.add(
      {
        to,
        subject,
        template,
        context: context || {},
        attachments: attachments || []
      },
      {
        priority: options.priority || 10,
        delay: options.delay || 0,
        attempts: options.attempts || 3,
        ...options
      }
    );

    logger.info('Email job added to queue', {
      jobId: job.id,
      to,
      subject,
      template
    });

    return job;
  } catch (error) {
    logger.error('Failed to add email job to queue', {
      emailData,
      error: error.message
    });
    throw error;
  }
};

/**
 * Add bulk emails to queue
 * @param {Array<Object>} emailsData - Array of email data objects
 * @param {Object} options - Job options (optional)
 * @returns {Promise<Array>} Array of job objects
 */


const addBulkEmailJobs = async (emailsData, options = {}) => {
  try {
    if (!Array.isArray(emailsData) || emailsData.length === 0) {
      throw new Error('emailsData must be a non-empty array');
    }

    const jobs = emailsData.map((emailData) => ({
      data: {
        to: emailData.to,
        subject: emailData.subject,
        template: emailData.template,
        context: emailData.context || {},
        attachments: emailData.attachments || []
      },
      opts: {
        priority: options.priority || 10,
        delay: options.delay || 0,
        attempts: options.attempts || 3,
        ...options
      }
    }));

    const addedJobs = await emailQueue.addBulk(jobs);

    logger.info('Bulk email jobs added to queue', {
      count: addedJobs.length
    });

    return addedJobs;
  } catch (error) {
    logger.error('Failed to add bulk email jobs to queue', {
      count: emailsData?.length,
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
      emailQueue.getWaitingCount(),
      emailQueue.getActiveCount(),
      emailQueue.getCompletedCount(),
      emailQueue.getFailedCount(),
      emailQueue.getDelayedCount()
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
    logger.error('Failed to get queue stats', { error: error.message });
    throw error;
  }
};

/**
 * Clean old jobs from queue
 * @param {number} grace - Grace period in milliseconds (default: 24 hours)
 * @returns {Promise<void>}
 */


const cleanQueue = async (grace = 24 * 60 * 60 * 1000) => {
  try {
    await emailQueue.clean(grace, 'completed');
    await emailQueue.clean(grace, 'failed');

    logger.info('Email queue cleaned', { grace });
  } catch (error) {
    logger.error('Failed to clean email queue', { error: error.message });
    throw error;
  }
};

/**
 * Pause queue processing
 * @returns {Promise<void>}
 */


const pauseQueue = async () => {
  try {
    await emailQueue.pause();
    logger.info('Email queue paused');
  } catch (error) {
    logger.error('Failed to pause email queue', { error: error.message });
    throw error;
  }
};

/**
 * Resume queue processing
 * @returns {Promise<void>}
 */


const resumeQueue = async () => {
  try {
    await emailQueue.resume();
    logger.info('Email queue resumed');
  } catch (error) {
    logger.error('Failed to resume email queue', { error: error.message });
    throw error;
  }
};

/**
 * Close queue connection
 * @returns {Promise<void>}
 */


const closeQueue = async () => {
  try {
    await emailQueue.close();
    logger.info('Email queue closed');
  } catch (error) {
    logger.error('Failed to close email queue', { error: error.message });
    throw error;
  }
};

/**
 * Graceful shutdown
 */
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing email queue gracefully');
  await closeQueue();
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing email queue gracefully');
  await closeQueue();
});

module.exports = {
  emailQueue,
  addEmailJob,
  addBulkEmailJobs,
  getQueueStats,
  cleanQueue,
  pauseQueue,
  resumeQueue,
  closeQueue
};
