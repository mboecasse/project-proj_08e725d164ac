// File: src/utils/token.js
// Generated: 2025-10-08 13:14:42 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_1jcqg39co13c


const jwt = require('jsonwebtoken');


const logger = require('./logger');

/**
 * Generate JWT access token
 * @param {Object} payload - Token payload (userId, email, role)
 * @returns {string} JWT access token
 */


const generateAccessToken = (payload) => {
  try {
    const accessToken = jwt.sign(
      payload,
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
    );

    logger.debug('Access token generated', { userId: payload.userId });
    return accessToken;
  } catch (error) {
    logger.error('Failed to generate access token', { error: error.message });
    throw new Error('Token generation failed');
  }
};

/**
 * Generate JWT refresh token
 * @param {Object} payload - Token payload (userId)
 * @returns {string} JWT refresh token
 */


const generateRefreshToken = (payload) => {
  try {
    const refreshToken = jwt.sign(
      payload,
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
    );

    logger.debug('Refresh token generated', { userId: payload.userId });
    return refreshToken;
  } catch (error) {
    logger.error('Failed to generate refresh token', { error: error.message });
    throw new Error('Token generation failed');
  }
};

/**
 * Generate both access and refresh tokens
 * @param {Object} payload - Token payload
 * @returns {Object} Object containing accessToken and refreshToken
 */


const generateTokens = (payload) => {
  try {
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken({ userId: payload.userId });

    logger.info('Token pair generated', { userId: payload.userId });

    return {
      accessToken,
      refreshToken
    };
  } catch (error) {
    logger.error('Failed to generate token pair', { error: error.message });
    throw error;
  }
};

/**
 * Verify JWT access token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */


const verifyAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    logger.debug('Access token verified', { userId: decoded.userId });
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logger.warn('Access token expired', { expiredAt: error.expiredAt });
      throw new Error('Token expired');
    }
    if (error.name === 'JsonWebTokenError') {
      logger.warn('Invalid access token', { error: error.message });
      throw new Error('Invalid token');
    }
    logger.error('Access token verification failed', { error: error.message });
    throw new Error('Token verification failed');
  }
};

/**
 * Verify JWT refresh token
 * @param {string} token - JWT refresh token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */


const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    logger.debug('Refresh token verified', { userId: decoded.userId });
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logger.warn('Refresh token expired', { expiredAt: error.expiredAt });
      throw new Error('Refresh token expired');
    }
    if (error.name === 'JsonWebTokenError') {
      logger.warn('Invalid refresh token', { error: error.message });
      throw new Error('Invalid refresh token');
    }
    logger.error('Refresh token verification failed', { error: error.message });
    throw new Error('Token verification failed');
  }
};

/**
 * Decode JWT token without verification
 * @param {string} token - JWT token to decode
 * @returns {Object|null} Decoded token payload or null if invalid
 */


const decodeToken = (token) => {
  try {
    const decoded = jwt.decode(token);
    return decoded;
  } catch (error) {
    logger.error('Failed to decode token', { error: error.message });
    return null;
  }
};

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Extracted token or null
 */


const extractTokenFromHeader = (authHeader) => {
  if (!authHeader) {
    return null;
  }

  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
};

/**
 * Get token expiration time
 * @param {string} token - JWT token
 * @returns {Date|null} Expiration date or null if invalid
 */


const getTokenExpiration = (token) => {
  try {
    const decoded = decodeToken(token);
    if (decoded && decoded.exp) {
      return new Date(decoded.exp * 1000);
    }
    return null;
  } catch (error) {
    logger.error('Failed to get token expiration', { error: error.message });
    return null;
  }
};

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean} True if expired, false otherwise
 */


const isTokenExpired = (token) => {
  try {
    const expiration = getTokenExpiration(token);
    if (!expiration) {
      return true;
    }
    return expiration < new Date();
  } catch (error) {
    logger.error('Failed to check token expiration', { error: error.message });
    return true;
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  extractTokenFromHeader,
  getTokenExpiration,
  isTokenExpired
};
