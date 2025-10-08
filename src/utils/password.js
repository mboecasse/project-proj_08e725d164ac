// File: src/utils/password.js
// Generated: 2025-10-08 13:14:41 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_9r97zr0qcrvz


const bcrypt = require('bcryptjs');


const logger = require('./logger');

/**
 * Hash a plain text password
 * @param {string} password - Plain text password to hash
 * @returns {Promise<string>} Hashed password
 */


const hashPassword = async (password) => {
  try {
    if (!password || typeof password !== 'string') {
      throw new Error('Invalid password provided for hashing');
    }

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    logger.debug('Password hashed successfully');

    return hashedPassword;
  } catch (error) {
    logger.error('Failed to hash password', { error: error.message });
    throw new Error('Password hashing failed');
  }
};

/**
 * Compare a plain text password with a hashed password
 * @param {string} password - Plain text password to compare
 * @param {string} hashedPassword - Hashed password to compare against
 * @returns {Promise<boolean>} True if passwords match, false otherwise
 */


const comparePassword = async (password, hashedPassword) => {
  try {
    if (!password || typeof password !== 'string') {
      throw new Error('Invalid password provided for comparison');
    }

    if (!hashedPassword || typeof hashedPassword !== 'string') {
      throw new Error('Invalid hashed password provided for comparison');
    }

    const isMatch = await bcrypt.compare(password, hashedPassword);

    logger.debug('Password comparison completed', { isMatch });

    return isMatch;
  } catch (error) {
    logger.error('Failed to compare password', { error: error.message });
    throw new Error('Password comparison failed');
  }
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with isValid flag and errors array
 */


const validatePasswordStrength = (password) => {
  const errors = [];

  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      errors: ['Password is required']
    };
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  const isValid = errors.length === 0;

  logger.debug('Password strength validation completed', { isValid, errorCount: errors.length });

  return {
    isValid,
    errors
  };
};

/**
 * Generate a random password
 * @param {number} length - Length of password to generate (default: 16)
 * @returns {string} Generated password
 */


const generateRandomPassword = (length = 16) => {
  try {
    if (length < 8 || length > 128) {
      throw new Error('Password length must be between 8 and 128 characters');
    }

    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const allChars = lowercase + uppercase + numbers + special;

    let password = '';

    // Ensure at least one character from each category
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // Fill remaining length with random characters
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password to randomize character positions
    password = password.split('').sort(() => Math.random() - 0.5).join('');

    logger.debug('Random password generated', { length });

    return password;
  } catch (error) {
    logger.error('Failed to generate random password', { error: error.message });
    throw new Error('Password generation failed');
  }
};

module.exports = {
  hashPassword,
  comparePassword,
  validatePasswordStrength,
  generateRandomPassword
};
