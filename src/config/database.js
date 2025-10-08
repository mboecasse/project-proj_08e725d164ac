// File: src/config/database.js
// Generated: 2025-10-08 13:14:33 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_sdao8jon6dqq


const logger = require('../utils/logger');


const mongoose = require('mongoose');

/**
 * MongoDB connection configuration
 */


const dbConfig = {
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/taskmanagement',
  options: {
    maxPoolSize: 10,
    minPoolSize: 2,
    socketTimeoutMS: 45000,
    serverSelectionTimeoutMS: 5000,
    family: 4
  }
};

/**
 * Connect to MongoDB
 * @returns {Promise<void>}
 */


const connectDB = async () => {
  try {
    mongoose.set('strictQuery', false);

    const conn = await mongoose.connect(dbConfig.uri, dbConfig.options);

    logger.info('MongoDB connected successfully', {
      host: conn.connection.host,
      name: conn.connection.name,
      port: conn.connection.port
    });

    // Connection event listeners
    mongoose.connection.on('connected', () => {
      logger.info('Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('Mongoose connection error', { error: err.message });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('Mongoose disconnected from MongoDB');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        logger.info('Mongoose connection closed due to application termination');
        process.exit(0);
      } catch (err) {
        logger.error('Error closing mongoose connection', { error: err.message });
        process.exit(1);
      }
    });

  } catch (error) {
    logger.error('MongoDB connection failed', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
};

/**
 * Disconnect from MongoDB
 * @returns {Promise<void>}
 */


const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB disconnected successfully');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB', { error: error.message });
    throw error;
  }
};

/**
 * Get connection status
 * @returns {string} Connection state
 */


const getConnectionStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  return states[mongoose.connection.readyState] || 'unknown';
};

module.exports = {
  connectDB,
  disconnectDB,
  getConnectionStatus,
  mongoose
};
