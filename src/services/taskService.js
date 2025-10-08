// File: src/services/taskService.js
// Generated: 2025-10-08 13:18:11 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_h7n3v24vxuc9


const Project = require('../models/Project');


const Task = require('../models/Task');


const logger = require('../utils/logger');


const mongoose = require('mongoose');


const notificationService = require('./notificationService');


const socketService = require('./socketService');

/**
 * Task Service
 * Handles all task-related business logic including CRUD operations,
 * assignments, status updates, and workflow management
 */

/**
 * Create a new task
 * @param {Object} taskData - Task data
 * @param {String} userId - ID of user creating the task
 * @returns {Promise<Object>} Created task
 */
exports.createTask = async (taskData, userId) => {
  try {
    const { projectId, title, description, priority, status, dueDate, assignedTo, tags, dependencies } = taskData;

    // Verify project exists and user has access
    const project = await Project.findById(projectId);
    if (!project) {
      const error = new Error('Project not found');
      error.statusCode = 404;
      throw error;
    }

    // Verify user is member of project team
    const isMember = project.team.some(member => member.user.toString() === userId);
    if (!isMember) {
      const error = new Error('You do not have access to this project');
      error.statusCode = 403;
      throw error;
    }

    // Verify assigned users are project members
    if (assignedTo && assignedTo.length > 0) {
      const projectMemberIds = project.team.map(member => member.user.toString());
      const invalidAssignees = assignedTo.filter(id => !projectMemberIds.includes(id.toString()));

      if (invalidAssignees.length > 0) {
        const error = new Error('Some assigned users are not members of this project');
        error.statusCode = 400;
        throw error;
      }
    }

    // Verify dependencies exist and belong to same project
    if (dependencies && dependencies.length > 0) {
      const dependencyTasks = await Task.find({ _id: { $in: dependencies }, project: projectId });
      if (dependencyTasks.length !== dependencies.length) {
        const error = new Error('Some dependency tasks not found or belong to different project');
        error.statusCode = 400;
        throw error;
      }
    }

    // Create task
    const task = await Task.create({
      project: projectId,
      title,
      description,
      priority: priority || 'medium',
      status: status || 'todo',
      dueDate,
      assignedTo: assignedTo || [],
      tags: tags || [],
      dependencies: dependencies || [],
      createdBy: userId
    });

    // Populate task data
    await task.populate([
      { path: 'project', select: 'name' },
      { path: 'assignedTo', select: 'name email' },
      { path: 'createdBy', select: 'name email' }
    ]);

    logger.info('Task created', { taskId: task._id, projectId, userId });

    // Send notifications to assigned users
    if (assignedTo && assignedTo.length > 0) {
      const notificationPromises = assignedTo.map(assigneeId =>
        notificationService.createNotification({
          user: assigneeId,
          type: 'task_assigned',
          title: 'New Task Assigned',
          message: `You have been assigned to task: ${title}`,
          relatedTask: task._id,
          relatedProject: projectId
        })
      );
      await Promise.all(notificationPromises);
    }

    // Broadcast real-time event
    socketService.emitToProject(projectId.toString(), 'task:created', {
      task: task.toObject(),
      createdBy: userId
    });

    return task;
  } catch (error) {
    logger.error('Failed to create task', { error: error.message, userId });
    throw error;
  }
};

/**
 * Get task by ID
 * @param {String} taskId - Task ID
 * @param {String} userId - ID of user requesting the task
 * @returns {Promise<Object>} Task data
 */
exports.getTaskById = async (taskId, userId) => {
  try {
    const task = await Task.findById(taskId)
      .populate('project', 'name team')
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('dependencies', 'title status')
      .populate('subtasks.createdBy', 'name email')
      .populate('comments.user', 'name email avatar')
      .populate('attachments.uploadedBy', 'name email');

    if (!task) {
      const error = new Error('Task not found');
      error.statusCode = 404;
      throw error;
    }

    // Verify user has access to project
    const isMember = task.project.team.some(member => member.user.toString() === userId);
    if (!isMember) {
      const error = new Error('You do not have access to this task');
      error.statusCode = 403;
      throw error;
    }

    logger.info('Task retrieved', { taskId, userId });

    return task;
  } catch (error) {
    logger.error('Failed to get task', { taskId, error: error.message, userId });
    throw error;
  }
};

