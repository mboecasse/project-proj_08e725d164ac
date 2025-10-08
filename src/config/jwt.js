// File: src/config/jwt.js
// Generated: 2025-10-08 13:14:18 UTC
// Project ID: proj_08e725d164ac
// Task ID: task_kxvwryk0c5i7


const config = {
  // Access Token Configuration
  access: {
    secret: process.env.JWT_ACCESS_SECRET || 'your_jwt_access_secret_here_must_be_long_and_complex_change_in_production',
    expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
    algorithm: 'HS256'
  },

  // Refresh Token Configuration
  refresh: {
    secret: process.env.JWT_REFRESH_SECRET || 'your_jwt_refresh_secret_here_must_be_long_and_complex_change_in_production',
    expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
    algorithm: 'HS256'
  },

  // Token Options
  options: {
    issuer: process.env.JWT_ISSUER || 'genesis-task-management',
    audience: process.env.JWT_AUDIENCE || 'genesis-users'
  },

  // Cookie Configuration for Refresh Tokens
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
  }
};

module.exports = config;
