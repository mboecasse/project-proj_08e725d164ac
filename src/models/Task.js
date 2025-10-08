// File: src/models/Task.js
// Generated: 2025-10-08 13:14:58 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_mroxxh26qrgo


const mongoose = require('mongoose');


const subtaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Subtask title is required'],
    trim: true,
    maxlength: [200, 'Subtask title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Subtask description cannot exceed 1000 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'blocked'],
    default: 'pending'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  completedAt: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });


const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    maxlength: [200, 'Task title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Task description is required'],
    trim: true,
    maxlength: [5000, 'Task description cannot exceed 5000 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'blocked', 'cancelled'],
    default: 'pending',
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project is required'],
    index: true
  },
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  subtasks: [subtaskSchema],
  dependencies: [{
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task'
    },
    type: {
      type: String,
      enum: ['blocks', 'blocked_by', 'related_to'],
      default: 'related_to'
    }
  }],
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  dueDate: {
    type: Date,
    index: true
  },
  startDate: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  estimatedHours: {
    type: Number,
    min: [0, 'Estimated hours cannot be negative']
  },
  actualHours: {
    type: Number,
    min: [0, 'Actual hours cannot be negative']
  },
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    url: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  watchers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isArchived: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ createdBy: 1, createdAt: -1 });
taskSchema.index({ dueDate: 1, status: 1 });
taskSchema.index({ tags: 1 });
taskSchema.index({ 'subtasks.assignedTo': 1 });

// Virtual for progress calculation
taskSchema.virtual('progress').get(function() {
  if (!this.subtasks || this.subtasks.length === 0) {
    return this.status === 'completed' ? 100 : 0;
  }

  const completedSubtasks = this.subtasks.filter(st => st.status === 'completed').length;
  return Math.round((completedSubtasks / this.subtasks.length) * 100);
});

// Virtual for overdue status
taskSchema.virtual('isOverdue').get(function() {
  if (!this.dueDate || this.status === 'completed' || this.status === 'cancelled') {
    return false;
  }
  return new Date() > this.dueDate;
});

// Pre-save middleware to set completedAt
taskSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    if (this.status === 'completed' && !this.completedAt) {
      this.completedAt = new Date();
    } else if (this.status !== 'completed') {
      this.completedAt = undefined;
    }
  }
  next();
});

// Pre-save middleware to update subtask completedAt
taskSchema.pre('save', function(next) {
  if (this.isModified('subtasks')) {
    this.subtasks.forEach(subtask => {
      if (subtask.status === 'completed' && !subtask.completedAt) {
        subtask.completedAt = new Date();
      } else if (subtask.status !== 'completed') {
        subtask.completedAt = undefined;
      }
    });
  }
  next();
});

// Method to check if user can access task
taskSchema.methods.canAccess = async function(userId) {
  const userIdStr = userId.toString();

  // Creator can always access
  if (this.createdBy.toString() === userIdStr) {
    return true;
  }

  // Assigned users can access
  if (this.assignedTo.some(id => id.toString() === userIdStr)) {
    return true;
  }

  // Watchers can access
  if (this.watchers.some(id => id.toString() === userIdStr)) {
    return true;
  }

  // Check if user is part of the project
  const Project = mongoose.model('Project');
  const project = await Project.findById(this.project);

  if (!project) {
    return false;
  }

  return project.members.some(member => member.user.toString() === userIdStr);
};

// Method to check if user can edit task
taskSchema.methods.canEdit = async function(userId) {
  const userIdStr = userId.toString();

  // Creator can always edit
  if (this.createdBy.toString() === userIdStr) {
    return true;
  }

  // Check if user is project admin or manager
  const Project = mongoose.model('Project');
  const project = await Project.findById(this.project);

  if (!project) {
    return false;
  }

  const member = project.members.find(m => m.user.toString() === userIdStr);
  return member && (member.role === 'admin' || member.role === 'manager');
};

// Method to add subtask
taskSchema.methods.addSubtask = function(subtaskData, userId) {
  this.subtasks.push({
    ...subtaskData,
    createdBy: userId
  });
  return this.save();
};

// Method to update subtask
taskSchema.methods.updateSubtask = function(subtaskId, updates) {
  const subtask = this.subtasks.id(subtaskId);
  if (!subtask) {
    throw new Error('Subtask not found');
  }

  Object.assign(subtask, updates);
  return this.save();
};

// Method to delete subtask
taskSchema.methods.deleteSubtask = function(subtaskId) {
  this.subtasks.pull(subtaskId);
  return this.save();
};

// Method to add dependency
taskSchema.methods.addDependency = function(taskId, type = 'related_to') {
  const exists = this.dependencies.some(dep => dep.task.toString() === taskId.toString());
  if (!exists) {
    this.dependencies.push({ task: taskId, type });
  }
  return this.save();
};

// Method to remove dependency
taskSchema.methods.removeDependency = function(taskId) {
  this.dependencies = this.dependencies.filter(dep => dep.task.toString() !== taskId.toString());
  return this.save();
};

// Method to add watcher
taskSchema.methods.addWatcher = function(userId) {
  const userIdStr = userId.toString();
  if (!this.watchers.some(id => id.toString() === userIdStr)) {
    this.watchers.push(userId);
  }
  return this.save();
};

// Method to remove watcher
taskSchema.methods.removeWatcher = function(userId) {
  this.watchers = this.watchers.filter(id => id.toString() !== userId.toString());
  return this.save();
};

// Static method to get tasks by project
taskSchema.statics.getByProject = function(projectId, filters = {}) {
  const query = { project: projectId, isArchived: false };

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.priority) {
    query.priority = filters.priority;
  }

  if (filters.assignedTo) {
    query.assignedTo = filters.assignedTo;
  }

  if (filters.tags && filters.tags.length > 0) {
    query.tags = { $in: filters.tags };
  }

  if (filters.dueDateFrom || filters.dueDateTo) {
    query.dueDate = {};
    if (filters.dueDateFrom) {
      query.dueDate.$gte = new Date(filters.dueDateFrom);
    }
    if (filters.dueDateTo) {
      query.dueDate.$lte = new Date(filters.dueDateTo);
    }
  }

  return this.find(query)
    .populate('assignedTo', 'name email avatar')
    .populate('createdBy', 'name email avatar')
    .populate('subtasks.assignedTo', 'name email')
    .populate('dependencies.task', 'title status')
    .sort({ priority: -1, dueDate: 1 });
};

// Static method to get user tasks
taskSchema.statics.getUserTasks = function(userId, filters = {}) {
  const query = {
    $or: [
      { assignedTo: userId },
      { createdBy: userId },
      { watchers: userId },
      { 'subtasks.assignedTo': userId }
    ],
    isArchived: false
  };

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.priority) {
    query.priority = filters.priority;
  }

  return this.find(query)
    .populate('project', 'name')
    .populate('assignedTo', 'name email avatar')
    .populate('createdBy', 'name email avatar')
    .sort({ priority: -1, dueDate: 1 });
};

// Static method to get overdue tasks
taskSchema.statics.getOverdueTasks = function(projectId = null) {
  const query = {
    dueDate: { $lt: new Date() },
    status: { $nin: ['completed', 'cancelled'] },
    isArchived: false
  };

  if (projectId) {
    query.project = projectId;
  }

  return this.find(query)
    .populate('project', 'name')
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email')
    .sort({ dueDate: 1 });
};


const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
