const jwt = require('jsonwebtoken');
const dbConfig = require('../config/db');
const authConfig = require('../config/auth');
const { hashPasswordWithEmail, verifyPasswordHash } = require('../utils/simpleHash');
const { recordBruteForceResult } = require('../utils/bruteForceGuard');
const InputSanitizer = require('../utils/inputSanitization');
const ADMIN_VERIFICATION_EMAIL = (process.env.ADMIN_VERIFICATION_EMAIL || 'dishchord3@gmail.com').toLowerCase();
const ADMIN_OFFICIAL_EMAIL = (process.env.ADMIN_OFFICIAL_EMAIL || '').toLowerCase();
const MODERATOR_OFFICIAL_EMAIL = (process.env.MODERATOR_OFFICIAL_EMAIL || '').toLowerCase();

// NEW: session manager (DB-backed sessions)
const { createSession, revokeSession } = require('../utils/sessionManager');

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
        role: requestedRole = 'student' 
      } = req.body;

      // Debug: log keys received (avoid logging password fully)
      try {
        const clone = { ...req.body };
        if (clone.password) clone.password = `len:${clone.password.length}`;
        console.log('[Register] Incoming body keys:', Object.keys(clone), 'otpCode:', clone.otpCode);
      } catch(_) {}

      // Accept 'name' alias from frontend
      let effectiveFullName = fullName || req.body.name;

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

      // OTP email differs for admin/moderator roles (shared mailbox)
      // Determine final role
      let finalRole = requestedRole;
      const emailLc = email.toLowerCase();
      if (emailLc === ADMIN_OFFICIAL_EMAIL) {
        finalRole = 'admin';
      } else if (emailLc === MODERATOR_OFFICIAL_EMAIL && finalRole !== 'admin') {
        finalRole = 'moderator';
      } else if (['admin','moderator'].includes(requestedRole) && ![ADMIN_OFFICIAL_EMAIL, MODERATOR_OFFICIAL_EMAIL].includes(emailLc)) {
        finalRole = 'student';
      }

      const otpEmail = (finalRole === 'admin' || finalRole === 'moderator') ? ADMIN_VERIFICATION_EMAIL : emailLc;
      const otpResult = await db.query(
        `SELECT * FROM email_verification_tokens 
         WHERE email = $1 AND otp_code = $2 AND used = FALSE AND expires_at > NOW()`,
        [otpEmail, otpCode]
      );
      if (otpResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired OTP code'
        });
      }

      // Password validation
      const passwordErrors = [];
      if (typeof password !== 'string' || password.length < 8) passwordErrors.push('Password must be at least 8 characters long');
      if (!/[A-Z]/.test(password)) passwordErrors.push('Password must contain at least one uppercase letter');
      if (!/[a-z]/.test(password)) passwordErrors.push('Password must contain at least one lowercase letter');
      if (!/[0-9]/.test(password)) passwordErrors.push('Password must contain at least one number');
      if (!/[!@#$%^&*()_+=\-]/.test(password)) passwordErrors.push('Password must contain at least one special character (*@!@#$%^(_+=-)');
      if (passwordErrors.length > 0) {
        return res.status(400).json({ success: false, message: passwordErrors.join('. ') });
      }

      // Check if user exists
      const existingUser = await db.query('SELECT user_id FROM users WHERE email = $1', [email.toLowerCase()]);
      if (existingUser.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'User with this email already exists' });
      }

      // Hash password with email-based salt
      const hashedPassword = hashPasswordWithEmail(
        password, email.toLowerCase(),
        authConfig.CUSTOM_HASH_WORK_FACTOR || 1000,
        authConfig.CUSTOM_HASH_OUTPUT_BITS || 128
      );

      // Resolve role_id
      const roleResult = await db.query('SELECT role_id FROM roles WHERE role_name = $1', [finalRole]);
      let roleId = 3; // default student
      if (roleResult.rows.length > 0) roleId = roleResult.rows[0].role_id;

      // Create user (mark verified)
      const userResult = await db.query(
        `INSERT INTO users (full_name, email, password_hash, phone, role_id, institution, location, is_email_verified, email_verified_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, NOW(), NOW(), NOW())
         RETURNING user_id, full_name, email, phone, role_id, institution, location, is_email_verified, email_verified_at, created_at`,
        [effectiveFullName, email.toLowerCase(), hashedPassword, phone, roleId, null, location]
      );
      const newUser = userResult.rows[0];

      // Create wallet
      await db.query('INSERT INTO wallets (user_id, balance, created_at, updated_at) VALUES ($1, $2, NOW(), NOW())', [newUser.user_id, 0.00]);

      // Generate tokens (JWT)
      const tokenPayload = { userId: newUser.user_id, email: newUser.email, role: finalRole };
      const accessToken = authConfig.generateToken(tokenPayload);
      const refreshToken = authConfig.generateRefreshToken(tokenPayload);

      // Resolve role name for response
      const roleNameResult = await db.query('SELECT role_name FROM roles WHERE role_id = $1', [newUser.role_id]);
      const userData = { ...newUser, role: roleNameResult.rows[0]?.role_name || 'student' };

      // Mark OTP used
      await db.query(`UPDATE email_verification_tokens SET used = TRUE WHERE token_id = $1`, [otpResult.rows[0].token_id]);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: { user: userData, accessToken, refreshToken }
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ success: false, message: 'Internal server error during registration' });
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
      const { email, role } = req.body;
      if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

      const allowedDomain = (process.env.ALLOWED_EMAIL_DOMAIN || '@bscse.uiu.ac.bd').toLowerCase();
      if (!email.toLowerCase().endsWith(allowedDomain)) {
        return res.status(400).json({ success: false, message: `Email must end with ${allowedDomain}` });
      }

      const db = dbConfig.db;

      // Registered & verified?
      const existingUser = await db.query('SELECT is_email_verified FROM users WHERE email = $1', [email.toLowerCase()]);
      if (existingUser.rows.length > 0 && existingUser.rows[0].is_email_verified) {
        return res.status(409).json({ success: false, message: 'Email already registered and verified' });
      }

      // Abuse controls
      const cooldownSeconds = parseInt(process.env.OTP_REQUEST_COOLDOWN || '60');
      const maxPerHour = parseInt(process.env.OTP_MAX_PER_HOUR || '5');
      const targetEmail = (role === 'admin' || role === 'moderator') ? ADMIN_VERIFICATION_EMAIL : email.toLowerCase();

      const hourCountResult = await db.query(
        `SELECT COUNT(*)::int AS cnt FROM email_verification_tokens 
         WHERE email = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
        [targetEmail]
      );
      if (hourCountResult.rows[0].cnt >= maxPerHour) {
        return res.status(429).json({ success: false, message: 'Too many OTP requests for this email. Try again later.' });
      }

      const lastResult = await db.query(
        `SELECT created_at FROM email_verification_tokens 
         WHERE email = $1 ORDER BY created_at DESC LIMIT 1`,
        [targetEmail]
      );
      if (lastResult.rows.length) {
        const lastCreated = new Date(lastResult.rows[0].created_at).getTime();
        const diffSec = (Date.now() - lastCreated) / 1000;
        if (diffSec < cooldownSeconds) {
          return res.status(429).json({ success: false, message: `Please wait ${Math.ceil(cooldownSeconds - diffSec)}s before requesting another code.` });
        }
      }

      // Generate+send OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const { sendOtpEmail } = require('../services/emailService');
      try {
        await sendOtpEmail(targetEmail, otp);
      } catch (e) {
        console.error('[OTP] Email send failed, not storing OTP:', e.message);
        return res.status(502).json({ success: false, message: 'Failed to send OTP email. Please try again later.' });
      }

      // Store OTP
      await db.query('DELETE FROM email_verification_tokens WHERE email = $1 OR expires_at < NOW()', [targetEmail]);
      await db.query(
        `INSERT INTO email_verification_tokens (email, otp_code, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '10 minutes')`,
        [targetEmail, otp]
      );

      res.json({ success: true, message: 'OTP sent to email' });
    } catch (error) {
      console.error('Request OTP error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Test email endpoint (diagnostic)
  async testEmail(req, res) {
    try {
      const { to, subject, body } = req.body;
      if (!to) return res.status(400).json({ success: false, message: '"to" email required' });
      const { sendGenericEmail } = require('../services/emailService');
      const subj = subject || 'EduSync Test Email';
      const text = body || 'This is a test email from EduSync test endpoint.';
      await sendGenericEmail(to, subj, text);
      res.json({ success: true, message: 'Email sent (diagnostic)' });
    } catch (e) {
      console.error('[TestEmail] error:', e.message);
      res.status(502).json({ success: false, message: 'Failed to send test email', error: e.message });
    }
  }

  // Verify OTP (pre-registration check)
  async verifyOtp(req, res) {
    try {
      console.log('[OTP] verify-otp hit. Authorization header present:', !!req.headers.authorization);
      const { email, otp, role } = req.body;
      if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP required' });

      const db = dbConfig.db;
      const lookupEmail = (role === 'admin' || role === 'moderator') ? ADMIN_VERIFICATION_EMAIL : email.toLowerCase();
      const result = await db.query(
        `SELECT * FROM email_verification_tokens 
         WHERE email = $1 AND otp_code = $2 AND used = FALSE AND expires_at > NOW()`,
        [lookupEmail, otp]
      );
      if (result.rows.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
      }

      res.json({ success: true, message: 'OTP verified. You may proceed to register.', data: { email, role } });
    } catch (error) {
      console.error('Verify OTP error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Verify admin login OTP and complete login
  async verifyAdminLoginOtp(req, res) {
    try {
      const { tempToken, otp } = req.body;
      if (!tempToken || !otp) {
        return res.status(400).json({ success: false, message: 'Temporary token and OTP are required' });
      }

      const db = dbConfig.db;
      // Find OTP record + user
      const otpResult = await db.query(`
        SELECT alo.*, u.*, r.role_name
        FROM admin_login_otps alo
        JOIN users u ON alo.user_id = u.user_id
        JOIN roles r ON u.role_id = r.role_id
        WHERE alo.session_token = $1 AND alo.otp_code = $2 
          AND alo.used = FALSE AND alo.expires_at > NOW()
      `, [tempToken, otp]);

      if (otpResult.rows.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
      }
      const user = otpResult.rows[0];

      // Mark OTP as used
      await db.query(`UPDATE admin_login_otps SET used = TRUE WHERE otp_id = $1`, [user.otp_id]);

      // Update stats (non-fatal)
      try {
        await db.query(
          `INSERT INTO user_statistics (user_id, login_count, last_login)
           VALUES ($1, 1, NOW())
           ON CONFLICT (user_id)
           DO UPDATE SET login_count = user_statistics.login_count + 1, last_login = NOW()`,
          [user.user_id]
        );
      } catch (statsErr) {
        console.warn('[AdminLogin] Failed to update user_statistics:', statsErr.message);
      }

      // Issue JWTs
      const tokenPayload = { userId: user.user_id, email: user.email, role: user.role_name };
      const accessToken = authConfig.generateToken(tokenPayload);
      const refreshToken = authConfig.generateRefreshToken(tokenPayload);

      // NEW: create DB session (single active)
      const sess = await createSession({
        userId: user.user_id,
        ip: req.ip,
        ua: req.headers['user-agent'],
        singleSession: true
      });
      // Set cookie (optional)
      res.cookie('session_token', sess.token, {
        httpOnly: true,
        secure: String(process.env.SECURE_COOKIES || 'false') === 'true',
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 8
      });

      const { password_hash, otp_id, session_token, otp_code, expires_at, used, created_at, ...userData } = user;
      return res.json({
        success: true,
        message: 'Admin login completed successfully',
        data: {
          user: userData,
          accessToken,
          refreshToken,
          sessionToken: sess.token,
          sessionExpiresAt: sess.expires_at
        }
      });

    } catch (error) {
      console.error('Admin OTP verification error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error during admin verification' });
    }
  }

  // User login
  async login(req, res) {
    const bfCtx = res.locals._bf; // brute force guard context

    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
      }
      if (InputSanitizer.validateEmail(email) === false) {
        recordBruteForceResult({ success: false }, bfCtx);
        return res.status(400).json({ success: false, message: 'Invalid email format' });
      }
      if (password.length < 6 || password.length > 128) {
        recordBruteForceResult({ success: false }, bfCtx);
        return res.status(400).json({ success: false, message: 'Invalid password format' });
      }

      const db = dbConfig.db;

      // Fetch user + role
      const userResult = await db.query(
        `SELECT u.*, r.role_name
         FROM users u
         JOIN roles r ON u.role_id = r.role_id
         WHERE u.email = $1`,
        [email.toLowerCase()]
      );

      if (userResult.rows.length === 0) {
        recordBruteForceResult({ success: false }, bfCtx);
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      const user = userResult.rows[0];

      // Verify password
      let isPasswordValid = false;
      if (user.password_hash) {
        isPasswordValid = verifyPasswordHash(password, user.password_hash, user.email.toLowerCase());
      }
      if (!isPasswordValid) {
        recordBruteForceResult({ success: false }, bfCtx);
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      // success -> reset brute-force counters
      recordBruteForceResult({ success: true }, bfCtx);

      // Admin requires OTP second factor
      if (user.role_name === 'admin') {
        const tempSessionToken = require('crypto').randomBytes(32).toString('hex');
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        try {
          const { sendAdminLoginOtpEmail } = require('../services/emailService');
          await sendAdminLoginOtpEmail(user.email, otp, user.full_name || user.name);

          await db.query(`DELETE FROM admin_login_otps WHERE user_id = $1 OR expires_at < NOW()`, [user.user_id]);
          await db.query(
            `INSERT INTO admin_login_otps (user_id, email, otp_code, session_token, expires_at)
             VALUES ($1, $2, $3, $4, NOW() + INTERVAL '10 minutes')`,
            [user.user_id, user.email, otp, tempSessionToken]
          );

          return res.json({
            success: true,
            requiresOtp: true,
            message: 'OTP sent to admin email. Please verify to complete login.',
            tempToken: tempSessionToken
          });
        } catch (otpError) {
          console.error('Admin OTP send failed:', otpError);
          return res.status(500).json({ success: false, message: 'Failed to send admin verification OTP. Please try again.' });
        }
      }

      // Non-admin: continue normal login

      // Update statistics (non-fatal)
      try {
        await db.query(
          `INSERT INTO user_statistics (user_id, login_count, last_login)
           VALUES ($1, 1, NOW())
           ON CONFLICT (user_id)
           DO UPDATE SET login_count = user_statistics.login_count + 1, last_login = NOW()`,
          [user.user_id]
        );
      } catch (statsErr) {
        console.warn('[Login] Failed to update user_statistics:', statsErr.message);
      }

      // Issue JWTs
      const tokenPayload = { userId: user.user_id, email: user.email, role: user.role_name };
      const accessToken = authConfig.generateToken(tokenPayload);
      const refreshToken = authConfig.generateRefreshToken(tokenPayload);

      // NEW: create DB session (single active)
      const sess = await createSession({
        userId: user.user_id,
        ip: req.ip,
        ua: req.headers['user-agent'],
        singleSession: true
      });

      // Set cookie (optional)
      res.cookie('session_token', sess.token, {
        httpOnly: true,
        secure: String(process.env.SECURE_COOKIES || 'false') === 'true',
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 8
      });

      const { password_hash, ...userData } = user;

      return res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: userData,
          accessToken,
          refreshToken,
          sessionToken: sess.token,
          sessionExpiresAt: sess.expires_at
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error during login' });
    }
  }

  // Refresh token
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ success: false, message: 'Refresh token is required' });
      }

      // Verify refresh token
      const decoded = authConfig.verifyRefreshToken(refreshToken);

      const db = dbConfig.db;
      const userResult = await db.query(
        `SELECT u.*, r.role_name 
         FROM users u 
         JOIN roles r ON u.role_id = r.role_id 
         WHERE u.user_id = $1`,
        [decoded.userId]
      );
      if (!userResult.rows.length) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      const user = userResult.rows[0];

      // Generate new access token
      const tokenPayload = { userId: user.user_id, email: user.email, role: user.role_name };
      const accessToken = authConfig.generateToken(tokenPayload);

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: { accessToken }
      });

    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }
  }

  // Logout
  async logout(req, res) {
    try {
      // Blacklist JWT if Bearer provided
      const authHeader = req.headers.authorization || '';
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        authConfig.blacklistToken(token);
      }

      // Revoke DB session (header or cookie)
      let sessionToken = null;
      if (authHeader.startsWith('Session ')) {
        sessionToken = authHeader.slice('Session '.length).trim();
      } else if (req.cookies?.session_token) {
        sessionToken = req.cookies.session_token;
      }
      if (sessionToken) await revokeSession(sessionToken);

      // Clear cookie if set
      res.clearCookie('session_token', { sameSite: 'lax' });

      res.json({ success: true, message: 'Logged out successfully' });

    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ success: false, message: 'Internal server error during logout' });
    }
  }

  // Get current user profile
  async getProfile(req, res) {
    try {
      // Accept user id from either JWT middleware or session middleware
      const userId = (req.user && req.user.userId) || (req.session && req.session.user_id);
      if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

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
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const user = userResult.rows[0];
      res.json({ success: true, data: { user } });

    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Change password
  async changePassword(req, res) {
    try {
      const userId = (req.user && req.user.userId) || (req.session && req.session.user_id);
      if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, message: 'Current password and new password are required' });
      }

      // Password validation
      const passwordErrors = [];
      if (typeof newPassword !== 'string' || newPassword.length < 8) passwordErrors.push('Password must be at least 8 characters long');
      if (!/[A-Z]/.test(newPassword)) passwordErrors.push('Password must contain at least one uppercase letter');
      if (!/[a-z]/.test(newPassword)) passwordErrors.push('Password must contain at least one lowercase letter');
      if (!/[0-9]/.test(newPassword)) passwordErrors.push('Password must contain at least one number');
      if (!/[!@#$%^&*()_+=\-]/.test(newPassword)) passwordErrors.push('Password must contain at least one special character (*@!@#$%^(_+=-)');
      if (passwordErrors.length > 0) {
        return res.status(400).json({ success: false, message: passwordErrors.join('. ') });
      }

      const db = dbConfig.db;

      // Get current user (hash + email)
      const userResult = await db.query('SELECT email, password_hash FROM users WHERE user_id = $1', [userId]);
      if (!userResult.rows.length) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      const { email, password_hash } = userResult.rows[0];

      // Verify current password with stored hash
      const currentValid = password_hash
        ? verifyPasswordHash(currentPassword, password_hash, (email || '').toLowerCase())
        : false;

      if (!currentValid) {
        return res.status(400).json({ success: false, message: 'Current password is incorrect' });
      }

      // Hash new password with email-based salt (same scheme as register/login)
      const newHashed = hashPasswordWithEmail(
        newPassword,
        (email || '').toLowerCase(),
        authConfig.CUSTOM_HASH_WORK_FACTOR || 1000,
        authConfig.CUSTOM_HASH_OUTPUT_BITS || 128
      );

      await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2', [newHashed, userId]);

      res.json({ success: true, message: 'Password changed successfully' });

    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}

module.exports = new AuthController();
