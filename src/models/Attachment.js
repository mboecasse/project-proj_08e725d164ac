// File: src/models/Attachment.js
// Generated: 2025-10-08 13:14:59 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_rw1s9upusele


const mongoose = require('mongoose');

/**
 * Attachment Schema
 * Stores metadata for files uploaded to S3
 */


const attachmentSchema = new mongoose.Schema(
  {
    // File identification
    filename: {
      type: String,
      required: [true, 'Filename is required'],
      trim: true,
      maxlength: [255, 'Filename cannot exceed 255 characters']
    },
    originalName: {
      type: String,
      required: [true, 'Original filename is required'],
      trim: true,
      maxlength: [255, 'Original filename cannot exceed 255 characters']
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
      trim: true
    },
    size: {
      type: Number,
      required: [true, 'File size is required'],
      min: [0, 'File size must be positive']
    },

    // S3 metadata
    s3Key: {
      type: String,
      required: [true, 'S3 key is required'],
      unique: true,
      trim: true
    },
    s3Bucket: {
      type: String,
      required: [true, 'S3 bucket is required'],
      trim: true
    },
    s3Region: {
      type: String,
      required: [true, 'S3 region is required'],
      trim: true
    },
    s3Url: {
      type: String,
      required: [true, 'S3 URL is required'],
      trim: true
    },
    s3ETag: {
      type: String,
      trim: true
    },

    // Reference to parent entity
    entityType: {
      type: String,
      required: [true, 'Entity type is required'],
      enum: ['task', 'comment', 'project', 'user'],
      index: true
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Entity ID is required'],
      index: true
    },

    // Upload metadata
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Uploader is required'],
      index: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
      index: true
    },

    // File status
    status: {
      type: String,
      enum: ['uploading', 'active', 'deleted', 'failed'],
      default: 'active',
      index: true
    },

    // Soft delete
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    deletedAt: {
      type: Date,
      default: null
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    // Additional metadata
    metadata: {
      width: Number,
      height: Number,
      duration: Number,
      thumbnail: String,
      description: String
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for performance
attachmentSchema.index({ entityType: 1, entityId: 1 });
attachmentSchema.index({ uploadedBy: 1, createdAt: -1 });
attachmentSchema.index({ status: 1, isDeleted: 1 });
attachmentSchema.index({ s3Key: 1 }, { unique: true });

// Virtual for file extension
attachmentSchema.virtual('extension').get(function () {
  if (!this.filename) return '';
  const parts = this.filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
});

// Virtual for human-readable file size
attachmentSchema.virtual('formattedSize').get(function () {
  if (!this.size) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = this.size;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`;
});

// Virtual for file type category
attachmentSchema.virtual('fileCategory').get(function () {
  if (!this.mimeType) return 'other';

  if (this.mimeType.startsWith('image/')) return 'image';
  if (this.mimeType.startsWith('video/')) return 'video';
  if (this.mimeType.startsWith('audio/')) return 'audio';
  if (this.mimeType.includes('pdf')) return 'pdf';
  if (this.mimeType.includes('word') || this.mimeType.includes('document')) return 'document';
  if (this.mimeType.includes('sheet') || this.mimeType.includes('excel')) return 'spreadsheet';
  if (this.mimeType.includes('presentation') || this.mimeType.includes('powerpoint')) return 'presentation';
  if (this.mimeType.includes('zip') || this.mimeType.includes('rar') || this.mimeType.includes('tar')) return 'archive';
  if (this.mimeType.includes('text/')) return 'text';

  return 'other';
});

// Method to soft delete attachment
attachmentSchema.methods.softDelete = function (userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  this.status = 'deleted';
  return this.save();
};

// Method to restore soft deleted attachment
attachmentSchema.methods.restore = function () {
  this.isDeleted = false;
  this.deletedAt = null;
  this.deletedBy = null;
  this.status = 'active';
  return this.save();
};

// Static method to find active attachments by entity
attachmentSchema.statics.findByEntity = function (entityType, entityId) {
  return this.find({
    entityType,
    entityId,
    isDeleted: false,
    status: 'active'
  }).sort({ createdAt: -1 });
};

// Static method to find attachments by uploader
attachmentSchema.statics.findByUploader = function (userId) {
  return this.find({
    uploadedBy: userId,
    isDeleted: false,
    status: 'active'
  }).sort({ createdAt: -1 });
};

// Static method to calculate total storage used by user
attachmentSchema.statics.calculateUserStorage = async function (userId) {
  const result = await this.aggregate([
    {
      $match: {
        uploadedBy: mongoose.Types.ObjectId(userId),
        isDeleted: false,
        status: 'active'
      }
    },
    {
      $group: {
        _id: null,
        totalSize: { $sum: '$size' },
        count: { $sum: 1 }
      }
    }
  ]);

  return result.length > 0 ? result[0] : { totalSize: 0, count: 0 };
};

// Static method to calculate total storage used by entity
attachmentSchema.statics.calculateEntityStorage = async function (entityType, entityId) {
  const result = await this.aggregate([
    {
      $match: {
        entityType,
        entityId: mongoose.Types.ObjectId(entityId),
        isDeleted: false,
        status: 'active'
      }
    },
    {
      $group: {
        _id: null,
        totalSize: { $sum: '$size' },
        count: { $sum: 1 }
      }
    }
  ]);

  return result.length > 0 ? result[0] : { totalSize: 0, count: 0 };
};

// Pre-save middleware to validate file size limits
attachmentSchema.pre('save', function (next) {
  const maxFileSize = 100 * 1024 * 1024; // 100MB

  if (this.size > maxFileSize) {
    return next(new Error(`File size exceeds maximum limit of ${maxFileSize / (1024 * 1024)}MB`));
  }

  next();
});

// Pre-save middleware to ensure S3 key uniqueness
attachmentSchema.pre('save', async function (next) {
  if (this.isNew && this.s3Key) {
    const existing = await this.constructor.findOne({ s3Key: this.s3Key });
    if (existing) {
      return next(new Error('S3 key already exists'));
    }
  }
  next();
});


const Attachment = mongoose.model('Attachment', attachmentSchema);

module.exports = Attachment;
