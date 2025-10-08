// File: src/routes/attachments.js
// Generated: 2025-10-08 13:16:50 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_i9177gaqkhzt

    const fileStream = require('fs').createReadStream(attachment.path);


const Attachment = require('../models/Attachment');


const Task = require('../models/Task');


const express = require('express');


const fs = require('fs').promises;


const logger = require('../utils/logger');


const path = require('path');

const { auth } = require('../middleware/auth');

const { upload } = require('../middleware/upload');


const router = express.Router();

/**
 * POST /api/attachments
 * Upload file and attach to task
 */
router.post('/', auth, upload.single('file'), async (req, res, next) => {
  try {
    const { taskId } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    if (!taskId) {
      // Delete uploaded file if taskId not provided
      await fs.unlink(req.file.path).catch(err =>
        logger.error('Failed to delete orphaned file', { path: req.file.path, error: err.message })
      );
      return res.status(400).json({
        success: false,
        error: 'Task ID is required'
      });
    }

    // Verify task exists and user has access
    const task = await Task.findById(taskId).populate('project');
    if (!task) {
      await fs.unlink(req.file.path).catch(err =>
        logger.error('Failed to delete orphaned file', { path: req.file.path, error: err.message })
      );
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // Check if user is member of the project
    if (!task.project.members.some(member => member.user.toString() === req.userId)) {
      await fs.unlink(req.file.path).catch(err =>
        logger.error('Failed to delete orphaned file', { path: req.file.path, error: err.message })
      );
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this task'
      });
    }

    // Create attachment record
    const attachment = await Attachment.create({
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      task: taskId,
      uploadedBy: req.userId
    });

    // Add attachment to task
    task.attachments.push(attachment._id);
    await task.save();

    logger.info('File uploaded successfully', {
      attachmentId: attachment._id,
      taskId,
      userId: req.userId,
      filename: req.file.originalname
    });

    res.status(201).json({
      success: true,
      data: attachment,
      message: 'File uploaded successfully'
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file) {
      await fs.unlink(req.file.path).catch(err =>
        logger.error('Failed to delete file after error', { path: req.file.path, error: err.message })
      );
    }
    logger.error('Failed to upload file', { error: error.message, userId: req.userId });
    next(error);
  }
});

/**
 * GET /api/attachments/:id
 * Get attachment metadata
 */
router.get('/:id', auth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const attachment = await Attachment.findById(id)
      .populate('task')
      .populate('uploadedBy', 'name email');

    if (!attachment) {
      return res.status(404).json({
        success: false,
        error: 'Attachment not found'
      });
    }

    // Verify user has access to the task
    const task = await Task.findById(attachment.task._id).populate('project');
    if (!task || !task.project.members.some(member => member.user.toString() === req.userId)) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this attachment'
      });
    }

    logger.info('Fetched attachment metadata', { attachmentId: id, userId: req.userId });

    res.json({
      success: true,
      data: attachment
    });
  } catch (error) {
    logger.error('Failed to fetch attachment', { attachmentId: req.params.id, error: error.message });
    next(error);
  }
});

/**
 * GET /api/attachments/:id/download
 * Download attachment file
 */
router.get('/:id/download', auth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const attachment = await Attachment.findById(id).populate('task');

    if (!attachment) {
      return res.status(404).json({
        success: false,
        error: 'Attachment not found'
      });
    }

    // Verify user has access to the task
    const task = await Task.findById(attachment.task._id).populate('project');
    if (!task || !task.project.members.some(member => member.user.toString() === req.userId)) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this attachment'
      });
    }

    // Check if file exists
    try {
      await fs.access(attachment.path);
    } catch (err) {
      logger.error('Attachment file not found on disk', {
        attachmentId: id,
        path: attachment.path
      });
      return res.status(404).json({
        success: false,
        error: 'File not found on server'
      });
    }

    logger.info('Attachment downloaded', {
      attachmentId: id,
      userId: req.userId,
      filename: attachment.originalName
    });

    // Set headers for download
    res.setHeader('Content-Type', attachment.mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.originalName}"`);
    res.setHeader('Content-Length', attachment.size);

    // Stream file to response
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      logger.error('Error streaming file', {
        attachmentId: id,
        error: error.message
      });
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Error downloading file'
        });
      }
    });
  } catch (error) {
    logger.error('Failed to download attachment', {
      attachmentId: req.params.id,
      error: error.message
    });
    next(error);
  }
});

/**
 * DELETE /api/attachments/:id
 * Delete attachment
 */
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const attachment = await Attachment.findById(id).populate('task');

    if (!attachment) {
      return res.status(404).json({
        success: false,
        error: 'Attachment not found'
      });
    }

    // Verify user has access and permission
    const task = await Task.findById(attachment.task._id).populate('project');
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Associated task not found'
      });
    }

    const userMember = task.project.members.find(member => member.user.toString() === req.userId);
    if (!userMember) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this attachment'
      });
    }

    // Only uploader, task assignee, or admin/manager can delete
    const canDelete =
      attachment.uploadedBy.toString() === req.userId ||
      task.assignedTo.toString() === req.userId ||
      userMember.role === 'admin' ||
      userMember.role === 'manager';

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to delete this attachment'
      });
    }

    // Delete file from disk
    try {
      await fs.unlink(attachment.path);
    } catch (err) {
      logger.warn('Failed to delete file from disk', {
        path: attachment.path,
        error: err.message
      });
    }

    // Remove attachment from task
    task.attachments = task.attachments.filter(
      att => att.toString() !== attachment._id.toString()
    );
    await task.save();

    // Delete attachment record
    await Attachment.findByIdAndDelete(id);

    logger.info('Attachment deleted', {
      attachmentId: id,
      userId: req.userId,
      filename: attachment.originalName
    });

    res.json({
      success: true,
      message: 'Attachment deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete attachment', {
      attachmentId: req.params.id,
      error: error.message
    });
    next(error);
  }
});

/**
 * GET /api/attachments/task/:taskId
 * Get all attachments for a task
 */
router.get('/task/:taskId', auth, async (req, res, next) => {
  try {
    const { taskId } = req.params;

    // Verify task exists and user has access
    const task = await Task.findById(taskId).populate('project');
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    if (!task.project.members.some(member => member.user.toString() === req.userId)) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this task'
      });
    }

    const attachments = await Attachment.find({ task: taskId })
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 });

    logger.info('Fetched task attachments', {
      taskId,
      count: attachments.length,
      userId: req.userId
    });

    res.json({
      success: true,
      count: attachments.length,
      data: attachments
    });
  } catch (error) {
    logger.error('Failed to fetch task attachments', {
      taskId: req.params.taskId,
      error: error.message
    });
    next(error);
  }
});

module.exports = router;
