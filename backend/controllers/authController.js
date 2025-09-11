const jwt = require('jsonwebtoken');
const dbConfig = require('../config/db');
const authConfig = require('../config/auth');
const { aaa_7, verify_aaa_7, generateSaltFromEmail } = require('../utils/simpleHash');

// Internal helper to parse stored aaa_7 hash format robustly
function parseAaa7(stored) {
  if (!stored || typeof stored !== 'string') return null;
  const rawParts = stored.split('$').filter(p => p !== ''); // remove empties
  // Expect order: [ 'aaa_7', workFactor, outputBits, salt, hash ]
  if (rawParts[0] !== 'aaa_7') return null;
  if (rawParts.length < 5) return null;
  const [prefix, wf, bits, salt, hash] = rawParts;
  if (!wf || !bits || !salt || !hash) return null;
  return { workFactor: parseInt(wf, 10), outputBits: parseInt(bits, 10), salt, hash };
}

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

      // Debug: log keys received (avoid logging password fully)
      try {
        const clone = { ...req.body };
        if (clone.password) clone.password = `len:${clone.password.length}`;
        console.log('[Register] Incoming body keys:', Object.keys(clone), 'otpCode:', clone.otpCode);
      } catch(_) {}

      // Accept 'name' alias from frontend
      const effectiveFullName = fullName || req.body.name;

      // Validation
  if (!effectiveFullName || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Full name, email, and password are required'
        });
      }

      // Enforce institutional domain
  const allowedDomain = (process.env.ALLOWED_EMAIL_DOMAIN || '@bscse.uiu.ac.bd').toLowerCase();
      if (!email.toLowerCase().endsWith(allowedDomain)) {
        return res.status(400).json({
          success: false,
          message: `Email must end with ${allowedDomain}`
        });
      }

      // Ensure email verified prior to completing registration (OTP flow)
      const { otpCode } = req.body;
      if (!otpCode) {
        return res.status(400).json({
          success: false,
          message: 'OTP code required. Please verify your email first.'
        });
      }

      const db = dbConfig.db;

      // Validate OTP record
      const otpResult = await db.query(
        `SELECT * FROM email_verification_tokens 
         WHERE email = $1 AND otp_code = $2 AND used = FALSE AND expires_at > NOW()`,
        [email.toLowerCase(), otpCode]
      );
      if (otpResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired OTP code'
        });
      }

      // Password validation (min 8 chars, upper, lower, number, special)
      const passwordErrors = [];
      if (typeof password !== 'string' || password.length < 8) {
        passwordErrors.push('Password must be at least 8 characters long');
      }
      if (!/[A-Z]/.test(password)) {
        passwordErrors.push('Password must contain at least one uppercase letter');
      }
      if (!/[a-z]/.test(password)) {
        passwordErrors.push('Password must contain at least one lowercase letter');
      }
      if (!/[0-9]/.test(password)) {
        passwordErrors.push('Password must contain at least one number');
      }
      if (!/[!@#$%^&*()_+=\-]/.test(password)) {
        passwordErrors.push('Password must contain at least one special character (*@!@#$%^(_+=-)');
      }
      if (passwordErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: passwordErrors.join('. ')
        });
      }

  // DB already assigned above

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

  // Hash password with deterministic salt from email (educational, NOT secure)
  const derivedSalt = generateSaltFromEmail(email.toLowerCase());
  const h = aaa_7(password, derivedSalt, authConfig.CUSTOM_HASH_WORK_FACTOR || 1000, authConfig.CUSTOM_HASH_OUTPUT_BITS || 128);
  // Store with identifiable prefix & parameters: aaa_7$workFactor$outputBits$salt$hash
  const hashedPassword = `aaa_7$${h.workFactor}$${h.outputBits}$${h.salt}$${h.hash}`;
      console.log(hashedPassword);
      // Get role_id
      const roleResult = await db.query(
        'SELECT role_id FROM roles WHERE role_name = $1',
        [role]
      );

      let roleId = 3; // Default to student role
      if (roleResult.rows.length > 0) {
        roleId = roleResult.rows[0].role_id;
      }

      // Create user (mark verified)
      const userResult = await db.query(
  `INSERT INTO users (full_name, email, password_hash, phone, role_id, institution, location, is_email_verified, email_verified_at, created_at, updated_at)
   VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, NOW(), NOW(), NOW())
         RETURNING user_id, full_name, email, phone, role_id, institution, location, is_email_verified, email_verified_at, created_at`,
  [effectiveFullName, email.toLowerCase(), hashedPassword, phone, roleId, null, location]
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

  // Mark OTP token used
  await db.query(`UPDATE email_verification_tokens SET used = TRUE WHERE token_id = $1`, [otpResult.rows[0].token_id]);

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

  // Diagnostics: report current password hashing configuration (no secrets)
  async hashStrategy(req, res) {
    try {
      res.json({
        success: true,
        data: {
          customHashWorkFactor: authConfig.CUSTOM_HASH_WORK_FACTOR,
          customHashOutputBits: authConfig.CUSTOM_HASH_OUTPUT_BITS,
          scheme: 'aaa_7'
        }
      });
    } catch (e) {
      res.status(500).json({ success: false, message: 'Failed to report hash strategy' });
    }
  }

  // Request OTP for email verification
  async requestOtp(req, res) {
    try {
  console.log('[OTP] request-otp hit. Authorization header present:', !!req.headers.authorization);
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
      }
  const allowedDomain = (process.env.ALLOWED_EMAIL_DOMAIN || '@bscse.uiu.ac.bd').toLowerCase();
      if (!email.toLowerCase().endsWith(allowedDomain)) {
        return res.status(400).json({ success: false, message: `Email must end with ${allowedDomain}` });
      }

      const db = dbConfig.db;

      // If already registered & verified block; if registered but not verified allow resend
      const existingUser = await db.query('SELECT is_email_verified FROM users WHERE email = $1', [email.toLowerCase()]);
      if (existingUser.rows.length > 0 && existingUser.rows[0].is_email_verified) {
        return res.status(409).json({ success: false, message: 'Email already registered and verified' });
      }

      // Abuse controls: cooldown + max per hour
      const cooldownSeconds = parseInt(process.env.OTP_REQUEST_COOLDOWN || '60');
      const maxPerHour = parseInt(process.env.OTP_MAX_PER_HOUR || '5');
      // Count tokens created in last hour (used or unused) for this email
      const hourCountResult = await db.query(
        `SELECT COUNT(*)::int AS cnt FROM email_verification_tokens 
         WHERE email = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
        [email.toLowerCase()]
      );
      if (hourCountResult.rows[0].cnt >= maxPerHour) {
        return res.status(429).json({ success: false, message: 'Too many OTP requests for this email. Try again later.' });
      }
      // Cooldown: find last token (any) for email
      const lastResult = await db.query(
        `SELECT created_at FROM email_verification_tokens 
         WHERE email = $1 ORDER BY created_at DESC LIMIT 1`,
        [email.toLowerCase()]
      );
      if (lastResult.rows.length) {
        const lastCreated = new Date(lastResult.rows[0].created_at).getTime();
        const diffSec = (Date.now() - lastCreated) / 1000;
        if (diffSec < cooldownSeconds) {
          return res.status(429).json({ success: false, message: `Please wait ${Math.ceil(cooldownSeconds - diffSec)}s before requesting another code.` });
        }
      }

      // Generate OTP (NOT stored until email send success)
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const { sendOtpEmail } = require('../services/emailService');
      try {
        await sendOtpEmail(email.toLowerCase(), otp);
      } catch (e) {
        console.error('[OTP] Email send failed, not storing OTP:', e.message);
        return res.status(502).json({ success: false, message: 'Failed to send OTP email. Please try again later.' });
      }
      // On success: delete old tokens & insert new
      await db.query('DELETE FROM email_verification_tokens WHERE email = $1 OR expires_at < NOW()', [email.toLowerCase()]);
      await db.query(
        `INSERT INTO email_verification_tokens (email, otp_code, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '10 minutes')`,
        [email.toLowerCase(), otp]
      );
      res.json({ success: true, message: 'OTP sent to email' });
    } catch (error) {
      console.error('Request OTP error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Test email endpoint (no OTP storage) for diagnostics
  async testEmail(req, res) {
    try {
      const { to, subject, body } = req.body;
      if (!to) return res.status(400).json({ success: false, message: '"to" email required' });
      const { sendGenericEmail } = require('../services/emailService');
      const subj = subject || 'EduSync Test Email';
      const text = body || 'This is a test email from EduSync test endpoint.';
      const result = await sendGenericEmail(to, subj, text);
      res.json({ success: true, message: 'Email dispatch attempted', data: { messageId: result.messageId || null } });
    } catch (e) {
      console.error('[TestEmail] error:', e.message);
      res.status(502).json({ success: false, message: 'Failed to send test email', error: e.message });
    }
  }

  // Verify OTP (pre-registration check)
  async verifyOtp(req, res) {
    try {
  console.log('[OTP] verify-otp hit. Authorization header present:', !!req.headers.authorization);
      const { email, otp } = req.body;
      if (!email || !otp) {
        return res.status(400).json({ success: false, message: 'Email and OTP required' });
      }
      const db = dbConfig.db;

      const result = await db.query(
        `SELECT * FROM email_verification_tokens 
         WHERE email = $1 AND otp_code = $2 AND used = FALSE AND expires_at > NOW()`,
        [email.toLowerCase(), otp]
      );
      if (result.rows.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
      }

      res.json({ success: true, message: 'OTP verified. You may proceed to register.', data: { email } });
    } catch (error) {
      console.error('Verify OTP error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
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

  // Verify password (aaa_7 only). Expected format: aaa_7$wf$outputBits$salt$hash
      let isPasswordValid = false;
  if (user.password_hash && user.password_hash.includes('aaa_7')) {
        const parsed = parseAaa7(user.password_hash.trim());
        if (parsed) {
          isPasswordValid = verify_aaa_7(password, parsed.hash, parsed.salt, parsed.workFactor, parsed.outputBits);
        }
      }
      // Minimal debug (safe) when invalid to help diagnose format issues
      if (!isPasswordValid) {
        console.warn('[Login] Password verification failed. Stored format:', user.password_hash);
      }
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

      // Password validation (min 8 chars, upper, lower, number, special)
      const passwordErrors = [];
      if (typeof newPassword !== 'string' || newPassword.length < 8) {
        passwordErrors.push('Password must be at least 8 characters long');
      }
      if (!/[A-Z]/.test(newPassword)) {
        passwordErrors.push('Password must contain at least one uppercase letter');
      }
      if (!/[a-z]/.test(newPassword)) {
        passwordErrors.push('Password must contain at least one lowercase letter');
      }
      if (!/[0-9]/.test(newPassword)) {
        passwordErrors.push('Password must contain at least one number');
      }
      if (!/[!@#$%^&*()_+=\-]/.test(newPassword)) {
        passwordErrors.push('Password must contain at least one special character (*@!@#$%^(_+=-)');
      }
      if (passwordErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: passwordErrors.join('. ')
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

  // Verify current password (aaa_7 only)
      let currentValid = false;
  if (user.password_hash && user.password_hash.includes('aaa_7')) {
        const parsed = parseAaa7(user.password_hash.trim());
        if (parsed) {
          currentValid = verify_aaa_7(currentPassword, parsed.hash, parsed.salt, parsed.workFactor, parsed.outputBits);
        }
      }
      if (!currentValid) {
        console.warn('[ChangePassword] Current password verification failed. Stored format:', user.password_hash);
      }
      if (!currentValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

  // Hash new password with deterministic salt from email (predictable; educational only)
  const userEmailResult = await db.query('SELECT email FROM users WHERE user_id = $1', [userId]);
  const userEmail = (userEmailResult.rows[0]?.email || '').toLowerCase();
  const newSalt = generateSaltFromEmail(userEmail);
  const nh = aaa_7(newPassword, newSalt, authConfig.CUSTOM_HASH_WORK_FACTOR || 1000, authConfig.CUSTOM_HASH_OUTPUT_BITS || 128);
  const hashedNewPassword = `aaa_7$${nh.workFactor}$${nh.outputBits}$${nh.salt}$${nh.hash}`;

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
