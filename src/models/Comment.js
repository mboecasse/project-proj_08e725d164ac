// File: src/models/Comment.js
// Generated: 2025-10-08 13:14:45 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_ujcdv71xx9f5


const mongoose = require('mongoose');


const replySchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, 'Reply content is required'],
    trim: true,
    maxlength: [2000, 'Reply content cannot exceed 2000 characters']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Reply author is required']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  isEdited: {
    type: Boolean,
    default: false
  }
}, {
  _id: true,
  timestamps: true
});


const commentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, 'Comment content is required'],
    trim: true,
    maxlength: [5000, 'Comment content cannot exceed 5000 characters']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Comment author is required'],
    index: true
  },
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: [true, 'Task reference is required'],
    index: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project reference is required'],
    index: true
  },
  replies: [replySchema],
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  attachments: [{
    filename: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    mimetype: {
      type: String,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
commentSchema.index({ task: 1, createdAt: -1 });
commentSchema.index({ project: 1, createdAt: -1 });
commentSchema.index({ author: 1, createdAt: -1 });
commentSchema.index({ 'mentions': 1 });
commentSchema.index({ isDeleted: 1, createdAt: -1 });

// Virtual for reply count
commentSchema.virtual('replyCount').get(function() {
  return this.replies ? this.replies.length : 0;
});

// Pre-save middleware to update isEdited flag
commentSchema.pre('save', function(next) {
  if (this.isModified('content') && !this.isNew) {
    this.isEdited = true;
    this.editedAt = new Date();
  }
  next();
});

// Method to add reply
commentSchema.methods.addReply = function(replyData) {
  this.replies.push(replyData);
  return this.save();
};

// Method to update reply
commentSchema.methods.updateReply = function(replyId, content) {
  const reply = this.replies.id(replyId);
  if (!reply) {
    throw new Error('Reply not found');
  }
  reply.content = content;
  reply.isEdited = true;
  reply.updatedAt = new Date();
  return this.save();
};

// Method to delete reply
commentSchema.methods.deleteReply = function(replyId) {
  this.replies.pull(replyId);
  return this.save();
};

// Method to soft delete comment
commentSchema.methods.softDelete = function(userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return this.save();
};

// Static method to get comments by task
commentSchema.statics.getByTask = function(taskId, options = {}) {
  const query = this.find({ task: taskId, isDeleted: false })
    .populate('author', 'name email avatar')
    .populate('replies.author', 'name email avatar')
    .populate('mentions', 'name email')
    .sort({ createdAt: options.sort || -1 });

  if (options.limit) {
    query.limit(options.limit);
  }

  if (options.skip) {
    query.skip(options.skip);
  }

  return query;
};

// Static method to get comments by project
commentSchema.statics.getByProject = function(projectId, options = {}) {
  const query = this.find({ project: projectId, isDeleted: false })
    .populate('author', 'name email avatar')
    .populate('task', 'title')
    .sort({ createdAt: options.sort || -1 });

  if (options.limit) {
    query.limit(options.limit);
  }

  if (options.skip) {
    query.skip(options.skip);
  }

  return query;
};

// Static method to get user's comments
commentSchema.statics.getByAuthor = function(authorId, options = {}) {
  const query = this.find({ author: authorId, isDeleted: false })
    .populate('task', 'title')
    .populate('project', 'name')
    .sort({ createdAt: options.sort || -1 });

  if (options.limit) {
    query.limit(options.limit);
  }

  if (options.skip) {
    query.skip(options.skip);
  }

  return query;
};

// Static method to get comments with mentions
commentSchema.statics.getMentions = function(userId, options = {}) {
  const query = this.find({ mentions: userId, isDeleted: false })
    .populate('author', 'name email avatar')
    .populate('task', 'title')
    .populate('project', 'name')
    .sort({ createdAt: options.sort || -1 });

  if (options.limit) {
    query.limit(options.limit);
  }

  if (options.skip) {
    query.skip(options.skip);
  }

  return query;
};

// Static method to count comments by task
commentSchema.statics.countByTask = function(taskId) {
  return this.countDocuments({ task: taskId, isDeleted: false });
};

// Static method to count comments by project
commentSchema.statics.countByProject = function(projectId) {
  return this.countDocuments({ project: projectId, isDeleted: false });
};


const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;
