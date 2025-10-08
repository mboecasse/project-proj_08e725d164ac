// File: src/middleware/rbac.js
// Generated: 2025-10-08 13:14:49 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_oa8h6iv55g4f


const logger = require('../utils/logger');

/**
 * Role-based access control middleware
 * Checks if authenticated user has required role(s)
 *
 * @param {...string} allowedRoles - Roles allowed to access the route
 * @returns {Function} Express middleware function
 */


const checkRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        logger.warn('RBAC check failed: No authenticated user', {
          path: req.path,
          method: req.method
        });
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Check if user has required role
      const userRole = req.user.role;

      if (!userRole) {
        logger.warn('RBAC check failed: User has no role assigned', {
          userId: req.userId,
          path: req.path
        });
        return res.status(403).json({
          success: false,
          error: 'Access denied: No role assigned'
        });
      }

      // Check if user's role is in allowed roles
      if (!allowedRoles.includes(userRole)) {
        logger.warn('RBAC check failed: Insufficient permissions', {
          userId: req.userId,
          userRole,
          requiredRoles: allowedRoles,
          path: req.path,
          method: req.method
        });
        return res.status(403).json({
          success: false,
          error: 'Access denied: Insufficient permissions'
        });
      }

      // User has required role
      logger.debug('RBAC check passed', {
        userId: req.userId,
        userRole,
        path: req.path
      });

      next();
    } catch (error) {
      logger.error('Error in RBAC middleware', {
        error: error.message,
        userId: req.userId,
        path: req.path
      });
      next(error);
    }
  };
};

/**
 * Check if user is admin
 */


const isAdmin = checkRole('admin');

/**
 * Check if user is admin or manager
 */


const isAdminOrManager = checkRole('admin', 'manager');

/**
 * Check if user is member (any authenticated user with role)
 */


const isMember = checkRole('admin', 'manager', 'member');

/**
 * Check resource ownership or admin access
 * Allows access if user owns the resource OR is an admin
 *
 * @param {string} resourceIdParam - Name of route parameter containing resource ID
 * @param {string} ownerField - Field name in resource that contains owner ID (default: 'userId')
 * @returns {Function} Express middleware function
 */


const checkOwnershipOrAdmin = (resourceIdParam = 'id', ownerField = 'userId') => {
  return async (req, res, next) => {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        logger.warn('Ownership check failed: No authenticated user', {
          path: req.path
        });
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const userRole = req.user.role;
      const userId = req.userId;

      // Admins have full access
      if (userRole === 'admin') {
        logger.debug('Ownership check passed: User is admin', {
          userId,
          path: req.path
        });
        return next();
      }

      // Check ownership via request body or params
      const resourceOwnerId = req.body[ownerField] || req.params[ownerField];

      if (!resourceOwnerId) {
        logger.warn('Ownership check failed: No owner ID found', {
          userId,
          ownerField,
          path: req.path
        });
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      // Check if user owns the resource
      if (resourceOwnerId.toString() !== userId.toString()) {
        logger.warn('Ownership check failed: User does not own resource', {
          userId,
          resourceOwnerId,
          path: req.path
        });
        return res.status(403).json({
          success: false,
          error: 'Access denied: You do not have permission to access this resource'
        });
      }

      logger.debug('Ownership check passed', {
        userId,
        resourceOwnerId,
        path: req.path
      });

      next();
    } catch (error) {
      logger.error('Error in ownership check middleware', {
        error: error.message,
        userId: req.userId,
        path: req.path
      });
      next(error);
    }
  };
};

/**
 * Check team membership
 * Allows access if user is member of the team OR is an admin
 *
 * @param {Function} getTeamId - Function to extract team ID from request
 * @returns {Function} Express middleware function
 */


const checkTeamMembership = (getTeamId = (req) => req.params.teamId) => {
  return async (req, res, next) => {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        logger.warn('Team membership check failed: No authenticated user', {
          path: req.path
        });
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const userRole = req.user.role;
      const userId = req.userId;

      // Admins have full access
      if (userRole === 'admin') {
        logger.debug('Team membership check passed: User is admin', {
          userId,
          path: req.path
        });
        return next();
      }

      // Get team ID from request
      const teamId = getTeamId(req);

      if (!teamId) {
        logger.warn('Team membership check failed: No team ID found', {
          userId,
          path: req.path
        });
        return res.status(400).json({
          success: false,
          error: 'Team ID required'
        });
      }

      // Check if user's teams include this team
      const userTeams = req.user.teams || [];
      const isMember = userTeams.some(team => team.toString() === teamId.toString());

      if (!isMember) {
        logger.warn('Team membership check failed: User not a team member', {
          userId,
          teamId,
          path: req.path
        });
        return res.status(403).json({
          success: false,
          error: 'Access denied: You are not a member of this team'
        });
      }

      logger.debug('Team membership check passed', {
        userId,
        teamId,
        path: req.path
      });

      next();
    } catch (error) {
      logger.error('Error in team membership check middleware', {
        error: error.message,
        userId: req.userId,
        path: req.path
      });
      next(error);
    }
  };
};

/**
 * Check project access
 * Allows access if user has access to the project OR is an admin
 *
 * @param {Function} getProjectId - Function to extract project ID from request
 * @returns {Function} Express middleware function
 */


const checkProjectAccess = (getProjectId = (req) => req.params.projectId) => {
  return async (req, res, next) => {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        logger.warn('Project access check failed: No authenticated user', {
          path: req.path
        });
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const userRole = req.user.role;
      const userId = req.userId;

      // Admins have full access
      if (userRole === 'admin') {
        logger.debug('Project access check passed: User is admin', {
          userId,
          path: req.path
        });
        return next();
      }

      // Get project ID from request
      const projectId = getProjectId(req);

      if (!projectId) {
        logger.warn('Project access check failed: No project ID found', {
          userId,
          path: req.path
        });
        return res.status(400).json({
          success: false,
          error: 'Project ID required'
        });
      }

      // Store project ID for use in controller
      req.projectId = projectId;

      logger.debug('Project access check passed', {
        userId,
        projectId,
        path: req.path
      });

      next();
    } catch (error) {
      logger.error('Error in project access check middleware', {
        error: error.message,
        userId: req.userId,
        path: req.path
      });
      next(error);
    }
  };
};

module.exports = {
  checkRole,
  isAdmin,
  isAdminOrManager,
  isMember,
  checkOwnershipOrAdmin,
  checkTeamMembership,
  checkProjectAccess
};
