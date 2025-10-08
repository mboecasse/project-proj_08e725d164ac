// File: src/services/emailService.js
// Generated: 2025-10-08 13:15:42 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_j78k0ai0mltb


const emailConfig = require('../config/email');


const emailTemplates = require('../utils/emailTemplates');


const logger = require('../utils/logger');


const nodemailer = require('nodemailer');

/**
 * Email Service
 * Handles email sending with template rendering
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
  }

  /**
   * Initialize email transporter
   */
  async initialize() {
    try {
      if (this.initialized) {
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: emailConfig.smtp.host,
        port: emailConfig.smtp.port,
        secure: emailConfig.smtp.secure,
        auth: {
          user: emailConfig.smtp.auth.user,
          pass: emailConfig.smtp.auth.pass
        },
        tls: {
          rejectUnauthorized: emailConfig.smtp.tls.rejectUnauthorized
        }
      });

      // Verify connection
      await this.transporter.verify();

      this.initialized = true;
      logger.info('Email service initialized successfully', {
        host: emailConfig.smtp.host,
        port: emailConfig.smtp.port
      });
    } catch (error) {
      logger.error('Failed to initialize email service', {
        error: error.message,
        stack: error.stack
      });
      throw new Error('Email service initialization failed');
    }
  }

  /**
   * Send email with template
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email
   * @param {string} options.subject - Email subject
   * @param {string} options.template - Template name
   * @param {Object} options.data - Template data
   * @returns {Promise<Object>} Send result
   */
  async sendEmail({ to, subject, template, data }) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      // Render email template
      const html = emailTemplates.render(template, data);

      // Prepare email options
      const mailOptions = {
        from: `"${emailConfig.from.name}" <${emailConfig.from.email}>`,
        to,
        subject,
        html
      };

      // Send email
      const info = await this.transporter.sendMail(mailOptions);

      logger.info('Email sent successfully', {
        to,
        subject,
        template,
        messageId: info.messageId
      });

      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      logger.error('Failed to send email', {
        to,
        subject,
        template,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Send welcome email to new user
   * @param {Object} user - User object
   * @param {string} user.email - User email
   * @param {string} user.name - User name
   * @returns {Promise<Object>} Send result
   */
  async sendWelcomeEmail(user) {
    try {
      return await this.sendEmail({
        to: user.email,
        subject: 'Welcome to Task Management System',
        template: 'welcome',
        data: {
          name: user.name,
          email: user.email
        }
      });
    } catch (error) {
      logger.error('Failed to send welcome email', {
        userId: user._id,
        email: user.email,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Send password reset email
   * @param {Object} user - User object
   * @param {string} resetToken - Password reset token
   * @param {string} resetUrl - Password reset URL
   * @returns {Promise<Object>} Send result
   */
  async sendPasswordResetEmail(user, resetToken, resetUrl) {
    try {
      return await this.sendEmail({
        to: user.email,
        subject: 'Password Reset Request',
        template: 'passwordReset',
        data: {
          name: user.name,
          resetUrl,
          resetToken,
          expiryTime: '1 hour'
        }
      });
    } catch (error) {
      logger.error('Failed to send password reset email', {
        userId: user._id,
        email: user.email,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Send email verification email
   * @param {Object} user - User object
   * @param {string} verificationToken - Email verification token
   * @param {string} verificationUrl - Email verification URL
   * @returns {Promise<Object>} Send result
   */
  async sendVerificationEmail(user, verificationToken, verificationUrl) {
    try {
      return await this.sendEmail({
        to: user.email,
        subject: 'Verify Your Email Address',
        template: 'emailVerification',
        data: {
          name: user.name,
          verificationUrl,
          verificationToken
        }
      });
    } catch (error) {
      logger.error('Failed to send verification email', {
        userId: user._id,
        email: user.email,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Send task assignment notification
   * @param {Object} user - User object
   * @param {Object} task - Task object
   * @param {Object} assignedBy - User who assigned the task
   * @returns {Promise<Object>} Send result
   */
  async sendTaskAssignmentEmail(user, task, assignedBy) {
    try {
      return await this.sendEmail({
        to: user.email,
        subject: `New Task Assigned: ${task.title}`,
        template: 'taskAssignment',
        data: {
          userName: user.name,
          taskTitle: task.title,
          taskDescription: task.description,
          taskPriority: task.priority,
          taskDueDate: task.dueDate,
          assignedByName: assignedBy.name,
          taskUrl: `${process.env.FRONTEND_URL}/tasks/${task._id}`
        }
      });
    } catch (error) {
      logger.error('Failed to send task assignment email', {
        userId: user._id,
        taskId: task._id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Send task due date reminder
   * @param {Object} user - User object
   * @param {Object} task - Task object
   * @returns {Promise<Object>} Send result
   */
  async sendTaskReminderEmail(user, task) {
    try {
      return await this.sendEmail({
        to: user.email,
        subject: `Task Reminder: ${task.title}`,
        template: 'taskReminder',
        data: {
          userName: user.name,
          taskTitle: task.title,
          taskDescription: task.description,
          taskDueDate: task.dueDate,
          taskUrl: `${process.env.FRONTEND_URL}/tasks/${task._id}`
        }
      });
    } catch (error) {
      logger.error('Failed to send task reminder email', {
        userId: user._id,
        taskId: task._id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Send team invitation email
   * @param {Object} user - User object
   * @param {Object} team - Team object
   * @param {Object} invitedBy - User who sent invitation
   * @param {string} invitationToken - Invitation token
   * @returns {Promise<Object>} Send result
   */
  async sendTeamInvitationEmail(user, team, invitedBy, invitationToken) {
    try {
      const invitationUrl = `${process.env.FRONTEND_URL}/teams/accept-invitation/${invitationToken}`;

      return await this.sendEmail({
        to: user.email,
        subject: `Team Invitation: ${team.name}`,
        template: 'teamInvitation',
        data: {
          userName: user.name,
          teamName: team.name,
          invitedByName: invitedBy.name,
          invitationUrl,
          invitationToken
        }
      });
    } catch (error) {
      logger.error('Failed to send team invitation email', {
        userId: user._id,
        teamId: team._id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Send project update notification
   * @param {Object} user - User object
   * @param {Object} project - Project object
   * @param {string} updateType - Type of update
   * @param {Object} updatedBy - User who made the update
   * @returns {Promise<Object>} Send result
   */
  async sendProjectUpdateEmail(user, project, updateType, updatedBy) {
    try {
      return await this.sendEmail({
        to: user.email,
        subject: `Project Update: ${project.name}`,
        template: 'projectUpdate',
        data: {
          userName: user.name,
          projectName: project.name,
          updateType,
          updatedByName: updatedBy.name,
          projectUrl: `${process.env.FRONTEND_URL}/projects/${project._id}`
        }
      });
    } catch (error) {
      logger.error('Failed to send project update email', {
        userId: user._id,
        projectId: project._id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Send comment notification
   * @param {Object} user - User object
   * @param {Object} task - Task object
   * @param {Object} comment - Comment object
   * @param {Object} commentedBy - User who commented
   * @returns {Promise<Object>} Send result
   */
  async sendCommentNotificationEmail(user, task, comment, commentedBy) {
    try {
      return await this.sendEmail({
        to: user.email,
        subject: `New Comment on Task: ${task.title}`,
        template: 'commentNotification',
        data: {
          userName: user.name,
          taskTitle: task.title,
          commentText: comment.text,
          commentedByName: commentedBy.name,
          taskUrl: `${process.env.FRONTEND_URL}/tasks/${task._id}`
        }
      });
    } catch (error) {
      logger.error('Failed to send comment notification email', {
        userId: user._id,
        taskId: task._id,
        commentId: comment._id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Send bulk emails
   * @param {Array} emails - Array of email objects
   * @returns {Promise<Object>} Send results
   */
  async sendBulkEmails(emails) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const results = {
        success: [],
        failed: []
      };

      for (const email of emails) {
        try {
          const result = await this.sendEmail(email);
          results.success.push({
            to: email.to,
            messageId: result.messageId
          });
        } catch (error) {
          results.failed.push({
            to: email.to,
            error: error.message
          });
        }
      }

      logger.info('Bulk email send completed', {
        total: emails.length,
        success: results.success.length,
        failed: results.failed.length
      });

      return results;
    } catch (error) {
      logger.error('Failed to send bulk emails', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new EmailService();
