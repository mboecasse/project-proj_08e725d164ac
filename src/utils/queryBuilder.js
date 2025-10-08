// File: src/utils/queryBuilder.js
// Generated: 2025-10-08 13:14:53 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_8cfr4psg0rlg


const logger = require('./logger');

/**
 * QueryBuilder - Dynamic query builder for filtering, sorting, pagination, and searching
 * Supports MongoDB queries with flexible filtering options
 */
class QueryBuilder {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  /**
   * Filter query based on query parameters
   * Excludes special parameters (page, sort, limit, fields, search)
   * Supports advanced operators: gte, gt, lte, lt, in, nin, ne
   */
  filter() {
    try {
      const queryObj = { ...this.queryString };
      const excludedFields = ['page', 'sort', 'limit', 'fields', 'search', 'populate'];
      excludedFields.forEach(field => delete queryObj[field]);

      // Convert operators (gte, gt, lte, lt, in, nin, ne) to MongoDB format
      let queryStr = JSON.stringify(queryObj);
      queryStr = queryStr.replace(/\b(gte|gt|lte|lt|in|nin|ne|regex)\b/g, match => `$${match}`);

      const parsedQuery = JSON.parse(queryStr);

      // Handle array values for $in and $nin operators
      Object.keys(parsedQuery).forEach(key => {
        if (parsedQuery[key].$in && typeof parsedQuery[key].$in === 'string') {
          parsedQuery[key].$in = parsedQuery[key].$in.split(',');
        }
        if (parsedQuery[key].$nin && typeof parsedQuery[key].$nin === 'string') {
          parsedQuery[key].$nin = parsedQuery[key].$nin.split(',');
        }
      });

      this.query = this.query.find(parsedQuery);

      logger.debug('Applied filters to query', { filters: parsedQuery });

      return this;
    } catch (error) {
      logger.error('Error applying filters', { error: error.message });
      throw error;
    }
  }

  /**
   * Sort query results
   * Supports multiple sort fields separated by comma
   * Default sort: -createdAt (newest first)
   */
  sort() {
    try {
      if (this.queryString.sort) {
        const sortBy = this.queryString.sort.split(',').join(' ');
        this.query = this.query.sort(sortBy);
        logger.debug('Applied sorting', { sortBy });
      } else {
        this.query = this.query.sort('-createdAt');
        logger.debug('Applied default sorting', { sortBy: '-createdAt' });
      }

      return this;
    } catch (error) {
      logger.error('Error applying sort', { error: error.message });
      throw error;
    }
  }

  /**
   * Limit fields returned in query
   * Supports multiple fields separated by comma
   * Always excludes __v field
   */
  limitFields() {
    try {
      if (this.queryString.fields) {
        const fields = this.queryString.fields.split(',').join(' ');
        this.query = this.query.select(fields);
        logger.debug('Limited fields', { fields });
      } else {
        this.query = this.query.select('-__v');
      }

      return this;
    } catch (error) {
      logger.error('Error limiting fields', { error: error.message });
      throw error;
    }
  }

  /**
   * Paginate query results
   * Default: page=1, limit=10
   * Max limit: 100
   */
  paginate() {
    try {
      const page = parseInt(this.queryString.page, 10) || 1;
      const limit = Math.min(parseInt(this.queryString.limit, 10) || 10, 100);
      const skip = (page - 1) * limit;

      this.query = this.query.skip(skip).limit(limit);

      logger.debug('Applied pagination', { page, limit, skip });

      return this;
    } catch (error) {
      logger.error('Error applying pagination', { error: error.message });
      throw error;
    }
  }

