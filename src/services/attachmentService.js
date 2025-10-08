// File: src/services/attachmentService.js
// Generated: 2025-10-08 13:15:51 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_28zq729gi1ij


const Attachment = require('../models/Attachment');


const crypto = require('crypto');


const logger = require('../utils/logger');


const path = require('path');

const s3Client = require('../config/s3');

const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');

const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const { processFile, validateFile, generateThumbnail } = require('../utils/fileProcessor');

/**
 * Upload file to S3 and create attachment record
 * @param {Object} file - Multer file object
 * @param {String} uploadedBy - User ID who uploaded the file
 * @param {String} entityType - Type of entity (task, comment, project)
 * @param {String} entityId - ID of the entity
 * @returns {Promise<Object>} Created attachment document
 */
exports.uploadFile = async (file, uploadedBy, entityType, entityId) => {
  try {
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const uniqueFilename = `${crypto.randomBytes(16).toString('hex')}${fileExtension}`;
    const s3Key = `${entityType}/${entityId}/${uniqueFilename}`;

    // Process file (virus scan, metadata extraction, etc.)
    const processedFile = await processFile(file);

    // Upload to S3
    const uploadParams = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: s3Key,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        originalName: file.originalname,
        uploadedBy: uploadedBy.toString(),
        entityType,
        entityId: entityId.toString()
      }
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    logger.info('File uploaded to S3', {
      key: s3Key,
      size: file.size,
      uploadedBy,
      entityType,
      entityId
    });

    // Generate thumbnail for images
    let thumbnailUrl = null;
    if (file.mimetype.startsWith('image/')) {
      try {
        const thumbnailKey = `thumbnails/${s3Key}`;
        const thumbnail = await generateThumbnail(file.buffer, file.mimetype);

        const thumbnailParams = {
          Bucket: process.env.AWS_S3_BUCKET,
          Key: thumbnailKey,
          Body: thumbnail,
          ContentType: file.mimetype
        };

        await s3Client.send(new PutObjectCommand(thumbnailParams));

        const thumbnailCommand = new GetObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: thumbnailKey
        });
        thumbnailUrl = await getSignedUrl(s3Client, thumbnailCommand, { expiresIn: 604800 }); // 7 days

        logger.info('Thumbnail generated', { thumbnailKey });
      } catch (thumbnailError) {
        logger.warn('Failed to generate thumbnail', {
          error: thumbnailError.message,
          key: s3Key
        });
      }
    }

    // Create attachment record
    const attachment = await Attachment.create({
      filename: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      s3Key,
      s3Bucket: process.env.AWS_S3_BUCKET,
      uploadedBy,
      entityType,
      entityId,
      thumbnailUrl,
      metadata: processedFile.metadata || {}
    });

    logger.info('Attachment record created', {
      attachmentId: attachment._id,
      filename: file.originalname
    });

    return attachment;
  } catch (error) {
    logger.error('Failed to upload file', {
      error: error.message,
      filename: file?.originalname,
      uploadedBy,
      entityType,
      entityId
    });
    throw error;
  }
};

/**
 * Get attachment by ID
 * @param {String} attachmentId - Attachment ID
 * @param {String} userId - User ID requesting the attachment
 * @returns {Promise<Object>} Attachment document
 */
exports.getAttachment = async (attachmentId, userId) => {
  try {
    const attachment = await Attachment.findById(attachmentId)
      .populate('uploadedBy', 'name email')
      .lean();

    if (!attachment) {
      throw new Error('Attachment not found');
    }

    logger.info('Fetched attachment', {
      attachmentId,
      userId
    });

    return attachment;
  } catch (error) {
    logger.error('Failed to fetch attachment', {
      error: error.message,
      attachmentId,
      userId
    });
    throw error;
  }
};

/**
 * Get attachments for an entity
 * @param {String} entityType - Type of entity
 * @param {String} entityId - ID of the entity
 * @returns {Promise<Array>} Array of attachment documents
 */
