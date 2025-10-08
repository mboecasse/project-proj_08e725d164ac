// File: tests/integration/auth.test.js
// Generated: 2025-10-08 13:15:40 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_s6n64n6xx3mh

      const crypto = require('crypto');
      const jwt = require('jsonwebtoken');


const User = require('../../src/models/User');


const app = require('../../src/app');


const logger = require('../../src/utils/logger');


const mongoose = require('mongoose');


const request = require('supertest');

// Test database connection


const testDbUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/taskmanager_test';

// Test user data


const testUser = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'Test123!@#'
};


const testUser2 = {
  name: 'Test User 2',
  email: 'test2@example.com',
  password: 'Test456!@#'
};

describe('Authentication Integration Tests', () => {
  let accessToken;
  let refreshToken;
  let userId;

  // Connect to test database before all tests
  beforeAll(async () => {
    try {
      await mongoose.connect(testDbUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      logger.info('Connected to test database');
    } catch (error) {
      logger.error('Failed to connect to test database', { error: error.message });
      throw error;
    }
  });

  // Clear database before each test
  beforeEach(async () => {
    try {
      await User.deleteMany({});
    } catch (error) {
      logger.error('Failed to clear test database', { error: error.message });
      throw error;
    }
  });

  // Disconnect after all tests
  afterAll(async () => {
    try {
      await mongoose.connection.close();
      logger.info('Disconnected from test database');
    } catch (error) {
      logger.error('Failed to disconnect from test database', { error: error.message });
    }
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.user.name).toBe(testUser.name);
      expect(response.body.data.user).not.toHaveProperty('password');

      // Verify user in database
      const user = await User.findOne({ email: testUser.email });
      expect(user).toBeTruthy();
      expect(user.email).toBe(testUser.email);
    });

    it('should fail to register with missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: testUser.email })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('error');
    });

    it('should fail to register with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: testUser.name,
          email: 'invalid-email',
          password: testUser.password
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('error');
    });

    it('should fail to register with weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: testUser.name,
          email: testUser.email,
          password: '123'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('error');
    });

    it('should fail to register with duplicate email', async () => {
      // Register first user
      await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      // Try to register with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/already exists|already registered/i);
    });

    it('should hash password before storing', async () => {
      await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      const user = await User.findOne({ email: testUser.email });
      expect(user.password).not.toBe(testUser.password);
      expect(user.password.length).toBeGreaterThan(20);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Register a user for login tests
      await request(app)
        .post('/api/auth/register')
        .send(testUser);
    });

    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.user).not.toHaveProperty('password');

      accessToken = response.body.data.accessToken;
      refreshToken = response.body.data.refreshToken;
    });

    it('should fail to login with incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/invalid|incorrect/i);
    });

    it('should fail to login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/invalid|not found/i);
    });

    it('should fail to login with missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('error');
    });

    it('should update lastLogin timestamp on successful login', async () => {
      const userBefore = await User.findOne({ email: testUser.email });
      const lastLoginBefore = userBefore.lastLogin;

      await new Promise(resolve => setTimeout(resolve, 1000));

      await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      const userAfter = await User.findOne({ email: testUser.email });
      expect(userAfter.lastLogin).toBeTruthy();
      if (lastLoginBefore) {
        expect(userAfter.lastLogin.getTime()).toBeGreaterThan(lastLoginBefore.getTime());
      }
    });
  });

  describe('POST /api/auth/refresh', () => {
    beforeEach(async () => {
      // Register and login to get tokens
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      accessToken = response.body.data.accessToken;
      refreshToken = response.body.data.refreshToken;
      userId = response.body.data.user._id;
    });

    it('should refresh access token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.accessToken).not.toBe(accessToken);
    });

    it('should fail to refresh with invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid.token.here' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/invalid|expired/i);
    });

    it('should fail to refresh with missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('error');
    });

    it('should fail to refresh with expired refresh token', async () => {
      const expiredToken = jwt.sign(
        { userId },
        process.env.JWT_REFRESH_SECRET || 'test_refresh_secret',
        { expiresIn: '0s' }
      );

      await new Promise(resolve => setTimeout(resolve, 1000));

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: expiredToken })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/expired|invalid/i);
    });
  });

  describe('POST /api/auth/logout', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      accessToken = response.body.data.accessToken;
      refreshToken = response.body.data.refreshToken;
    });

    it('should logout successfully with valid access token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toMatch(/logout|success/i);
    });

    it('should fail to logout without access token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/token|unauthorized/i);
    });

    it('should fail to logout with invalid access token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/invalid|unauthorized/i);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send(testUser);
    });

    it('should send password reset email for valid email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toMatch(/reset|email|sent/i);

      // Verify reset token was created
      const user = await User.findOne({ email: testUser.email });
      expect(user.resetPasswordToken).toBeTruthy();
      expect(user.resetPasswordExpires).toBeTruthy();
      expect(user.resetPasswordExpires.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return success even for non-existent email (security)', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toMatch(/reset|email|sent/i);
    });

    it('should fail with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('error');
    });

    it('should fail with missing email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    let resetToken;

    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send(testUser);

      // Generate reset token
      resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

      await User.findOneAndUpdate(
        { email: testUser.email },
        {
          resetPasswordToken: hashedToken,
          resetPasswordExpires: Date.now() + 3600000 // 1 hour
        }
      );
    });

    it('should reset password with valid token', async () => {
      const newPassword = 'NewPassword123!@#';

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: newPassword
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toMatch(/reset|success/i);

      // Verify password was changed
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: newPassword
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);

      // Verify reset token was cleared
      const user = await User.findOne({ email: testUser.email });
      expect(user.resetPasswordToken).toBeUndefined();
      expect(user.resetPasswordExpires).toBeUndefined();
    });

    it('should fail with invalid reset token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token',
          password: 'NewPassword123!@#'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/invalid|expired/i);
    });

    it
