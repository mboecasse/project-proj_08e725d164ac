// File: src/middleware/upload.js
// Generated: 2025-10-08 13:14:53 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_mm3faat2iqfx


const fs = require('fs');


const logger = require('../utils/logger');


const multer = require('multer');


const path = require('path');

// Ensure upload directories exist


const uploadDir = path.join(__dirname, '../../uploads');


const tempDir = path.join(uploadDir, 'temp');


const attachmentsDir = path.join(uploadDir, 'attachments');


const avatarsDir = path.join(uploadDir, 'avatars');

[uploadDir, tempDir, attachmentsDir, avatarsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    logger.info('Created upload directory', { directory: dir });
  }
});

// File filter function


const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedMimeTypes = [
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    // Archives
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    logger.warn('File upload rejected - invalid file type', {
      filename: file.originalname,
      mimetype: file.mimetype
    });
    cb(new Error(`Invalid file type. Allowed types: images, PDFs, documents, and archives`), false);
  }
};

// Storage configuration for attachments


const attachmentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, attachmentsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${sanitizedName}-${uniqueSuffix}${ext}`);
  }
});

// Storage configuration for avatars


const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${uniqueSuffix}${ext}`);
  }
});

// Avatar file filter (images only)


const avatarFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    logger.warn('Avatar upload rejected - invalid file type', {
      filename: file.originalname,
      mimetype: file.mimetype
    });
    cb(new Error('Invalid file type. Only images are allowed for avatars'), false);
  }
};

// File size limits (in bytes)


const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB for general attachments


const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB for avatars

// Multer upload configurations


const uploadAttachment = multer({
  storage: attachmentStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 5 // Maximum 5 files per request
  }
});


const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: avatarFileFilter,
  limits: {
    fileSize: MAX_AVATAR_SIZE,
    files: 1
  }
});

// Memory storage for temporary uploads


const uploadMemory = multer({
  storage: multer.memoryStorage(),
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE
  }
});

/**
 * Middleware to handle single attachment upload
 */


const singleAttachment = (fieldName = 'file') => {
  return (req, res, next) => {
    const upload = uploadAttachment.single(fieldName);

    upload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        logger.error('Multer error during file upload', {
          error: err.message,
          code: err.code,
          field: err.field
        });

        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`
          });
        }

        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            success: false,
            error: `Unexpected field. Expected field name: ${fieldName}`
          });
        }

        return res.status(400).json({
          success: false,
          error: `File upload error: ${err.message}`
        });
      } else if (err) {
        logger.error('Error during file upload', { error: err.message });
        return res.status(400).json({
          success: false,
          error: err.message
        });
      }

      if (req.file) {
        logger.info('File uploaded successfully', {
          filename: req.file.filename,
          originalname: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype
        });
      }

      next();
    });
  };
};

/**
 * Middleware to handle multiple attachment uploads
 */


const multipleAttachments = (fieldName = 'files', maxCount = 5) => {
  return (req, res, next) => {
    const upload = uploadAttachment.array(fieldName, maxCount);

    upload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        logger.error('Multer error during multiple file upload', {
          error: err.message,
          code: err.code,
          field: err.field
        });

        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`
          });
        }

        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            error: `Too many files. Maximum is ${maxCount} files`
          });
        }

        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            success: false,
            error: `Unexpected field. Expected field name: ${fieldName}`
          });
        }

        return res.status(400).json({
          success: false,
          error: `File upload error: ${err.message}`
        });
      } else if (err) {
        logger.error('Error during multiple file upload', { error: err.message });
        return res.status(400).json({
          success: false,
          error: err.message
        });
      }

      if (req.files && req.files.length > 0) {
        logger.info('Multiple files uploaded successfully', {
          count: req.files.length,
          files: req.files.map(f => ({
            filename: f.filename,
            originalname: f.originalname,
            size: f.size
          }))
        });
      }

      next();
    });
  };
};

/**
 * Middleware to handle avatar upload
 */


const avatar = (fieldName = 'avatar') => {
  return (req, res, next) => {
    const upload = uploadAvatar.single(fieldName);

    upload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        logger.error('Multer error during avatar upload', {
          error: err.message,
          code: err.code,
          field: err.field
        });

        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: `Avatar too large. Maximum size is ${MAX_AVATAR_SIZE / (1024 * 1024)}MB`
          });
        }

        return res.status(400).json({
          success: false,
          error: `Avatar upload error: ${err.message}`
        });
      } else if (err) {
        logger.error('Error during avatar upload', { error: err.message });
        return res.status(400).json({
          success: false,
          error: err.message
        });
      }

      if (req.file) {
        logger.info('Avatar uploaded successfully', {
          filename: req.file.filename,
          originalname: req.file.originalname,
          size: req.file.size
        });
      }

      next();
    });
  };
};

/**
 * Delete file from filesystem
 */


const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info('File deleted successfully', { filePath });
      return true;
    }
    return false;
  } catch (error) {
    logger.error('Failed to delete file', { filePath, error: error.message });
    return false;
  }
};

/**
 * Delete multiple files from filesystem
 */


const deleteFiles = (filePaths) => {
  const results = filePaths.map(filePath => deleteFile(filePath));
  return results.every(result => result === true);
};

module.exports = {
  singleAttachment,
  multipleAttachments,
  avatar,
  deleteFile,
  deleteFiles,
  uploadDir,
  attachmentsDir,
  avatarsDir
};
