// File: src/config/s3.js
// Generated: 2025-10-08 13:14:52 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_956skum34tr6


const AWS = require('aws-sdk');


const logger = require('../utils/logger');

/**
 * AWS S3 Configuration
 * Handles file storage operations for task attachments
 */

// Validate required environment variables


const requiredEnvVars = [
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
  'AWS_S3_BUCKET_NAME'
];


const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  logger.error('Missing required AWS S3 environment variables', {
    missing: missingEnvVars
  });
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// Create S3 instance

const s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  signatureVersion: 'v4'
});

// S3 bucket configuration

const s3Config = {
  bucket: process.env.AWS_S3_BUCKET_NAME,
  region: process.env.AWS_REGION,
  acl: process.env.AWS_S3_ACL || 'private',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ]
};

/**
 * Upload file to S3
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - Original file name
 * @param {string} mimeType - File MIME type
 * @param {string} folder - S3 folder path (e.g., 'attachments', 'avatars')
 * @returns {Promise<Object>} Upload result with key and location
 */


const uploadFile = async (fileBuffer, fileName, mimeType, folder = 'attachments') => {
  try {
    // Validate file size
    if (fileBuffer.length > s3Config.maxFileSize) {
      throw new Error(`File size exceeds maximum allowed size of ${s3Config.maxFileSize / 1024 / 1024}MB`);
    }

    // Validate MIME type
    if (!s3Config.allowedMimeTypes.includes(mimeType)) {
      throw new Error(`File type ${mimeType} is not allowed`);
    }

    // Generate unique file key
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileKey = `${folder}/${timestamp}-${sanitizedFileName}`;

    const params = {
      Bucket: s3Config.bucket,
      Key: fileKey,
      Body: fileBuffer,
      ContentType: mimeType,
      ACL: s3Config.acl,
      ServerSideEncryption: 'AES256',
      Metadata: {
        originalName: fileName,
        uploadedAt: new Date().toISOString()
      }
    };

    const result = await s3.upload(params).promise();

    logger.info('File uploaded to S3', {
      key: fileKey,
      bucket: s3Config.bucket,
      size: fileBuffer.length
    });

    return {
      key: result.Key,
      location: result.Location,
      bucket: result.Bucket,
      etag: result.ETag
    };
  } catch (error) {
    logger.error('Failed to upload file to S3', {
      error: error.message,
      fileName,
      mimeType
    });
    throw error;
  }
};

/**
 * Download file from S3
 * @param {string} fileKey - S3 file key
 * @returns {Promise<Buffer>} File buffer
 */


const downloadFile = async (fileKey) => {
  try {
    const params = {
      Bucket: s3Config.bucket,
      Key: fileKey
    };

    const result = await s3.getObject(params).promise();

    logger.info('File downloaded from S3', {
      key: fileKey,
      bucket: s3Config.bucket,
      size: result.ContentLength
    });

    return result.Body;
  } catch (error) {
    logger.error('Failed to download file from S3', {
      error: error.message,
      fileKey
    });
    throw error;
  }
};

/**
 * Delete file from S3
 * @param {string} fileKey - S3 file key
 * @returns {Promise<void>}
 */


const deleteFile = async (fileKey) => {
  try {
    const params = {
      Bucket: s3Config.bucket,
      Key: fileKey
    };

    await s3.deleteObject(params).promise();

    logger.info('File deleted from S3', {
      key: fileKey,
      bucket: s3Config.bucket
    });
  } catch (error) {
    logger.error('Failed to delete file from S3', {
      error: error.message,
      fileKey
    });
    throw error;
  }
};

/**
 * Delete multiple files from S3
 * @param {string[]} fileKeys - Array of S3 file keys
 * @returns {Promise<void>}
 */


const deleteFiles = async (fileKeys) => {
  try {
    if (!fileKeys || fileKeys.length === 0) {
      return;
    }

    const params = {
      Bucket: s3Config.bucket,
      Delete: {
        Objects: fileKeys.map(key => ({ Key: key })),
        Quiet: false
      }
    };

    const result = await s3.deleteObjects(params).promise();

    logger.info('Multiple files deleted from S3', {
      bucket: s3Config.bucket,
      count: fileKeys.length,
      deleted: result.Deleted?.length || 0
    });
  } catch (error) {
    logger.error('Failed to delete multiple files from S3', {
      error: error.message,
      fileCount: fileKeys.length
    });
    throw error;
  }
};

/**
 * Generate presigned URL for file download
 * @param {string} fileKey - S3 file key
 * @param {number} expiresIn - URL expiration time in seconds (default: 3600)
 * @returns {Promise<string>} Presigned URL
 */


const getSignedUrl = async (fileKey, expiresIn = 3600) => {
  try {
    const params = {
      Bucket: s3Config.bucket,
      Key: fileKey,
      Expires: expiresIn
    };

    const url = await s3.getSignedUrlPromise('getObject', params);

    logger.info('Generated presigned URL', {
      key: fileKey,
      expiresIn
    });

    return url;
  } catch (error) {
    logger.error('Failed to generate presigned URL', {
      error: error.message,
      fileKey
    });
    throw error;
  }
};

/**
 * Check if file exists in S3
 * @param {string} fileKey - S3 file key
 * @returns {Promise<boolean>} True if file exists
 */


const fileExists = async (fileKey) => {
  try {
    const params = {
      Bucket: s3Config.bucket,
      Key: fileKey
    };

    await s3.headObject(params).promise();
    return true;
  } catch (error) {
    if (error.code === 'NotFound') {
      return false;
    }
    logger.error('Failed to check file existence', {
      error: error.message,
      fileKey
    });
    throw error;
  }
};

/**
 * Get file metadata from S3
 * @param {string} fileKey - S3 file key
 * @returns {Promise<Object>} File metadata
 */


const getFileMetadata = async (fileKey) => {
  try {
    const params = {
      Bucket: s3Config.bucket,
      Key: fileKey
    };

    const result = await s3.headObject(params).promise();

    logger.info('Retrieved file metadata', {
      key: fileKey,
      size: result.ContentLength
    });

    return {
      contentType: result.ContentType,
      contentLength: result.ContentLength,
      lastModified: result.LastModified,
      etag: result.ETag,
      metadata: result.Metadata
    };
  } catch (error) {
    logger.error('Failed to get file metadata', {
      error: error.message,
      fileKey
    });
    throw error;
  }
};

// Log successful S3 configuration
logger.info('AWS S3 configured successfully', {
  bucket: s3Config.bucket,
  region: s3Config.region
});

module.exports = {
  s3,
  s3Config,
  uploadFile,
  downloadFile,
  deleteFile,
  deleteFiles,
  getSignedUrl,
  fileExists,
  getFileMetadata
};
