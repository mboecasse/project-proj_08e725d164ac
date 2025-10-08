// File: src/routes/index.js
// Generated: 2025-10-08 13:14:36 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_wvrt836m5c7p


const activityRoutes = require('./activityRoutes');


const attachmentRoutes = require('./attachmentRoutes');


const authRoutes = require('./authRoutes');


const commentRoutes = require('./commentRoutes');


const express = require('express');


const logger = require('../utils/logger');


const notificationRoutes = require('./notificationRoutes');


const projectRoutes = require('./projectRoutes');


const subtaskRoutes = require('./subtaskRoutes');


const taskRoutes = require('./taskRoutes');


const teamRoutes = require('./teamRoutes');


const userRoutes = require('./userRoutes');


const router = express.Router();

// Import route modules

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

/**
 * API version info
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Task Management API v1.0',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      teams: '/api/teams',
      projects: '/api/projects',
      tasks: '/api/tasks',
      subtasks: '/api/subtasks',
      comments: '/api/comments',
      attachments: '/api/attachments',
      notifications: '/api/notifications',
      activities: '/api/activities'
    }
  });
});

/**
 * Mount route modules
 */
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/teams', teamRoutes);
router.use('/projects', projectRoutes);
router.use('/tasks', taskRoutes);
router.use('/subtasks', subtaskRoutes);
router.use('/comments', commentRoutes);
router.use('/attachments', attachmentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/activities', activityRoutes);

/**
 * 404 handler for undefined routes
 */
router.use('*', (req, res) => {
  logger.warn('Route not found', {
    method: req.method,
    path: req.originalUrl,
    ip: req.ip
  });

  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl
  });
});

module.exports = router;
