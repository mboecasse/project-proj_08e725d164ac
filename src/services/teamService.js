// File: src/services/teamService.js
// Generated: 2025-10-08 13:17:05 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_j5hhvuar5g4a


const Invitation = require('../models/Invitation');


const Team = require('../models/Team');


const User = require('../models/User');


const crypto = require('crypto');


const emailService = require('./emailService');


const logger = require('../utils/logger');

/**
 * Create a new team
 * @param {string} name - Team name
 * @param {string} description - Team description
 * @param {string} ownerId - User ID of team owner
 * @returns {Promise<Object>} Created team
 */
exports.createTeam = async (name, description, ownerId) => {
  try {
    const team = await Team.create({
      name,
      description,
      owner: ownerId,
      members: [{
        user: ownerId,
        role: 'admin',
        joinedAt: new Date()
      }]
    });

    await team.populate('owner', 'name email');
    await team.populate('members.user', 'name email');

    logger.info('Team created', { teamId: team._id, ownerId, name });

    return team;
  } catch (error) {
    logger.error('Failed to create team', { ownerId, name, error: error.message });
    throw error;
  }
};

/**
 * Get team by ID
 * @param {string} teamId - Team ID
 * @returns {Promise<Object>} Team details
 */
exports.getTeamById = async (teamId) => {
  try {
    const team = await Team.findById(teamId)
      .populate('owner', 'name email')
      .populate('members.user', 'name email avatar');

    if (!team) {
      const error = new Error('Team not found');
      error.statusCode = 404;
      throw error;
    }

    logger.info('Fetched team by ID', { teamId });

    return team;
  } catch (error) {
    logger.error('Failed to fetch team', { teamId, error: error.message });
    throw error;
  }
};

/**
 * Get all teams for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} User's teams
 */
exports.getUserTeams = async (userId) => {
  try {
    const teams = await Team.find({
      'members.user': userId
    })
      .populate('owner', 'name email')
      .populate('members.user', 'name email avatar')
      .sort({ createdAt: -1 });

    logger.info('Fetched user teams', { userId, count: teams.length });

    return teams;
  } catch (error) {
    logger.error('Failed to fetch user teams', { userId, error: error.message });
    throw error;
  }
};

/**
 * Update team details
 * @param {string} teamId - Team ID
 * @param {string} userId - User ID making the update
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated team
 */
exports.updateTeam = async (teamId, userId, updates) => {
  try {
    const team = await Team.findById(teamId);

    if (!team) {
      const error = new Error('Team not found');
      error.statusCode = 404;
      throw error;
    }

    // Check if user is owner or admin
    const member = team.members.find(m => m.user.toString() === userId);
    if (!member || (member.role !== 'admin' && team.owner.toString() !== userId)) {
      const error = new Error('Not authorized to update team');
      error.statusCode = 403;
      throw error;
    }

    // Only allow updating certain fields
    const allowedUpdates = ['name', 'description'];
    const updateFields = {};

    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updateFields[key] = updates[key];
      }
    });

    Object.assign(team, updateFields);
    await team.save();

    await team.populate('owner', 'name email');
    await team.populate('members.user', 'name email avatar');

    logger.info('Team updated', { teamId, userId, updates: Object.keys(updateFields) });

    return team;
  } catch (error) {
    logger.error('Failed to update team', { teamId, userId, error: error.message });
    throw error;
  }
};

/**
 * Delete a team
 * @param {string} teamId - Team ID
 * @param {string} userId - User ID requesting deletion
 * @returns {Promise<void>}
 */
exports.deleteTeam = async (teamId, userId) => {
  try {
    const team = await Team.findById(teamId);

    if (!team) {
      const error = new Error('Team not found');
      error.statusCode = 404;
      throw error;
    }

    // Only owner can delete team
    if (team.owner.toString() !== userId) {
      const error = new Error('Only team owner can delete the team');
      error.statusCode = 403;
      throw error;
    }

    await Team.findByIdAndDelete(teamId);

    // Delete all pending invitations for this team
    await Invitation.deleteMany({ team: teamId });

    logger.info('Team deleted', { teamId, userId });
  } catch (error) {
    logger.error('Failed to delete team', { teamId, userId, error: error.message });
    throw error;
  }
};

