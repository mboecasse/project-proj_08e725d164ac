// File: src/controllers/teamController.js
// Generated: 2025-10-08 13:15:25 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_qxep6gqadq9u


const Project = require('../models/Project');


const Team = require('../models/Team');


const User = require('../models/User');


const logger = require('../utils/logger');

const { successResponse, errorResponse } = require('../utils/response');

/**
 * Get all teams (with optional filters)
 * @route GET /api/teams
 * @access Private
 */
exports.getAllTeams = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, sortBy = 'createdAt', order = 'desc' } = req.query;

    const query = {};

    // Search by team name or description
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === 'asc' ? 1 : -1;

    const teams = await Team.find(query)
      .populate('owner', 'name email')
      .populate('members.user', 'name email avatar')
      .sort({ [sortBy]: sortOrder })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const total = await Team.countDocuments(query);

    logger.info('Fetched all teams', {
      userId: req.userId,
      count: teams.length,
      page,
      limit
    });

    return successResponse(res, {
      teams,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }, 'Teams fetched successfully');
  } catch (error) {
    logger.error('Failed to fetch teams', {
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Get team by ID
 * @route GET /api/teams/:id
 * @access Private
 */
exports.getTeamById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const team = await Team.findById(id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar role')
      .lean();

    if (!team) {
      logger.warn('Team not found', { teamId: id, userId: req.userId });
      return errorResponse(res, 'Team not found', 404);
    }

    logger.info('Fetched team by ID', { teamId: id, userId: req.userId });

    return successResponse(res, team, 'Team fetched successfully');
  } catch (error) {
    logger.error('Failed to fetch team', {
      teamId: req.params.id,
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Create new team
 * @route POST /api/teams
 * @access Private
 */
exports.createTeam = async (req, res, next) => {
  try {
    const { name, description, members } = req.body;
    const userId = req.userId;

    // Check if team with same name exists for this user
    const existingTeam = await Team.findOne({ name, owner: userId });
    if (existingTeam) {
      logger.warn('Team with this name already exists', {
        name,
        userId
      });
      return errorResponse(res, 'Team with this name already exists', 400);
    }

    // Validate member user IDs if provided
    if (members && members.length > 0) {
      const memberIds = members.map(m => m.user);
      const validUsers = await User.find({ _id: { $in: memberIds } }).select('_id');

      if (validUsers.length !== memberIds.length) {
        logger.warn('Invalid member user IDs provided', { userId, memberIds });
        return errorResponse(res, 'One or more member user IDs are invalid', 400);
      }
    }

    // Create team with owner as admin member
    const teamData = {
      name,
      description,
      owner: userId,
      members: [
        {
          user: userId,
          role: 'admin',
          joinedAt: new Date()
        }
      ]
    };

    // Add additional members if provided
    if (members && members.length > 0) {
      const additionalMembers = members
        .filter(m => m.user.toString() !== userId.toString())
        .map(m => ({
          user: m.user,
          role: m.role || 'member',
          joinedAt: new Date()
        }));

      teamData.members.push(...additionalMembers);
    }

    const team = await Team.create(teamData);

    const populatedTeam = await Team.findById(team._id)
      .populate('owner', 'name email')
      .populate('members.user', 'name email avatar');

    logger.info('Created new team', {
      teamId: team._id,
      name,
      userId
    });

    return successResponse(res, populatedTeam, 'Team created successfully', 201);
  } catch (error) {
    logger.error('Failed to create team', {
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Update team
 * @route PUT /api/teams/:id
 * @access Private (Owner or Admin)
 */
exports.updateTeam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const userId = req.userId;

    const team = await Team.findById(id);

    if (!team) {
      logger.warn('Team not found', { teamId: id, userId });
      return errorResponse(res, 'Team not found', 404);
    }

    // Check if user is owner or admin
    const isOwner = team.owner.toString() === userId.toString();
    const memberRole = team.members.find(m => m.user.toString() === userId.toString())?.role;
    const isAdmin = memberRole === 'admin';

    if (!isOwner && !isAdmin) {
      logger.warn('Unauthorized team update attempt', {
        teamId: id,
        userId
      });
      return errorResponse(res, 'You do not have permission to update this team', 403);
    }

    // Check if new name conflicts with existing team
    if (name && name !== team.name) {
      const existingTeam = await Team.findOne({
        name,
        owner: team.owner,
        _id: { $ne: id }
      });

      if (existingTeam) {
        logger.warn('Team name already exists', { name, userId });
        return errorResponse(res, 'Team with this name already exists', 400);
      }
    }

    // Update team
    if (name) team.name = name;
    if (description !== undefined) team.description = description;

    await team.save();

    const updatedTeam = await Team.findById(id)
      .populate('owner', 'name email')
      .populate('members.user', 'name email avatar');

    logger.info('Updated team', { teamId: id, userId });

    return successResponse(res, updatedTeam, 'Team updated successfully');
  } catch (error) {
    logger.error('Failed to update team', {
      teamId: req.params.id,
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Delete team
 * @route DELETE /api/teams/:id
 * @access Private (Owner only)
 */
exports.deleteTeam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const team = await Team.findById(id);

    if (!team) {
      logger.warn('Team not found', { teamId: id, userId });
      return errorResponse(res, 'Team not found', 404);
    }

    // Only owner can delete team
    if (team.owner.toString() !== userId.toString()) {
      logger.warn('Unauthorized team deletion attempt', {
        teamId: id,
        userId
      });
      return errorResponse(res, 'Only team owner can delete the team', 403);
    }

    // Check if team has active projects
    const projectCount = await Project.countDocuments({ team: id });
    if (projectCount > 0) {
      logger.warn('Cannot delete team with active projects', {
        teamId: id,
        projectCount
      });
      return errorResponse(res, 'Cannot delete team with active projects. Please delete or reassign projects first.', 400);
    }

    await Team.findByIdAndDelete(id);

    logger.info('Deleted team', { teamId: id, userId });

    return successResponse(res, null, 'Team deleted successfully');
  } catch (error) {
    logger.error('Failed to delete team', {
      teamId: req.params.id,
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Add member to team
 * @route POST /api/teams/:id/members
 * @access Private (Owner or Admin)
 */
exports.addTeamMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId: newMemberId, role = 'member' } = req.body;
    const userId = req.userId;

    const team = await Team.findById(id);

    if (!team) {
      logger.warn('Team not found', { teamId: id, userId });
      return errorResponse(res, 'Team not found', 404);
    }

    // Check if user is owner or admin
    const isOwner = team.owner.toString() === userId.toString();
    const memberRole = team.members.find(m => m.user.toString() === userId.toString())?.role;
    const isAdmin = memberRole === 'admin';

    if (!isOwner && !isAdmin) {
      logger.warn('Unauthorized add member attempt', {
        teamId: id,
        userId
      });
      return errorResponse(res, 'You do not have permission to add members to this team', 403);
    }

    // Validate new member exists
    const newMember = await User.findById(newMemberId);
    if (!newMember) {
      logger.warn('User not found for team member', {
        newMemberId,
        teamId: id
      });
      return errorResponse(res, 'User not found', 404);
    }

    // Check if user is already a member
    const existingMember = team.members.find(
      m => m.user.toString() === newMemberId.toString()
    );

    if (existingMember) {
      logger.warn('User is already a team member', {
        newMemberId,
        teamId: id
      });
      return errorResponse(res, 'User is already a member of this team', 400);
    }

    // Validate role
    if (!['admin', 'manager', 'member'].includes(role)) {
      logger.warn('Invalid role provided', { role, teamId: id });
      return errorResponse(res, 'Invalid role. Must be admin, manager, or member', 400);
    }

    // Add member
    team.members.push({
      user: newMemberId,
      role,
      joinedAt: new Date()
    });

    await team.save();

    const updatedTeam = await Team.findById(id)
      .populate('owner', 'name email')
      .populate('members.user', 'name email avatar');

    logger.info('Added team member', {
      teamId: id,
      newMemberId,
      role,
      addedBy: userId
    });

    return successResponse(res, updatedTeam, 'Member added successfully');
  } catch (error) {
    logger.error('Failed to add team member', {
      teamId: req.params.id,
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Update team member role
 * @route PUT /api/teams/:id/members/:memberId
 * @access Private (Owner or Admin)
 */
exports.updateTeamMemberRole = async (req, res, next) => {
  try {
    const { id, memberId } = req.params;
    const { role } = req.body;
    const userId = req.userId;

    const team = await Team.findById(id);

    if (!team) {
      logger.warn('Team not found', { teamId: id, userId });
      return errorResponse(res, 'Team not found', 404);
    }

    // Check if user is owner or admin
    const isOwner = team.owner.toString() === userId.toString();
    const memberRole = team.members.find(m => m.user.toString() === userId.toString())?.role;
    const isAdmin = memberRole === 'admin';

    if (!isOwner && !isAdmin) {
      logger.warn('Unauthorized update member role attempt', {
        teamId: id,
        userId
      });
      return errorResponse(res, 'You do not have permission to update member roles', 403);
    }

    // Validate role
    if (!['admin', 'manager', 'member'].includes(role)) {
      logger.warn('Invalid role provided', { role, teamId: id });
      return errorResponse(res, 'Invalid role. Must be admin, manager, or member', 400);
    }

    // Cannot change owner's role
    if (team.owner.toString() === memberId.toString()) {
      logger.warn('Attempt to change owner role', {
        teamId: id,
        memberId
      });
      return errorResponse(res, 'Cannot change team owner role', 400);
    }

    // Find and update member
    const member = team.members.find(m => m.user.toString() === memberId.toString());

    if (!member) {
      logger.warn('Member not found in team', {
        teamId: id,
        memberId
      });
      return errorResponse(res, 'Member not found in team', 404);
    }

    member.role = role;
    await team.save();

    const updatedTeam = await Team.findById(id)
      .populate('owner', 'name email')
      .populate('members.user', 'name email avatar');

    logger.info('Updated team member role', {
      teamId: id,
      memberId,
      newRole: role,
      updatedBy: userId
    });

    return successResponse(res, updatedTeam, 'Member role updated successfully');
  } catch (error) {
    logger.error('Failed to update team member role', {
      teamId: req.params.id,
      memberId: req.params.memberId,
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Remove member from team
 * @route DELETE /api/teams/:id/members/:memberId
 * @access Private (Owner, Admin, or Self)
 */
exports.removeTeamMember = async (req, res, next) => {
  try {
    const { id, memberId } = req.params;
    const userId = req.userId;

    const team = await Team.findById(id);

    if (!team) {
      logger.warn('Team not found', { teamId: id, userId });
      return errorResponse(res, 'Team not found', 404);
