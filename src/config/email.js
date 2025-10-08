// File: src/config/email.js
// Generated: 2025-10-08 13:14:41 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_r8807o59hto3


const logger = require('../utils/logger');

/**
 * Email service configuration
 * Provides SMTP settings and email templates for the application
 */


const emailConfig = {
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true' || false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    }
  },

  from: {
    name: process.env.EMAIL_FROM_NAME || 'Task Management System',
    address: process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER
  },

  templates: {
    welcome: {
      subject: 'Welcome to Task Management System',
      getHtml: (data) => `
        <h1>Welcome ${data.name}!</h1>
        <p>Thank you for joining our task management platform.</p>
        <p>You can now start creating projects, managing tasks, and collaborating with your team.</p>
        <p>If you have any questions, feel free to reach out to our support team.</p>
      `
    },

    passwordReset: {
      subject: 'Password Reset Request',
      getHtml: (data) => `
        <h1>Password Reset Request</h1>
        <p>Hi ${data.name},</p>
        <p>You requested to reset your password. Click the link below to proceed:</p>
        <p><a href="${data.resetUrl}">Reset Password</a></p>
        <p>This link will expire in ${data.expiresIn || '1 hour'}.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
    },

    passwordChanged: {
      subject: 'Password Changed Successfully',
      getHtml: (data) => `
        <h1>Password Changed</h1>
        <p>Hi ${data.name},</p>
        <p>Your password has been changed successfully.</p>
        <p>If you didn't make this change, please contact support immediately.</p>
      `
    },

    taskAssigned: {
      subject: 'New Task Assigned',
      getHtml: (data) => `
        <h1>New Task Assigned</h1>
        <p>Hi ${data.assigneeName},</p>
        <p>You have been assigned a new task:</p>
        <h2>${data.taskTitle}</h2>
        <p><strong>Project:</strong> ${data.projectName}</p>
        <p><strong>Due Date:</strong> ${data.dueDate || 'Not set'}</p>
        <p><strong>Priority:</strong> ${data.priority || 'Medium'}</p>
        <p><a href="${data.taskUrl}">View Task</a></p>
      `
    },

    taskStatusChanged: {
      subject: 'Task Status Updated',
      getHtml: (data) => `
        <h1>Task Status Updated</h1>
        <p>Hi ${data.userName},</p>
        <p>The status of task "${data.taskTitle}" has been changed to <strong>${data.newStatus}</strong>.</p>
        <p><strong>Project:</strong> ${data.projectName}</p>
        <p><a href="${data.taskUrl}">View Task</a></p>
      `
    },

    taskDueSoon: {
      subject: 'Task Due Soon',
      getHtml: (data) => `
        <h1>Task Due Soon</h1>
        <p>Hi ${data.assigneeName},</p>
        <p>The following task is due soon:</p>
        <h2>${data.taskTitle}</h2>
        <p><strong>Due Date:</strong> ${data.dueDate}</p>
        <p><strong>Project:</strong> ${data.projectName}</p>
        <p><a href="${data.taskUrl}">View Task</a></p>
      `
    },

    taskOverdue: {
      subject: 'Task Overdue',
      getHtml: (data) => `
        <h1>Task Overdue</h1>
        <p>Hi ${data.assigneeName},</p>
        <p>The following task is overdue:</p>
        <h2>${data.taskTitle}</h2>
        <p><strong>Due Date:</strong> ${data.dueDate}</p>
        <p><strong>Project:</strong> ${data.projectName}</p>
        <p>Please update the task status or reschedule.</p>
        <p><a href="${data.taskUrl}">View Task</a></p>
      `
    },

    commentAdded: {
      subject: 'New Comment on Task',
      getHtml: (data) => `
        <h1>New Comment</h1>
        <p>Hi ${data.userName},</p>
        <p><strong>${data.commenterName}</strong> commented on task "${data.taskTitle}":</p>
        <blockquote>${data.commentText}</blockquote>
        <p><a href="${data.taskUrl}">View Task</a></p>
      `
    },

    teamInvitation: {
      subject: 'Team Invitation',
      getHtml: (data) => `
        <h1>Team Invitation</h1>
        <p>Hi ${data.inviteeName},</p>
        <p>You have been invited to join the team <strong>${data.teamName}</strong>.</p>
        <p><strong>Role:</strong> ${data.role}</p>
        <p><a href="${data.invitationUrl}">Accept Invitation</a></p>
        <p>This invitation will expire in ${data.expiresIn || '7 days'}.</p>
      `
    },

    projectCreated: {
      subject: 'New Project Created',
      getHtml: (data) => `
        <h1>New Project Created</h1>
        <p>Hi ${data.userName},</p>
        <p>A new project has been created:</p>
        <h2>${data.projectName}</h2>
        <p>${data.projectDescription || ''}</p>
        <p><strong>Team:</strong> ${data.teamName}</p>
        <p><a href="${data.projectUrl}">View Project</a></p>
      `
    },

    weeklyDigest: {
      subject: 'Weekly Task Digest',
      getHtml: (data) => `
        <h1>Weekly Task Digest</h1>
        <p>Hi ${data.userName},</p>
        <p>Here's your weekly summary:</p>
        <ul>
          <li><strong>Completed Tasks:</strong> ${data.completedTasks || 0}</li>
          <li><strong>Pending Tasks:</strong> ${data.pendingTasks || 0}</li>
          <li><strong>Overdue Tasks:</strong> ${data.overdueTasks || 0}</li>
        </ul>
        <p><a href="${data.dashboardUrl}">View Dashboard</a></p>
      `
    }
  },

  options: {
    maxRetries: parseInt(process.env.EMAIL_MAX_RETRIES, 10) || 3,
    retryDelay: parseInt(process.env.EMAIL_RETRY_DELAY, 10) || 5000, // 5 seconds
    timeout: parseInt(process.env.EMAIL_TIMEOUT, 10) || 30000 // 30 seconds
  }
};

/**
 * Validate email configuration
 * @returns {boolean} True if configuration is valid
 */


const validateConfig = () => {
  try {
    if (!emailConfig.smtp.auth.user || !emailConfig.smtp.auth.pass) {
      logger.warn('Email configuration incomplete: SMTP credentials missing');
      return false;
    }

    if (!emailConfig.smtp.host) {
      logger.warn('Email configuration incomplete: SMTP host missing');
      return false;
    }

    logger.info('Email configuration validated successfully');
    return true;
  } catch (error) {
    logger.error('Error validating email configuration', { error: error.message });
    return false;
  }
};

/**
 * Get email template by name
 * @param {string} templateName - Name of the template
 * @returns {Object|null} Template object or null if not found
 */


const getTemplate = (templateName) => {
  try {
    const template = emailConfig.templates[templateName];
    if (!template) {
      logger.warn('Email template not found', { templateName });
      return null;
    }
    return template;
  } catch (error) {
    logger.error('Error getting email template', { templateName, error: error.message });
    return null;
  }
};

/**
 * Check if email service is configured
 * @returns {boolean} True if configured
 */


const isConfigured = () => {
  return !!(emailConfig.smtp.auth.user && emailConfig.smtp.auth.pass);
};

module.exports = {
  emailConfig,
  validateConfig,
  getTemplate,
  isConfigured
};