  /**
   * Search across multiple fields
   * Supports case-insensitive regex search
   * @param {Array} searchFields - Fields to search in
   */
  search(searchFields = []) {
    try {
      if (this.queryString.search && searchFields.length > 0) {
        const searchTerm = this.queryString.search;
        const searchQuery = {
          $or: searchFields.map(field => ({
            [field]: { $regex: searchTerm, $options: 'i' }
          }))
        };

        this.query = this.query.find(searchQuery);

        logger.debug('Applied search', { searchTerm, searchFields });
      }

      return this;
    } catch (error) {
      logger.error('Error applying search', { error: error.message });
      throw error;
    }
  }

  /**
   * Populate referenced documents
   * Supports multiple populate fields separated by comma
   */
  populate() {
    try {
      if (this.queryString.populate) {
        const populateFields = this.queryString.populate.split(',');
        populateFields.forEach(field => {
          this.query = this.query.populate(field.trim());
        });

        logger.debug('Applied populate', { populateFields });
      }

      return this;
    } catch (error) {
      logger.error('Error applying populate', { error: error.message });
      throw error;
    }
  }

  /**
   * Execute query and return results with metadata
   * @returns {Object} - Results with pagination metadata
   */
  async execute() {
    try {
      const results = await this.query;

      const page = parseInt(this.queryString.page, 10) || 1;
      const limit = Math.min(parseInt(this.queryString.limit, 10) || 10, 100);

      logger.info('Query executed successfully', {
        resultCount: results.length,
        page,
        limit
      });

      return {
        success: true,
        count: results.length,
        page,
        limit,
        data: results
      };
    } catch (error) {
      logger.error('Error executing query', { error: error.message });
      throw error;
    }
  }

  /**
   * Get total count for pagination metadata
   * @param {Object} model - Mongoose model
   * @returns {Number} - Total document count
   */
  async getCount(model) {
    try {
      const queryObj = { ...this.queryString };
      const excludedFields = ['page', 'sort', 'limit', 'fields', 'search', 'populate'];
      excludedFields.forEach(field => delete queryObj[field]);

      let queryStr = JSON.stringify(queryObj);
      queryStr = queryStr.replace(/\b(gte|gt|lte|lt|in|nin|ne|regex)\b/g, match => `$${match}`);

      const parsedQuery = JSON.parse(queryStr);

      // Handle array values for $in and $nin operators
      Object.keys(parsedQuery).forEach(key => {
        if (parsedQuery[key].$in && typeof parsedQuery[key].$in === 'string') {
          parsedQuery[key].$in = parsedQuery[key].$in.split(',');
        }
        if (parsedQuery[key].$nin && typeof parsedQuery[key].$nin === 'string') {
          parsedQuery[key].$nin = parsedQuery[key].$nin.split(',');
        }
      });

      const count = await model.countDocuments(parsedQuery);

      logger.debug('Retrieved document count', { count });

      return count;
    } catch (error) {
      logger.error('Error getting count', { error: error.message });
      throw error;
    }
  }
}

/**
 * Helper function to create and execute a complete query
 * @param {Object} model - Mongoose model
 * @param {Object} queryString - Request query parameters
 * @param {Array} searchFields - Fields to search in (optional)
 * @returns {Object} - Query results with metadata
 */


const buildQuery = async (model, queryString, searchFields = []) => {
  try {
    const queryBuilder = new QueryBuilder(model.find(), queryString)
      .filter()
      .search(searchFields)
      .sort()
      .limitFields()
      .paginate()
      .populate();

    const results = await queryBuilder.query;
    const total = await queryBuilder.getCount(model);

    const page = parseInt(queryString.page, 10) || 1;
    const limit = Math.min(parseInt(queryString.limit, 10) || 10, 100);
    const totalPages = Math.ceil(total / limit);

    logger.info('Built and executed query', {
      total,
      page,
      limit,
      totalPages,
      resultCount: results.length
    });

    return {
      success: true,
      count: results.length,
      total,
      page,
      limit,
      totalPages,
      data: results
    };
  } catch (error) {
    logger.error('Error building query', { error: error.message });
    throw error;
  }
};

module.exports = { QueryBuilder, buildQuery };
