// File: src/models/Invitation.js
// Generated: 2025-10-08 13:14:34 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_1rm7xtiei680


const crypto = require('crypto');


const mongoose = require('mongoose');

/**
 * Team Invitation Schema
 * Manages team invitations with secure tokens and expiration
 */


const invitationSchema = new mongoose.Schema(
  {
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: [true, 'Team is required'],
      index: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email'
      ],
      index: true
    },
    role: {
      type: String,
      enum: ['admin', 'manager', 'member'],
      default: 'member',
      required: true
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Inviter is required']
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'expired'],
      default: 'pending',
      index: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },
    acceptedAt: {
      type: Date
    },
    acceptedBy: {
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

/**
 * Compound indexes for efficient queries
 */
invitationSchema.index({ team: 1, email: 1 });
invitationSchema.index({ status: 1, expiresAt: 1 });
invitationSchema.index({ token: 1, status: 1 });

/**
 * Virtual for checking if invitation is expired
 */
invitationSchema.virtual('isExpired').get(function() {
  return this.expiresAt < new Date() || this.status === 'expired';
});

/**
 * Virtual for checking if invitation is valid
 */
invitationSchema.virtual('isValid').get(function() {
  return this.status === 'pending' && this.expiresAt > new Date();
});

/**
 * Pre-save middleware to generate token and set expiration
 */
invitationSchema.pre('save', function(next) {
  if (this.isNew && !this.token) {
    this.token = crypto.randomBytes(32).toString('hex');
  }

  if (this.isNew && !this.expiresAt) {
    // Default expiration: 7 days from now
    this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  next();
});

/**
 * Pre-save middleware to mark as expired if past expiration date
 */
invitationSchema.pre('save', function(next) {
  if (this.status === 'pending' && this.expiresAt < new Date()) {
    this.status = 'expired';
  }
  next();
});

/**
 * Static method to find valid invitation by token
 */
invitationSchema.statics.findValidByToken = async function(token) {
  const invitation = await this.findOne({
    token,
    status: 'pending',
    expiresAt: { $gt: new Date() }
  })
    .populate('team', 'name description')
    .populate('invitedBy', 'name email');

  return invitation;
};

/**
 * Static method to find pending invitations for a team
 */
invitationSchema.statics.findPendingByTeam = async function(teamId) {
  return this.find({
    team: teamId,
    status: 'pending',
    expiresAt: { $gt: new Date() }
  })
    .populate('invitedBy', 'name email')
    .sort({ createdAt: -1 });
};

/**
 * Static method to find pending invitations for an email
 */
invitationSchema.statics.findPendingByEmail = async function(email) {
  return this.find({
    email: email.toLowerCase(),
    status: 'pending',
    expiresAt: { $gt: new Date() }
  })
    .populate('team', 'name description')
    .populate('invitedBy', 'name email')
    .sort({ createdAt: -1 });
};

/**
 * Instance method to accept invitation
 */
invitationSchema.methods.accept = async function(userId) {
  if (this.status !== 'pending') {
    throw new Error('Invitation is not pending');
  }

  if (this.expiresAt < new Date()) {
    this.status = 'expired';
    await this.save();
    throw new Error('Invitation has expired');
  }

  this.status = 'accepted';
  this.acceptedAt = new Date();
  this.acceptedBy = userId;

  await this.save();
  return this;
};

/**
 * Instance method to decline invitation
 */
invitationSchema.methods.decline = async function() {
  if (this.status !== 'pending') {
    throw new Error('Invitation is not pending');
  }

  this.status = 'declined';
  await this.save();
  return this;
};

/**
 * Instance method to resend invitation (generate new token and extend expiration)
 */
invitationSchema.methods.resend = async function() {
  if (this.status !== 'pending' && this.status !== 'expired') {
    throw new Error('Cannot resend accepted or declined invitation');
  }

  this.token = crypto.randomBytes(32).toString('hex');
  this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  this.status = 'pending';

  await this.save();
  return this;
};

/**
 * Static method to cleanup expired invitations
 */
invitationSchema.statics.cleanupExpired = async function() {
  const result = await this.updateMany(
    {
      status: 'pending',
      expiresAt: { $lt: new Date() }
    },
    {
      $set: { status: 'expired' }
    }
  );

  return result.modifiedCount;
};

/**
 * Static method to check if invitation exists for email and team
 */
invitationSchema.statics.existsForEmailAndTeam = async function(email, teamId) {
  const invitation = await this.findOne({
    email: email.toLowerCase(),
    team: teamId,
    status: 'pending',
    expiresAt: { $gt: new Date() }
  });

  return !!invitation;
};


const Invitation = mongoose.model('Invitation', invitationSchema);

module.exports = Invitation;
