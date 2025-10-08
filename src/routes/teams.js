// File: src/routes/teams.js
// Generated: 2025-10-08 13:17:02 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_jktnwdoq3vcd


const Team = require('../models/Team');


const User = require('../models/User');


const express = require('express');


const logger = require('../utils/logger');

const { auth } = require('../middleware/auth');

const { body, param } = require('express-validator');

const { checkRole } = require('../middleware/rbac');

const { validate } = require('../middleware/validator');


const router = express.Router();

/**
 * Validation rules for team creation
 */


const createTeamValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Team name is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Team name must be between 3 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('members')
    .optional()
    .isArray()
    .withMessage('Members must be an array'),
  body('members.*.userId')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID'),
  body('members.*.role')
    .optional()
    .isIn(['admin', 'manager', 'member'])
    .withMessage('Invalid role')
];

/**
 * Validation rules for team update
 */


const updateTeamValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid team ID'),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Team name cannot be empty')
    .isLength({ min: 3, max: 100 })
    .withMessage('Team name must be between 3 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters')
];

/**
 * Validation rules for adding team member
 */


const addMemberValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid team ID'),
  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isMongoId()
    .withMessage('Invalid user ID'),
  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['admin', 'manager', 'member'])
    .withMessage('Invalid role. Must be admin, manager, or member')
];

/**
 * Validation rules for updating member role
 */


const updateMemberRoleValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid team ID'),
  param('memberId')
    .isMongoId()
    .withMessage('Invalid member ID'),
  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['admin', 'manager', 'member'])
    .withMessage('Invalid role. Must be admin, manager, or member')
];

/**
 * Validation rules for removing member
 */


const removeMemberValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid team ID'),
  param('memberId')
    .isMongoId()
    .withMessage('Invalid member ID')
];

/**
 * GET /api/teams
 * Get all teams (user is member of)
 */
router.get('/', auth, async (req, res, next) => {
  try {
    const teams = await Team.find({
      'members.userId': req.userId
    })
      .populate('members.userId', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    logger.info('Fetched user teams', { userId: req.userId, count: teams.length });

    res.json({
      success: true,
      count: teams.length,
      data: teams
    });
  } catch (error) {
    logger.error('Failed to fetch teams', { userId: req.userId, error: error.message });
    next(error);
  }
});

/**
 * GET /api/teams/:id
 * Get team by ID
 */
router.get('/:id', auth, param('id').isMongoId().withMessage('Invalid team ID'), validate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const team = await Team.findById(id)
      .populate('members.userId', 'name email')
      .populate('createdBy', 'name email');

    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    // Check if user is a member
    const isMember = team.members.some(
      member => member.userId._id.toString() === req.userId
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You are not a member of this team'
      });
    }

    logger.info('Fetched team by ID', { teamId: id, userId: req.userId });

    res.json({
      success: true,
      data: team
    });
  } catch (error) {
    logger.error('Failed to fetch team', { teamId: req.params.id, userId: req.userId, error: error.message });
    next(error);
  }
});

/**
 * POST /api/teams
 * Create new team
 */
router.post('/', auth, createTeamValidation, validate, async (req, res, next) => {
  try {
    const { name, description, members } = req.body;

    // Create team with creator as admin
    const teamData = {
      name,
      description,
      createdBy: req.userId,
      members: [
        {
          userId: req.userId,
          role: 'admin',
          joinedAt: new Date()
        }
      ]
    };

    // Add additional members if provided
    if (members && members.length > 0) {
      for (const member of members) {
        // Verify user exists
        const userExists = await User.findById(member.userId);
        if (!userExists) {
          return res.status(400).json({
            success: false,
            error: `User with ID ${member.userId} not found`
          });
        }

        // Don't add creator again
        if (member.userId !== req.userId) {
          teamData.members.push({
            userId: member.userId,
            role: member.role || 'member',
            joinedAt: new Date()
          });
        }
      }
    }

    const team = await Team.create(teamData);

    const populatedTeam = await Team.findById(team._id)
      .populate('members.userId', 'name email')
      .populate('createdBy', 'name email');

    logger.info('Created new team', { teamId: team._id, userId: req.userId, name });

    res.status(201).json({
      success: true,
      data: populatedTeam,
      message: 'Team created successfully'
    });
  } catch (error) {
    logger.error('Failed to create team', { userId: req.userId, error: error.message });
    next(error);
  }
});

/**
 * PUT /api/teams/:id
 * Update team
 */
