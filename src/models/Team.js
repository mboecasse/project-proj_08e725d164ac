// File: src/models/Team.js
// Generated: 2025-10-08 13:14:45 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_ewbsxokv6j2e


const mongoose = require('mongoose');


const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Team name is required'],
    trim: true,
    minlength: [2, 'Team name must be at least 2 characters'],
    maxlength: [100, 'Team name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Team owner is required'],
    index: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'manager', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  settings: {
    isPrivate: {
      type: Boolean,
      default: false
    },
    allowMemberInvite: {
      type: Boolean,
      default: false
    },
    requireApproval: {
      type: Boolean,
      default: true
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
teamSchema.index({ owner: 1, createdAt: -1 });
teamSchema.index({ 'members.user': 1 });
teamSchema.index({ name: 1, owner: 1 });
teamSchema.index({ isActive: 1 });

// Virtual for member count
teamSchema.virtual('memberCount').get(function() {
  return this.members ? this.members.length : 0;
});

// Virtual for projects
teamSchema.virtual('projects', {
  ref: 'Project',
  localField: '_id',
  foreignField: 'team'
});

// Instance method to check if user is team member
teamSchema.methods.isMember = function(userId) {
  return this.members.some(member => member.user.toString() === userId.toString());
};

// Instance method to check if user is team owner
teamSchema.methods.isOwner = function(userId) {
  return this.owner.toString() === userId.toString();
};

// Instance method to check if user is admin or manager
teamSchema.methods.isAdminOrManager = function(userId) {
  const member = this.members.find(m => m.user.toString() === userId.toString());
  return member && (member.role === 'admin' || member.role === 'manager');
};

// Instance method to get member role
teamSchema.methods.getMemberRole = function(userId) {
  const member = this.members.find(m => m.user.toString() === userId.toString());
  return member ? member.role : null;
};

// Instance method to add member
teamSchema.methods.addMember = function(userId, role = 'member') {
  if (this.isMember(userId)) {
    throw new Error('User is already a member of this team');
  }

  this.members.push({
    user: userId,
    role: role,
    joinedAt: new Date()
  });

  return this.save();
};

// Instance method to remove member
teamSchema.methods.removeMember = function(userId) {
  if (this.isOwner(userId)) {
    throw new Error('Cannot remove team owner');
  }

  this.members = this.members.filter(m => m.user.toString() !== userId.toString());
  return this.save();
};

// Instance method to update member role
teamSchema.methods.updateMemberRole = function(userId, newRole) {
  if (this.isOwner(userId)) {
    throw new Error('Cannot change owner role');
  }

  const member = this.members.find(m => m.user.toString() === userId.toString());
  if (!member) {
    throw new Error('User is not a member of this team');
  }

  member.role = newRole;
  return this.save();
};

// Pre-save middleware to ensure owner is in members list
teamSchema.pre('save', function(next) {
  if (this.isNew) {
    const ownerInMembers = this.members.some(m => m.user.toString() === this.owner.toString());
    if (!ownerInMembers) {
      this.members.unshift({
        user: this.owner,
        role: 'admin',
        joinedAt: new Date()
      });
    }
  }
  next();
});

// Pre-remove middleware to clean up related data
teamSchema.pre('remove', async function(next) {
  try {
    // Remove all projects associated with this team
    await mongoose.model('Project').deleteMany({ team: this._id });
    next();
  } catch (error) {
    next(error);
  }
});

// Static method to find teams by user
teamSchema.statics.findByUser = function(userId) {
  return this.find({
    $or: [
      { owner: userId },
      { 'members.user': userId }
    ],
    isActive: true
  }).populate('owner', 'name email')
    .populate('members.user', 'name email')
    .sort('-createdAt');
};

// Static method to find teams owned by user
teamSchema.statics.findByOwner = function(userId) {
  return this.find({ owner: userId, isActive: true })
    .populate('owner', 'name email')
    .populate('members.user', 'name email')
    .sort('-createdAt');
};

// Static method to find teams where user is member
teamSchema.statics.findByMember = function(userId) {
  return this.find({
    'members.user': userId,
    owner: { $ne: userId },
    isActive: true
  }).populate('owner', 'name email')
    .populate('members.user', 'name email')
    .sort('-createdAt');
};

module.exports = mongoose.model('Team', teamSchema);
