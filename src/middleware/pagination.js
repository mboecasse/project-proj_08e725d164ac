// File: src/middleware/pagination.js
// Generated: 2025-10-08 13:14:52 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_eyykz7yny39o


const logger = require('../utils/logger');

/**
 * Pagination middleware
 * Parses pagination parameters from query string and adds them to req
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10, max: 100)
 * - sortBy: Field to sort by (default: 'createdAt')
 * - sortOrder: Sort direction 'asc' or 'desc' (default: 'desc')
 *
 * Adds to req object:
 * - req.pagination: { page, limit, skip, sortBy, sortOrder }
 */


const paginate = (req, res, next) => {
  try {
    // Parse page number (minimum 1)
    const page = Math.max(1, parseInt(req.query.page) || 1);

    // Parse limit (minimum 1, maximum 100)
    let limit = parseInt(req.query.limit) || 10;
    limit = Math.max(1, Math.min(100, limit));

    // Calculate skip value
    const skip = (page - 1) * limit;

    // Parse sort parameters
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';

    // Add pagination info to request
    req.pagination = {
      page,
      limit,
      skip,
      sortBy,
      sortOrder
    };

    logger.debug('Pagination applied', {
      page,
      limit,
      skip,
      sortBy,
      sortOrder
    });

    next();
  } catch (error) {
    logger.error('Pagination middleware error', { error: error.message });
    next(error);
  }
};

/**
 * Filter middleware
 * Parses filter parameters from query string and adds them to req
 *
 * Query parameters:
 * - search: Text search query
 * - status: Filter by status
 * - priority: Filter by priority
 * - assignedTo: Filter by assigned user ID
 * - projectId: Filter by project ID
 * - teamId: Filter by team ID
 * - startDate: Filter by start date (ISO format)
 * - endDate: Filter by end date (ISO format)
 * - tags: Comma-separated list of tags
 *
 * Adds to req object:
 * - req.filters: Object with filter conditions
 */


const filter = (req, res, next) => {
  try {
    const filters = {};

    // Text search
    if (req.query.search) {
      filters.search = req.query.search.trim();
    }

    // Status filter
    if (req.query.status) {
      const validStatuses = ['todo', 'in_progress', 'in_review', 'completed', 'cancelled'];
      const statuses = req.query.status.split(',').map(s => s.trim().toLowerCase());
      const validatedStatuses = statuses.filter(s => validStatuses.includes(s));

      if (validatedStatuses.length > 0) {
        filters.status = validatedStatuses.length === 1 ? validatedStatuses[0] : { $in: validatedStatuses };
      }
    }

    // Priority filter
    if (req.query.priority) {
      const validPriorities = ['low', 'medium', 'high', 'urgent'];
      const priorities = req.query.priority.split(',').map(p => p.trim().toLowerCase());
      const validatedPriorities = priorities.filter(p => validPriorities.includes(p));

      if (validatedPriorities.length > 0) {
        filters.priority = validatedPriorities.length === 1 ? validatedPriorities[0] : { $in: validatedPriorities };
      }
    }

    // Assigned user filter
    if (req.query.assignedTo) {
      filters.assignedTo = req.query.assignedTo;
    }

    // Project filter
    if (req.query.projectId) {
      filters.project = req.query.projectId;
    }

    // Team filter
    if (req.query.teamId) {
      filters.team = req.query.teamId;
    }

    // Date range filter
    if (req.query.startDate || req.query.endDate) {
      filters.dateRange = {};

      if (req.query.startDate) {
        const startDate = new Date(req.query.startDate);
        if (!isNaN(startDate.getTime())) {
          filters.dateRange.$gte = startDate;
        }
      }

      if (req.query.endDate) {
        const endDate = new Date(req.query.endDate);
        if (!isNaN(endDate.getTime())) {
          // Set to end of day
          endDate.setHours(23, 59, 59, 999);
          filters.dateRange.$lte = endDate;
        }
      }

      // Remove dateRange if empty
      if (Object.keys(filters.dateRange).length === 0) {
        delete filters.dateRange;
      }
    }

    // Tags filter
    if (req.query.tags) {
      const tags = req.query.tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
      if (tags.length > 0) {
        filters.tags = { $in: tags };
      }
    }

    // Created by filter
    if (req.query.createdBy) {
      filters.createdBy = req.query.createdBy;
    }

    // Is archived filter
    if (req.query.archived !== undefined) {
      filters.isArchived = req.query.archived === 'true';
    }

    // Add filters to request
    req.filters = filters;

    logger.debug('Filters applied', { filters });

    next();
  } catch (error) {
    logger.error('Filter middleware error', { error: error.message });
    next(error);
  }
};

/**
 * Build MongoDB query from filters
 * Helper function to convert req.filters to MongoDB query object
 *
 * @param {Object} filters - Filter object from req.filters
 * @param {Array} searchFields - Fields to search in for text search
 * @returns {Object} MongoDB query object
 */


const buildQuery = (filters, searchFields = ['title', 'description']) => {
  const query = {};

  // Text search across multiple fields
  if (filters.search) {
    query.$or = searchFields.map(field => ({
      [field]: { $regex: filters.search, $options: 'i' }
    }));
  }

  // Status filter
  if (filters.status) {
    query.status = filters.status;
  }

  // Priority filter
  if (filters.priority) {
    query.priority = filters.priority;
  }

  // Assigned user filter
  if (filters.assignedTo) {
    query.assignedTo = filters.assignedTo;
  }

  // Project filter
  if (filters.project) {
    query.project = filters.project;
  }

  // Team filter
  if (filters.team) {
    query.team = filters.team;
  }

  // Date range filter
  if (filters.dateRange) {
    query.dueDate = filters.dateRange;
  }

  // Tags filter
  if (filters.tags) {
    query.tags = filters.tags;
  }

  // Created by filter
  if (filters.createdBy) {
    query.createdBy = filters.createdBy;
  }

  // Archived filter
  if (filters.isArchived !== undefined) {
    query.isArchived = filters.isArchived;
  } else {
    // By default, exclude archived items
    query.isArchived = { $ne: true };
  }

  return query;
};

/**
 * Build sort object from pagination
 * Helper function to convert req.pagination to MongoDB sort object
 *
 * @param {Object} pagination - Pagination object from req.pagination
 * @returns {Object} MongoDB sort object
 */


const buildSort = (pagination) => {
  const sort = {};
  sort[pagination.sortBy] = pagination.sortOrder === 'asc' ? 1 : -1;

  // Add secondary sort by _id for consistency
  if (pagination.sortBy !== '_id') {
    sort._id = -1;
  }

  return sort;
};

/**
 * Format paginated response
 * Helper function to create consistent paginated response format
 *
 * @param {Array} data - Array of documents
 * @param {Number} total - Total count of documents
 * @param {Object} pagination - Pagination object from req.pagination
 * @returns {Object} Formatted response object
 */


const formatPaginatedResponse = (data, total, pagination) => {
  const totalPages = Math.ceil(total / pagination.limit);

  return {
    success: true,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages,
      hasNextPage: pagination.page < totalPages,
      hasPrevPage: pagination.page > 1
    }
  };
};

module.exports = {
  paginate,
  filter,
  buildQuery,
  buildSort,
  formatPaginatedResponse
};