/**
 * Get all tasks for a project
 * @param {String} projectId - Project ID
 * @param {String} userId - ID of user requesting tasks
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} Array of tasks
 */
exports.getProjectTasks = async (projectId, userId, filters = {}) => {
  try {
    // Verify project exists and user has access
    const project = await Project.findById(projectId);
    if (!project) {
      const error = new Error('Project not found');
      error.statusCode = 404;
      throw error;
    }

    const isMember = project.team.some(member => member.user.toString() === userId);
    if (!isMember) {
      const error = new Error('You do not have access to this project');
      error.statusCode = 403;
      throw error;
    }

    // Build query
    const query = { project: projectId };

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.priority) {
      query.priority = filters.priority;
    }

    if (filters.assignedTo) {
      query.assignedTo = filters.assignedTo;
    }

    if (filters.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags };
    }

    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } }
      ];
    }

    // Execute query
    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email')
      .sort(filters.sortBy || '-createdAt')
      .lean();

    logger.info('Project tasks retrieved', { projectId, count: tasks.length, userId });

    return tasks;
  } catch (error) {
    logger.error('Failed to get project tasks', { projectId, error: error.message, userId });
    throw error;
  }
};

/**
 * Update task
 * @param {String} taskId - Task ID
 * @param {Object} updates - Update data
 * @param {String} userId - ID of user updating the task
 * @returns {Promise<Object>} Updated task
 */
exports.updateTask = async (taskId, updates, userId) => {
  try {
    const task = await Task.findById(taskId).populate('project', 'team');

    if (!task) {
      const error = new Error('Task not found');
      error.statusCode = 404;
      throw error;
    }

    // Verify user has access
    const isMember = task.project.team.some(member => member.user.toString() === userId);
    if (!isMember) {
      const error = new Error('You do not have access to this task');
      error.statusCode = 403;
      throw error;
    }

    // Track changes for notifications
    const changes = {};
    const oldStatus = task.status;
    const oldAssignees = task.assignedTo.map(id => id.toString());

    // Validate and apply updates
    const allowedUpdates = ['title', 'description', 'priority', 'status', 'dueDate', 'assignedTo', 'tags', 'dependencies'];
    const updateKeys = Object.keys(updates).filter(key => allowedUpdates.includes(key));

    // Verify new assignees are project members
    if (updates.assignedTo) {
      const projectMemberIds = task.project.team.map(member => member.user.toString());
      const invalidAssignees = updates.assignedTo.filter(id => !projectMemberIds.includes(id.toString()));

      if (invalidAssignees.length > 0) {
        const error = new Error('Some assigned users are not members of this project');
        error.statusCode = 400;
        throw error;
      }
    }

    // Verify dependencies
    if (updates.dependencies) {
      const dependencyTasks = await Task.find({
        _id: { $in: updates.dependencies },
        project: task.project._id
      });
      if (dependencyTasks.length !== updates.dependencies.length) {
        const error = new Error('Some dependency tasks not found or belong to different project');
        error.statusCode = 400;
        throw error;
      }
    }

    // Apply updates
    updateKeys.forEach(key => {
      if (updates[key] !== undefined) {
        changes[key] = { old: task[key], new: updates[key] };
        task[key] = updates[key];
      }
    });

    task.updatedAt = Date.now();
    await task.save();

    await task.populate([
      { path: 'assignedTo', select: 'name email avatar' },
      { path: 'createdBy', select: 'name email' }
    ]);

    logger.info('Task updated', { taskId, changes, userId });

    // Send notifications for status change
    if (updates.status && oldStatus !== updates.status) {
      const notificationPromises = task.assignedTo.map(assignee =>
        notificationService.createNotification({
          user: assignee._id,
          type: 'task_updated',
          title: 'Task Status Changed',
          message: `Task "${task.title}" status changed from ${oldStatus} to ${updates.status}`,
          relatedTask: task._id,
          relatedProject: task.project._id
        })
      );
      await Promise.all(notificationPromises);
    }

    // Send notifications to newly assigned users
    if (updates.assignedTo) {
      const newAssignees = updates.assignedTo.filter(id => !oldAssignees.includes(id.toString()));
      if (newAssignees.length > 0) {
        const notificationPromises = newAssignees.map(assigneeId =>
          notificationService.createNotification({
            user: assigneeId,
            type: 'task_assigned',
            title: 'Task Assigned',
            message: `You have been assigned to task: ${task.title}`,
            relatedTask: task._id,
            relatedProject: task.project._id
          })
        );
        await Promise.all(notificationPromises);
      }
    }

    // Broadcast real-time event
    socketService.emitToProject(task.project._id.toString(), 'task:updated', {
      task: task.toObject(),
      changes,
      updatedBy: userId
    });

    return task;
  } catch (error) {
    logger.error('Failed to update task', { taskId, error: error.message, userId });
    throw error;
  }
};

