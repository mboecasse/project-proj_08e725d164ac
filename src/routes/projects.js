// File: src/routes/projects.js
// Generated: 2025-10-08 13:16:58 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_8bujcmhoja75


const Project = require('../models/Project');


const Team = require('../models/Team');


const express = require('express');


const logger = require('../utils/logger');

const { auth } = require('../middleware/auth');

const { body, param } = require('express-validator');

const { checkRole, checkProjectAccess } = require('../middleware/rbac');

const { validate } = require('../middleware/validator');


const router = express.Router();

/**
 * Validation rules for project creation
 */


const createProjectValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Project name is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Project name must be between 3 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
  body('teamId')
    .notEmpty()
    .withMessage('Team ID is required')
    .isMongoId()
    .withMessage('Invalid team ID'),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format')
    .custom((value, { req }) => {
      if (req.body.startDate && new Date(value) <= new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  body('status')
    .optional()
    .isIn(['planning', 'active', 'on-hold', 'completed', 'cancelled'])
    .withMessage('Invalid project status'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid priority level')
];

/**
 * Validation rules for project update
 */


const updateProjectValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid project ID'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Project name must be between 3 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
  body('status')
    .optional()
    .isIn(['planning', 'active', 'on-hold', 'completed', 'cancelled'])
    .withMessage('Invalid project status'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid priority level')
];

/**
 * Validation rules for project ID parameter
 */


const projectIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid project ID')
];

/**
 * Validation rules for adding project members
 */


const addMemberValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid project ID'),
  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isMongoId()
    .withMessage('Invalid user ID'),
  body('role')
    .optional()
    .isIn(['manager', 'member'])
    .withMessage('Invalid role')
];

/**
 * GET /api/projects
 * Get all projects (filtered by user's teams)
 */
router.get('/', auth, async (req, res, next) => {
  try {
    const { status, priority, teamId, search, page = 1, limit = 10 } = req.query;

    const query = {};

    // Find teams user belongs to
    const userTeams = await Team.find({
      $or: [
        { owner: req.userId },
        { members: req.userId }
      ]
    }).select('_id');

    const teamIds = userTeams.map(team => team._id);
    query.team = { $in: teamIds };

    // Apply filters
    if (status) {
      query.status = status;
    }

    if (priority) {
      query.priority = priority;
    }

    if (teamId) {
      query.team = teamId;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [projects, total] = await Promise.all([
      Project.find(query)
        .populate('team', 'name')
        .populate('createdBy', 'name email')
        .populate('members.user', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Project.countDocuments(query)
    ]);

    logger.info('Fetched projects', {
      userId: req.userId,
      count: projects.length,
      total,
      page,
      filters: { status, priority, teamId, search }
    });

    res.json({
      success: true,
      data: projects,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Failed to fetch projects', {
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
});

/**
 * GET /api/projects/:id
 * Get project by ID
 */
router.get('/:id', auth, projectIdValidation, validate, checkProjectAccess, async (req, res, next) => {
  try {
    const { id } = req.params;

    const project = await Project.findById(id)
      .populate('team', 'name description')
      .populate('createdBy', 'name email')
      .populate('members.user', 'name email avatar')
      .populate({
        path: 'tasks',
        select: 'title status priority assignee dueDate',
        populate: { path: 'assignee', select: 'name email' }
      });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    logger.info('Fetched project by ID', {
      userId: req.userId,
      projectId: id
    });

    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    logger.error('Failed to fetch project', {
      userId: req.userId,
      projectId: req.params.id,
      error: error.message
    });
    next(error);
  }
});

/**
 * POST /api/projects
 * Create new project
 */
router.post('/', auth, checkRole(['admin', 'manager']), createProjectValidation, validate, async (req, res, next) => {
  try {
    const { name, description, teamId, startDate, endDate, status, priority } = req.body;

    // Verify team exists and user has access
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    // Check if user is team owner or admin
    const isTeamOwner = team.owner.toString() === req.userId;
    const isTeamMember = team.members.some(member => member.toString() === req.userId);

    if (!isTeamOwner && !isTeamMember) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to create projects in this team'
      });
    }

    // Create project
    const project = await Project.create({
      name,
      description,
      team: teamId,
      createdBy: req.userId,
      startDate,
      endDate,
      status: status || 'planning',
      priority: priority || 'medium',
      members: [{
        user: req.userId,
        role: 'manager',
        addedAt: new Date()
      }]
    });

    await project.populate([
      { path: 'team', select: 'name' },
      { path: 'createdBy', select: 'name email' },
      { path: 'members.user', select: 'name email' }
    ]);

    logger.info('Created new project', {
      userId: req.userId,
      projectId: project._id,
      teamId,
      name
    });

    res.status(201).json({
      success: true,
      data: project,
      message: 'Project created successfully'
    });
  } catch (error) {
    logger.error('Failed to create project', {
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
});

/**
 * PUT /api/projects/:id
 * Update project
 */
router.put('/:id', auth, checkProjectAccess, updateProjectValidation, validate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Get project to check permissions
    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check if user is project manager or admin
    const isManager = project.members.some(
      member => member.user.toString() === req.userId && member.role === 'manager'
    );

    if (!isManager && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only project managers can update project details'
      });
    }

    // Validate date logic if both dates are being updated
    if (updates.startDate && updates.endDate) {
      if (new Date(updates.endDate) <= new Date(updates.startDate)) {
        return res.status(400).json({
          success: false,
          error: 'End date must be after start date'
        });
      }
    }

    // Update project
    const updatedProject = await Project.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('team', 'name')
      .populate('createdBy', 'name email')
      .populate('members.user', 'name email');

    logger.info('Updated project', {
      userId: req.userId,
      projectId: id,
      updates: Object.keys(updates)
    });

    res.json({
      success: true,
      data: updatedProject,
      message: 'Project updated successfully'
    });
  } catch (error) {
    logger.error('Failed to update project', {
      userId: req.userId,
      projectId: req.params.id,
      error: error.message
    });
    next(error);
  }
});

/**
 * DELETE /api/projects/:id
 * Delete project
 */
router.delete('/:id', auth, checkRole(['admin', 'manager']), projectIdValidation, validate, checkProjectAccess, async (req, res, next) => {
  try {
    const { id } = req.params;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check if user is project manager or admin
    const isManager = project.members.some(
      member => member.user.toString() === req.userId && member.role === 'manager'
    );

    if (!isManager && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only project managers can delete projects'
      });
    }

    await Project.findByIdAndDelete(id);

    logger.info('Deleted project', {
      userId: req.userId,
      projectId: id
    });

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete project', {
      userId: req.userId,
      projectId: req.params.id,
      error: error.message
    });
    next(error);
  }
});

