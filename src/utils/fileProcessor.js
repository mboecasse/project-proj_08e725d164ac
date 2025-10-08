// File: src/utils/fileProcessor.js
// Generated: 2025-10-08 13:15:03 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_symgzyki49nj


const fs = require('fs').promises;


const logger = require('./logger');


const path = require('path');


const sharp = require('sharp');

/**
 * Supported image MIME types
 */


const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml'
];

/**
 * Supported document MIME types
 */


const SUPPORTED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv'
];

/**
 * Maximum file sizes (in bytes)
 */


const MAX_FILE_SIZES = {
  image: 10 * 1024 * 1024, // 10MB
  document: 50 * 1024 * 1024, // 50MB
  default: 25 * 1024 * 1024 // 25MB
};

/**
 * Thumbnail dimensions
 */


const THUMBNAIL_SIZES = {
  small: { width: 150, height: 150 },
  medium: { width: 300, height: 300 },
  large: { width: 600, height: 600 }
};

/**
 * Validate file type
 * @param {string} mimetype - File MIME type
 * @param {string} category - File category (image, document, or all)
 * @returns {boolean} - Whether file type is valid
 */


const validateFileType = (mimetype, category = 'all') => {
  try {
    if (category === 'image') {
      return SUPPORTED_IMAGE_TYPES.includes(mimetype);
    }

    if (category === 'document') {
      return SUPPORTED_DOCUMENT_TYPES.includes(mimetype);
    }

    return [...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_DOCUMENT_TYPES].includes(mimetype);
  } catch (error) {
    logger.error('Error validating file type', { mimetype, category, error: error.message });
    return false;
  }
};

/**
 * Validate file size
 * @param {number} size - File size in bytes
 * @param {string} category - File category (image, document, or default)
 * @returns {boolean} - Whether file size is valid
 */


const validateFileSize = (size, category = 'default') => {
  try {
    const maxSize = MAX_FILE_SIZES[category] || MAX_FILE_SIZES.default;
    return size <= maxSize;
  } catch (error) {
    logger.error('Error validating file size', { size, category, error: error.message });
    return false;
  }
};

/**
 * Validate file
 * @param {Object} file - File object from multer
 * @param {string} category - File category (image, document, or all)
 * @returns {Object} - Validation result { valid: boolean, error: string }
 */


const validateFile = (file, category = 'all') => {
  try {
    if (!file) {
      return { valid: false, error: 'No file provided' };
    }

    // Validate file type
    if (!validateFileType(file.mimetype, category)) {
      return {
        valid: false,
        error: `Invalid file type. Supported types: ${category === 'image' ? 'images' : category === 'document' ? 'documents' : 'images and documents'}`
      };
    }

    // Validate file size
    const sizeCategory = SUPPORTED_IMAGE_TYPES.includes(file.mimetype) ? 'image' : 'document';
    if (!validateFileSize(file.size, sizeCategory)) {
      const maxSize = MAX_FILE_SIZES[sizeCategory];
      return {
        valid: false,
        error: `File too large. Maximum size: ${Math.round(maxSize / 1024 / 1024)}MB`
      };
    }

    return { valid: true };
  } catch (error) {
    logger.error('Error validating file', { error: error.message });
    return { valid: false, error: 'File validation failed' };
  }
};

/**
 * Generate thumbnail for image
 * @param {string} inputPath - Path to input image
 * @param {string} outputPath - Path to save thumbnail
 * @param {string} size - Thumbnail size (small, medium, large)
 * @returns {Promise<string>} - Path to generated thumbnail
 */


const generateThumbnail = async (inputPath, outputPath, size = 'medium') => {
  try {
    const dimensions = THUMBNAIL_SIZES[size] || THUMBNAIL_SIZES.medium;

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    // Generate thumbnail
    await sharp(inputPath)
      .resize(dimensions.width, dimensions.height, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80 })
      .toFile(outputPath);

    logger.info('Generated thumbnail', { inputPath, outputPath, size });

    return outputPath;
  } catch (error) {
    logger.error('Failed to generate thumbnail', {
      inputPath,
      outputPath,
      size,
      error: error.message
    });
    throw new Error('Thumbnail generation failed');
  }
};

/**
 * Generate multiple thumbnail sizes
 * @param {string} inputPath - Path to input image
 * @param {string} baseOutputPath - Base path for thumbnails (without size suffix)
 * @returns {Promise<Object>} - Object with paths to all generated thumbnails
 */