exports.getAttachmentsByEntity = async (entityType, entityId) => {
  try {
    const attachments = await Attachment.find({
      entityType,
      entityId,
      isDeleted: false
    })
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    logger.info('Fetched attachments by entity', {
      entityType,
      entityId,
      count: attachments.length
    });

    return attachments;
  } catch (error) {
    logger.error('Failed to fetch attachments by entity', {
      error: error.message,
      entityType,
      entityId
    });
    throw error;
  }
};

/**
 * Generate presigned URL for file download
 * @param {String} attachmentId - Attachment ID
 * @param {String} userId - User ID requesting the download
 * @param {Number} expiresIn - URL expiration time in seconds (default: 3600)
 * @returns {Promise<Object>} Object with download URL and attachment info
 */
exports.generateDownloadUrl = async (attachmentId, userId, expiresIn = 3600) => {
  try {
    const attachment = await Attachment.findById(attachmentId);

    if (!attachment) {
      throw new Error('Attachment not found');
    }

    if (attachment.isDeleted) {
      throw new Error('Attachment has been deleted');
    }

    // Verify file exists in S3
    const headParams = {
      Bucket: attachment.s3Bucket,
      Key: attachment.s3Key
    };

    await s3Client.send(new HeadObjectCommand(headParams));

    // Generate presigned URL
    const getParams = {
      Bucket: attachment.s3Bucket,
      Key: attachment.s3Key,
      ResponseContentDisposition: `attachment; filename="${attachment.filename}"`
    };

    const command = new GetObjectCommand(getParams);
    const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn });

    // Update download count
    attachment.downloadCount += 1;
    attachment.lastDownloadedAt = new Date();
    await attachment.save();

    logger.info('Generated download URL', {
      attachmentId,
      userId,
      expiresIn
    });

    return {
      downloadUrl,
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      size: attachment.size,
      expiresIn
    };
  } catch (error) {
    logger.error('Failed to generate download URL', {
      error: error.message,
      attachmentId,
      userId
    });
    throw error;
  }
};

/**
 * Delete attachment (soft delete)
 * @param {String} attachmentId - Attachment ID
 * @param {String} userId - User ID performing the deletion
 * @returns {Promise<Object>} Deleted attachment document
 */
exports.deleteAttachment = async (attachmentId, userId) => {
  try {
    const attachment = await Attachment.findById(attachmentId);

    if (!attachment) {
      throw new Error('Attachment not found');
    }

    if (attachment.isDeleted) {
      throw new Error('Attachment already deleted');
    }

    // Soft delete
    attachment.isDeleted = true;
    attachment.deletedAt = new Date();
    attachment.deletedBy = userId;
    await attachment.save();

    logger.info('Attachment soft deleted', {
      attachmentId,
      userId
    });

    return attachment;
  } catch (error) {
    logger.error('Failed to delete attachment', {
      error: error.message,
      attachmentId,
      userId
    });
    throw error;
  }
};

/**
 * Permanently delete attachment from S3 and database
 * @param {String} attachmentId - Attachment ID
 * @param {String} userId - User ID performing the deletion
 * @returns {Promise<void>}
 */
exports.permanentlyDeleteAttachment = async (attachmentId, userId) => {
  try {
    const attachment = await Attachment.findById(attachmentId);

    if (!attachment) {
      throw new Error('Attachment not found');
    }

    // Delete from S3
    const deleteParams = {
      Bucket: attachment.s3Bucket,
      Key: attachment.s3Key
    };

    await s3Client.send(new DeleteObjectCommand(deleteParams));

    // Delete thumbnail if exists
    if (attachment.thumbnailUrl) {
      const thumbnailKey = `thumbnails/${attachment.s3Key}`;
      const thumbnailParams = {
        Bucket: attachment.s3Bucket,
        Key: thumbnailKey
      };

      try {
        await s3Client.send(new DeleteObjectCommand(thumbnailParams));
      } catch (thumbnailError) {
        logger.warn('Failed to delete thumbnail', {
          error: thumbnailError.message,
          thumbnailKey
        });
      }
    }

    // Delete from database
    await Attachment.findByIdAndDelete(attachmentId);

    logger.info('Attachment permanently deleted', {
      attachmentId,
      userId,
      s3Key: attachment.s3Key
    });
  } catch (error) {
    logger.error('Failed to permanently delete attachment', {
      error: error.message,
      attachmentId,
      userId
    });
    throw error;
  }
};

