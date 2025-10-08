// File: src/routes/tasks.js
// Generated: 2025-10-08 13:17:04 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_ena23n8zuyd9


const Project = require('../models/Project');


const Task = require('../models/Task');


const express = require('express');


const logger = require('../utils/logger');

const { auth } = require('../middleware/auth');

const { body, param, query } = require('express-validator');

const { validate } = require('../middleware/validator');


const router = express.Router();

/**
 * Validation rules for task creation
 */


const createTaskValidation = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }).withMessage('Title must be less than 200 characters'),
  body('description').optional().trim().isLength({ max: 5000 }).withMessage('Description must be less than 5000 characters'),
  body('projectId').notEmpty().withMessage('Project ID is required').isMongoId().withMessage('Invalid project ID'),
  body('assignedTo').optional().isArray().withMessage('Assigned to must be an array'),
  body('assignedTo.*').optional().isMongoId().withMessage('Invalid user ID in assignedTo'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority value'),
  body('status').optional().isIn(['todo', 'in_progress', 'in_review', 'completed', 'cancelled']).withMessage('Invalid status value'),
  body('dueDate').optional().isISO8601().withMessage('Invalid due date format'),
  body('estimatedHours').optional().isFloat({ min: 0 }).withMessage('Estimated hours must be a positive number'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('tags.*').optional().trim().notEmpty().withMessage('Tag cannot be empty')
];

/**
 * Validation rules for task update
 */


const updateTaskValidation = [
  param('id').isMongoId().withMessage('Invalid task ID'),
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty').isLength({ max: 200 }).withMessage('Title must be less than 200 characters'),
  body('description').optional().trim().isLength({ max: 5000 }).withMessage('Description must be less than 5000 characters'),
  body('assignedTo').optional().isArray().withMessage('Assigned to must be an array'),
  body('assignedTo.*').optional().isMongoId().withMessage('Invalid user ID in assignedTo'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority value'),
  body('status').optional().isIn(['todo', 'in_progress', 'in_review', 'completed', 'cancelled']).withMessage('Invalid status value'),
  body('dueDate').optional().isISO8601().withMessage('Invalid due date format'),
  body('estimatedHours').optional().isFloat({ min: 0 }).withMessage('Estimated hours must be a positive number'),
  body('actualHours').optional().isFloat({ min: 0 }).withMessage('Actual hours must be a positive number'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('tags.*').optional().trim().notEmpty().withMessage('Tag cannot be empty')
];

/**
 * Validation rules for status update
 */


const updateStatusValidation = [
  param('id').isMongoId().withMessage('Invalid task ID'),
  body('status').notEmpty().withMessage('Status is required').isIn(['todo', 'in_progress', 'in_review', 'completed', 'cancelled']).withMessage('Invalid status value')
];

/**
 * Validation rules for assignment update
 */


const updateAssignmentValidation = [
  param('id').isMongoId().withMessage('Invalid task ID'),
  body('assignedTo').isArray().withMessage('Assigned to must be an array'),
  body('assignedTo.*').isMongoId().withMessage('Invalid user ID in assignedTo')
];

/**
 * Validation rules for task query
 */


const queryTasksValidation = [
  query('projectId').optional().isMongoId().withMessage('Invalid project ID'),
  query('status').optional().isIn(['todo', 'in_progress', 'in_review', 'completed', 'cancelled']).withMessage('Invalid status value'),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority value'),
  query('assignedTo').optional().isMongoId().withMessage('Invalid user ID'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

/**
 * GET /api/tasks
 * Get all tasks with filtering and pagination
 */
router.get('/', auth, queryTasksValidation, validate, async (req, res, next) => {
  try {
    const { projectId, status, priority, assignedTo, search, page = 1, limit = 20 } = req.query;
    const userId = req.userId;

    const filter = {};

    if (projectId) {
      filter.project = projectId;

      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      const isMember = project.members.some(member => member.user.toString() === userId);
      if (!isMember) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this project'
        });
      }
    }

    if (status) {
      filter.status = status;
    }

    if (priority) {
      filter.priority = priority;
    }

    if (assignedTo) {
      filter.assignedTo = assignedTo;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate('project', 'name')
        .populate('assignedTo', 'name email')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Task.countDocuments(filter)
    ]);

    logger.info('Fetched tasks', { userId, count: tasks.length, filter });

    res.json({
      success: true,
      data: tasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Failed to fetch tasks', { userId: req.userId, error: error.message });
    next(error);
  }
});

/**
 * GET /api/tasks/:id
 * Get task by ID
 */
router.get('/:id', auth, param('id').isMongoId().withMessage('Invalid task ID'), validate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const task = await Task.findById(id)
      .populate('project', 'name members')
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('subtasks')
      .populate('comments.user', 'name email avatar');

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    const isMember = task.project.members.some(member => member.user.toString() === userId);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this task'
      });
    }

    logger.info('Fetched task by ID', { userId, taskId: id });

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    logger.error('Failed to fetch task', { userId: req.userId, taskId: req.params.id, error: error.message });
    next(error);
  }
});

