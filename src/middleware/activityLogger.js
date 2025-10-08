// File: src/middleware/activityLogger.js
// Generated: 2025-10-08 13:14:56 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_v2tcbk2d3tdw


const logger = require('../utils/logger');

/**
 * Activity types for audit trail
 */


const ACTIVITY_TYPES = {
  // Authentication
  LOGIN: 'login',
  LOGOUT: 'logout',
  REGISTER: 'register',
  PASSWORD_CHANGE: 'password_change',
  PASSWORD_RESET: 'password_reset',

  // User Management
  USER_CREATE: 'user_create',
  USER_UPDATE: 'user_update',
  USER_DELETE: 'user_delete',
  USER_ROLE_CHANGE: 'user_role_change',

  // Team Management
  TEAM_CREATE: 'team_create',
  TEAM_UPDATE: 'team_update',
  TEAM_DELETE: 'team_delete',
  TEAM_MEMBER_ADD: 'team_member_add',
  TEAM_MEMBER_REMOVE: 'team_member_remove',
  TEAM_MEMBER_ROLE_CHANGE: 'team_member_role_change',

  // Project Management
  PROJECT_CREATE: 'project_create',
  PROJECT_UPDATE: 'project_update',
  PROJECT_DELETE: 'project_delete',
  PROJECT_STATUS_CHANGE: 'project_status_change',

  // Task Management
  TASK_CREATE: 'task_create',
  TASK_UPDATE: 'task_update',
  TASK_DELETE: 'task_delete',
  TASK_ASSIGN: 'task_assign',
  TASK_STATUS_CHANGE: 'task_status_change',
  TASK_PRIORITY_CHANGE: 'task_priority_change',

  // Subtask Management
  SUBTASK_CREATE: 'subtask_create',
  SUBTASK_UPDATE: 'subtask_update',
  SUBTASK_DELETE: 'subtask_delete',
  SUBTASK_COMPLETE: 'subtask_complete',

  // Comment Management
  COMMENT_CREATE: 'comment_create',
  COMMENT_UPDATE: 'comment_update',
  COMMENT_DELETE: 'comment_delete',

  // File Management
  FILE_UPLOAD: 'file_upload',
  FILE_DELETE: 'file_delete',
  FILE_DOWNLOAD: 'file_download'
};

/**
 * Extract relevant activity data from request
 * @param {Object} req - Express request object
 * @returns {Object} Activity data
 */


const extractActivityData = (req) => {
  const data = {
    method: req.method,
    path: req.path,
    baseUrl: req.baseUrl,
    params: req.params,
    query: req.query,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent')
  };

  // Sanitize body - remove sensitive fields
  if (req.body) {
    const sanitizedBody = { ...req.body };
    delete sanitizedBody.password;
    delete sanitizedBody.currentPassword;
    delete sanitizedBody.newPassword;
    delete sanitizedBody.token;
    delete sanitizedBody.refreshToken;
    data.body = sanitizedBody;
  }

  return data;
};

/**
 * Determine activity type from request
 * @param {Object} req - Express request object
 * @returns {string|null} Activity type
 */