/**
 * Delete task
 * @param {String} taskId - Task ID
 * @param {String} userId - ID of user deleting the task
 * @returns {Promise<Object>} Deletion result
 */
exports.deleteTask = async (taskId, userId) => {
  try {
    const task = await Task.findById(taskId).populate('project', 'team');

    if (!task) {
      const error = new Error('Task not found');
      error.statusCode = 404;
      throw error;
    }

    // Verify user has access
    const isMember = task.project.team.some(member => member.user.toString() === userId);
    if (!isMember) {
      const error = new Error('You do not have access to this task');
      error.statusCode = 403;
      throw error;
    }

    // Remove task from dependencies of other tasks
    await Task.updateMany(
      { dependencies: taskId },
      { $pull: { dependencies: taskId } }
    );

    const projectId = task.project._id;
    const taskTitle = task.title;

    await task.deleteOne();

    logger.info('Task deleted', { taskId, projectId, userId });

    // Notify assigned users
    const notificationPromises = task.assignedTo.map(assigneeId =>
      notificationService.createNotification({
        user: assigneeId,
        type: 'task_deleted',
        title: 'Task Deleted',
        message: `Task "${taskTitle}" has been deleted`,
        relatedProject: projectId
      })
    );
    await Promise.all(notificationPromises);

    // Broadcast real-time event
    socketService.emitToProject(projectId.toString(), 'task:deleted', {
      taskId,
      deletedBy: userId
    });

    return { success: true, message: 'Task deleted successfully' };
  } catch (error) {
    logger.error('Failed to delete task', { taskId, error: error.message, userId });
    throw error;
  }
};

/**
 * Add subtask to task
 * @param {String} taskId - Task ID
 * @param {Object} subtaskData - Subtask data
 * @param {String} userId - ID of user adding subtask
 * @returns {Promise<Object>} Updated task
 */
exports.addSubtask = async (taskId, subtaskData, userId) => {
  try {
    const task = await Task.findById(taskId).populate('project', 'team');

    if (!task) {
      const error = new Error('Task not found');
      error.statusCode = 404;
      throw error;
    }

    // Verify user has access
    const isMember = task.project.team.some(member => member.user.toString() === userId);
    if (!isMember) {
      const error = new Error('You do not have access to this task');
      error.statusCode = 403;
      throw error;
    }

    const subtask = {
      title: subtaskData.title,
      completed: false,
      createdBy: userId,
      createdAt: Date.now()
    };

    task.subtasks.push(subtask);
    await task.save();

    await task.populate('subtasks.createdBy', 'name email');

    logger.info('Subtask added', { taskId, subtaskId: task.subtasks[task.subtasks.length - 1]._id, userId });

    // Broadcast real-time event
    socketService.emitToProject(task.project._id.toString(), 'task:subtask_added', {
      taskId,
      subtask: task.subtasks[task.subtasks.length - 1],
      addedBy: userId
    });

    return task;
  } catch (error) {
    logger.error('Failed to add subtask', { taskId, error: error.message, userId });
    throw error;
  }
};

/**
 * Update subtask
 * @param {String} taskId - Task ID
