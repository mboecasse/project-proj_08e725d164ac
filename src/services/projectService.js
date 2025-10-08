// File: src/services/projectService.js
// Generated: 2025-10-08 13:15:31 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_zl72w1bie141


const Project = require('../models/Project');


const Team = require('../models/Team');


const logger = require('../utils/logger');


const mongoose = require('mongoose');

/**
 * Create a new project
 * @param {Object} projectData - Project data
 * @param {string} userId - ID of user creating the project
 * @returns {Promise<Object>} Created project
 */
exports.createProject = async (projectData, userId) => {
  try {
    const { name, description, teamId, status, priority, startDate, endDate, settings } = projectData;

    // Verify team exists and user has access
    const team = await Team.findById(teamId);
    if (!team) {
      const error = new Error('Team not found');
      error.statusCode = 404;
      throw error;
    }

    // Check if user is team owner or member
    const isMember = team.members.some(
      member => member.user.toString() === userId.toString()
    );
    const isOwner = team.owner.toString() === userId.toString();

    if (!isMember && !isOwner) {
      const error = new Error('You do not have permission to create projects in this team');
      error.statusCode = 403;
      throw error;
    }

    // Create project
    const project = await Project.create({
      name,
      description,
      team: teamId,
      status: status || 'planning',
      priority: priority || 'medium',
      startDate,
      endDate,
      settings: settings || {},
      createdBy: userId
    });

    logger.info('Project created', { projectId: project._id, teamId, userId });

    return project;
  } catch (error) {
    logger.error('Failed to create project', { error: error.message, userId });
    throw error;
  }
};

/**
 * Get all projects for a team
 * @param {string} teamId - Team ID
 * @param {string} userId - ID of requesting user
 * @param {Object} filters - Optional filters (status, priority)
 * @returns {Promise<Array>} List of projects
 */
exports.getTeamProjects = async (teamId, userId, filters = {}) => {
  try {
    // Verify team exists and user has access
    const team = await Team.findById(teamId);
    if (!team) {
      const error = new Error('Team not found');
      error.statusCode = 404;
      throw error;
    }

    const isMember = team.members.some(
      member => member.user.toString() === userId.toString()
    );
    const isOwner = team.owner.toString() === userId.toString();

    if (!isMember && !isOwner) {
      const error = new Error('You do not have permission to view projects in this team');
      error.statusCode = 403;
      throw error;
    }

    // Build query
    const query = { team: teamId };
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.priority) {
      query.priority = filters.priority;
    }

    const projects = await Project.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    logger.info('Fetched team projects', { teamId, count: projects.length, userId });

    return projects;
  } catch (error) {
    logger.error('Failed to fetch team projects', { teamId, userId, error: error.message });
    throw error;
  }
};

/**
 * Get project by ID
 * @param {string} projectId - Project ID
 * @param {string} userId - ID of requesting user
 * @returns {Promise<Object>} Project details
 */
exports.getProjectById = async (projectId, userId) => {
  try {
    const project = await Project.findById(projectId)
      .populate('team', 'name description')
      .populate('createdBy', 'name email');

    if (!project) {
      const error = new Error('Project not found');
      error.statusCode = 404;
      throw error;
    }

    // Verify user has access to team
    const team = await Team.findById(project.team._id);
    const isMember = team.members.some(
      member => member.user.toString() === userId.toString()
    );
    const isOwner = team.owner.toString() === userId.toString();

    if (!isMember && !isOwner) {
      const error = new Error('You do not have permission to view this project');
      error.statusCode = 403;
      throw error;
    }

    logger.info('Fetched project by ID', { projectId, userId });

    return project;
  } catch (error) {
    logger.error('Failed to fetch project', { projectId, userId, error: error.message });
    throw error;
  }
};

/**
 * Update project
 * @param {string} projectId - Project ID
 * @param {Object} updates - Project updates
 * @param {string} userId - ID of user updating the project
 * @returns {Promise<Object>} Updated project
 */
exports.updateProject = async (projectId, updates, userId) => {
  try {
    const project = await Project.findById(projectId);

    if (!project) {
      const error = new Error('Project not found');
      error.statusCode = 404;
      throw error;
    }

    // Verify user has permission to update
    const team = await Team.findById(project.team);
    const isOwner = team.owner.toString() === userId.toString();
    const isManager = team.members.some(
      member => member.user.toString() === userId.toString() && member.role === 'manager'
    );

    if (!isOwner && !isManager) {
      const error = new Error('You do not have permission to update this project');
      error.statusCode = 403;
      throw error;
    }

    // Update allowed fields
    const allowedUpdates = ['name', 'description', 'status', 'priority', 'startDate', 'endDate', 'settings'];
    const updateFields = {};

    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        updateFields[field] = updates[field];
      }
    });

    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      { $set: updateFields },
      { new: true, runValidators: true }
    )
      .populate('team', 'name description')
      .populate('createdBy', 'name email');

    logger.info('Project updated', { projectId, userId, updates: Object.keys(updateFields) });

    return updatedProject;
  } catch (error) {
    logger.error('Failed to update project', { projectId, userId, error: error.message });
    throw error;
  }
};

