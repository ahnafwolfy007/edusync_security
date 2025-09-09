const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dbConfig = require('../config/db');
const authConfig = require('../config/auth');

class AuthController {
  // Register new user
  async register(req, res) {
    try {
      const { 
        fullName, 
        email, 
        password, 
        phone, 
        institution, 
        location, 
        role = 'student' 
      } = req.body;

      // Validation
      if (!fullName || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Full name, email, and password are required'
        });
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address'
        });
      }

      // Password validation
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long'
        });
      }

      const db = dbConfig.db;

      // Check if user already exists
      const existingUser = await db.query(
        'SELECT user_id FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'User with this email already exists'
        });
      }

      // Hash password
      const saltRounds = authConfig.BCRYPT_ROUNDS;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Get role_id
      const roleResult = await db.query(
        'SELECT role_id FROM roles WHERE role_name = $1',
        [role]
      );

      let roleId = 3; // Default to student role
      if (roleResult.rows.length > 0) {
        roleId = roleResult.rows[0].role_id;
      }

      // Create user
      const userResult = await db.query(
        `INSERT INTO users (full_name, email, password_hash, phone, role_id, institution, location, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         RETURNING user_id, full_name, email, phone, role_id, institution, location, created_at`,
        [fullName, email.toLowerCase(), hashedPassword, phone, roleId, institution, location]
      );

      const newUser = userResult.rows[0];

      // Create wallet for the user
      await db.query(
        'INSERT INTO wallets (user_id, balance, created_at, updated_at) VALUES ($1, $2, NOW(), NOW())',
        [newUser.user_id, 0.00]
      );

      // Generate tokens
      const tokenPayload = {
        userId: newUser.user_id,
        email: newUser.email,
        role: role
      };

      const accessToken = authConfig.generateToken(tokenPayload);
      const refreshToken = authConfig.generateRefreshToken(tokenPayload);

      // Get role name
      const roleNameResult = await db.query(
        'SELECT role_name FROM roles WHERE role_id = $1',
        [newUser.role_id]
      );

      const userData = {
        ...newUser,
        role: roleNameResult.rows[0]?.role_name || 'student'
      };

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: userData,
          accessToken,
          refreshToken
        }
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during registration'
      });
    }
  }

  // User login
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validation
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      const db = dbConfig.db;

      // Find user with role information
      const userResult = await db.query(
        `SELECT u.*, r.role_name 
         FROM users u 
         JOIN roles r ON u.role_id = r.role_id 
         WHERE u.email = $1`,
        [email.toLowerCase()]
      );

      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      const user = userResult.rows[0];

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Generate tokens
      const tokenPayload = {
        userId: user.user_id,
        email: user.email,
        role: user.role_name
      };

      const accessToken = authConfig.generateToken(tokenPayload);
      const refreshToken = authConfig.generateRefreshToken(tokenPayload);

      // Remove password from response
      const { password_hash, ...userData } = user;

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: userData,
          accessToken,
          refreshToken
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during login'
      });
    }
  }

  // Refresh token
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token is required'
        });
      }

      // Verify refresh token
      const decoded = authConfig.verifyRefreshToken(refreshToken);
      
      const db = dbConfig.db;

      // Get updated user information
      const userResult = await db.query(
        `SELECT u.*, r.role_name 
         FROM users u 
         JOIN roles r ON u.role_id = r.role_id 
         WHERE u.user_id = $1`,
        [decoded.userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      const user = userResult.rows[0];

      // Generate new access token
      const tokenPayload = {
        userId: user.user_id,
        email: user.email,
        role: user.role_name
      };

      const accessToken = authConfig.generateToken(tokenPayload);

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken
        }
      });

    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }
  }

  // Logout
  async logout(req, res) {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader) {
        const token = authHeader.split(' ')[1];
        authConfig.blacklistToken(token);
      }

      res.json({
        success: true,
        message: 'Logged out successfully'
      });

    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during logout'
      });
    }
  }

  // Get current user profile
  async getProfile(req, res) {
    try {
      const userId = req.user.userId;
      const db = dbConfig.db;

      const userResult = await db.query(
        `SELECT u.user_id, u.full_name, u.email, u.phone, u.institution, u.location, 
                u.created_at, u.updated_at, r.role_name
         FROM users u 
         JOIN roles r ON u.role_id = r.role_id 
         WHERE u.user_id = $1`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const user = userResult.rows[0];

      res.json({
        success: true,
        data: { user }
      });

    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Change password
  async changePassword(req, res) {
    try {
      const userId = req.user.userId;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password and new password are required'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters long'
        });
      }

      const db = dbConfig.db;

      // Get current user
      const userResult = await db.query(
        'SELECT password_hash FROM users WHERE user_id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const user = userResult.rows[0];

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, authConfig.BCRYPT_ROUNDS);

      // Update password
      await db.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2',
        [hashedNewPassword, userId]
      );

      res.json({
        success: true,
        message: 'Password changed successfully'
      });

    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new AuthController();
