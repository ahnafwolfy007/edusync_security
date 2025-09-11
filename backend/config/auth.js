const jwt = require('jsonwebtoken');
require('dotenv').config();

// JWT Configuration
const authConfig = {
  // JWT Settings
  JWT_SECRET: process.env.JWT_SECRET || 'edusync_super_secret_jwt_key_2025_campus_marketplace',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || 'edusync_refresh_token_secret_key_2025',
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
  // Hash parameters for simpleHash (educational only)
  CUSTOM_HASH_WORK_FACTOR: parseInt(process.env.CUSTOM_HASH_WORK_FACTOR) || 1000,
  CUSTOM_HASH_OUTPUT_BITS: parseInt(process.env.CUSTOM_HASH_OUTPUT_BITS) || 128,

  // Token blacklist (for logout)
  tokenBlacklist: new Set(),

  // Generate JWT token
  generateToken: (payload) => {
    try {
      return jwt.sign(payload, authConfig.JWT_SECRET, {
        expiresIn: authConfig.JWT_EXPIRES_IN,
        issuer: 'EduSync',
        audience: 'EduSync-Users'
      });
    } catch (error) {
      console.error('Token generation error:', error);
      throw new Error('Failed to generate token');
    }
  },

  // Generate refresh token
  generateRefreshToken: (payload) => {
    try {
      return jwt.sign(payload, authConfig.REFRESH_TOKEN_SECRET, {
        expiresIn: authConfig.REFRESH_TOKEN_EXPIRES_IN,
        issuer: 'EduSync',
        audience: 'EduSync-Users'
      });
    } catch (error) {
      console.error('Refresh token generation error:', error);
      throw new Error('Failed to generate refresh token');
    }
  },

  // Verify JWT token
  verifyToken: (token) => {
    try {
      // Check if token is blacklisted
      if (authConfig.tokenBlacklist.has(token)) {
        throw new Error('Token has been revoked');
      }

      return jwt.verify(token, authConfig.JWT_SECRET, {
        issuer: 'EduSync',
        audience: 'EduSync-Users'
      });
    } catch (error) {
      console.error('Token verification error:', error);
      throw error;
    }
  },

  // Verify refresh token
  verifyRefreshToken: (token) => {
    try {
      return jwt.verify(token, authConfig.REFRESH_TOKEN_SECRET, {
        issuer: 'EduSync',
        audience: 'EduSync-Users'
      });
    } catch (error) {
      console.error('Refresh token verification error:', error);
      throw error;
    }
  },

  // Add token to blacklist
  blacklistToken: (token) => {
    try {
      authConfig.tokenBlacklist.add(token);
      console.log('Token blacklisted successfully');
    } catch (error) {
      console.error('Token blacklist error:', error);
    }
  },

  // Clean up expired tokens from blacklist (should be run periodically)
  cleanupBlacklist: () => {
    try {
      const now = Date.now() / 1000;
      authConfig.tokenBlacklist.forEach(token => {
        try {
          const decoded = jwt.decode(token);
          if (decoded && decoded.exp < now) {
            authConfig.tokenBlacklist.delete(token);
          }
        } catch (error) {
          // If token can't be decoded, remove it
          authConfig.tokenBlacklist.delete(token);
        }
      });
    } catch (error) {
      console.error('Blacklist cleanup error:', error);
    }
  },

  // Password validation rules
  passwordValidation: {
    minLength: 6,
    requireUppercase: false,
    requireLowercase: false,
    requireNumbers: false,
    requireSpecialChars: false
  },

  // Validate password against rules
  validatePassword: (password) => {
    const rules = authConfig.passwordValidation;
    const errors = [];

    if (password.length < rules.minLength) {
      errors.push(`Password must be at least ${rules.minLength} characters long`);
    }

    if (rules.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (rules.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (rules.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (rules.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // Email validation
  validateEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Generate random password for password reset
  generateRandomPassword: (length = 12) => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  },

  // Extract token from Authorization header
  extractTokenFromHeader: (authHeader) => {
    if (!authHeader) return null;
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }
    
    return parts[1];
  },

  // Check if user has required role
  hasRole: (userRole, requiredRole) => {
    const roleHierarchy = {
      'student': 1,
      'business_owner': 2,
      'food_vendor': 2,
      'moderator': 3,
      'admin': 4
    };

    const userRoleLevel = roleHierarchy[userRole] || 0;
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

    return userRoleLevel >= requiredRoleLevel;
  },

  // Get user permissions based on role
  getUserPermissions: (role) => {
    const permissions = {
      student: [
        'read_own_profile',
        'update_own_profile',
        'create_listings',
        'view_marketplace',
        'create_orders',
        'view_own_orders'
      ],
      business_owner: [
        'read_own_profile',
        'update_own_profile',
        'create_listings',
        'view_marketplace',
        'create_orders',
        'view_own_orders',
        'manage_business',
        'view_business_analytics'
      ],
      food_vendor: [
        'read_own_profile',
        'update_own_profile',
        'manage_food_items',
        'view_food_orders',
        'update_order_status'
      ],
      moderator: [
        'read_own_profile',
        'update_own_profile',
        'moderate_content',
        'view_reports',
        'manage_notices'
      ],
      admin: [
        'full_access'
      ]
    };

    return permissions[role] || permissions.student;
  }
};

// Run cleanup every hour
setInterval(() => {
  authConfig.cleanupBlacklist();
}, 60 * 60 * 1000);

module.exports = authConfig;