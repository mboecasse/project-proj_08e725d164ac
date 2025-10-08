// File: src/models/Notification.js
// Generated: 2025-10-08 13:14:44 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_85c920verd6r


const mongoose = require('mongoose');


const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient is required'],
      index: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    type: {
      type: String,
      required: [true, 'Notification type is required'],
      enum: [
        'task_assigned',
        'task_updated',
        'task_completed',
        'task_overdue',
        'comment_added',
        'comment_mention',
        'file_uploaded',
        'team_invitation',
        'team_removed',
        'project_created',
        'project_updated',
        'project_archived',
        'deadline_approaching',
        'subtask_completed',
        'role_changed',
        'system_announcement'
      ],
      index: true
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters']
    },
    relatedResource: {
      resourceType: {
        type: String,
        enum: ['task', 'project', 'team', 'comment', 'file', 'user', 'subtask', null],
        default: null
      },
      resourceId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
      }
    },
    actionUrl: {
      type: String,
      trim: true,
      maxlength: [500, 'Action URL cannot exceed 500 characters']
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    readAt: {
      type: Date,
      default: null
    },
    deliveryPreferences: {
      inApp: {
        type: Boolean,
        default: true
      },
      email: {
        type: Boolean,
        default: false
      },
      push: {
        type: Boolean,
        default: false
      }
    },
    deliveryStatus: {
      inApp: {
        delivered: {
          type: Boolean,
          default: false
        },
        deliveredAt: {
          type: Date,
          default: null
        }
      },
      email: {
        delivered: {
          type: Boolean,
          default: false
        },
        deliveredAt: {
          type: Date,
          default: null
        },
        error: {
          type: String,
          default: null
        }
      },
      push: {
        delivered: {
          type: Boolean,
          default: false
        },
        deliveredAt: {
          type: Date,
          default: null
        },
        error: {
          type: String,
          default: null
        }
      }
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {}
    },
    expiresAt: {
      type: Date,
      default: null,
      index: true
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true
    },
    archivedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound indexes for efficient queries
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, priority: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, isArchived: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $exists: true, $ne: null } } });

// Virtual for checking if notification is expired
notificationSchema.virtual('isExpired').get(function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

// Virtual for time since creation
notificationSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt.getTime();
});

// Pre-save middleware to set in-app delivery status
notificationSchema.pre('save', function(next) {
  if (this.isNew && this.deliveryPreferences.inApp) {
    this.deliveryStatus.inApp.delivered = true;
    this.deliveryStatus.inApp.deliveredAt = new Date();
  }
  next();
});

// Pre-save middleware to set readAt timestamp
notificationSchema.pre('save', function(next) {
  if (this.isModified('isRead') && this.isRead && !this.readAt) {
    this.readAt = new Date();
  }
  next();
});

// Pre-save middleware to set archivedAt timestamp
notificationSchema.pre('save', function(next) {
  if (this.isModified('isArchived') && this.isArchived && !this.archivedAt) {
    this.archivedAt = new Date();
  }
  next();
});

/**
 * Mark notification as read
 */
notificationSchema.methods.markAsRead = async function() {
  this.isRead = true;
  this.readAt = new Date();
  return await this.save();
};

/**
 * Mark notification as unread
 */
notificationSchema.methods.markAsUnread = async function() {
  this.isRead = false;
  this.readAt = null;
  return await this.save();
};

/**
 * Archive notification
 */
notificationSchema.methods.archive = async function() {
  this.isArchived = true;
  this.archivedAt = new Date();
  return await this.save();
};

/**
 * Unarchive notification
 */
notificationSchema.methods.unarchive = async function() {
  this.isArchived = false;
  this.archivedAt = null;
  return await this.save();
};

/**
 * Update delivery status for a channel
 */
notificationSchema.methods.updateDeliveryStatus = async function(channel, delivered, error = null) {
  if (!['email', 'push'].includes(channel)) {
    throw new Error('Invalid delivery channel');
  }

  this.deliveryStatus[channel].delivered = delivered;
  this.deliveryStatus[channel].deliveredAt = delivered ? new Date() : null;
  if (error) {
    this.deliveryStatus[channel].error = error;
  }

  return await this.save();
};

/**
 * Check if notification should be delivered via a channel
 */
notificationSchema.methods.shouldDeliverVia = function(channel) {
  if (!['inApp', 'email', 'push'].includes(channel)) {
    return false;
  }
  return this.deliveryPreferences[channel] === true;
};

/**
 * Get unread notifications for a user
 */
notificationSchema.statics.getUnreadForUser = function(userId, options = {}) {
  const query = {
    recipient: userId,
    isRead: false,
    isArchived: false
  };

  if (options.type) {
    query.type = options.type;
  }

  if (options.priority) {
    query.priority = options.priority;
  }

  return this.find(query)
    .sort({ priority: -1, createdAt: -1 })
    .limit(options.limit || 50)
    .populate('sender', 'name email avatar')
    .lean();
};

/**
 * Get notification count for a user
 */
notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    recipient: userId,
    isRead: false,
    isArchived: false
  });
};

/**
 * Mark all notifications as read for a user
 */
notificationSchema.statics.markAllAsReadForUser = function(userId) {
  return this.updateMany(
    {
      recipient: userId,
      isRead: false,
      isArchived: false
    },
    {
      $set: {
        isRead: true,
        readAt: new Date()
      }
    }
  );
};

/**
 * Delete old archived notifications
 */
notificationSchema.statics.deleteOldArchived = function(daysOld = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  return this.deleteMany({
    isArchived: true,
    archivedAt: { $lt: cutoffDate }
  });
};

/**
 * Delete expired notifications
 */
notificationSchema.statics.deleteExpired = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date(), $ne: null }
  });
};

/**
 * Get notifications by resource
 */
notificationSchema.statics.getByResource = function(resourceType, resourceId, options = {}) {
  const query = {
    'relatedResource.resourceType': resourceType,
    'relatedResource.resourceId': resourceId
  };

  if (options.recipient) {
    query.recipient = options.recipient;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .populate('sender', 'name email avatar')
    .populate('recipient', 'name email')
    .lean();
};


const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
