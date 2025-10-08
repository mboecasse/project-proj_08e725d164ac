// File: tests/setup.js
// Generated: 2025-10-08 13:14:22 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_q9304nscrqo8


const logger = require('../src/utils/logger');


const mongoose = require('mongoose');

const { MongoMemoryServer } = require('mongodb-memory-server');


let mongoServer;

/**
 * Connect to in-memory MongoDB for testing
 */


const connect = async () => {
  try {
    // Close any existing connections
    await mongoose.disconnect();

    // Create in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    // Connect to in-memory database
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    logger.info('Connected to in-memory MongoDB for testing');
  } catch (error) {
    logger.error('Failed to connect to test database', { error: error.message });
    throw error;
  }
};

/**
 * Clear all collections in the database
 */


const clearDatabase = async () => {
  try {
    const collections = mongoose.connection.collections;

    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }

    logger.debug('Cleared all collections in test database');
  } catch (error) {
    logger.error('Failed to clear test database', { error: error.message });
    throw error;
  }
};

/**
 * Close database connection and stop MongoDB server
 */


const closeDatabase = async () => {
  try {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();

    if (mongoServer) {
      await mongoServer.stop();
    }

    logger.info('Closed test database connection');
  } catch (error) {
    logger.error('Failed to close test database', { error: error.message });
    throw error;
  }
};

/**
 * Setup before all tests
 */
beforeAll(async () => {
  await connect();
});

/**
 * Clear database after each test
 */
afterEach(async () => {
  await clearDatabase();
});

/**
 * Cleanup after all tests
 */
afterAll(async () => {
  await closeDatabase();
});

/**
 * Set test environment variables
 */
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_key_for_testing_purposes_only';
process.env.JWT_ACCESS_EXPIRY = '15m';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_key_for_testing_purposes_only';
process.env.JWT_REFRESH_EXPIRY = '7d';

module.exports = {
  connect,
  clearDatabase,
  closeDatabase,
};