/**
 * POST /api/tasks
 * Create new task
 */
router.post('/', auth, createTaskValidation, validate, async (req, res, next) => {
  try {
    const { title, description, projectId, assignedTo, priority, status, dueDate, estimatedHours, tags } = req.body;
    const userId = req.userId;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    const userMember = project.members.find(member => member.user.toString() === userId);
    if (!userMember) {
      return res.status(403).json({
        success: false,
        error: 'You are not a member of this project'
      });
    }

    if (userMember.role === 'member') {
      return res.status(403).json({
        success: false,
        error: 'Only managers and admins can create tasks'
      });
    }

    if (assignedTo && assignedTo.length > 0) {
      const validAssignees = assignedTo.every(assigneeId =>
        project.members.some(member => member.user.toString() === assigneeId)
      );

      if (!validAssignees) {
        return res.status(400).json({
          success: false,
          error: 'All assigned users must be project members'
        });
      }
    }

    const task = await Task.create({
      title,
      description,
      project: projectId,
      assignedTo: assignedTo || [],
      priority: priority || 'medium',
      status: status || 'todo',
      dueDate,
      estimatedHours,
      tags: tags || [],
      createdBy: userId
    });

    await task.populate([
      { path: 'project', select: 'name' },
      { path: 'assignedTo', select: 'name email' },
      { path: 'createdBy', select: 'name email' }
    ]);

    logger.info('Created new task', { userId, taskId: task._id, projectId });

    res.status(201).json({
      success: true,
      data: task,
      message: 'Task created successfully'
    });
  } catch (error) {
    logger.error('Failed to create task', { userId: req.userId, error: error.message });
    next(error);
  }
});

/**
 * PUT /api/tasks/:id
 * Update task
 */
router.put('/:id', auth, updateTaskValidation, validate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const updates = req.body;

    const task = await Task.findById(id).populate('project', 'members');
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    const userMember = task.project.members.find(member => member.user.toString() === userId);
    if (!userMember) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this task'
      });
    }

    if (userMember.role === 'member') {
      const isAssigned = task.assignedTo.some(assignee => assignee.toString() === userId);
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          error: 'Only assigned members can update this task'
        });
      }
    }

    if (updates.assignedTo) {
      const validAssignees = updates.assignedTo.every(assigneeId =>
        task.project.members.some(member => member.user.toString() === assigneeId)
      );

      if (!validAssignees) {
        return res.status(400).json({
          success: false,
          error: 'All assigned users must be project members'
        });
      }
    }

    const allowedUpdates = ['title', 'description', 'assignedTo', 'priority', 'status', 'dueDate', 'estimatedHours', 'actualHours', 'tags'];
    const updateData = {};

    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    });

    updateData.updatedAt = Date.now();

    const updatedTask = await Task.findByIdAndUpdate(id, updateData, { new: true })
      .populate('project', 'name')
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    logger.info('Updated task', { userId, taskId: id });

    res.json({
      success: true,
      data: updatedTask,
      message: 'Task updated successfully'
    });
  } catch (error) {
    logger.error('Failed to update task', { userId: req.userId, taskId: req.params.id, error: error.message });
    next(error);
  }
});

/**
 * PATCH /api/tasks/:id/status
 * Update task status
 */
router.patch('/:id/status', auth, updateStatusValidation, validate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.userId;

    const task = await Task.findById(id).populate('project', 'members');
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    const isMember = task.project.members.some(member => member.user.toString() === userId);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this task'
      });
    }

    const isAssigned = task.assignedTo.some(assignee => assignee.toString() === userId);
    const userMember = task.project.members.find(member => member.user.toString() === userId);

    if (userMember.role === 'member' && !isAssigned) {
      return res.status(403).json({
        success: false,
        error: 'Only assigned members can update task status'
      });
    }

    task.status = status;
    task.updatedAt = Date.now();

    if (status === 'completed') {
      task.completedAt = Date.now();
    }

    await task.save();

    await task.populate([
      { path: 'project', select: 'name' },
      { path: 'assignedTo', select: 'name email' },
      { path: 'createdBy', select: 'name email' }
    ]);

    logger.info('Updated task status', { userId, taskId: id, status });

    res.json({
      success: true,
      data: task,
      message: 'Task status updated successfully'
    });
  } catch (error) {
    logger.error('Failed to update task status', { userId: req.userId, taskId: req.params.id, error: error.message });
    next(error);
  }
});

/**
 * PATCH /api/tasks/:id/assign
 * Update task assignment
 */
router.patch('/:id/assign', auth, updateAssignmentVali
