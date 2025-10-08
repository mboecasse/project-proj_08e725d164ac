// File: src/config/redis.js
// Generated: 2025-10-08 13:14:33 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_whx788x089do


const logger = require('../utils/logger');


const redis = require('redis');

/**
 * Redis client configuration
 * Used for caching and session management
 */


let redisClient = null;

let isConnected = false;

/**
 * Redis configuration options
 */


const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB, 10) || 0,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: true,
  connectTimeout: 10000,
  lazyConnect: false
};

/**
 * Create and configure Redis client
 */


const createRedisClient = () => {
  try {
    const client = redis.createClient({
      socket: {
        host: redisConfig.host,
        port: redisConfig.port,
        connectTimeout: redisConfig.connectTimeout,
        reconnectStrategy: redisConfig.retryStrategy
      },
      password: redisConfig.password,
      database: redisConfig.db
    });

    // Connection event handlers
    client.on('connect', () => {
      logger.info('Redis client connecting...', {
        host: redisConfig.host,
        port: redisConfig.port
      });
    });

    client.on('ready', () => {
      isConnected = true;
      logger.info('Redis client connected and ready', {
        host: redisConfig.host,
        port: redisConfig.port
      });
    });

    client.on('error', (error) => {
      isConnected = false;
      logger.error('Redis client error', {
        error: error.message,
        host: redisConfig.host,
        port: redisConfig.port
      });
    });

    client.on('end', () => {
      isConnected = false;
      logger.warn('Redis client connection closed', {
        host: redisConfig.host,
        port: redisConfig.port
      });
    });

    client.on('reconnecting', () => {
      logger.info('Redis client reconnecting...', {
        host: redisConfig.host,
        port: redisConfig.port
      });
    });

    return client;
  } catch (error) {
    logger.error('Failed to create Redis client', {
      error: error.message,
      host: redisConfig.host,
      port: redisConfig.port
    });
    throw error;
  }
};

/**
 * Initialize Redis connection
 */


const connectRedis = async () => {
  try {
    if (redisClient && isConnected) {
      logger.info('Redis client already connected');
      return redisClient;
    }

    redisClient = createRedisClient();
    await redisClient.connect();

    logger.info('Redis connection established successfully');
    return redisClient;
  } catch (error) {
    logger.error('Failed to connect to Redis', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Disconnect Redis client
 */


const disconnectRedis = async () => {
  try {
    if (redisClient && isConnected) {
      await redisClient.quit();
      redisClient = null;
      isConnected = false;
      logger.info('Redis client disconnected successfully');
    }
  } catch (error) {
    logger.error('Error disconnecting Redis client', {
      error: error.message
    });
    throw error;
  }
};

/**
 * Get Redis client instance
 */


const getRedisClient = () => {
  if (!redisClient || !isConnected) {
    logger.warn('Redis client not connected, attempting to connect...');
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  return redisClient;
};

/**
 * Check if Redis is connected
 */


const isRedisConnected = () => {
  return isConnected && redisClient !== null;
};

/**
 * Set value in Redis with optional expiration
 */


const setCache = async (key, value, expirationInSeconds = null) => {
  try {
    const client = getRedisClient();
    const serializedValue = JSON.stringify(value);

    if (expirationInSeconds) {
      await client.setEx(key, expirationInSeconds, serializedValue);
    } else {
      await client.set(key, serializedValue);
    }

    logger.debug('Cache set successfully', { key, expirationInSeconds });
    return true;
  } catch (error) {
    logger.error('Failed to set cache', {
      key,
      error: error.message
    });
    return false;
  }
};

/**
 * Get value from Redis
 */


const getCache = async (key) => {
  try {
    const client = getRedisClient();
    const value = await client.get(key);

    if (value) {
      logger.debug('Cache hit', { key });
      return JSON.parse(value);
    }

    logger.debug('Cache miss', { key });
    return null;
  } catch (error) {
    logger.error('Failed to get cache', {
      key,
      error: error.message
    });
    return null;
  }
};

/**
 * Delete value from Redis
 */


const deleteCache = async (key) => {
  try {
    const client = getRedisClient();
    const result = await client.del(key);

    logger.debug('Cache deleted', { key, deleted: result > 0 });
    return result > 0;
  } catch (error) {
    logger.error('Failed to delete cache', {
      key,
      error: error.message
    });
    return false;
  }
};

/**
 * Delete multiple keys matching pattern
 */


const deleteCachePattern = async (pattern) => {
  try {
    const client = getRedisClient();
    const keys = await client.keys(pattern);

    if (keys.length > 0) {
      await client.del(keys);
      logger.debug('Cache pattern deleted', { pattern, count: keys.length });
      return keys.length;
    }

    return 0;
  } catch (error) {
    logger.error('Failed to delete cache pattern', {
      pattern,
      error: error.message
    });
    return 0;
  }
};

/**
 * Check if key exists in Redis
 */


const cacheExists = async (key) => {
  try {
    const client = getRedisClient();
    const exists = await client.exists(key);
    return exists === 1;
  } catch (error) {
    logger.error('Failed to check cache existence', {
      key,
      error: error.message
    });
    return false;
  }
};

/**
 * Set expiration time for a key
 */


const setCacheExpiration = async (key, expirationInSeconds) => {
  try {
    const client = getRedisClient();
    const result = await client.expire(key, expirationInSeconds);
    return result === 1;
  } catch (error) {
    logger.error('Failed to set cache expiration', {
      key,
      expirationInSeconds,
      error: error.message
    });
    return false;
  }
};

/**
 * Flush all Redis data (use with caution)
 */


const flushCache = async () => {
  try {
    const client = getRedisClient();
    await client.flushDb();
    logger.warn('Redis cache flushed');
    return true;
  } catch (error) {
    logger.error('Failed to flush cache', {
      error: error.message
    });
    return false;
  }
};

module.exports = {
  connectRedis,
  disconnectRedis,
  getRedisClient,
  isRedisConnected,
  setCache,
  getCache,
  deleteCache,
  deleteCachePattern,
  cacheExists,
  setCacheExpiration,
  flushCache,
  redisConfig
};
