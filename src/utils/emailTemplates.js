// File: src/utils/emailTemplates.js
// Generated: 2025-10-08 13:15:07 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_j4ljl889y1qb


const logger = require('./logger');

/**
 * Email template utilities for generating HTML email content
 */

/**
 * Base HTML template wrapper
 * @param {string} content - HTML content to wrap
 * @returns {string} Complete HTML email
 */


const baseTemplate = (content) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Genesis Task Management</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      padding: 20px;
    }
    .header {
      background-color: #4f46e5;
      color: #ffffff;
      padding: 20px;
      text-align: center;
      border-radius: 5px 5px 0 0;
    }
    .content {
      padding: 30px 20px;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background-color: #4f46e5;
      color: #ffffff;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #666;
      font-size: 12px;
      border-top: 1px solid #e0e0e0;
    }
    .info-box {
      background-color: #f8f9fa;
      border-left: 4px solid #4f46e5;
      padding: 15px;
      margin: 20px 0;
    }
    .warning-box {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
    }
    h1 {
      margin: 0;
      font-size: 24px;
    }
    h2 {
      color: #4f46e5;
      font-size: 20px;
    }
    p {
      margin: 10px 0;
    }
    .task-details {
      background-color: #f8f9fa;
      padding: 15px;
      border-radius: 5px;
      margin: 15px 0;
    }
    .task-details strong {
      color: #4f46e5;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Genesis Task Management</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Genesis Task Management. All rights reserved.</p>
      <p>This is an automated email. Please do not reply to this message.</p>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * Welcome email template
 * @param {Object} data - User data
 * @param {string} data.name - User's name
 * @param {string} data.email - User's email
 * @returns {string} HTML email content
 */


const welcomeEmail = (data) => {
  try {
    const { name, email } = data;

    const content = `
      <h2>Welcome to Genesis Task Management! 🎉</h2>
      <p>Hi ${name},</p>
      <p>Thank you for joining Genesis Task Management. We're excited to have you on board!</p>
      <div class="info-box">
        <p><strong>Your account details:</strong></p>
        <p>Email: ${email}</p>
      </div>
      <p>With Genesis, you can:</p>
      <ul>
        <li>Create and manage projects</li>
        <li>Organize tasks and subtasks</li>
        <li>Collaborate with team members</li>
        <li>Track progress in real-time</li>
        <li>Attach files and add comments</li>
      </ul>
      <p>Get started by creating your first project!</p>
      <p>If you have any questions, feel free to reach out to our support team.</p>
      <p>Best regards,<br>The Genesis Team</p>
    `;

    return baseTemplate(content);
  } catch (error) {
    logger.error('Error generating welcome email template', { error: error.message, data });
    throw error;
  }
};

/**
 * Password reset email template
 * @param {Object} data - Reset data
 * @param {string} data.name - User's name
 * @param {string} data.resetToken - Password reset token
 * @param {string} data.resetUrl - Password reset URL
 * @returns {string} HTML email content
 */


const passwordResetEmail = (data) => {
  try {
    const { name, resetToken, resetUrl } = data;

    const content = `
      <h2>Password Reset Request</h2>
      <p>Hi ${name},</p>
      <p>We received a request to reset your password for your Genesis Task Management account.</p>
      <div class="warning-box">
        <p><strong>Important:</strong> If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
      </div>
      <p>To reset your password, click the button below:</p>
      <center>
        <a href="${resetUrl}" class="button">Reset Password</a>
      </center>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #666;">${resetUrl}</p>
      <div class="info-box">
        <p><strong>Security Note:</strong></p>
        <p>This link will expire in 1 hour for security reasons.</p>
        <p>Reset Token: <code>${resetToken}</code></p>
      </div>
      <p>If you continue to have problems, please contact our support team.</p>
      <p>Best regards,<br>The Genesis Team</p>
    `;

    return baseTemplate(content);
  } catch (error) {
    logger.error('Error generating password reset email template', { error: error.message, data });
    throw error;
  }
};

/**
 * Task assignment email template
 * @param {Object} data - Task assignment data
 * @param {string} data.assigneeName - Name of person being assigned
 * @param {string} data.assignerName - Name of person assigning
 * @param {string} data.taskTitle - Task title
 * @param {string} data.taskDescription - Task description
 * @param {string} data.projectName - Project name
 * @param {string} data.dueDate - Due date
 * @param {string} data.priority - Task priority
 * @param {string} data.taskUrl - URL to view task
 * @returns {string} HTML email content
 */


const taskAssignmentEmail = (data) => {
  try {
    const { assigneeName, assignerName, taskTitle, taskDescription, projectName, dueDate, priority, taskUrl } = data;

    const priorityColors = {
      low: '#28a745',
      medium: '#ffc107',
      high: '#fd7e14',
      urgent: '#dc3545'
    };

    const priorityColor = priorityColors[priority?.toLowerCase()] || '#6c757d';

    const content = `
      <h2>New Task Assigned to You</h2>
      <p>Hi ${assigneeName},</p>
      <p>${assignerName} has assigned you a new task in the <strong>${projectName}</strong> project.</p>
      <div class="task-details">
        <p><strong>Task:</strong> ${taskTitle}</p>
        ${taskDescription ? `<p><strong>Description:</strong> ${taskDescription}</p>` : ''}
        <p><strong>Priority:</strong> <span style="color: ${priorityColor}; font-weight: bold;">${priority?.toUpperCase() || 'MEDIUM'}</span></p>
        ${dueDate ? `<p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>` : ''}
      </div>
      <center>
        <a href="${taskUrl}" class="button">View Task</a>
      </center>
      <p>Click the button above to view the full task details and get started.</p>
      <p>Best regards,<br>The Genesis Team</p>
    `;

    return baseTemplate(content);
  } catch (error) {
    logger.error('Error generating task assignment email template', { error: error.message, data });
    throw error;
  }
};

/**
 * Task comment notification email template
 * @param {Object} data - Comment notification data
 * @param {string} data.recipientName - Name of recipient
 * @param {string} data.commenterName - Name of commenter
 * @param {string} data.taskTitle - Task title
 * @param {string} data.comment - Comment text
 * @param {string} data.projectName - Project name
 * @param {string} data.taskUrl - URL to view task
 * @returns {string} HTML email content
 */


const taskCommentEmail = (data) => {
  try {
    const { recipientName, commenterName, taskTitle, comment, projectName, taskUrl } = data;

    const content = `
      <h2>New Comment on Task</h2>
      <p>Hi ${recipientName},</p>
      <p>${commenterName} commented on the task <strong>${taskTitle}</strong> in the <strong>${projectName}</strong> project.</p>
      <div class="info-box">
        <p><strong>Comment:</strong></p>
        <p>${comment}</p>
      </div>
      <center>
        <a href="${taskUrl}" class="button">View Task</a>
      </center>
      <p>Click the button above to view the task and reply to the comment.</p>
      <p>Best regards,<br>The Genesis Team</p>
    `;

    return baseTemplate(content);
  } catch (error) {
    logger.error('Error generating task comment email template', { error: error.message, data });
    throw error;
  }
};

/**
 * Task due date reminder email template
 * @param {Object} data - Reminder data
 * @param {string} data.recipientName - Name of recipient
 * @param {string} data.taskTitle - Task title
 * @param {string} data.projectName - Project name
 * @param {string} data.dueDate - Due date
 * @param {string} data.priority - Task priority
 * @param {string} data.taskUrl - URL to view task
 * @returns {string} HTML email content
 */


const taskDueReminderEmail = (data) => {
  try {
    const { recipientName, taskTitle, projectName, dueDate, priority, taskUrl } = data;

    const dueDateTime = new Date(dueDate);
    const now = new Date();
    const hoursUntilDue = Math.round((dueDateTime - now) / (1000 * 60 * 60));

    let urgencyMessage = '';
    if (hoursUntilDue < 24) {
      urgencyMessage = `<div class="warning-box"><p><strong>⚠️ Urgent:</strong> This task is due in less than 24 hours!</p></div>`;
    }

    const content = `
      <h2>Task Due Date Reminder</h2>
      <p>Hi ${recipientName},</p>
      <p>This is a reminder that the following task is due soon:</p>
      ${urgencyMessage}
      <div class="task-details">
        <p><strong>Task:</strong> ${taskTitle}</p>
        <p><strong>Project:</strong> ${projectName}</p>
        <p><strong>Priority:</strong> ${priority?.toUpperCase() || 'MEDIUM'}</p>
        <p><strong>Due Date:</strong> ${dueDateTime.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
      </div>
      <center>
        <a href="${taskUrl}" class="button">View Task</a>
      </center>
      <p>Make sure to complete this task before the deadline.</p>
      <p>Best regards,<br>The Genesis Team</p>
    `;

    return baseTemplate(content);
  } catch (error) {
    logger.error('Error generating task due reminder email template', { error: error.message, data });
    throw error;
  }
};

/**
 * Team invitation email template
 * @param {Object} data - Invitation data
 * @param {string} data.inviteeName - Name of person being invited
 * @param {string} data.inviterName - Name of person inviting
 * @param {string} data.teamName - Team name
 * @param {string} data.role - Role in team
 * @param {string} data.inviteUrl - URL to accept invitation
 * @returns {string} HTML email content
 */


const teamInvitationEmail = (data) => {
  try {
    const { inviteeName, inviterName, teamName, role, inviteUrl } = data;

    const content = `
      <h2>Team Invitation</h2>
      <p>Hi ${inviteeName},</p>
      <p>${inviterName} has invited you to join the <strong>${teamName}</strong> team on Genesis Task Management.</p>
      <div class="info-box">
        <p><strong>Your Role:</strong> ${role?.charAt(0).toUpperCase() + role?.slice(1) || 'Member'}</p>
      </div>
      <p>As a team member, you'll be able to:</p>
      <ul>
        <li>Collaborate on projects</li>
        <li>View and manage assigned tasks</li>
        <li>Communicate with team members</li>
        <li>Track project progress</li>
      </ul>
      <center>
        <a href="${inviteUrl}" class="button">Accept Invitation</a>
      </center>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #666;">${inviteUrl}</p>
      <div class="warning-box">
        <p><strong>Note:</strong> This invitation link will expire in 7 days.</p>
      </div>
      <p>We look forward to having you on the team!</p>
      <p>Best regards,<br>The Genesis Team</p>
    `;

    return baseTemplate(content);
  } catch (error) {
    logger.error('Error generating team invitation email template', { error: error.message, data });
    throw error;
  }
};

/**
 * Project status update email template
 * @param {Object} data - Status update data
 * @param {string} data.recipientName - Name of recipient
 * @param {string} data.projectName - Project name
 * @param {string} data.oldStatus - Previous status
 * @param {string} data.newStatus - New status
 * @param {string} data.updatedBy - Name of person who updated
 * @param {string} data.projectUrl - URL to view project
 * @returns {string} HTML email content
 */

const projectStatusUpdateEmail
