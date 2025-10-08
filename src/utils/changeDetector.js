// File: src/utils/changeDetector.js
// Generated: 2025-10-08 13:15:00 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_29aa728milfg


const logger = require('./logger');

/**
 * Detects changes between two objects and returns a detailed diff
 * @param {Object} oldObj - Original object
 * @param {Object} newObj - Updated object
 * @param {Array<string>} excludeFields - Fields to exclude from comparison (e.g., ['updatedAt', 'password'])
 * @returns {Object} - { hasChanges: boolean, changes: Array<{field, oldValue, newValue}> }
 */


const detectChanges = (oldObj, newObj, excludeFields = []) => {
  try {
    if (!oldObj || !newObj) {
      logger.warn('Change detection called with null/undefined objects');
      return { hasChanges: false, changes: [] };
    }

    const changes = [];
    const allKeys = new Set([
      ...Object.keys(oldObj),
      ...Object.keys(newObj)
    ]);

    // Fields to always exclude
    const defaultExcludeFields = ['_id', '__v', 'createdAt', 'updatedAt', 'password', 'passwordHash'];
    const excludeSet = new Set([...defaultExcludeFields, ...excludeFields]);

    for (const key of allKeys) {
      // Skip excluded fields
      if (excludeSet.has(key)) {
        continue;
      }

      const oldValue = oldObj[key];
      const newValue = newObj[key];

      // Handle different value types
      if (isValueChanged(oldValue, newValue)) {
        changes.push({
          field: key,
          oldValue: sanitizeValue(oldValue),
          newValue: sanitizeValue(newValue)
        });
      }
    }

    return {
      hasChanges: changes.length > 0,
      changes
    };
  } catch (error) {
    logger.error('Error detecting changes', { error: error.message });
    return { hasChanges: false, changes: [] };
  }
};

/**
 * Checks if a value has changed between old and new
 * @param {*} oldValue - Original value
 * @param {*} newValue - New value
 * @returns {boolean} - True if values are different
 */


const isValueChanged = (oldValue, newValue) => {
  // Handle null/undefined cases
  if (oldValue === null && newValue === null) return false;
  if (oldValue === undefined && newValue === undefined) return false;
  if (oldValue === null && newValue === undefined) return false;
  if (oldValue === undefined && newValue === null) return false;
  if ((oldValue === null || oldValue === undefined) && newValue !== null && newValue !== undefined) return true;
  if ((newValue === null || newValue === undefined) && oldValue !== null && oldValue !== undefined) return true;

  // Handle Date objects
  if (oldValue instanceof Date && newValue instanceof Date) {
    return oldValue.getTime() !== newValue.getTime();
  }

  // Handle MongoDB ObjectId
  if (oldValue && newValue && oldValue.toString && newValue.toString) {
    if (oldValue.constructor.name === 'ObjectId' || newValue.constructor.name === 'ObjectId') {
      return oldValue.toString() !== newValue.toString();
    }
  }

  // Handle arrays
  if (Array.isArray(oldValue) && Array.isArray(newValue)) {
    if (oldValue.length !== newValue.length) return true;

    // Compare array elements
    for (let i = 0; i < oldValue.length; i++) {
      if (isValueChanged(oldValue[i], newValue[i])) {
        return true;
      }
    }
    return false;
  }

  // Handle objects (but not arrays or dates)
  if (
    typeof oldValue === 'object' &&
    typeof newValue === 'object' &&
    oldValue !== null &&
    newValue !== null &&
    !Array.isArray(oldValue) &&
    !Array.isArray(newValue) &&
    !(oldValue instanceof Date) &&
    !(newValue instanceof Date)
  ) {
    const oldKeys = Object.keys(oldValue);
    const newKeys = Object.keys(newValue);

    if (oldKeys.length !== newKeys.length) return true;

    for (const key of oldKeys) {
      if (isValueChanged(oldValue[key], newValue[key])) {
        return true;
      }
    }
    return false;
  }

  // Primitive comparison
  return oldValue !== newValue;
};