router.put('/:id', auth, updateTeamValidation, validate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const team = await Team.findById(id);

    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    // Check if user is admin or manager
    const member = team.members.find(
      m => m.userId.toString() === req.userId
    );

    if (!member || (member.role !== 'admin' && member.role !== 'manager')) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only admins and managers can update team details'
      });
    }

    // Update fields
    if (name) team.name = name;
    if (description !== undefined) team.description = description;

    await team.save();

    const updatedTeam = await Team.findById(id)
      .populate('members.userId', 'name email')
      .populate('createdBy', 'name email');

    logger.info('Updated team', { teamId: id, userId: req.userId });

    res.json({
      success: true,
      data: updatedTeam,
      message: 'Team updated successfully'
    });
  } catch (error) {
    logger.error('Failed to update team', { teamId: req.params.id, userId: req.userId, error: error.message });
    next(error);
  }
});

/**
 * DELETE /api/teams/:id
 * Delete team
 */
router.delete('/:id', auth, param('id').isMongoId().withMessage('Invalid team ID'), validate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const team = await Team.findById(id);

    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    // Only team creator or admin can delete
    const member = team.members.find(
      m => m.userId.toString() === req.userId
    );

    if (!member || member.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only team admins can delete the team'
      });
    }

    await Team.findByIdAndDelete(id);

    logger.info('Deleted team', { teamId: id, userId: req.userId });

    res.json({
      success: true,
      message: 'Team deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete team', { teamId: req.params.id, userId: req.userId, error: error.message });
    next(error);
  }
});

/**
 * POST /api/teams/:id/members
 * Add member to team
 */
router.post('/:id/members', auth, addMemberValidation, validate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.body;

    const team = await Team.findById(id);

    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    // Check if requester is admin or manager
    const requester = team.members.find(
      m => m.userId.toString() === req.userId
    );

    if (!requester || (requester.role !== 'admin' && requester.role !== 'manager')) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only admins and managers can add members'
      });
    }

    // Verify user exists
    const userExists = await User.findById(userId);
    if (!userExists) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if user is already a member
    const existingMember = team.members.find(
      m => m.userId.toString() === userId
    );

    if (existingMember) {
      return res.status(400).json({
        success: false,
        error: 'User is already a member of this team'
      });
    }

    // Add member
    team.members.push({
      userId,
      role,
      joinedAt: new Date()
    });

    await team.save();

    const updatedTeam = await Team.findById(id)
      .populate('members.userId', 'name email')
      .populate('createdBy', 'name email');

    logger.info('Added member to team', { teamId: id, newMemberId: userId, role, addedBy: req.userId });

    res.status(201).json({
      success: true,
      data: updatedTeam,
      message: 'Member added successfully'
    });
  } catch (error) {
    logger.error('Failed to add member', { teamId: req.params.id, userId: req.userId, error: error.message });
    next(error);
  }
});

/**
 * PUT /api/teams/:id/members/:memberId
 * Update member role
 */
router.put('/:id/members/:memberId', auth, updateMemberRoleValidation, validate, async (req, res, next) => {
  try {
    const { id, memberId } = req.params;
    const { role } = req.body;

    const team = await Team.findById(id);

    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    // Check if requester is admin
    const requester = team.members.find(
      m => m.userId.toString() === req.userId
    );

    if (!requester || requester.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only admins can change member roles'
      });
    }

    // Find member to update
    const memberIndex = team.members.findIndex(
      m => m.userId.toString() === memberId
    );

    if (memberIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Member not found in this team'
      });
    }

    // Prevent removing last admin
    if (team.members[memberIndex].role === 'admin' && role !== 'admin') {
      const adminCount = team.members.filter(m => m.role === 'admin').length;
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          error: 'Cannot change role. Team must have at least one admin'
        });
      }
    }

    // Update role
    team.members[memberIndex].role = role;

    await team.save();

    const updatedTeam = await Team.findById(id)
      .populate('members.userId', 'name email')
      .populate('createdBy', 'name email');

    logger.info('Updated member role', { teamId: id, memberId, newRole: role, updatedBy: req.userId });

    res.json({
      success: true,
      data: updatedTeam,
      message: 'Member role updated successfully'
    });
  } catch (error) {
    logger.error('Failed to update member role', { teamId: req.params.id, memberId: req.params.memberId, userId: req.userId, error: error.message });
    next(error);
  }
});

/**
 * DELETE /api/teams/:id/members/:memberId
 * Remove member from team
 */
router.delete('/:id/members/:memberId', auth, removeMemberValidation, validate, async (req, res, next) => {
  try {
    const { id, memberId } = req.params;

    const team = await Team.findById(id);

    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    // Check if requester is admin or the member themselves
    const requester = team.members.find(
      m => m.userId.toString() === req.userId
    );

    const isAdmin = requester && requester.role === 'admin';
    const isSelf = req.userId === memberId;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({