const generateThumbnails = async (inputPath, baseOutputPath) => {
  try {
    const ext = path.extname(baseOutputPath);
    const baseName = baseOutputPath.slice(0, -ext.length);

    const thumbnails = {};

    for (const [sizeName, dimensions] of Object.entries(THUMBNAIL_SIZES)) {
      const outputPath = `${baseName}_${sizeName}${ext}`;
      await generateThumbnail(inputPath, outputPath, sizeName);
      thumbnails[sizeName] = outputPath;
    }

    logger.info('Generated all thumbnails', { inputPath, count: Object.keys(thumbnails).length });

    return thumbnails;
  } catch (error) {
    logger.error('Failed to generate thumbnails', {
      inputPath,
      baseOutputPath,
      error: error.message
    });
    throw new Error('Thumbnails generation failed');
  }
};

/**
 * Optimize image
 * @param {string} inputPath - Path to input image
 * @param {string} outputPath - Path to save optimized image
 * @param {Object} options - Optimization options
 * @returns {Promise<string>} - Path to optimized image
 */


const optimizeImage = async (inputPath, outputPath, options = {}) => {
  try {
    const {
      quality = 85,
      maxWidth = 2000,
      maxHeight = 2000,
      format = 'jpeg'
    } = options;

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    let pipeline = sharp(inputPath);

    // Get image metadata
    const metadata = await pipeline.metadata();

    // Resize if needed
    if (metadata.width > maxWidth || metadata.height > maxHeight) {
      pipeline = pipeline.resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    // Apply format-specific optimization
    if (format === 'jpeg' || format === 'jpg') {
      pipeline = pipeline.jpeg({ quality, progressive: true });
    } else if (format === 'png') {
      pipeline = pipeline.png({ quality, compressionLevel: 9 });
    } else if (format === 'webp') {
      pipeline = pipeline.webp({ quality });
    }

    await pipeline.toFile(outputPath);

    logger.info('Optimized image', { inputPath, outputPath, format, quality });

    return outputPath;
  } catch (error) {
    logger.error('Failed to optimize image', {
      inputPath,
      outputPath,
      error: error.message
    });
    throw new Error('Image optimization failed');
  }
};

/**
 * Get image metadata
 * @param {string} filePath - Path to image file
 * @returns {Promise<Object>} - Image metadata
 */


const getImageMetadata = async (filePath) => {
  try {
    const metadata = await sharp(filePath).metadata();

    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: metadata.size,
      hasAlpha: metadata.hasAlpha,
      orientation: metadata.orientation
    };
  } catch (error) {
    logger.error('Failed to get image metadata', { filePath, error: error.message });
    throw new Error('Failed to read image metadata');
  }
};

/**
 * Delete file
 * @param {string} filePath - Path to file to delete
 * @returns {Promise<boolean>} - Whether deletion was successful
 */


const deleteFile = async (filePath) => {
  try {
    await fs.unlink(filePath);
    logger.info('Deleted file', { filePath });
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      logger.warn('File not found for deletion', { filePath });
      return true;
    }
    logger.error('Failed to delete file', { filePath, error: error.message });
    return false;
  }
};

/**
 * Delete multiple files
 * @param {Array<string>} filePaths - Array of file paths to delete
 * @returns {Promise<Object>} - Result with success count and errors
 */


const deleteFiles = async (filePaths) => {
  try {
    const results = await Promise.allSettled(
      filePaths.map(filePath => deleteFile(filePath))
    );

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
    const errors = results
      .filter(r => r.status === 'rejected')
      .map((r, i) => ({ path: filePaths[i], error: r.reason }));

    logger.info('Deleted multiple files', {
      total: filePaths.length,
      success: successCount,
      failed: errors.length
    });

    return { successCount, errors };
  } catch (error) {
    logger.error('Failed to delete files', { error: error.message });
    throw new Error('Bulk file deletion failed');
  }
};

/**
 * Check if file exists
 * @param {string} filePath - Path to file
 * @returns {Promise<boolean>} - Whether file exists
 */


const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Get file extension from filename
 * @param {string} filename - Filename
 * @returns {string} - File extension (lowercase, without dot)
 */


const getFileExtension = (filename) => {
  return path.extname(filename).toLowerCase().slice(1);
};

/**
 * Generate safe filename
 * @param {string} originalName - Original filename
 * @returns {string} - Safe filename with timestamp
 */


const generateSafeFilename = (originalName) => {
  const ext = path.extname(originalName);
  const baseName = path.basename(originalName, ext);
  const safeName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 50);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);

  return `${safeName}_${timestamp}_${random}${ext}`;
};

module.exports = {
  validateFile,
  validateFileType,
  validateFileSize,
  generateThumbnail,
  generateThumbnails,
  optimizeImage,
  getImageMetadata,
  deleteFile,
  deleteFiles,
  fileExists,
  getFileExtension,
  generateSafeFilename,
  SUPPORTED_IMAGE_TYPES,
  SUPPORTED_DOCUMENT_TYPES,
  MAX_FILE_SIZES,
  THUMBNAIL_SIZES
};
