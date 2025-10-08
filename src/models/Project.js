// File: src/models/Project.js
// Generated: 2025-10-08 13:14:56 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_x4qr7kbw39yv


const mongoose = require('mongoose');

/**
 * Project Schema
 * Represents a project within a team with settings and metadata
 */


const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      minlength: [3, 'Project name must be at least 3 characters'],
      maxlength: [100, 'Project name cannot exceed 100 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: [true, 'Team is required'],
      index: true
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Project owner is required'],
      index: true
    },
    status: {
      type: String,
      enum: ['active', 'archived', 'on-hold', 'completed'],
      default: 'active',
      index: true
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    dueDate: {
      type: Date,
      validate: {
        validator: function(value) {
          return !value || !this.startDate || value >= this.startDate;
        },
        message: 'Due date must be after start date'
      }
    },
    completedDate: {
      type: Date
    },
    settings: {
      allowComments: {
        type: Boolean,
        default: true
      },
      allowAttachments: {
        type: Boolean,
        default: true
      },
      allowSubtasks: {
        type: Boolean,
        default: true
      },
      requireApproval: {
        type: Boolean,
        default: false
      },
      notifyOnTaskCreate: {
        type: Boolean,
        default: true
      },
      notifyOnTaskUpdate: {
        type: Boolean,
        default: true
      },
      notifyOnTaskComplete: {
        type: Boolean,
        default: true
      },
      visibility: {
        type: String,
        enum: ['private', 'team', 'public'],
        default: 'team'
      }
    },
    tags: [{
      type: String,
      trim: true,
      maxlength: [50, 'Tag cannot exceed 50 characters']
    }],
    color: {
      type: String,
      default: '#3B82F6',
      match: [/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color code']
    },
    icon: {
      type: String,
      trim: true,
      maxlength: [50, 'Icon name cannot exceed 50 characters']
    },
    taskCount: {
      type: Number,
      default: 0,
      min: 0
    },
    completedTaskCount: {
      type: Number,
      default: 0,
      min: 0
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    members: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      role: {
        type: String,
        enum: ['manager', 'member', 'viewer'],
        default: 'member'
      },
      addedAt: {
        type: Date,
        default: Date.now
      },
      addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }],
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    deletedAt: {
      type: Date
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for performance
projectSchema.index({ team: 1, status: 1 });
projectSchema.index({ team: 1, isDeleted: 1 });
projectSchema.index({ owner: 1, status: 1 });
projectSchema.index({ 'members.user': 1 });
projectSchema.index({ createdAt: -1 });
projectSchema.index({ name: 'text', description: 'text' });

// Virtual for tasks
projectSchema.virtual('tasks', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'project'
});

// Virtual for completion percentage
projectSchema.virtual('completionPercentage').get(function() {
  if (this.taskCount === 0) return 0;
  return Math.round((this.completedTaskCount / this.taskCount) * 100);
});

// Virtual for is overdue
projectSchema.virtual('isOverdue').get(function() {
  if (!this.dueDate || this.status === 'completed' || this.status === 'archived') {
    return false;
  }
  return new Date() > this.dueDate;
});

// Pre-save middleware to update progress
projectSchema.pre('save', function(next) {
  if (this.taskCount > 0) {
    this.progress = Math.round((this.completedTaskCount / this.taskCount) * 100);
  } else {
    this.progress = 0;
  }
  next();
});

// Pre-save middleware to set completed date
projectSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'completed' && !this.completedDate) {
    this.completedDate = new Date();
  }
  next();
});

// Method to check if user is project member
projectSchema.methods.isMember = function(userId) {
  return this.members.some(member => member.user.toString() === userId.toString());
};

// Method to check if user is project manager
projectSchema.methods.isManager = function(userId) {
  return this.members.some(
    member => member.user.toString() === userId.toString() && member.role === 'manager'
  );
};

// Method to check if user is project owner
projectSchema.methods.isOwner = function(userId) {
  return this.owner.toString() === userId.toString();
};

// Method to get user role in project
projectSchema.methods.getUserRole = function(userId) {
  if (this.owner.toString() === userId.toString()) {
    return 'owner';
  }
  const member = this.members.find(m => m.user.toString() === userId.toString());
  return member ? member.role : null;
};

// Method to add member
projectSchema.methods.addMember = function(userId, role = 'member', addedBy) {
  if (!this.isMember(userId)) {
    this.members.push({
      user: userId,
      role: role,
      addedAt: new Date(),
      addedBy: addedBy
    });
  }
  return this;
};

// Method to remove member
projectSchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(member => member.user.toString() !== userId.toString());
  return this;
};

// Method to update member role
projectSchema.methods.updateMemberRole = function(userId, newRole) {
  const member = this.members.find(m => m.user.toString() === userId.toString());
  if (member) {
    member.role = newRole;
  }
  return this;
};

// Method to soft delete
projectSchema.methods.softDelete = function(userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return this.save();
};

// Method to restore
projectSchema.methods.restore = function() {
  this.isDeleted = false;
  this.deletedAt = null;
  this.deletedBy = null;
  return this.save();
};

// Static method to find active projects
projectSchema.statics.findActive = function(filter = {}) {
  return this.find({ ...filter, isDeleted: false, status: 'active' });
};

// Static method to find by team
projectSchema.statics.findByTeam = function(teamId, includeDeleted = false) {
  const filter = { team: teamId };
  if (!includeDeleted) {
    filter.isDeleted = false;
  }
  return this.find(filter).sort({ createdAt: -1 });
};

// Static method to find by user
projectSchema.statics.findByUser = function(userId, includeDeleted = false) {
  const filter = {
    $or: [
      { owner: userId },
      { 'members.user': userId }
    ]
  };
  if (!includeDeleted) {
    filter.isDeleted = false;
  }
  return this.find(filter).sort({ createdAt: -1 });
};

// Static method to update task counts
projectSchema.statics.updateTaskCounts = async function(projectId) {
  const Task = mongoose.model('Task');
  const totalTasks = await Task.countDocuments({ project: projectId, isDeleted: false });
  const completedTasks = await Task.countDocuments({
    project: projectId,
    isDeleted: false,
    status: 'completed'
  });

  return this.findByIdAndUpdate(
    projectId,
    {
      taskCount: totalTasks,
      completedTaskCount: completedTasks,
      progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    },
    { new: true }
  );
};


const Project = mongoose.model('Project', projectSchema);

module.exports = Project;
