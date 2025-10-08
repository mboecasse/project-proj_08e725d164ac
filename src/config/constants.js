// File: src/config/constants.js
// Generated: 2025-10-08 13:14:59 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_n85v706k9xwd

* Application-wide constants and enums
 * Centralized configuration for consistent values across the application
 */

/**
 * User roles for role-based access control
 */


const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  MEMBER: 'member'
};

/**
 * Task priority levels
 */


const TASK_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

/**
 * Task status options
 */


const TASK_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  IN_REVIEW: 'in_review',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

/**
 * Project status options
 */


const PROJECT_STATUS = {
  PLANNING: 'planning',
  ACTIVE: 'active',
  ON_HOLD: 'on_hold',
  COMPLETED: 'completed',
  ARCHIVED: 'archived'
};

/**
 * Team member roles within a team
 */


const TEAM_MEMBER_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member'
};

/**
 * Notification types
 */


const NOTIFICATION_TYPES = {
  TASK_ASSIGNED: 'task_assigned',
  TASK_UPDATED: 'task_updated',
  TASK_COMPLETED: 'task_completed',
  TASK_COMMENT: 'task_comment',
  PROJECT_INVITATION: 'project_invitation',
  TEAM_INVITATION: 'team_invitation',
  MENTION: 'mention',
  DEADLINE_REMINDER: 'deadline_reminder',
  FILE_UPLOADED: 'file_uploaded'
};

/**
 * Activity types for tracking
 */


const ACTIVITY_TYPES = {
  TASK_CREATED: 'task_created',
  TASK_UPDATED: 'task_updated',
  TASK_DELETED: 'task_deleted',
  TASK_COMPLETED: 'task_completed',
  TASK_ASSIGNED: 'task_assigned',
  COMMENT_ADDED: 'comment_added',
  COMMENT_UPDATED: 'comment_updated',
  COMMENT_DELETED: 'comment_deleted',
  FILE_UPLOADED: 'file_uploaded',
  FILE_DELETED: 'file_deleted',
  PROJECT_CREATED: 'project_created',
  PROJECT_UPDATED: 'project_updated',
  PROJECT_DELETED: 'project_deleted',
  TEAM_CREATED: 'team_created',
  TEAM_UPDATED: 'team_updated',
  MEMBER_ADDED: 'member_added',
  MEMBER_REMOVED: 'member_removed',
  SUBTASK_CREATED: 'subtask_created',
  SUBTASK_COMPLETED: 'subtask_completed'
};

/**
 * Allowed file types for attachments
 */


const ALLOWED_FILE_TYPES = {
  IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  DOCUMENTS: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv'
  ],
  ARCHIVES: ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed']
};

/**
 * Maximum file size in bytes (10MB)
 */


const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Maximum number of files per upload
 */


const MAX_FILES_PER_UPLOAD = 5;

/**
 * Pagination defaults
 */


const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100
};

/**
 * Rate limiting windows (in milliseconds)
 */


const RATE_LIMIT_WINDOWS = {
  AUTH: 15 * 60 * 1000, // 15 minutes
  API: 15 * 60 * 1000, // 15 minutes
  UPLOAD: 60 * 60 * 1000 // 1 hour
};

/**
 * Rate limiting max requests
 */


const RATE_LIMIT_MAX_REQUESTS = {
  AUTH: 5, // 5 requests per 15 minutes
  API: 100, // 100 requests per 15 minutes
  UPLOAD: 20 // 20 uploads per hour
};

/**
 * JWT token expiry times
 */


const TOKEN_EXPIRY = {
  ACCESS: '15m',
  REFRESH: '7d',
  EMAIL_VERIFICATION: '24h',
  PASSWORD_RESET: '1h'
};

/**
 * Password requirements
 */


const PASSWORD_REQUIREMENTS = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL: true
};

/**
 * Validation constraints
 */


const VALIDATION = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 30,
    PATTERN: /^[a-zA-Z0-9_-]+$/
  },
  EMAIL: {
    MAX_LENGTH: 255
  },
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100
  },
  TITLE: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 200
  },
  DESCRIPTION: {
    MAX_LENGTH: 5000
  },
  COMMENT: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 2000
  },
  TAG: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 30,
    MAX_TAGS: 10
  }
};

/**
 * Date/time formats
 */


const DATE_FORMATS = {
  ISO: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
  DATE_ONLY: 'YYYY-MM-DD',
  DISPLAY: 'MMM DD, YYYY',
  DISPLAY_WITH_TIME: 'MMM DD, YYYY HH:mm'
};

/**
 * Sort options
 */


const SORT_OPTIONS = {
  CREATED_ASC: 'createdAt',
  CREATED_DESC: '-createdAt',
  UPDATED_ASC: 'updatedAt',
  UPDATED_DESC: '-updatedAt',
  PRIORITY_ASC: 'priority',
  PRIORITY_DESC: '-priority',
  DUE_DATE_ASC: 'dueDate',
  DUE_DATE_DESC: '-dueDate',
  TITLE_ASC: 'title',
  TITLE_DESC: '-title'
};