/**
 * Invite user to team
 * @param {string} teamId - Team ID
 * @param {string} email - Email of user to invite
 * @param {string} role - Role to assign (manager/member)
 * @param {string} invitedBy - User ID of inviter
 * @returns {Promise<Object>} Created invitation
 */
exports.inviteToTeam = async (teamId, email, role, invitedBy) => {
  try {
    const team = await Team.findById(teamId).populate('owner', 'name email');

    if (!team) {
      const error = new Error('Team not found');
      error.statusCode = 404;
      throw error;
    }

    // Check if inviter has permission
    const inviter = team.members.find(m => m.user.toString() === invitedBy);
    if (!inviter || (inviter.role !== 'admin' && inviter.role !== 'manager' && team.owner.toString() !== invitedBy)) {
      const error = new Error('Not authorized to invite members');
      error.statusCode = 403;
      throw error;
    }

    // Check if user is already a member
    const user = await User.findOne({ email });
    if (user) {
      const isMember = team.members.some(m => m.user.toString() === user._id.toString());
      if (isMember) {
        const error = new Error('User is already a team member');
        error.statusCode = 400;
        throw error;
      }
    }

    // Check for existing pending invitation
    const existingInvitation = await Invitation.findOne({
      team: teamId,
      email,
      status: 'pending'
    });

    if (existingInvitation) {
      const error = new Error('Invitation already sent to this email');
      error.statusCode = 400;
      throw error;
    }

    // Generate invitation token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create invitation
    const invitation = await Invitation.create({
      team: teamId,
      email,
      role,
      token,
      invitedBy,
      expiresAt
    });

    await invitation.populate('team', 'name');
    await invitation.populate('invitedBy', 'name email');

    // Send invitation email
    try {
      const inviteLink = `${process.env.FRONTEND_URL}/invite/${token}`;
      await emailService.sendEmail(
        email,
        'Team Invitation',
        'teamInvitation',
        {
          teamName: team.name,
          inviterName: invitation.invitedBy.name,
          inviteLink,
          expiresAt: expiresAt.toLocaleDateString()
        }
      );

      logger.info('Team invitation sent', { teamId, email, invitedBy });
    } catch (emailError) {
      logger.error('Failed to send invitation email', {
        teamId,
        email,
        error: emailError.message
      });
      // Don't throw - invitation is created, email failure shouldn't block
    }

    return invitation;
  } catch (error) {
    logger.error('Failed to invite to team', { teamId, email, invitedBy, error: error.message });
    throw error;
  }
};

/**
 * Accept team invitation
 * @param {string} token - Invitation token
 * @param {string} userId - User ID accepting invitation
 * @returns {Promise<Object>} Updated team
 */
exports.acceptInvitation = async (token, userId) => {
  try {
    const invitation = await Invitation.findOne({ token, status: 'pending' })
      .populate('team');

    if (!invitation) {
      const error = new Error('Invalid or expired invitation');
      error.statusCode = 404;
      throw error;
    }

    if (invitation.expiresAt < new Date()) {
      invitation.status = 'expired';
      await invitation.save();

      const error = new Error('Invitation has expired');
      error.statusCode = 400;
      throw error;
    }

    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    // Verify email matches
    if (user.email !== invitation.email) {
      const error = new Error('Invitation email does not match user email');
      error.statusCode = 403;
      throw error;
    }

    const team = await Team.findById(invitation.team._id);

    // Check if already a member
    const isMember = team.members.some(m => m.user.toString() === userId);
    if (isMember) {
      const error = new Error('Already a team member');
      error.statusCode = 400;
      throw error;
    }

    // Add user to team
    team.members.push({
      user: userId,
      role: invitation.role,
      joinedAt: new Date()
    });

    await team.save();

    // Update invitation status
    invitation.status = 'accepted';
    await invitation.save();

    await team.populate('owner', 'name email');
    await team.populate('members.user', 'name email avatar');

    logger.info('Team invitation accepted', { teamId: team._id, userId, token });

    return team;
  } catch (error) {
    logger.error('Failed to accept invitation', { token, userId, error: error.message });
    throw error;
  }
};

