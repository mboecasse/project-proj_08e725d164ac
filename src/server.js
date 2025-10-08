// File: src/server.js
// Generated: 2025-10-08 13:16:31 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_xwcq25t25o1b

        const mongoose = require('mongoose');
        const redis = require('./config/redis');


const app = require('./app');


const connectDB = require('./config/database');


const connectRedis = require('./config/redis');


const logger = require('./utils/logger');


const PORT = process.env.PORT || 3000;


const NODE_ENV = process.env.NODE_ENV || 'development';


let server;

/**
 * Initialize database connections
 */
async function initializeConnections() {
  try {
    // Connect to MongoDB
    await connectDB();
    logger.info('MongoDB connection established');

    // Connect to Redis
    await connectRedis();
    logger.info('Redis connection established');
  } catch (error) {
    logger.error('Failed to initialize connections', { error: error.message });
    throw error;
  }
}

/**
 * Start the Express server
 */
async function startServer() {
  try {
    // Initialize all connections
    await initializeConnections();

    // Start Express server
    server = app.listen(PORT, () => {
      logger.info(`Server started successfully`, {
        port: PORT,
        environment: NODE_ENV,
        nodeVersion: process.version,
        pid: process.pid
      });
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use`, { error: error.message });
      } else {
        logger.error('Server error', { error: error.message });
      }
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(signal) {
  logger.info(`${signal} signal received: closing HTTP server`);

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');

      try {
        // Close database connections
        await mongoose.connection.close();
        logger.info('MongoDB connection closed');

        // Close Redis connection
        const redisClient = redis.getClient();
        if (redisClient && redisClient.isOpen) {
          await redisClient.quit();
          logger.info('Redis connection closed');
        }

        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown', { error: error.message });
        process.exit(1);
      }
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  } else {
    process.exit(0);
  }
}

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

/**
 * Handle unhandled promise rejections
 */
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason,
    promise: promise
  });
  process.exit(1);
});

/**
 * Handle termination signals
 */
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

/**
 * Handle process warnings
 */
process.on('warning', (warning) => {
  logger.warn('Process warning', {
    name: warning.name,
    message: warning.message,
    stack: warning.stack
  });
});

// Start the server
startServer();

// Export for testing
module.exports = { app, server };
