// File: src/controllers/taskController.js
// Generated: 2025-10-08 13:15:26 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_54z59455tbnx


const Project = require('../models/Project');


const Task = require('../models/Task');


const logger = require('../utils/logger');

const { successResponse, errorResponse } = require('../utils/response');

/**
 * Get all tasks with filtering, sorting, and pagination
 */
exports.getTasks = async (req, res, next) => {
  try {
    const {
      project,
      assignedTo,
      status,
      priority,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    const userId = req.userId;

    // Build filter
    const filter = {};

    // Filter by project
    if (project) {
      filter.project = project;
    }

    // Filter by assigned user
    if (assignedTo) {
      filter.assignedTo = assignedTo;
    }

    // Filter by status
    if (status) {
      filter.status = status;
    }

    // Filter by priority
    if (priority) {
      filter.priority = priority;
    }

    // Search in title and description
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Get user's accessible projects
    const userProjects = await Project.find({
      $or: [
        { owner: userId },
        { 'team.user': userId }
      ]
    }).select('_id');

    const projectIds = userProjects.map(p => p._id);

    // Only show tasks from accessible projects
    filter.project = { $in: projectIds };

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const tasks = await Task.find(filter)
      .populate('project', 'name')
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await Task.countDocuments(filter);

    logger.info('Fetched tasks', {
      userId,
      count: tasks.length,
      total,
      page,
      filters: filter
    });

    res.json(successResponse(
      {
        tasks,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      },
      'Tasks fetched successfully'
    ));
  } catch (error) {
    logger.error('Failed to fetch tasks', {
      userId: req.userId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Get task by ID
 */
exports.getTaskById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const task = await Task.findById(id)
      .populate('project', 'name owner team')
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('subtasks')
      .populate({
        path: 'comments',
        populate: { path: 'user', select: 'name email' }
      })
      .populate('attachments');

    if (!task) {
      logger.warn('Task not found', { taskId: id, userId });
      return res.status(404).json(errorResponse('Task not found'));
    }

    // Check access permission
    const project = task.project;
    const hasAccess = project.owner.toString() === userId ||
      project.team.some(member => member.user.toString() === userId);

    if (!hasAccess) {
      logger.warn('Unauthorized task access attempt', { taskId: id, userId });
      return res.status(403).json(errorResponse('Access denied'));
    }

    logger.info('Fetched task by ID', { taskId: id, userId });

    res.json(successResponse(task, 'Task fetched successfully'));
  } catch (error) {
    logger.error('Failed to fetch task', {
      taskId: req.params.id,
      userId: req.userId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Create new task
 */
exports.createTask = async (req, res, next) => {
  try {
    const {
      project,
      title,
      description,
      assignedTo,
      priority,
      status,
      dueDate,
      tags
    } = req.body;

    const userId = req.userId;

    // Verify project exists and user has access
    const projectDoc = await Project.findById(project);

    if (!projectDoc) {
      logger.warn('Project not found for task creation', { projectId: project, userId });
      return res.status(404).json(errorResponse('Project not found'));
    }

    // Check if user is owner or manager
    const isOwner = projectDoc.owner.toString() === userId;
    const teamMember = projectDoc.team.find(member => member.user.toString() === userId);
    const isManager = teamMember && teamMember.role === 'manager';

    if (!isOwner && !isManager) {
      logger.warn('Unauthorized task creation attempt', { projectId: project, userId });
      return res.status(403).json(errorResponse('Only project owners and managers can create tasks'));
    }

    // Verify assignedTo user is in project team
    if (assignedTo) {
      const assigneeInTeam = projectDoc.team.some(member => member.user.toString() === assignedTo) ||
        projectDoc.owner.toString() === assignedTo;

      if (!assigneeInTeam) {
        logger.warn('Assigned user not in project team', { assignedTo, projectId: project, userId });
        return res.status(400).json(errorResponse('Assigned user must be a member of the project'));
      }
    }

    // Create task
    const task = await Task.create({
      project,
      title,
      description,
      assignedTo,
      priority: priority || 'medium',
      status: status || 'todo',
      dueDate,
      tags: tags || [],
      createdBy: userId
    });

    // Populate fields
    await task.populate('project', 'name');
    await task.populate('assignedTo', 'name email');
    await task.populate('createdBy', 'name email');

    logger.info('Created new task', {
      taskId: task._id,
      projectId: project,
      userId,
      title
    });

    res.status(201).json(successResponse(task, 'Task created successfully'));
  } catch (error) {
    logger.error('Failed to create task', {
      userId: req.userId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Update task
 */
exports.updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userId = req.userId;

    // Find task
    const task = await Task.findById(id).populate('project', 'owner team');

    if (!task) {
      logger.warn('Task not found for update', { taskId: id, userId });
      return res.status(404).json(errorResponse('Task not found'));
    }

    // Check access permission
    const project = task.project;
    const isOwner = project.owner.toString() === userId;
    const teamMember = project.team.find(member => member.user.toString() === userId);
    const isManager = teamMember && teamMember.role === 'manager';
    const isAssignee = task.assignedTo && task.assignedTo.toString() === userId;

    // Members can only update status and add comments
    if (!isOwner && !isManager && !isAssignee) {
      logger.warn('Unauthorized task update attempt', { taskId: id, userId });
      return res.status(403).json(errorResponse('Access denied'));
    }

    // Restrict what members can update
    if (!isOwner && !isManager && isAssignee) {
      const allowedFields = ['status', 'progress'];
      const updateFields = Object.keys(updates);
      const hasUnauthorizedFields = updateFields.some(field => !allowedFields.includes(field));

      if (hasUnauthorizedFields) {
        logger.warn('Member attempted unauthorized field update', { taskId: id, userId, fields: updateFields });
        return res.status(403).json(errorResponse('You can only update task status and progress'));
      }
    }

    // Don't allow changing project or createdBy
    delete updates.project;
    delete updates.createdBy;

    // Verify assignedTo user is in project team if being updated
    if (updates.assignedTo) {
      const assigneeInTeam = project.team.some(member => member.user.toString() === updates.assignedTo) ||
        project.owner.toString() === updates.assignedTo;

      if (!assigneeInTeam) {
        logger.warn('Assigned user not in project team', { assignedTo: updates.assignedTo, taskId: id, userId });
        return res.status(400).json(errorResponse('Assigned user must be a member of the project'));
      }
    }

    // Update task
    const updatedTask = await Task.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: Date.now() },
      { new: true, runValidators: true }
    )
      .populate('project', 'name')
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    logger.info('Updated task', {
      taskId: id,
      userId,
      updates: Object.keys(updates)
    });

    res.json(successResponse(updatedTask, 'Task updated successfully'));
  } catch (error) {
    logger.error('Failed to update task', {
      taskId: req.params.id,
      userId: req.userId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Delete task
 */
exports.deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Find task
    const task = await Task.findById(id).populate('project', 'owner team');

    if (!task) {
      logger.warn('Task not found for deletion', { taskId: id, userId });
      return res.status(404).json(errorResponse('Task not found'));
    }

    // Check access permission - only owner and managers can delete
    const project = task.project;
    const isOwner = project.owner.toString() === userId;
    const teamMember = project.team.find(member => member.user.toString() === userId);
    const isManager = teamMember && teamMember.role === 'manager';

    if (!isOwner && !isManager) {
      logger.warn('Unauthorized task deletion attempt', { taskId: id, userId });
      return res.status(403).json(errorResponse('Only project owners and managers can delete tasks'));
    }

    // Delete task
    await Task.findByIdAndDelete(id);

    logger.info('Deleted task', { taskId: id, userId });

    res.json(successResponse(null, 'Task deleted successfully'));
  } catch (error) {
    logger.error('Failed to delete task', {
      taskId: req.params.id,
      userId: req.userId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Get tasks by project
 */
exports.getTasksByProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId;
    const {
      status,
      priority,
      assignedTo,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Verify project exists and user has access
    const project = await Project.findById(projectId);

    if (!project) {
      logger.warn('Project not found', { projectId, userId });
      return res.status(404).json(errorResponse('Project not found'));
    }

    // Check access
    const hasAccess = project.owner.toString() === userId ||
      project.team.some(member => member.user.toString() === userId);

    if (!hasAccess) {
      logger.warn('Unauthorized project access attempt', { projectId, userId });
      return res.status(403).json(errorResponse('Access denied'));
    }

    // Build filter
    const filter = { project: projectId };

    if (status) {
      filter.status = status;
    }

    if (priority) {
      filter.priority = priority;
    }

    if (assignedTo) {
      filter.assignedTo = assignedTo;
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Fetch tasks
    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort(sort);

    logger.info('Fetched tasks by project', {
      projectId,
      userId,
      count: tasks.length
    });

    res.json(successResponse(tasks, 'Tasks fetched successfully'));
  } catch (error) {
    logger.error('Failed to fetch tasks by project', {
      projectId: req.params.projectId,
      userId: req.userId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Get tasks assigned to user
 */
exports.getMyTasks = async (req, res, next) => {
  try {
    const userId = req.userId;
    const {
      status,
      priority,
      project,
      sortBy = 'dueDate',
      sortOrder = 'asc'
    } = req.query;

    // Build filter
    const filter = { assignedTo: userId };

    if (status) {
      filter.status = status;
    }

    if (priority) {
      filter.priority = priority;
    }

    if (project) {
      filter.project = project;
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Fetch tasks
    const tasks = await Task.find(filter)
      .populate('project', 'name')
      .populate('createdBy', 'name email')
      .sort(sort);

    logger.info('Fetched user tasks', {
      userId,
      count: tasks.length
    });

    res.json(successResponse(tasks, 'Your tasks fetched successfully'));
  } catch (error) {
    logger.error('Failed to fetch user tasks', {
      userId: req.userId,
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Update task status
 */
exports.updateTaskStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.userId;

    if (!status) {
      return res.status(400).json(errorResponse('Status is required'));
    }

    // Find task
    const task = await Task.findById(id).populate('project', 'owner team');

    if (!task) {
      logger.warn('Task not found for status
