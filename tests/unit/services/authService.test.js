// File: tests/unit/services/authService.test.js
// Generated: 2025-10-08 13:17:11 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_2p1g2suryztu


const User = require('../../../src/models/User');


const authService = require('../../../src/services/authService');


const bcrypt = require('bcryptjs');


const jwt = require('jsonwebtoken');

// Mock dependencies
jest.mock('../../../src/models/User');
jest.mock('jsonwebtoken');
jest.mock('bcryptjs');

describe('AuthService', () => {
  let mockUser;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Setup mock user
    mockUser = {
      _id: '507f1f77bcf86cd799439011',
      name: 'Test User',
      email: 'test@example.com',
      password: '$2a$12$hashedpassword',
      role: 'member',
      save: jest.fn().mockResolvedValue(true),
      toObject: jest.fn().mockReturnValue({
        _id: '507f1f77bcf86cd799439011',
        name: 'Test User',
        email: 'test@example.com',
        role: 'member'
      })
    };

    // Setup environment variables
    process.env.JWT_ACCESS_SECRET = 'test_access_secret';
    process.env.JWT_ACCESS_EXPIRY = '15m';
    process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
    process.env.JWT_REFRESH_EXPIRY = '7d';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123!'
      };

      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue(mockUser);
      bcrypt.hash.mockResolvedValue('$2a$12$hashedpassword');
      jwt.sign.mockReturnValueOnce('access_token').mockReturnValueOnce('refresh_token');

      const result = await authService.register(userData);

      expect(User.findOne).toHaveBeenCalledWith({ email: userData.email });
      expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, 12);
      expect(User.create).toHaveBeenCalledWith({
        name: userData.name,
        email: userData.email,
        password: '$2a$12$hashedpassword'
      });
      expect(jwt.sign).toHaveBeenCalledTimes(2);
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken', 'access_token');
      expect(result).toHaveProperty('refreshToken', 'refresh_token');
      expect(result.user).not.toHaveProperty('password');
    });

    it('should throw error if user already exists', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123!'
      };

      User.findOne.mockResolvedValue(mockUser);

      await expect(authService.register(userData)).rejects.toThrow('User with this email already exists');
      expect(User.create).not.toHaveBeenCalled();
    });

    it('should throw error if required fields are missing', async () => {
      const userData = {
        email: 'test@example.com'
      };

      await expect(authService.register(userData)).rejects.toThrow();
    });

    it('should handle database errors during registration', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123!'
      };

      User.findOne.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('$2a$12$hashedpassword');
      User.create.mockRejectedValue(new Error('Database error'));

      await expect(authService.register(userData)).rejects.toThrow('Database error');
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'Password123!'
      };

      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValueOnce('access_token').mockReturnValueOnce('refresh_token');

      const result = await authService.login(credentials);

      expect(User.findOne).toHaveBeenCalledWith({ email: credentials.email });
      expect(bcrypt.compare).toHaveBeenCalledWith(credentials.password, mockUser.password);
      expect(jwt.sign).toHaveBeenCalledTimes(2);
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken', 'access_token');
      expect(result).toHaveProperty('refreshToken', 'refresh_token');
      expect(result.user).not.toHaveProperty('password');
    });

    it('should throw error if user not found', async () => {
      const credentials = {
        email: 'nonexistent@example.com',
        password: 'Password123!'
      };

      User.findOne.mockResolvedValue(null);

      await expect(authService.login(credentials)).rejects.toThrow('Invalid email or password');
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw error if password is incorrect', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'WrongPassword123!'
      };

      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      await expect(authService.login(credentials)).rejects.toThrow('Invalid email or password');
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    it('should throw error if required fields are missing', async () => {
      const credentials = {
        email: 'test@example.com'
      };

      await expect(authService.login(credentials)).rejects.toThrow();
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh access token with valid refresh token', async () => {
      const refreshToken = 'valid_refresh_token';
      const decodedToken = {
        userId: '507f1f77bcf86cd799439011',
        email: 'test@example.com'
      };

      jwt.verify.mockReturnValue(decodedToken);
      User.findById.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValue('new_access_token');

      const result = await authService.refreshToken(refreshToken);

      expect(jwt.verify).toHaveBeenCalledWith(refreshToken, process.env.JWT_REFRESH_SECRET);
      expect(User.findById).toHaveBeenCalledWith(decodedToken.userId);
      expect(jwt.sign).toHaveBeenCalledWith(
        { userId: mockUser._id.toString(), email: mockUser.email },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: process.env.JWT_ACCESS_EXPIRY }
      );
      expect(result).toHaveProperty('accessToken', 'new_access_token');
    });

    it('should throw error if refresh token is invalid', async () => {
      const refreshToken = 'invalid_refresh_token';

      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.refreshToken(refreshToken)).rejects.toThrow('Invalid or expired refresh token');
      expect(User.findById).not.toHaveBeenCalled();
    });

    it('should throw error if refresh token is expired', async () => {
      const refreshToken = 'expired_refresh_token';

      jwt.verify.mockImplementation(() => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      await expect(authService.refreshToken(refreshToken)).rejects.toThrow('Invalid or expired refresh token');
    });

    it('should throw error if user not found', async () => {
      const refreshToken = 'valid_refresh_token';
      const decodedToken = {
        userId: '507f1f77bcf86cd799439011',
        email: 'test@example.com'
      };

      jwt.verify.mockReturnValue(decodedToken);
      User.findById.mockResolvedValue(null);

      await expect(authService.refreshToken(refreshToken)).rejects.toThrow('User not found');
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    it('should throw error if refresh token is missing', async () => {
      await expect(authService.refreshToken()).rejects.toThrow();
    });
  });

  describe('verifyToken', () => {
    it('should successfully verify valid access token', async () => {
      const accessToken = 'valid_access_token';
      const decodedToken = {
        userId: '507f1f77bcf86cd799439011',
        email: 'test@example.com'
      };

      jwt.verify.mockReturnValue(decodedToken);
      User.findById.mockResolvedValue(mockUser);

      const result = await authService.verifyToken(accessToken);

      expect(jwt.verify).toHaveBeenCalledWith(accessToken, process.env.JWT_ACCESS_SECRET);
      expect(User.findById).toHaveBeenCalledWith(decodedToken.userId);
      expect(result).toHaveProperty('user');
      expect(result.user).not.toHaveProperty('password');
    });

    it('should throw error if access token is invalid', async () => {
      const accessToken = 'invalid_access_token';

      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.verifyToken(accessToken)).rejects.toThrow('Invalid or expired token');
      expect(User.findById).not.toHaveBeenCalled();
    });

    it('should throw error if access token is expired', async () => {
      const accessToken = 'expired_access_token';

      jwt.verify.mockImplementation(() => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      await expect(authService.verifyToken(accessToken)).rejects.toThrow('Invalid or expired token');
    });

    it('should throw error if user not found', async () => {
      const accessToken = 'valid_access_token';
      const decodedToken = {
        userId: '507f1f77bcf86cd799439011',
        email: 'test@example.com'
      };

      jwt.verify.mockReturnValue(decodedToken);
      User.findById.mockResolvedValue(null);

      await expect(authService.verifyToken(accessToken)).rejects.toThrow('User not found');
    });

    it('should throw error if token is missing', async () => {
      await expect(authService.verifyToken()).rejects.toThrow();
    });
  });

  describe('changePassword', () => {
    it('should successfully change password with valid credentials', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const passwordData = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!'
      };

      User.findById.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      bcrypt.hash.mockResolvedValue('$2a$12$newhashedpassword');

      const result = await authService.changePassword(userId, passwordData);

      expect(User.findById).toHaveBeenCalledWith(userId);
      expect(bcrypt.compare).toHaveBeenCalledWith(passwordData.currentPassword, mockUser.password);
      expect(bcrypt.hash).toHaveBeenCalledWith(passwordData.newPassword, 12);
      expect(mockUser.password).toBe('$2a$12$newhashedpassword');
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toHaveProperty('message', 'Password changed successfully');
    });

    it('should throw error if user not found', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const passwordData = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!'
      };

      User.findById.mockResolvedValue(null);

      await expect(authService.changePassword(userId, passwordData)).rejects.toThrow('User not found');
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw error if current password is incorrect', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const passwordData = {
        currentPassword: 'WrongPassword123!',
        newPassword: 'NewPassword123!'
      };

      User.findById.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      await expect(authService.changePassword(userId, passwordData)).rejects.toThrow('Current password is incorrect');
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(mockUser.save).not.toHaveBeenCalled();
    });

    it('should throw error if required fields are missing', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const passwordData = {
        currentPassword: 'OldPassword123!'
      };

      await expect(authService.changePassword(userId, passwordData)).rejects.toThrow();
    });

    it('should throw error if new password is same as current password', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const passwordData = {
        currentPassword: 'Password123!',
        newPassword: 'Password123!'
      };

      User.findById.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);

      await expect(authService.changePassword(userId, passwordData)).rejects.toThrow('New password must be different from current password');
      expect(bcrypt.hash).not.toHaveBeenCalled();
    });
  });

  describe('generateTokens', () => {
    it('should generate both access and refresh tokens', () => {
      const payload = {
        userId: '507f1f77bcf86cd799439011',
        email: 'test@example.com'
      };

      jwt.sign.mockReturnValueOnce('access_token').mockReturnValueOnce('refresh_token');

      const result = authService.generateTokens(payload);

      expect(jwt.sign).toHaveBeenCalledTimes(2);
      expect(jwt.sign).toHaveBeenNthCalledWith(
        1,
        payload,
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: process.env.JWT_ACCESS_EXPIRY }
      );
      expect(jwt.sign).toHaveBeenNthCalledWith(
        2,
        payload,
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRY }
      );
      expect(result).toEqual({
        accessToken: 'access_token',
        refreshToken: 'refresh_token'
      });
    });

    it('should use default expiry values if env variables not set', () => {
      delete process.env.JWT_ACCESS_EXPIRY;
      delete process.env.JWT_
