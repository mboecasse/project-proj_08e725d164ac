// File: src/jobs/cleanupJob.js
// Generated: 2025-10-08 13:15:40 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_2qaof5xi9abt


const Activity = require('../models/Activity');


const Attachment = require('../models/Attachment');


const cron = require('node-cron');


const logger = require('../utils/logger');


const mongoose = require('mongoose');

const { s3Client, deleteFromS3 } = require('../config/s3');

/**
 * Cleanup old activity logs
 * Removes activity logs older than specified retention period
 */
async function cleanupOldActivities() {
  try {
    const retentionDays = parseInt(process.env.ACTIVITY_RETENTION_DAYS || '90', 10);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await Activity.deleteMany({
      createdAt: { $lt: cutoffDate }
    });

    logger.info('Cleaned up old activity logs', {
      deletedCount: result.deletedCount,
      retentionDays,
      cutoffDate: cutoffDate.toISOString()
    });

    return result.deletedCount;
  } catch (error) {
    logger.error('Failed to cleanup old activities', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Cleanup orphaned attachments
 * Removes attachment records and S3 files that are no longer referenced
 */
async function cleanupOrphanedAttachments() {
  try {
    // Find attachments with no associated task (orphaned)
    const orphanedAttachments = await Attachment.find({
      task: { $exists: false }
    }).limit(100); // Process in batches

    let deletedCount = 0;
    let s3DeletedCount = 0;

    for (const attachment of orphanedAttachments) {
      try {
        // Delete from S3 if key exists
        if (attachment.key) {
          await deleteFromS3(attachment.key);
          s3DeletedCount++;
          logger.debug('Deleted orphaned file from S3', {
            attachmentId: attachment._id,
            key: attachment.key
          });
        }

        // Delete attachment record
        await Attachment.findByIdAndDelete(attachment._id);
        deletedCount++;
      } catch (error) {
        logger.error('Failed to delete orphaned attachment', {
          attachmentId: attachment._id,
          error: error.message
        });
        // Continue with next attachment
      }
    }

    logger.info('Cleaned up orphaned attachments', {
      deletedCount,
      s3DeletedCount
    });

    return deletedCount;
  } catch (error) {
    logger.error('Failed to cleanup orphaned attachments', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Cleanup old soft-deleted records
 * Permanently removes records that were soft-deleted beyond retention period
 */
async function cleanupSoftDeletedRecords() {
  try {
    const retentionDays = parseInt(process.env.SOFT_DELETE_RETENTION_DAYS || '30', 10);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    let totalDeleted = 0;

    // Get all models that support soft delete
    const models = ['Task', 'Project', 'Team'];

    for (const modelName of models) {
      try {
        const Model = mongoose.model(modelName);

        // Check if model has deletedAt field
        if (Model.schema.path('deletedAt')) {
          const result = await Model.deleteMany({
            deletedAt: { $lt: cutoffDate, $ne: null }
          });

          totalDeleted += result.deletedCount;

          logger.debug(`Cleaned up soft-deleted ${modelName} records`, {
            deletedCount: result.deletedCount
          });
        }
      } catch (error) {
        logger.error(`Failed to cleanup soft-deleted ${modelName} records`, {
          error: error.message
        });
        // Continue with next model
      }
    }

    logger.info('Cleaned up soft-deleted records', {
      totalDeleted,
      retentionDays,
      cutoffDate: cutoffDate.toISOString()
    });

    return totalDeleted;
  } catch (error) {
    logger.error('Failed to cleanup soft-deleted records', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Cleanup expired sessions
 * Removes expired session tokens from database
 */
async function cleanupExpiredSessions() {
  try {
    // Check if Session model exists
    let Session;
    try {
      Session = mongoose.model('Session');
    } catch (error) {
      logger.debug('Session model not found, skipping session cleanup');
      return 0;
    }

    const result = await Session.deleteMany({
      expiresAt: { $lt: new Date() }
    });

    logger.info('Cleaned up expired sessions', {
      deletedCount: result.deletedCount
    });

    return result.deletedCount;
  } catch (error) {
    logger.error('Failed to cleanup expired sessions', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Run all cleanup tasks
 */
async function runCleanupTasks() {
  const startTime = Date.now();

  logger.info('Starting cleanup job');

  try {
    const results = {
      activities: 0,
      attachments: 0,
      softDeleted: 0,
      sessions: 0
    };

    // Run cleanup tasks in parallel
    const [activities, attachments, softDeleted, sessions] = await Promise.allSettled([
      cleanupOldActivities(),
      cleanupOrphanedAttachments(),
      cleanupSoftDeletedRecords(),
      cleanupExpiredSessions()
    ]);

    // Process results
    if (activities.status === 'fulfilled') {
      results.activities = activities.value;
    } else {
      logger.error('Activity cleanup failed', { error: activities.reason });
    }

    if (attachments.status === 'fulfilled') {
      results.attachments = attachments.value;
    } else {
      logger.error('Attachment cleanup failed', { error: attachments.reason });
    }

    if (softDeleted.status === 'fulfilled') {
      results.softDeleted = softDeleted.value;
    } else {
      logger.error('Soft-deleted records cleanup failed', { error: softDeleted.reason });
    }

    if (sessions.status === 'fulfilled') {
      results.sessions = sessions.value;
    } else {
      logger.error('Session cleanup failed', { error: sessions.reason });
    }

    const duration = Date.now() - startTime;

    logger.info('Cleanup job completed', {
      duration: `${duration}ms`,
      results
    });

    return results;
  } catch (error) {
    logger.error('Cleanup job failed', {
      error: error.message,
      stack: error.stack,
      duration: `${Date.now() - startTime}ms`
    });
    throw error;
  }
}

/**
 * Initialize cleanup job scheduler
 */


function initCleanupJob() {
  // Run daily at 2:00 AM
  const schedule = process.env.CLEANUP_JOB_SCHEDULE || '0 2 * * *';

  logger.info('Initializing cleanup job', { schedule });

  // Schedule the job
  cron.schedule(schedule, async () => {
    try {
      await runCleanupTasks();
    } catch (error) {
      logger.error('Scheduled cleanup job failed', {
        error: error.message
      });
    }
  });

  logger.info('Cleanup job scheduled successfully', { schedule });

  // Run immediately on startup if enabled
  if (process.env.RUN_CLEANUP_ON_STARTUP === 'true') {
    logger.info('Running cleanup job on startup');
    setTimeout(async () => {
      try {
        await runCleanupTasks();
      } catch (error) {
        logger.error('Startup cleanup job failed', {
          error: error.message
        });
      }
    }, 5000); // Wait 5 seconds after startup
  }
}

module.exports = {
  initCleanupJob,
  runCleanupTasks,
  cleanupOldActivities,
  cleanupOrphanedAttachments,
  cleanupSoftDeletedRecords,
  cleanupExpiredSessions
};
