// File: src/controllers/attachmentController.js
// Generated: 2025-10-08 13:15:29 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_g4mr2e3ax4qk

    const fileStream = require('fs').createReadStream(attachment.path);


const Attachment = require('../models/Attachment');


const Comment = require('../models/Comment');


const Task = require('../models/Task');


const fs = require('fs').promises;


const logger = require('../utils/logger');


const path = require('path');

const { successResponse, errorResponse } = require('../utils/response');

// Configure upload directory


const UPLOAD_DIR = path.join(__dirname, '../../uploads');


const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB


const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed'
];

/**
 * Ensure upload directory exists
 */


const ensureUploadDir = async () => {
  try {
    await fs.access(UPLOAD_DIR);
  } catch (error) {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    logger.info('Created upload directory', { path: UPLOAD_DIR });
  }
};

/**
 * Upload attachment to task
 * POST /api/attachments/task/:taskId
 */
exports.uploadTaskAttachment = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const userId = req.userId;

    if (!req.file) {
      return res.status(400).json(errorResponse('No file uploaded'));
    }

    // Validate file size
    if (req.file.size > MAX_FILE_SIZE) {
      await fs.unlink(req.file.path);
      return res.status(400).json(errorResponse('File size exceeds 10MB limit'));
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
      await fs.unlink(req.file.path);
      return res.status(400).json(errorResponse('File type not allowed'));
    }

    // Verify task exists and user has access
    const task = await Task.findById(taskId).populate('project');
    if (!task) {
      await fs.unlink(req.file.path);
      return res.status(404).json(errorResponse('Task not found'));
    }

    // Check if user is member of project team
    const isMember = task.project.team.some(member => member.toString() === userId);
    if (!isMember) {
      await fs.unlink(req.file.path);
      return res.status(403).json(errorResponse('Access denied to this task'));
    }

    // Create attachment record
    const attachment = await Attachment.create({
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      uploadedBy: userId,
      task: taskId
    });

    // Add attachment to task
    task.attachments.push(attachment._id);
    await task.save();

    logger.info('Task attachment uploaded', {
      attachmentId: attachment._id,
      taskId,
      userId,
      filename: req.file.originalname,
      size: req.file.size
    });

    res.status(201).json(successResponse(attachment, 'File uploaded successfully'));
  } catch (error) {
    // Clean up file if error occurs
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        logger.error('Failed to delete file after error', { error: unlinkError.message });
      }
    }
    logger.error('Failed to upload task attachment', {
      taskId: req.params.taskId,
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Upload attachment to comment
 * POST /api/attachments/comment/:commentId
 */
exports.uploadCommentAttachment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const userId = req.userId;

    if (!req.file) {
      return res.status(400).json(errorResponse('No file uploaded'));
    }

    // Validate file size
    if (req.file.size > MAX_FILE_SIZE) {
      await fs.unlink(req.file.path);
      return res.status(400).json(errorResponse('File size exceeds 10MB limit'));
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
      await fs.unlink(req.file.path);
      return res.status(400).json(errorResponse('File type not allowed'));
    }

    // Verify comment exists and user has access
    const comment = await Comment.findById(commentId).populate({
      path: 'task',
      populate: { path: 'project' }
    });

    if (!comment) {
      await fs.unlink(req.file.path);
      return res.status(404).json(errorResponse('Comment not found'));
    }

    // Check if user is member of project team
    const isMember = comment.task.project.team.some(member => member.toString() === userId);
    if (!isMember) {
      await fs.unlink(req.file.path);
      return res.status(403).json(errorResponse('Access denied to this comment'));
    }

    // Create attachment record
    const attachment = await Attachment.create({
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      uploadedBy: userId,
      comment: commentId
    });

    // Add attachment to comment
    comment.attachments.push(attachment._id);
    await comment.save();

    logger.info('Comment attachment uploaded', {
      attachmentId: attachment._id,
      commentId,
      userId,
      filename: req.file.originalname,
      size: req.file.size
    });

    res.status(201).json(successResponse(attachment, 'File uploaded successfully'));
  } catch (error) {
    // Clean up file if error occurs
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        logger.error('Failed to delete file after error', { error: unlinkError.message });
      }
    }
    logger.error('Failed to upload comment attachment', {
      commentId: req.params.commentId,
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Get attachment by ID
 * GET /api/attachments/:id
 */
exports.getAttachment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const attachment = await Attachment.findById(id)
      .populate('uploadedBy', 'name email')
      .populate({
        path: 'task',
        populate: { path: 'project' }
      })
      .populate({
        path: 'comment',
        populate: {
          path: 'task',
          populate: { path: 'project' }
        }
      });

    if (!attachment) {
      return res.status(404).json(errorResponse('Attachment not found'));
    }

    // Check access permissions
    let hasAccess = false;
    if (attachment.task) {
      hasAccess = attachment.task.project.team.some(member => member.toString() === userId);
    } else if (attachment.comment) {
      hasAccess = attachment.comment.task.project.team.some(member => member.toString() === userId);
    }

    if (!hasAccess) {
      return res.status(403).json(errorResponse('Access denied to this attachment'));
    }

    logger.info('Fetched attachment', { attachmentId: id, userId });

    res.json(successResponse(attachment));
  } catch (error) {
    logger.error('Failed to fetch attachment', {
      attachmentId: req.params.id,
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Download attachment
 * GET /api/attachments/:id/download
 */
exports.downloadAttachment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const attachment = await Attachment.findById(id)
      .populate({
        path: 'task',
        populate: { path: 'project' }
      })
      .populate({
        path: 'comment',
        populate: {
          path: 'task',
          populate: { path: 'project' }
        }
      });

    if (!attachment) {
      return res.status(404).json(errorResponse('Attachment not found'));
    }

    // Check access permissions
    let hasAccess = false;
    if (attachment.task) {
      hasAccess = attachment.task.project.team.some(member => member.toString() === userId);
    } else if (attachment.comment) {
      hasAccess = attachment.comment.task.project.team.some(member => member.toString() === userId);
    }

    if (!hasAccess) {
      return res.status(403).json(errorResponse('Access denied to this attachment'));
    }

    // Check if file exists
    try {
      await fs.access(attachment.path);
    } catch (error) {
      logger.error('Attachment file not found on disk', {
        attachmentId: id,
        path: attachment.path
      });
      return res.status(404).json(errorResponse('File not found on server'));
    }

    // Increment download count
    attachment.downloads += 1;
    await attachment.save();

    logger.info('Attachment downloaded', {
      attachmentId: id,
      userId,
      filename: attachment.originalName
    });

    // Set headers and send file
    res.setHeader('Content-Type', attachment.mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.originalName}"`);
    res.setHeader('Content-Length', attachment.size);

    fileStream.pipe(res);
  } catch (error) {
    logger.error('Failed to download attachment', {
      attachmentId: req.params.id,
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Delete attachment
 * DELETE /api/attachments/:id
 */
exports.deleteAttachment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const attachment = await Attachment.findById(id)
      .populate({
        path: 'task',
        populate: { path: 'project' }
      })
      .populate({
        path: 'comment',
        populate: {
          path: 'task',
          populate: { path: 'project' }
        }
      });

    if (!attachment) {
      return res.status(404).json(errorResponse('Attachment not found'));
    }

    // Check if user is uploader or project admin/manager
    let canDelete = false;
    if (attachment.uploadedBy.toString() === userId) {
      canDelete = true;
    } else if (attachment.task) {
      const userRole = attachment.task.project.team.find(
        member => member.user && member.user.toString() === userId
      );
      canDelete = userRole && (userRole.role === 'admin' || userRole.role === 'manager');
    } else if (attachment.comment) {
      const userRole = attachment.comment.task.project.team.find(
        member => member.user && member.user.toString() === userId
      );
      canDelete = userRole && (userRole.role === 'admin' || userRole.role === 'manager');
    }

    if (!canDelete) {
      return res.status(403).json(errorResponse('Access denied to delete this attachment'));
    }

    // Remove from task or comment
    if (attachment.task) {
      await Task.findByIdAndUpdate(attachment.task._id, {
        $pull: { attachments: attachment._id }
      });
    } else if (attachment.comment) {
      await Comment.findByIdAndUpdate(attachment.comment._id, {
        $pull: { attachments: attachment._id }
      });
    }

    // Delete file from disk
    try {
      await fs.unlink(attachment.path);
    } catch (error) {
      logger.warn('Failed to delete file from disk', {
        attachmentId: id,
        path: attachment.path,
        error: error.message
      });
    }

    // Delete attachment record
    await Attachment.findByIdAndDelete(id);

    logger.info('Attachment deleted', {
      attachmentId: id,
      userId,
      filename: attachment.originalName
    });

    res.json(successResponse(null, 'Attachment deleted successfully'));
  } catch (error) {
    logger.error('Failed to delete attachment', {
      attachmentId: req.params.id,
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Get all attachments for a task
 * GET /api/attachments/task/:taskId
 */
exports.getTaskAttachments = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const userId = req.userId;

    // Verify task exists and user has access
    const task = await Task.findById(taskId).populate('project');
    if (!task) {
      return res.status(404).json(errorResponse('Task not found'));
    }

    const isMember = task.project.team.some(member => member.toString() === userId);
    if (!isMember) {
      return res.status(403).json(errorResponse('Access denied to this task'));
    }

    const attachments = await Attachment.find({ task: taskId })
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 });

    logger.info('Fetched task attachments', {
      taskId,
      userId,
      count: attachments.length
    });

    res.json(successResponse(attachments));
  } catch (error) {
    logger.error('Failed to fetch task attachments', {
      taskId: req.params.taskId,
      userId: req.userId,
      error: error.message
    });
    next(error);
  }
};

/**
 * Get all attachments for a comment
 * GET /api/attachments/comment/:commentId
 */
exports.getCommentAttachments = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const userId = req.userId;

    // Verify comment exists and user has access
    const comment = await Comment.findById(commentId).populate({
      path: 'task',
      populate: { path: 'project' }
    });

    if (!comment) {
      return res.status(404).json(errorResponse('Comment not found'));
    }

    const isMember = comment.task.project.team.some(member => member.toString() === userId);
    if (!isMember) {
      return res.status(403).json(errorResponse('Access denied to this comment'));
    }

    const attachments = await Attachment.find({ comment: commentI