/**
 * Get total storage used by user
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Storage statistics
 */
exports.getUserStorageStats = async (userId) => {
  try {
    const attachments = await Attachment.find({
      uploadedBy: userId,
      isDeleted: false
    });

    const totalSize = attachments.reduce((sum, att) => sum + att.size, 0);
    const totalCount = attachments.length;

    const stats = {
      totalSize,
      totalCount,
      totalSizeFormatted: formatBytes(totalSize),
      byMimeType: {}
    };

    // Group by mime type
    attachments.forEach(att => {
      const mimeCategory = att.mimeType.split('/')[0];
      if (!stats.byMimeType[mimeCategory]) {
        stats.byMimeType[mimeCategory] = {
          count: 0,
          size: 0
        };
      }
      stats.byMimeType[mimeCategory].count += 1;
      stats.byMimeType[mimeCategory].size += att.size;
    });

    logger.info('Fetched user storage stats', {
      userId,
      totalSize,
      totalCount
    });

    return stats;
  } catch (error) {
    logger.error('Failed to fetch user storage stats', {
      error: error.message,
      userId
    });
    throw error;
  }
};

/**
 * Get storage statistics for entity
 * @param {String} entityType - Type of entity
 * @param {String} entityId - ID of the entity
 * @returns {Promise<Object>} Storage statistics
 */
exports.getEntityStorageStats = async (entityType, entityId) => {
  try {
    const attachments = await Attachment.find({
      entityType,
      entityId,
      isDeleted: false
    });

    const totalSize = attachments.reduce((sum, att) => sum + att.size, 0);
    const totalCount = attachments.length;

    const stats = {
      totalSize,
      totalCount,
      totalSizeFormatted: formatBytes(totalSize)
    };

    logger.info('Fetched entity storage stats', {
      entityType,
      entityId,
      totalSize,
      totalCount
    });

    return stats;
  } catch (error) {
    logger.error('Failed to fetch entity storage stats', {
      error: error.message,
      entityType,
      entityId
    });
    throw error;
  }
};

/**
 * Clean up deleted attachments older than specified days
 * @param {Number} daysOld - Number of days old
 * @returns {Promise<Object>} Cleanup statistics
 */
exports.cleanupDeletedAttachments = async (daysOld = 30) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const attachments = await Attachment.find({
      isDeleted: true,
      deletedAt: { $lt: cutoffDate }
    });

    let deletedCount = 0;
    let failedCount = 0;
    let freedSpace = 0;

    for (const attachment of attachments) {
      try {
        // Delete from S3
        const deleteParams = {
          Bucket: attachment.s3Bucket,
          Key: attachment.s3Key
        };

        await s3Client.send(new DeleteObjectCommand(deleteParams));

        // Delete thumbnail if exists
        if (attachment.thumbnailUrl) {
          const thumbnailKey = `thumbnails/${attachment.s3Key}`;
          const thumbnailParams = {
            Bucket: attachment.s3Bucket,
            Key: thumbnailKey
          };

          try {
            await s3Client.send(new DeleteObjectCommand(thumbnailParams));
          } catch (thumbnailError) {
            logger.warn('Failed to delete thumbnail during cleanup', {
              error: thumbnailError.message,
              thumbnailKey
            });
          }
        }

        // Delete from database
        await Attachment.findByIdAndDelete(attachment._id);

        deletedCount += 1;
        freedSpace += attachment.size;
      } catch (deleteError) {
        logger.error('Failed to delete attachment during cleanup', {
          error: deleteError.message,
          attachmentId: attachment._id
        });
        failedCount += 1;
      }
    }

    const stats = {
      deletedCount,
      failedCount,
      freedSpace,
      freedSpaceFormatted: formatBytes(freedSpace)
    };

    logger.info('Cleanup completed', stats);

    return stats;
  } catch (error) {
    logger.error('Failed to cleanup deleted attachments', {
      error: error.message,
      daysOld
    });
    throw error;
  }
};

/**
 * Format bytes to human-readable string
 * @param {Number} bytes - Number of bytes
 * @returns {String} Formatted string
 */


function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
