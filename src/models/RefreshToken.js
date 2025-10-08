// File: src/models/RefreshToken.js
// Generated: 2025-10-08 13:14:45 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_9w7ms28u278o


const mongoose = require('mongoose');

/**
 * RefreshToken Schema
 * Stores refresh tokens for JWT token rotation
 * Enables token revocation and secure session management
 */


const refreshTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: [true, 'Token is required'],
      unique: true,
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration date is required'],
      index: true
    },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true
    },
    revokedAt: {
      type: Date,
      default: null
    },
    revokedReason: {
      type: String,
      enum: ['logout', 'security', 'expired', 'replaced', null],
      default: null
    },
    deviceInfo: {
      userAgent: {
        type: String,
        default: null
      },
      ipAddress: {
        type: String,
        default: null
      },
      deviceType: {
        type: String,
        enum: ['web', 'mobile', 'tablet', 'desktop', 'unknown'],
        default: 'unknown'
      }
    },
    lastUsedAt: {
      type: Date,
      default: null
    },
    replacedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RefreshToken',
      default: null
    }
  },
  {
    timestamps: true,
    collection: 'refreshtokens'
  }
);

/**
 * Compound indexes for efficient queries
 */
refreshTokenSchema.index({ user: 1, isRevoked: 1 });
refreshTokenSchema.index({ user: 1, expiresAt: 1 });
refreshTokenSchema.index({ token: 1, isRevoked: 1 });
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/**
 * Instance method to check if token is valid
 * @returns {boolean} True if token is valid and not expired
 */
refreshTokenSchema.methods.isValid = function() {
  return !this.isRevoked && this.expiresAt > new Date();
};

/**
 * Instance method to revoke token
 * @param {string} reason - Reason for revocation
 * @param {mongoose.Types.ObjectId} replacedBy - ID of replacement token
 * @returns {Promise<RefreshToken>} Updated token document
 */
refreshTokenSchema.methods.revoke = async function(reason = 'logout', replacedBy = null) {
  this.isRevoked = true;
  this.revokedAt = new Date();
  this.revokedReason = reason;
  if (replacedBy) {
    this.replacedBy = replacedBy;
  }
  return await this.save();
};

/**
 * Static method to revoke all tokens for a user
 * @param {mongoose.Types.ObjectId} userId - User ID
 * @param {string} reason - Reason for revocation
 * @returns {Promise<Object>} Update result
 */
refreshTokenSchema.statics.revokeAllForUser = async function(userId, reason = 'security') {
  return await this.updateMany(
    { user: userId, isRevoked: false },
    {
      $set: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: reason
      }
    }
  );
};

/**
 * Static method to clean up expired tokens
 * @param {number} daysOld - Delete tokens older than this many days (default: 30)
 * @returns {Promise<Object>} Delete result
 */
refreshTokenSchema.statics.cleanupExpired = async function(daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  return await this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { isRevoked: true, revokedAt: { $lt: cutoffDate } }
    ]
  });
};

/**
 * Static method to find valid token
 * @param {string} token - Token string
 * @returns {Promise<RefreshToken|null>} Token document or null
 */
refreshTokenSchema.statics.findValidToken = async function(token) {
  return await this.findOne({
    token,
    isRevoked: false,
    expiresAt: { $gt: new Date() }
  }).populate('user', '-password');
};

/**
 * Static method to count active tokens for user
 * @param {mongoose.Types.ObjectId} userId - User ID
 * @returns {Promise<number>} Count of active tokens
 */
refreshTokenSchema.statics.countActiveForUser = async function(userId) {
  return await this.countDocuments({
    user: userId,
    isRevoked: false,
    expiresAt: { $gt: new Date() }
  });
};

/**
 * Pre-save middleware to update lastUsedAt
 */
refreshTokenSchema.pre('save', function(next) {
  if (this.isModified('token') && !this.isNew) {
    this.lastUsedAt = new Date();
  }
  next();
});

/**
 * Virtual for checking if token is expired
 */
refreshTokenSchema.virtual('isExpired').get(function() {
  return this.expiresAt <= new Date();
});

/**
 * Virtual for checking if token is active
 */
refreshTokenSchema.virtual('isActive').get(function() {
  return !this.isRevoked && !this.isExpired;
});

/**
 * Transform output to include virtuals
 */
refreshTokenSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

refreshTokenSchema.set('toObject', {
  virtuals: true
});

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