/**
 * POST /api/projects/:id/members
 * Add member to project
 */
router.post('/:id/members', auth, addMemberValidation, validate, checkProjectAccess, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId, role = 'member' } = req.body;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check if user is project manager or admin
    const isManager = project.members.some(
      member => member.user.toString() === req.userId && member.role === 'manager'
    );

    if (!isManager && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only project managers can add members'
      });
    }

    // Check if user is already a member
    const isMember = project.members.some(
      member => member.user.toString() === userId
    );

    if (isMember) {
      return res.status(400).json({
        success: false,
        error: 'User is already a project member'
      });
    }

    // Verify user is part of the team
    const team = await Team.findById(project.team);
    const isTeamMember = team.members.some(member => member.toString() === userId) ||
                         team.owner.toString() === userId;

    if (!isTeamMember) {
      return res.status(400).json({
        success: false,
        error: 'User must be a team member to be added to project'
      });
    }

    // Add member
    project.members.push({
      user: userId,
      role,
      addedAt: new Date()
    });

    await project.save();
    await project.populate('members.user', 'name email');

    logger.info('Added member to project', {
      userId: req.userId,
      projectId: id,
      newMemberId: userId,
      role
    });

    res.json({
      success: true,
      data: project,
      message: 'Member added successfully'
    });
  } catch (error) {
    logger.error('Failed to add project member', {
      userId: req.userId,
      projectId: req.params.id,
      error: error.message
    });
