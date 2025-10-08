// File: src/models/Activity.js
// Generated: 2025-10-08 13:15:05 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_mx6s6sn9c2r1


const mongoose = require('mongoose');

/**
 * Activity Schema
 * Tracks all user actions for audit trail and activity feed
 */


const activitySchema = new mongoose.Schema(
  {
    // User who performed the action
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true
    },

    // Action type (e.g., 'create', 'update', 'delete', 'comment', 'assign')
    action: {
      type: String,
      required: [true, 'Action type is required'],
      enum: [
        'create',
        'update',
        'delete',
        'comment',
        'assign',
        'unassign',
        'status_change',
        'priority_change',
        'attachment_add',
        'attachment_remove',
        'member_add',
        'member_remove',
        'complete',
        'reopen',
        'archive',
        'restore'
      ],
      index: true
    },

    // Resource type (e.g., 'task', 'project', 'team', 'comment')
    resourceType: {
      type: String,
      required: [true, 'Resource type is required'],
      enum: ['task', 'subtask', 'project', 'team', 'comment', 'attachment', 'user'],
      index: true
    },

    // Resource ID (the ID of the task, project, etc.)
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Resource ID is required'],
      index: true
    },

    // Resource name/title for quick reference
    resourceName: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, 'Resource name cannot exceed 500 characters']
    },

    // Parent resource (e.g., project for a task, task for a subtask)
    parentResource: {
      type: {
        type: String,
        enum: ['project', 'task', 'team']
      },
      id: {
        type: mongoose.Schema.Types.ObjectId
      },
      name: {
        type: String,
        trim: true
      }
    },

    // Team context (for filtering activities by team)
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      index: true
    },

    // Project context (for filtering activities by project)
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      index: true
    },

    // Description of the activity
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },

    // Changes made (for update actions)
    changes: {
      field: {
        type: String,
        trim: true
      },
      oldValue: {
        type: mongoose.Schema.Types.Mixed
      },
      newValue: {
        type: mongoose.Schema.Types.Mixed
      }
    },

    // Additional metadata
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {}
    },

    // IP address of the user
    ipAddress: {
      type: String,
      trim: true
    },

    // User agent
    userAgent: {
      type: String,
      trim: true
    },

    // Soft delete flag
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound indexes for common queries
activitySchema.index({ user: 1, createdAt: -1 });
activitySchema.index({ team: 1, createdAt: -1 });
activitySchema.index({ project: 1, createdAt: -1 });
activitySchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });
activitySchema.index({ action: 1, createdAt: -1 });
activitySchema.index({ isDeleted: 1, createdAt: -1 });

// Compound index for filtering by team and resource type
activitySchema.index({ team: 1, resourceType: 1, createdAt: -1 });

// Compound index for filtering by project and action
activitySchema.index({ project: 1, action: 1, createdAt: -1 });

/**
 * Static method to create activity log
 */
activitySchema.statics.logActivity = async function(activityData) {
  try {
    const activity = await this.create(activityData);
    return activity;
  } catch (error) {
    throw new Error(`Failed to log activity: ${error.message}`);
  }
};

/**
 * Static method to get user activities
 */
activitySchema.statics.getUserActivities = async function(userId, options = {}) {
  const { limit = 50, skip = 0, startDate, endDate } = options;

  const query = { user: userId, isDeleted: false };

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('user', 'name email avatar')
    .lean();
};

/**
 * Static method to get team activities
 */
activitySchema.statics.getTeamActivities = async function(teamId, options = {}) {
  const { limit = 50, skip = 0, resourceType, action, startDate, endDate } = options;

  const query = { team: teamId, isDeleted: false };

  if (resourceType) query.resourceType = resourceType;
  if (action) query.action = action;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('user', 'name email avatar')
    .lean();
};

/**
 * Static method to get project activities
 */
activitySchema.statics.getProjectActivities = async function(projectId, options = {}) {
  const { limit = 50, skip = 0, resourceType, action, startDate, endDate } = options;

  const query = { project: projectId, isDeleted: false };

  if (resourceType) query.resourceType = resourceType;
  if (action) query.action = action;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('user', 'name email avatar')
    .lean();
};

/**
 * Static method to get resource activities
 */
activitySchema.statics.getResourceActivities = async function(resourceType, resourceId, options = {}) {
  const { limit = 50, skip = 0 } = options;

  return this.find({
    resourceType,
    resourceId,
    isDeleted: false
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('user', 'name email avatar')
    .lean();
};

/**
 * Static method to get activity statistics
 */
activitySchema.statics.getActivityStats = async function(filters = {}) {
  const { userId, teamId, projectId, startDate, endDate } = filters;

  const matchQuery = { isDeleted: false };

  if (userId) matchQuery.user = mongoose.Types.ObjectId(userId);
  if (teamId) matchQuery.team = mongoose.Types.ObjectId(teamId);
  if (projectId) matchQuery.project = mongoose.Types.ObjectId(projectId);

  if (startDate || endDate) {
    matchQuery.createdAt = {};
    if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
    if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
  }

  const stats = await this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  const totalActivities = await this.countDocuments(matchQuery);

  return {
    total: totalActivities,
    byAction: stats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {})
  };
};

/**
 * Instance method to soft delete activity
 */
activitySchema.methods.softDelete = async function() {
  this.isDeleted = true;
  return this.save();
};

/**
 * Pre-save hook to set default values
 */
activitySchema.pre('save', function(next) {
  // Ensure metadata is initialized
  if (!this.metadata) {
    this.metadata = new Map();
  }
  next();
});


const Activity = mongoose.model('Activity', activitySchema);

module.exports = Activity;