/**
 * Cache TTL (Time To Live) in seconds
 */


const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400 // 24 hours
};

/**
 * HTTP status codes
 */


const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

/**
 * Error codes for consistent error handling
 */


const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  DATABASE_ERROR: 'DATABASE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
};

/**
 * Success messages
 */


const SUCCESS_MESSAGES = {
  USER_CREATED: 'User created successfully',
  USER_UPDATED: 'User updated successfully',
  USER_DELETED: 'User deleted successfully',
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  PASSWORD_CHANGED: 'Password changed successfully',
  PASSWORD_RESET_SENT: 'Password reset email sent',
  EMAIL_VERIFIED: 'Email verified successfully',
  TASK_CREATED: 'Task created successfully',
  TASK_UPDATED: 'Task updated successfully',
  TASK_DELETED: 'Task deleted successfully',
  PROJECT_CREATED: 'Project created successfully',
  PROJECT_UPDATED: 'Project updated successfully',
  PROJECT_DELETED: 'Project deleted successfully',
  TEAM_CREATED: 'Team created successfully',
  TEAM_UPDATED: 'Team updated successfully',
  TEAM_DELETED: 'Team deleted successfully',
  MEMBER_ADDED: 'Member added successfully',
  MEMBER_REMOVED: 'Member removed successfully',
  COMMENT_ADDED: 'Comment added successfully',
  COMMENT_UPDATED: 'Comment updated successfully',
  COMMENT_DELETED: 'Comment deleted successfully',
  FILE_UPLOADED: 'File uploaded successfully',
  FILE_DELETED: 'File deleted successfully'
};

/**
 * Error messages
 */


const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden',
  NOT_FOUND: 'Resource not found',
  USER_NOT_FOUND: 'User not found',
  TASK_NOT_FOUND: 'Task not found',
  PROJECT_NOT_FOUND: 'Project not found',
  TEAM_NOT_FOUND: 'Team not found',
  COMMENT_NOT_FOUND: 'Comment not found',
  FILE_NOT_FOUND: 'File not found',
  DUPLICATE_EMAIL: 'Email already exists',
  INVALID_TOKEN: 'Invalid or expired token',
  TOKEN_EXPIRED: 'Token has expired',
  VALIDATION_FAILED: 'Validation failed',
  FILE_TOO_LARGE: 'File size exceeds maximum allowed size',
  INVALID_FILE_TYPE: 'Invalid file type',
  RATE_LIMIT_EXCEEDED: 'Too many requests, please try again later',
  DATABASE_ERROR: 'Database operation failed',
  INTERNAL_ERROR: 'Internal server error',
  WEAK_PASSWORD: 'Password does not meet security requirements',
  INVALID_EMAIL: 'Invalid email format',
  MISSING_REQUIRED_FIELDS: 'Missing required fields',
  INVALID_DATE_RANGE: 'Invalid date range',
  PERMISSION_DENIED: 'You do not have permission to perform this action'
};

/**
 * Regex patterns for validation
 */


const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  USERNAME: /^[a-zA-Z0-9_-]{3,30}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  PHONE: /^\+?[\d\s-()]+$/,
  URL: /^https?:\/\/.+/,
  HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  MONGODB_ID: /^[a-f\d]{24}$/i
};

/**
 * Environment types
 */


const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production',
  TEST: 'test'
};

/**
 * WebSocket events
 */


const WEBSOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  NOTIFICATION: 'notification',
  TASK_UPDATE: 'task_update',
  COMMENT_ADDED: 'comment_added',
  USER_ONLINE: 'user_online',
  USER_OFFLINE: 'user_offline',
  TYPING: 'typing',
  STOP_TYPING: 'stop_typing'
};

/**
 * Export all constants
 */
module.exports = {
  USER_ROLES,
  TASK_PRIORITY,
  TASK_STATUS,
  PROJECT_STATUS,
  TEAM_MEMBER_ROLES,
  NOTIFICATION_TYPES,
  ACTIVITY_TYPES,
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE,
  MAX_FILES_PER_UPLOAD,
  PAGINATION,
  RATE_LIMIT_WINDOWS,
  RATE_LIMIT_MAX_REQUESTS,
  TOKEN_EXPIRY,
  PASSWORD_REQUIREMENTS,
  VALIDATION,
  DATE_FORMATS,
  SORT_OPTIONS,
  CACHE_TTL,
  HTTP_STATUS,
  ERROR_CODES,
  SUCCESS_MESSAGES,
  ERROR_MESSAGES,
  REGEX_PATTERNS,
  ENVIRONMENTS,
  WEBSOCKET_EVENTS
};