/**
 * Delete project
 * @param {string} projectId - Project ID
 * @param {string} userId - ID of user deleting the project
 * @returns {Promise<void>}
 */
exports.deleteProject = async (projectId, userId) => {
  try {
    const project = await Project.findById(projectId);

    if (!project) {
      const error = new Error('Project not found');
      error.statusCode = 404;
      throw error;
    }

    // Verify user has permission to delete (only team owner)
    const team = await Team.findById(project.team);
    const isOwner = team.owner.toString() === userId.toString();

    if (!isOwner) {
      const error = new Error('Only team owner can delete projects');
      error.statusCode = 403;
      throw error;
    }

    await Project.findByIdAndDelete(projectId);

    logger.info('Project deleted', { projectId, userId });
  } catch (error) {
    logger.error('Failed to delete project', { projectId, userId, error: error.message });
    throw error;
  }
};

/**
 * Update project status
 * @param {string} projectId - Project ID
 * @param {string} status - New status
 * @param {string} userId - ID of user updating status
 * @returns {Promise<Object>} Updated project
 */
exports.updateProjectStatus = async (projectId, status, userId) => {
  try {
    const project = await Project.findById(projectId);

    if (!project) {
      const error = new Error('Project not found');
      error.statusCode = 404;
      throw error;
    }

    // Verify user has permission
    const team = await Team.findById(project.team);
    const isOwner = team.owner.toString() === userId.toString();
    const isManager = team.members.some(
      member => member.user.toString() === userId.toString() && member.role === 'manager'
    );

    if (!isOwner && !isManager) {
      const error = new Error('You do not have permission to update project status');
      error.statusCode = 403;
      throw error;
    }

    // Validate status
    const validStatuses = ['planning', 'active', 'on-hold', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      const error = new Error('Invalid project status');
      error.statusCode = 400;
      throw error;
    }

    project.status = status;
    await project.save();

    logger.info('Project status updated', { projectId, status, userId });

    return project;
  } catch (error) {
    logger.error('Failed to update project status', { projectId, status, userId, error: error.message });
    throw error;
  }
};

/**
 * Get project statistics
 * @param {string} projectId - Project ID
 * @param {string} userId - ID of requesting user
 * @returns {Promise<Object>} Project statistics
 */
exports.getProjectStats = async (projectId, userId) => {
  try {
    const project = await Project.findById(projectId);

    if (!project) {
      const error = new Error('Project not found');
      error.statusCode = 404;
      throw error;
    }

    // Verify user has access
    const team = await Team.findById(project.team);
    const isMember = team.members.some(
      member => member.user.toString() === userId.toString()
    );
    const isOwner = team.owner.toString() === userId.toString();

    if (!isMember && !isOwner) {
      const error = new Error('You do not have permission to view project statistics');
      error.statusCode = 403;
      throw error;
    }

    // Calculate project duration
    let duration = null;
    if (project.startDate && project.endDate) {
      const start = new Date(project.startDate);
      const end = new Date(project.endDate);
      duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)); // days
    }

    const stats = {
      projectId: project._id,
      name: project.name,
      status: project.status,
      priority: project.priority,
      duration,
      startDate: project.startDate,
      endDate: project.endDate,
      createdAt: project.createdAt
    };

    logger.info('Fetched project statistics', { projectId, userId });

    return stats;
  } catch (error) {
    logger.error('Failed to fetch project statistics', { projectId, userId, error: error.message });
    throw error;
  }
};

/**
 * Search projects
 * @param {string} teamId - Team ID
 * @param {string} searchQuery - Search query
 * @param {string} userId - ID of requesting user
 * @returns {Promise<Array>} Matching projects
 */
exports.searchProjects = async (teamId, searchQuery, userId) => {
  try {
    // Verify team exists and user has access
    const team = await Team.findById(teamId);
    if (!team) {
      const error = new Error('Team not found');
      error.statusCode = 404;
      throw error;
    }

    const isMember = team.members.some(
      member => member.user.toString() === userId.toString()
    );
    const isOwner = team.owner.toString() === userId.toString();

    if (!isMember && !isOwner) {
      const error = new Error('You do not have permission to search projects in this team');
      error.statusCode = 403;
      throw error;
    }

    // Search projects by name or description
    const projects = await Project.find({
      team: teamId,
      $or: [
        { name: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } }
      ]
    })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    logger.info('Searched projects', { teamId, query: searchQuery, count: projects.length, userId });

    return projects;
  } catch (error) {
    logger.error('Failed to search projects', { teamId, query: searchQuery, userId, error: error.message });
    throw error;
  }
};
