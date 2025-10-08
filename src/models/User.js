// File: src/models/User.js
// Generated: 2025-10-08 13:14:46 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_ngi7ro3qmqlx


const bcrypt = require('bcryptjs');


const mongoose = require('mongoose');

/**
 * User Schema
 * Defines user structure with authentication fields and team management
 */


const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address'
      ]
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false
    },
    role: {
      type: String,
      enum: ['admin', 'manager', 'member'],
      default: 'member'
    },
    avatar: {
      type: String,
      default: null
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
      default: ''
    },
    teams: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team'
      }
    ],
    isActive: {
      type: Boolean,
      default: true
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    emailVerificationToken: {
      type: String,
      select: false
    },
    emailVerificationExpires: {
      type: Date,
      select: false
    },
    passwordResetToken: {
      type: String,
      select: false
    },
    passwordResetExpires: {
      type: Date,
      select: false
    },
    lastLogin: {
      type: Date,
      default: null
    },
    refreshToken: {
      type: String,
      select: false
    },
    preferences: {
      notifications: {
        email: {
          type: Boolean,
          default: true
        },
        push: {
          type: Boolean,
          default: true
        },
        taskAssigned: {
          type: Boolean,
          default: true
        },
        taskCompleted: {
          type: Boolean,
          default: true
        },
        commentAdded: {
          type: Boolean,
          default: true
        }
      },
      theme: {
        type: String,
        enum: ['light', 'dark', 'auto'],
        default: 'light'
      },
      language: {
        type: String,
        default: 'en'
      }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

/**
 * Indexes for performance optimization
 */
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ teams: 1 });
userSchema.index({ createdAt: -1 });

/**
 * Pre-save middleware to hash password
 */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Method to compare password for authentication
 * @param {string} candidatePassword - Password to compare
 * @returns {Promise<boolean>} - True if password matches
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

/**
 * Method to get public profile (exclude sensitive fields)
 * @returns {Object} - Public user profile
 */
userSchema.methods.getPublicProfile = function () {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.refreshToken;
  delete userObject.emailVerificationToken;
  delete userObject.emailVerificationExpires;
  delete userObject.passwordResetToken;
  delete userObject.passwordResetExpires;
  delete userObject.__v;
  return userObject;
};

/**
 * Method to update last login timestamp
 * @returns {Promise<void>}
 */
userSchema.methods.updateLastLogin = async function () {
  this.lastLogin = new Date();
  await this.save({ validateBeforeSave: false });
};

/**
 * Static method to find user by email with password field
 * @param {string} email - User email
 * @returns {Promise<Object|null>} - User document or null
 */
userSchema.statics.findByEmailWithPassword = function (email) {
  return this.findOne({ email }).select('+password');
};

/**
 * Static method to find active users
 * @param {Object} filter - Additional filter criteria
 * @returns {Promise<Array>} - Array of active users
 */
userSchema.statics.findActiveUsers = function (filter = {}) {
  return this.find({ ...filter, isActive: true });
};

/**
 * Virtual for full name (if needed for future first/last name split)
 */
userSchema.virtual('displayName').get(function () {
  return this.name;
});

/**
 * Virtual to populate user's assigned tasks
 */
userSchema.virtual('assignedTasks', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'assignedTo'
});

/**
 * Virtual to populate user's created projects
 */
userSchema.virtual('createdProjects', {
  ref: 'Project',
  localField: '_id',
  foreignField: 'createdBy'
});

/**
 * Pre-remove middleware to clean up related data
 */
userSchema.pre('remove', async function (next) {
  try {
    const Task = mongoose.model('Task');
    const Project = mongoose.model('Project');
    const Comment = mongoose.model('Comment');

    await Task.updateMany(
      { assignedTo: this._id },
      { $set: { assignedTo: null } }
    );

    await Project.updateMany(
      { members: this._id },
      { $pull: { members: this._id } }
    );

    await Comment.deleteMany({ user: this._id });

    next();
  } catch (error) {
    next(error);
  }
});


const User = mongoose.model('User', userSchema);

module.exports = User;