/**
 * Decline team invitation
 * @param {string} token - Invitation token
 * @param {string} userId - User ID declining invitation
 * @returns {Promise<void>}
 */
exports.declineInvitation = async (token, userId) => {
  try {
    const invitation = await Invitation.findOne({ token, status: 'pending' });

    if (!invitation) {
      const error = new Error('Invalid or expired invitation');
      error.statusCode = 404;
      throw error;
    }

    const user = await User.findById(userId);
    if (user && user.email !== invitation.email) {
      const error = new Error('Invitation email does not match user email');
      error.statusCode = 403;
      throw error;
    }

    invitation.status = 'declined';
    await invitation.save();

    logger.info('Team invitation declined', { token, userId });
  } catch (error) {
    logger.error('Failed to decline invitation', { token, userId, error: error.message });
    throw error;
  }
};

/**
 * Get pending invitations for a team
 * @param {string} teamId - Team ID
 * @param {string} userId - User ID requesting invitations
 * @returns {Promise<Array>} Pending invitations
 */
exports.getTeamInvitations = async (teamId, userId) => {
  try {
    const team = await Team.findById(teamId);

    if (!team) {
      const error = new Error('Team not found');
      error.statusCode = 404;
      throw error;
    }

    // Check if user has permission
    const member = team.members.find(m => m.user.toString() === userId);
    if (!member || (member.role !== 'admin' && member.role !== 'manager' && team.owner.toString() !== userId)) {
      const error = new Error('Not authorized to view invitations');
      error.statusCode = 403;
      throw error;
    }

    const invitations = await Invitation.find({
      team: teamId,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    })
      .populate('invitedBy', 'name email')
      .sort({ createdAt: -1 });

    logger.info('Fetched team invitations', { teamId, count: invitations.length });

    return invitations;
  } catch (error) {
    logger.error('Failed to fetch team invitations', { teamId, userId, error: error.message });
    throw error;
  }
};

/**
 * Remove member from team
 * @param {string} teamId - Team ID
 * @param {string} memberIdToRemove - User ID to remove
 * @param {string} userId - User ID requesting removal
 * @returns {Promise<Object>} Updated team
 */
exports.removeMember = async (teamId, memberIdToRemove, userId) => {
  try {
    const team = await Team.findById(teamId);

    if (!team) {
      const error = new Error('Team not found');
      error.statusCode = 404;
      throw error;
    }

    // Can't remove owner
    if (team.owner.toString() === memberIdToRemove) {
      const error = new Error('Cannot remove team owner');
      error.statusCode = 400;
      throw error;
    }

    // Check if requester has permission
    const requester = team.members.find(m => m.user.toString() === userId);
    if (!requester || (requester.role !== 'admin' && team.owner.toString() !== userId)) {
      const error = new Error('Not authorized to remove members');
      error.statusCode = 403;
      throw error;
    }

    // Check if member exists
    const memberIndex = team.members.findIndex(m => m.user.toString() === memberIdToRemove);
    if (memberIndex === -1) {
      const error = new Error('Member not found in team');
      error.statusCode = 404;
      throw error;
    }

    // Remove member
    team.members.splice(memberIndex, 1);
    await team.save();

    await team.populate('owner', 'name email');
    await team.populate('members.user', 'name email avatar');

    logger.info('Member removed from team', { teamId, memberIdToRemove, removedBy: userId });

    return team;
  } catch (error) {
    logger.error('Failed to remove member', { teamId, memberIdToRemove, userId, error: error.message });
    throw error;
  }
};

/**
 * Update member role
 * @param {string} teamId - Team ID
 * @param {string} memberIdToUpdate - User ID to update
 * @param {string} newRole - New role (admin/manager/member)
 * @param {string} userId - User ID requesting update
 * @returns {Promise<Object>} Updated team
 */
exports.updateMemberRole = async (teamId, memberIdToUpdate, newRole, userId) => {