/**
 * Sanitizes a value for safe logging (removes sensitive data)
 * @param {*} value - Value to sanitize
 * @returns {*} - Sanitized value
 */


const sanitizeValue = (value) => {
  if (value === null || value === undefined) {
    return value;
  }

  // Handle Date objects
  if (value instanceof Date) {
    return value.toISOString();
  }

  // Handle MongoDB ObjectId
  if (value && value.constructor && value.constructor.name === 'ObjectId') {
    return value.toString();
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.map(item => sanitizeValue(item));
  }

  // Handle objects
  if (typeof value === 'object') {
    const sanitized = {};
    for (const key in value) {
      // Skip sensitive fields
      if (['password', 'passwordHash', 'token', 'secret', 'apiKey'].includes(key)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeValue(value[key]);
      }
    }
    return sanitized;
  }

  // Return primitive values as-is
  return value;
};

/**
 * Formats changes into a human-readable string
 * @param {Array<Object>} changes - Array of change objects
 * @returns {string} - Formatted change description
 */


const formatChanges = (changes) => {
  if (!changes || changes.length === 0) {
    return 'No changes detected';
  }

  return changes.map(change => {
    const oldVal = formatValue(change.oldValue);
    const newVal = formatValue(change.newValue);
    return `${change.field}: ${oldVal} → ${newVal}`;
  }).join(', ');
};

/**
 * Formats a value for display
 * @param {*} value - Value to format
 * @returns {string} - Formatted value
 */


const formatValue = (value) => {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

/**
 * Creates an audit log entry from detected changes
 * @param {Object} options - Audit log options
 * @param {string} options.action - Action performed (create, update, delete)
 * @param {string} options.resourceType - Type of resource (task, project, user, etc.)
 * @param {string} options.resourceId - ID of the resource
 * @param {string} options.userId - ID of user who made the change
 * @param {Object} options.oldData - Original data
 * @param {Object} options.newData - Updated data
 * @param {Array<string>} options.excludeFields - Fields to exclude
 * @returns {Object} - Audit log entry
 */


const createAuditLog = ({ action, resourceType, resourceId, userId, oldData, newData, excludeFields = [] }) => {
  try {
    const { hasChanges, changes } = detectChanges(oldData, newData, excludeFields);

    return {
      action,
      resourceType,
      resourceId,
      userId,
      timestamp: new Date(),
      hasChanges,
      changes,
      changeDescription: formatChanges(changes),
      metadata: {
        changedFields: changes.map(c => c.field),
        changeCount: changes.length
      }
    };
  } catch (error) {
    logger.error('Error creating audit log', { error: error.message, resourceType, resourceId });
    throw error;
  }
};

/**
 * Compares two arrays of objects and returns added, removed, and modified items
 * @param {Array<Object>} oldArray - Original array
 * @param {Array<Object>} newArray - Updated array
 * @param {string} idField - Field to use as unique identifier (default: '_id')
 * @returns {Object} - { added: [], removed: [], modified: [] }
 */


const compareArrays = (oldArray = [], newArray = [], idField = '_id') => {
  try {
    const oldMap = new Map(oldArray.map(item => [String(item[idField]), item]));
    const newMap = new Map(newArray.map(item => [String(item[idField]), item]));

    const added = [];
    const removed = [];
    const modified = [];

    // Find added and modified items
    for (const [id, newItem] of newMap) {
      const oldItem = oldMap.get(id);
      if (!oldItem) {
        added.push(newItem);
      } else {
        const { hasChanges, changes } = detectChanges(oldItem, newItem);
        if (hasChanges) {
          modified.push({ id, changes, oldItem, newItem });
        }
      }
    }

    // Find removed items
    for (const [id, oldItem] of oldMap) {
      if (!newMap.has(id)) {
        removed.push(oldItem);
      }
    }

    return { added, removed, modified };
  } catch (error) {
    logger.error('Error comparing arrays', { error: error.message });
    return { added: [], removed: [], modified: [] };
  }
};

module.exports = {
  detectChanges,
  isValueChanged,
  sanitizeValue,
  formatChanges,
  formatValue,
  createAuditLog,
  compareArrays
};
