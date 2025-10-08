// File: src/controllers/projectController.js
// Generated: 2025-10-08 13:15:27 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_z5p9b7vt085u


const Project = require('../models/Project');


const Task = require('../models/Task');


const Team = require('../models/Team');


const logger = require('../utils/logger');

const { successResponse, errorResponse } = require('../utils/response');

/**
 * Get all projects
 * @route GET /api/projects
 * @access Private
 */
exports.getAllProjects = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, teamId, search } = req.query;
    const userId = req.userId;

    const query = {};

    // Filter by team membership
    if (teamId) {
      query.team = teamId;
    } else {
      // Get all teams user is member of
      const userTeams = await Team.find({
        $or: [
          { owner: userId },
          { members: userId }
        ]
      }).select('_id');
      query.team = { $in: userTeams.map(t => t._id) };
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Search by name or description
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
        .populate('owner', 'name email')
        .populate('members', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Project.countDocuments(query)
    ]);

    logger.info('Fetched projects', {
      userId,
      count: projects.length,
      total,
      page,
      filters: { status, teamId, search }
    });

    res.json(successResponse(
      {
        projects,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      },
      'Projects fetched successfully'
    ));
  } catch (error) {
    logger.error('Failed to fetch projects', {
      userId: req.userId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Get project by ID
 * @route GET /api/projects/:id
 * @access Private
 */
exports.getProjectById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const project = await Project.findById(id)
      .populate('team', 'name description')
      .populate('owner', 'name email avatar')
      .populate('members', 'name email avatar')
      .lean();

    if (!project) {
      logger.warn('Project not found', { projectId: id, userId });
      return res.status(404).json(errorResponse('Project not found'));
    }

    // Check if user has access to this project
    const team = await Team.findById(project.team._id);
    const hasAccess = team.owner.toString() === userId ||
                     team.members.some(m => m.toString() === userId);

    if (!hasAccess) {
      logger.warn('Unauthorized project access attempt', { projectId: id, userId });
      return res.status(403).json(errorResponse('Access denied'));
    }

    // Get task statistics
    const taskStats = await Task.aggregate([
      { $match: { project: project._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const stats = {
      total: 0,
      todo: 0,
      inProgress: 0,
      completed: 0
    };

    taskStats.forEach(stat => {
      stats[stat._id] = stat.count;
      stats.total += stat.count;
    });

    logger.info('Fetched project by ID', { projectId: id, userId });

    res.json(successResponse(
      { ...project, taskStats: stats },
      'Project fetched successfully'
    ));
  } catch (error) {
    logger.error('Failed to fetch project', {
      projectId: req.params.id,
      userId: req.userId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Create new project
 * @route POST /api/projects
 * @access Private
 */
exports.createProject = async (req, res, next) => {
  try {
    const { name, description, team, startDate, endDate, status, priority, members } = req.body;
    const userId = req.userId;

    // Verify team exists and user has permission
    const teamDoc = await Team.findById(team);
    if (!teamDoc) {
      return res.status(404).json(errorResponse('Team not found'));
    }

    const isOwner = teamDoc.owner.toString() === userId;
    const isManager = teamDoc.members.some(m =>
      m.user.toString() === userId && m.role === 'manager'
    );

    if (!isOwner && !isManager) {
      logger.warn('Unauthorized project creation attempt', { teamId: team, userId });
      return res.status(403).json(errorResponse('Only team owners and managers can create projects'));
    }

    // Validate members belong to team
    if (members && members.length > 0) {
      const teamMemberIds = teamDoc.members.map(m => m.user.toString());
      const invalidMembers = members.filter(m => !teamMemberIds.includes(m));

      if (invalidMembers.length > 0) {
        return res.status(400).json(errorResponse('Some members are not part of the team'));
      }
    }

    const project = await Project.create({
      name,
      description,
      team,
      owner: userId,
      startDate,
      endDate,
      status: status || 'planning',
      priority: priority || 'medium',
      members: members || []
    });

    const populatedProject = await Project.findById(project._id)
      .populate('team', 'name')
      .populate('owner', 'name email')
      .populate('members', 'name email');

    logger.info('Created new project', {
      projectId: project._id,
      projectName: name,
      teamId: team,
      userId
    });

    res.status(201).json(successResponse(
      populatedProject,
      'Project created successfully'
    ));
  } catch (error) {
    logger.error('Failed to create project', {
      userId: req.userId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Update project
 * @route PUT /api/projects/:id
 * @access Private
 */
exports.updateProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const updates = req.body;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json(errorResponse('Project not found'));
    }

    // Check permissions
    const team = await Team.findById(project.team);
    const isOwner = team.owner.toString() === userId;
    const isManager = team.members.some(m =>
      m.user.toString() === userId && m.role === 'manager'
    );
    const isProjectOwner = project.owner.toString() === userId;

    if (!isOwner && !isManager && !isProjectOwner) {
      logger.warn('Unauthorized project update attempt', { projectId: id, userId });
      return res.status(403).json(errorResponse('Access denied'));
    }

    // Don't allow changing team or owner
    delete updates.team;
    delete updates.owner;

    // Validate members if provided
    if (updates.members) {
      const teamMemberIds = team.members.map(m => m.user.toString());
      const invalidMembers = updates.members.filter(m => !teamMemberIds.includes(m));

      if (invalidMembers.length > 0) {
        return res.status(400).json(errorResponse('Some members are not part of the team'));
      }
    }

    const updatedProject = await Project.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('team', 'name')
      .populate('owner', 'name email')
      .populate('members', 'name email');

    logger.info('Updated project', {
      projectId: id,
      userId,
      updates: Object.keys(updates)
    });

    res.json(successResponse(
      updatedProject,
      'Project updated successfully'
    ));
  } catch (error) {
    logger.error('Failed to update project', {
      projectId: req.params.id,
      userId: req.userId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Delete project
 * @route DELETE /api/projects/:id
 * @access Private
 */
exports.deleteProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json(errorResponse('Project not found'));
    }

    // Check permissions - only team owner or project owner can delete
    const team = await Team.findById(project.team);
    const isTeamOwner = team.owner.toString() === userId;
    const isProjectOwner = project.owner.toString() === userId;

    if (!isTeamOwner && !isProjectOwner) {
      logger.warn('Unauthorized project deletion attempt', { projectId: id, userId });
      return res.status(403).json(errorResponse('Only team owner or project owner can delete projects'));
    }

    // Check if project has tasks
    const taskCount = await Task.countDocuments({ project: id });
    if (taskCount > 0) {
      return res.status(400).json(errorResponse(
        `Cannot delete project with ${taskCount} task(s). Please delete or reassign tasks first.`
      ));
    }

    await Project.findByIdAndDelete(id);

    logger.info('Deleted project', {
      projectId: id,
      projectName: project.name,
      userId
    });

    res.json(successResponse(
      null,
      'Project deleted successfully'
    ));
  } catch (error) {
    logger.error('Failed to delete project', {
      projectId: req.params.id,
      userId: req.userId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Add member to project
 * @route POST /api/projects/:id/members
 * @access Private
 */
exports.addMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId: memberUserId } = req.body;
    const userId = req.userId;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json(errorResponse('Project not found'));
    }

    // Check permissions
    const team = await Team.findById(project.team);
    const isOwner = team.owner.toString() === userId;
    const isManager = team.members.some(m =>
      m.user.toString() === userId && m.role === 'manager'
    );
    const isProjectOwner = project.owner.toString() === userId;

    if (!isOwner && !isManager && !isProjectOwner) {
      logger.warn('Unauthorized add member attempt', { projectId: id, userId });
      return res.status(403).json(errorResponse('Access denied'));
    }

    // Verify member is part of team
    const isMemberInTeam = team.members.some(m => m.user.toString() === memberUserId);
    if (!isMemberInTeam) {
      return res.status(400).json(errorResponse('User is not a member of the team'));
    }

    // Check if already a member
    if (project.members.includes(memberUserId)) {
      return res.status(400).json(errorResponse('User is already a project member'));
    }

    project.members.push(memberUserId);
    await project.save();

    const updatedProject = await Project.findById(id)
      .populate('members', 'name email avatar');

    logger.info('Added member to project', {
      projectId: id,
      newMemberId: memberUserId,
      userId
    });

    res.json(successResponse(
      updatedProject,
      'Member added successfully'
    ));
  } catch (error) {
    logger.error('Failed to add member to project', {
      projectId: req.params.id,
      userId: req.userId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Remove member from project
 * @route DELETE /api/projects/:id/members/:memberId
 * @access Private
 */
exports.removeMember = async (req, res, next) => {
  try {
    const { id, memberId } = req.params;
    const userId = req.userId;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json(errorResponse('Project not found'));
    }

    // Check permissions
    const team = await Team.findById(project.team);
    const isOwner = team.owner.toString() === userId;
    const isManager = team.members.some(m =>
      m.user.toString() === userId && m.role === 'manager'
    );
    const isProjectOwner = project.owner.toString() === userId;

    if (!isOwner && !isManager && !isProjectOwner) {
      logger.warn('Unauthorized remove member attempt', { projectId: id, userId });
      return res.status(403).json(errorResponse('Access denied'));
    }

    // Cannot remove project owner
    if (project.owner.toString() === memberId) {
      return res.status(400).json(errorResponse('Cannot remove project owner'));
    }

    project.members = project.members.filter(m => m.toString() !== memberId);
    await project.save();

    // Unassign tasks from removed member
    await Task.updateMany(
      { project: id, assignedTo: memberId },
      { $set: { assignedTo: null } }
    );

    const updatedProject = await Project.findById(id)
      .populate('members', 'name email avatar');

    logger.info('Removed member from project', {
      projectId: id,
      removedMemberId: memberId,
      userId
    });

    res.json(successResponse(
      updatedProject,
      'Member removed successfully'
    ));
  } catch (error) {
    logger.error('Failed to remove member from project', {
      projectId: req.params.id,
      userId: req.userId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Get project statistics
 * @route GET /api/projects/:id/stats
 * @access Private
 */
exports.getProjectStats = async (req, res, next) => {
  try {
    const { id } = req.params;
    const