const determineActivityType = (req) => {
  const { method, baseUrl, path } = req;
  const fullPath = `${baseUrl}${path}`.toLowerCase();

  // Authentication routes
  if (fullPath.includes('/auth/login')) return ACTIVITY_TYPES.LOGIN;
  if (fullPath.includes('/auth/logout')) return ACTIVITY_TYPES.LOGOUT;
  if (fullPath.includes('/auth/register')) return ACTIVITY_TYPES.REGISTER;
  if (fullPath.includes('/auth/change-password')) return ACTIVITY_TYPES.PASSWORD_CHANGE;
  if (fullPath.includes('/auth/reset-password')) return ACTIVITY_TYPES.PASSWORD_RESET;

  // User routes
  if (fullPath.includes('/users')) {
    if (method === 'POST') return ACTIVITY_TYPES.USER_CREATE;
    if (method === 'PUT' || method === 'PATCH') return ACTIVITY_TYPES.USER_UPDATE;
    if (method === 'DELETE') return ACTIVITY_TYPES.USER_DELETE;
  }

  // Team routes
  if (fullPath.includes('/teams')) {
    if (fullPath.includes('/members')) {
      if (method === 'POST') return ACTIVITY_TYPES.TEAM_MEMBER_ADD;
      if (method === 'DELETE') return ACTIVITY_TYPES.TEAM_MEMBER_REMOVE;
      if (method === 'PUT' || method === 'PATCH') return ACTIVITY_TYPES.TEAM_MEMBER_ROLE_CHANGE;
    } else {
      if (method === 'POST') return ACTIVITY_TYPES.TEAM_CREATE;
      if (method === 'PUT' || method === 'PATCH') return ACTIVITY_TYPES.TEAM_UPDATE;
      if (method === 'DELETE') return ACTIVITY_TYPES.TEAM_DELETE;
    }
  }

  // Project routes
  if (fullPath.includes('/projects')) {
    if (method === 'POST') return ACTIVITY_TYPES.PROJECT_CREATE;
    if (method === 'PUT' || method === 'PATCH') {
      if (req.body && req.body.status) return ACTIVITY_TYPES.PROJECT_STATUS_CHANGE;
      return ACTIVITY_TYPES.PROJECT_UPDATE;
    }
    if (method === 'DELETE') return ACTIVITY_TYPES.PROJECT_DELETE;
  }

  // Task routes
  if (fullPath.includes('/tasks')) {
    if (method === 'POST') return ACTIVITY_TYPES.TASK_CREATE;
    if (method === 'PUT' || method === 'PATCH') {
      if (req.body && req.body.assignedTo) return ACTIVITY_TYPES.TASK_ASSIGN;
      if (req.body && req.body.status) return ACTIVITY_TYPES.TASK_STATUS_CHANGE;
      if (req.body && req.body.priority) return ACTIVITY_TYPES.TASK_PRIORITY_CHANGE;
      return ACTIVITY_TYPES.TASK_UPDATE;
    }
    if (method === 'DELETE') return ACTIVITY_TYPES.TASK_DELETE;
  }

  // Subtask routes
  if (fullPath.includes('/subtasks')) {
    if (method === 'POST') return ACTIVITY_TYPES.SUBTASK_CREATE;
    if (method === 'PUT' || method === 'PATCH') {
      if (req.body && req.body.completed) return ACTIVITY_TYPES.SUBTASK_COMPLETE;
      return ACTIVITY_TYPES.SUBTASK_UPDATE;
    }
    if (method === 'DELETE') return ACTIVITY_TYPES.SUBTASK_DELETE;
  }

  // Comment routes
  if (fullPath.includes('/comments')) {
    if (method === 'POST') return ACTIVITY_TYPES.COMMENT_CREATE;
    if (method === 'PUT' || method === 'PATCH') return ACTIVITY_TYPES.COMMENT_UPDATE;
    if (method === 'DELETE') return ACTIVITY_TYPES.COMMENT_DELETE;
  }

  // File routes
  if (fullPath.includes('/files') || fullPath.includes('/attachments')) {
    if (method === 'POST') return ACTIVITY_TYPES.FILE_UPLOAD;
    if (method === 'DELETE') return ACTIVITY_TYPES.FILE_DELETE;
    if (method === 'GET' && fullPath.includes('/download')) return ACTIVITY_TYPES.FILE_DOWNLOAD;
  }

  return null;
};

/**
 * Activity logging middleware
 * Logs user activities for audit trail
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */


const activityLogger = (req, res, next) => {
  try {
    // Skip logging for GET requests (read operations) unless it's a download
    if (req.method === 'GET' && !req.path.includes('/download')) {
      return next();
    }

    // Determine activity type
    const activityType = determineActivityType(req);

    // Skip if activity type cannot be determined
    if (!activityType) {
      return next();
    }

    // Extract activity data
    const activityData = extractActivityData(req);

    // Store original res.json to intercept response
    const originalJson = res.json.bind(res);

    // Override res.json to capture response
    res.json = function (data) {
      try {
        // Log activity with response status
        const logData = {
          activityType,
          userId: req.userId || null,
          userName: req.user ? req.user.name : 'Anonymous',
          userEmail: req.user ? req.user.email : null,
          statusCode: res.statusCode,
          success: data.success !== false,
          ...activityData,
          timestamp: new Date().toISOString()
        };

        // Add resource IDs if available
        if (req.params.id) logData.resourceId = req.params.id;
        if (req.params.teamId) logData.teamId = req.params.teamId;
        if (req.params.projectId) logData.projectId = req.params.projectId;
        if (req.params.taskId) logData.taskId = req.params.taskId;

        // Add response data for successful operations (without sensitive info)
        if (data.success && data.data) {
          if (data.data._id) logData.resultId = data.data._id;
          if (data.data.id) logData.resultId = data.data.id;
        }

        // Log based on success/failure
        if (data.success !== false) {
          logger.info('User activity', logData);
        } else {
          logger.warn('Failed user activity', logData);
        }
      } catch (error) {
        logger.error('Error in activity logging', {
          error: error.message,
          activityType,
          userId: req.userId
        });
      }

      // Call original json method
      return originalJson(data);
    };

    next();
  } catch (error) {
    logger.error('Activity logger middleware error', {
      error: error.message,
      path: req.path,
      method: req.method
    });
    // Don't block request on logging error
    next();
  }
};

/**
 * Manual activity logging function for custom events
 * @param {Object} options - Activity options
 * @param {string} options.activityType - Type of activity
 * @param {string} options.userId - User ID
 * @param {Object} options.data - Additional activity data
 */


const logActivity = ({ activityType, userId, data = {} }) => {
  try {
    logger.info('Manual activity log', {
      activityType,
      userId,
      ...data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Manual activity logging error', {
      error: error.message,
      activityType,
      userId
    });
  }
};

module.exports = {
  activityLogger,
  logActivity,
  ACTIVITY_TYPES
};
