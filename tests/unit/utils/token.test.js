// File: tests/unit/utils/token.test.js
// Generated: 2025-10-08 13:15:08 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_ic0kywt5y5zp


const jwt = require('jsonwebtoken');

const { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken } = require('../../../src/utils/token');

// Mock environment variables


const mockEnv = {
  JWT_ACCESS_SECRET: 'test-access-secret-key-for-testing-purposes-only',
  JWT_ACCESS_EXPIRY: '15m',
  JWT_REFRESH_SECRET: 'test-refresh-secret-key-for-testing-purposes-only',
  JWT_REFRESH_EXPIRY: '7d'
};

describe('Token Utilities', () => {
  let originalEnv;

  beforeAll(() => {
    // Save original environment variables
    originalEnv = {
      JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
      JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY,
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
      JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY
    };

    // Set test environment variables
    process.env.JWT_ACCESS_SECRET = mockEnv.JWT_ACCESS_SECRET;
    process.env.JWT_ACCESS_EXPIRY = mockEnv.JWT_ACCESS_EXPIRY;
    process.env.JWT_REFRESH_SECRET = mockEnv.JWT_REFRESH_SECRET;
    process.env.JWT_REFRESH_EXPIRY = mockEnv.JWT_REFRESH_EXPIRY;
  });

  afterAll(() => {
    // Restore original environment variables
    process.env.JWT_ACCESS_SECRET = originalEnv.JWT_ACCESS_SECRET;
    process.env.JWT_ACCESS_EXPIRY = originalEnv.JWT_ACCESS_EXPIRY;
    process.env.JWT_REFRESH_SECRET = originalEnv.JWT_REFRESH_SECRET;
    process.env.JWT_REFRESH_EXPIRY = originalEnv.JWT_REFRESH_EXPIRY;
  });

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const userId = '507f1f77bcf86cd799439011';
      const token = generateAccessToken(userId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    it('should include userId in token payload', () => {
      const userId = '507f1f77bcf86cd799439011';
      const token = generateAccessToken(userId);

      const decoded = jwt.verify(token, mockEnv.JWT_ACCESS_SECRET);
      expect(decoded.userId).toBe(userId);
    });

    it('should set correct expiry time', () => {
      const userId = '507f1f77bcf86cd799439011';
      const token = generateAccessToken(userId);

      const decoded = jwt.verify(token, mockEnv.JWT_ACCESS_SECRET);
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
    });

    it('should throw error if userId is missing', () => {
      expect(() => generateAccessToken()).toThrow();
      expect(() => generateAccessToken(null)).toThrow();
      expect(() => generateAccessToken('')).toThrow();
    });

    it('should generate different tokens for different users', () => {
      const userId1 = '507f1f77bcf86cd799439011';
      const userId2 = '507f1f77bcf86cd799439012';

      const token1 = generateAccessToken(userId1);
      const token2 = generateAccessToken(userId2);

      expect(token1).not.toBe(token2);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const userId = '507f1f77bcf86cd799439011';
      const token = generateRefreshToken(userId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);
    });

    it('should include userId in token payload', () => {
      const userId = '507f1f77bcf86cd799439011';
      const token = generateRefreshToken(userId);

      const decoded = jwt.verify(token, mockEnv.JWT_REFRESH_SECRET);
      expect(decoded.userId).toBe(userId);
    });

    it('should have longer expiry than access token', () => {
      const userId = '507f1f77bcf86cd799439011';
      const accessToken = generateAccessToken(userId);
      const refreshToken = generateRefreshToken(userId);

      const decodedAccess = jwt.verify(accessToken, mockEnv.JWT_ACCESS_SECRET);
      const decodedRefresh = jwt.verify(refreshToken, mockEnv.JWT_REFRESH_SECRET);

      const accessExpiry = decodedAccess.exp - decodedAccess.iat;
      const refreshExpiry = decodedRefresh.exp - decodedRefresh.iat;

      expect(refreshExpiry).toBeGreaterThan(accessExpiry);
    });

    it('should throw error if userId is missing', () => {
      expect(() => generateRefreshToken()).toThrow();
      expect(() => generateRefreshToken(null)).toThrow();
      expect(() => generateRefreshToken('')).toThrow();
    });

    it('should use different secret than access token', () => {
      const userId = '507f1f77bcf86cd799439011';
      const refreshToken = generateRefreshToken(userId);

      // Should fail with access token secret
      expect(() => {
        jwt.verify(refreshToken, mockEnv.JWT_ACCESS_SECRET);
      }).toThrow();

      // Should succeed with refresh token secret
      expect(() => {
        jwt.verify(refreshToken, mockEnv.JWT_REFRESH_SECRET);
      }).not.toThrow();
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token', () => {
      const userId = '507f1f77bcf86cd799439011';
      const token = generateAccessToken(userId);

      const decoded = verifyAccessToken(token);
      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(userId);
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';

      expect(() => verifyAccessToken(invalidToken)).toThrow();
    });

    it('should throw error for expired token', () => {
      const userId = '507f1f77bcf86cd799439011';
      const expiredToken = jwt.sign(
        { userId },
        mockEnv.JWT_ACCESS_SECRET,
        { expiresIn: '0s' }
      );

      // Wait a moment to ensure token is expired
      setTimeout(() => {
        expect(() => verifyAccessToken(expiredToken)).toThrow();
      }, 100);
    });

    it('should throw error for token with wrong secret', () => {
      const userId = '507f1f77bcf86cd799439011';
      const token = jwt.sign({ userId }, 'wrong-secret', { expiresIn: '15m' });

      expect(() => verifyAccessToken(token)).toThrow();
    });

    it('should throw error for refresh token', () => {
      const userId = '507f1f77bcf86cd799439011';
      const refreshToken = generateRefreshToken(userId);

      expect(() => verifyAccessToken(refreshToken)).toThrow();
    });

    it('should throw error for missing token', () => {
      expect(() => verifyAccessToken()).toThrow();
      expect(() => verifyAccessToken(null)).toThrow();
      expect(() => verifyAccessToken('')).toThrow();
    });

    it('should throw error for malformed token', () => {
      expect(() => verifyAccessToken('not.a.valid.jwt.token')).toThrow();
      expect(() => verifyAccessToken('Bearer token')).toThrow();
      expect(() => verifyAccessToken('random-string')).toThrow();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', () => {
      const userId = '507f1f77bcf86cd799439011';
      const token = generateRefreshToken(userId);

      const decoded = verifyRefreshToken(token);
      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(userId);
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';

      expect(() => verifyRefreshToken(invalidToken)).toThrow();
    });

    it('should throw error for expired token', () => {
      const userId = '507f1f77bcf86cd799439011';
      const expiredToken = jwt.sign(
        { userId },
        mockEnv.JWT_REFRESH_SECRET,
        { expiresIn: '0s' }
      );

      setTimeout(() => {
        expect(() => verifyRefreshToken(expiredToken)).toThrow();
      }, 100);
    });

    it('should throw error for token with wrong secret', () => {
      const userId = '507f1f77bcf86cd799439011';
      const token = jwt.sign({ userId }, 'wrong-secret', { expiresIn: '7d' });

      expect(() => verifyRefreshToken(token)).toThrow();
    });

    it('should throw error for access token', () => {
      const userId = '507f1f77bcf86cd799439011';
      const accessToken = generateAccessToken(userId);

      expect(() => verifyRefreshToken(accessToken)).toThrow();
    });

    it('should throw error for missing token', () => {
      expect(() => verifyRefreshToken()).toThrow();
      expect(() => verifyRefreshToken(null)).toThrow();
      expect(() => verifyRefreshToken('')).toThrow();
    });
  });

  describe('Token lifecycle', () => {
    it('should support full token generation and verification cycle', () => {
      const userId = '507f1f77bcf86cd799439011';

      // Generate tokens
      const accessToken = generateAccessToken(userId);
      const refreshToken = generateRefreshToken(userId);

      // Verify tokens
      const decodedAccess = verifyAccessToken(accessToken);
      const decodedRefresh = verifyRefreshToken(refreshToken);

      // Check payloads
      expect(decodedAccess.userId).toBe(userId);
      expect(decodedRefresh.userId).toBe(userId);
    });

    it('should handle token refresh scenario', () => {
      const userId = '507f1f77bcf86cd799439011';

      // Generate initial tokens
      const initialAccessToken = generateAccessToken(userId);
      const refreshToken = generateRefreshToken(userId);

      // Verify refresh token
      const decoded = verifyRefreshToken(refreshToken);
      expect(decoded.userId).toBe(userId);

      // Generate new access token
      const newAccessToken = generateAccessToken(decoded.userId);

      // Verify new access token
      const decodedNewAccess = verifyAccessToken(newAccessToken);
      expect(decodedNewAccess.userId).toBe(userId);

      // Tokens should be different
      expect(initialAccessToken).not.toBe(newAccessToken);
    });

    it('should maintain token independence', () => {
      const userId1 = '507f1f77bcf86cd799439011';
      const userId2 = '507f1f77bcf86cd799439012';

      const token1 = generateAccessToken(userId1);
      const token2 = generateAccessToken(userId2);

      const decoded1 = verifyAccessToken(token1);
      const decoded2 = verifyAccessToken(token2);

      expect(decoded1.userId).toBe(userId1);
      expect(decoded2.userId).toBe(userId2);
      expect(decoded1.userId).not.toBe(decoded2.userId);
    });
  });

  describe('Error handling', () => {
    it('should handle JWT verification errors gracefully', () => {
      const invalidTokens = [
        'invalid',
        'invalid.token',
        'invalid.token.format',
        '',
        null,
        undefined,
        123,
        {},
        []
      ];

      invalidTokens.forEach(token => {
        expect(() => verifyAccessToken(token)).toThrow();
        expect(() => verifyRefreshToken(token)).toThrow();
      });
    });

    it('should throw descriptive errors', () => {
      try {
        verifyAccessToken('invalid.token.here');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toBeDefined();
      }

      try {
        verifyRefreshToken('invalid.token.here');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('Security', () => {
    it('should use different secrets for access and refresh tokens', () => {
      expect(mockEnv.JWT_ACCESS_SECRET).not.toBe(mockEnv.JWT_REFRESH_SECRET);
    });

    it('should not allow cross-verification of token types', () => {
      const userId = '507f1f77bcf86cd799439011';
      const accessToken = generateAccessToken(userId);
      const refreshToken = generateRefreshToken(userId);

      // Access token should not verify with refresh secret
      expect(() => verifyRefreshToken(accessToken)).toThrow();

      // Refresh token should not verify with access secret
      expect(() => verifyAccessToken(refreshToken)).toThrow();
    });

    it('should include standard JWT claims', () => {
      const userId = '507f1f77bcf86cd799439011';
      const token = generateAccessToken(userId);
      const decoded = jwt.verify(token, mockEnv.JWT_ACCESS_SECRET);

      expect(decoded.iat).toBeDefined(); // Issued at
      expect(decoded.exp).toBeDefined(); // Expiry
      expect(decoded.userId).toBeDefined(); // User ID
    });
  });
});
