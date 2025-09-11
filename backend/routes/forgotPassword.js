const express = require('express');
const router = express.Router();
const dbConfig = require('../config/db');
const { hashPasswordWithEmail } = require('../utils/simpleHash');
const { sendGenericEmail } = require('../services/emailService');

// Generate 6-digit OTP for password reset
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send password reset OTP email with branded template
async function sendPasswordResetOTP(email, otp) {
  const subject = 'Password Reset OTP - EduSync';
  const text = `Your password reset OTP is ${otp}. It expires in 10 minutes. If you didn't request this, please ignore this email.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #3b82f6; margin: 0;">EduSync</h1>
        <p style="color: #666; margin: 5px 0;">Campus Marketplace</p>
      </div>
      
      <div style="background: #f8fafc; border-radius: 8px; padding: 30px; text-align: center;">
        <h2 style="color: #1e293b; margin-bottom: 20px;">Password Reset Request</h2>
        <p style="color: #475569; margin-bottom: 30px;">You requested to reset your password. Use the OTP below:</p>
        
        <div style="background: white; border: 2px dashed #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; color: #3b82f6; letter-spacing: 4px;">${otp}</span>
        </div>
        
        <p style="color: #ef4444; font-size: 14px; margin-top: 20px;">⏰ This OTP expires in 10 minutes</p>
      </div>
      
      <div style="margin-top: 30px; padding: 20px; background: #fef2f2; border-radius: 8px;">
        <p style="color: #dc2626; font-size: 14px; margin: 0;">
          <strong>Security Notice:</strong> If you didn't request this password reset, please ignore this email and your password will remain unchanged.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
        <p style="color: #64748b; font-size: 12px; margin: 0;">
          © 2025 EduSync Campus Marketplace. All rights reserved.
        </p>
      </div>
    </div>
  `;
  
  return sendGenericEmail(email, subject, text, html);
}

// Request password reset OTP
router.post('/request', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const db = dbConfig.db;

    // Check if user exists
    const userResult = await db.query(
      'SELECT user_id, email, full_name FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      // Don't reveal if email exists or not for security
      return res.json({
        success: true,
        message: 'If the email exists, a reset code has been sent.'
      });
    }

    const user = userResult.rows[0];

    // Rate limiting: Check for recent OTP requests (1 minute cooldown)
    const recentOtpResult = await db.query(
      `SELECT created_at FROM password_reset_otps 
       WHERE email = $1 AND created_at > NOW() - INTERVAL '1 minute'
       ORDER BY created_at DESC LIMIT 1`,
      [user.email]
    );

    if (recentOtpResult.rows.length > 0) {
      return res.status(429).json({
        success: false,
        message: 'Please wait before requesting another reset code.'
      });
    }

    // Check hourly limit (max 5 OTPs per hour)
    const hourlyCountResult = await db.query(
      `SELECT COUNT(*)::int AS count FROM password_reset_otps 
       WHERE email = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
      [user.email]
    );

    if (hourlyCountResult.rows[0].count >= 5) {
      return res.status(429).json({
        success: false,
        message: 'Too many password reset requests. Please try again later.'
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Clean up expired OTPs and delete any existing OTPs for this email
    await db.query('DELETE FROM password_reset_otps WHERE email = $1 OR expires_at < NOW()', [user.email]);
    
    // Send reset OTP email first (fail early if email fails)
    try {
      await sendPasswordResetOTP(user.email, otp);
    } catch (emailError) {
      console.error('Failed to send reset OTP email:', emailError);
      return res.status(502).json({
        success: false,
        message: 'Failed to send reset code. Please try again later.'
      });
    }

    // Only store OTP after successful email send
    await db.query(
      `INSERT INTO password_reset_otps (email, otp_code, expires_at, user_id)
       VALUES ($1, $2, $3, $4)`,
      [user.email, otp, expiresAt, user.user_id]
    );

    res.json({
      success: true,
      message: 'If the email exists, a reset code has been sent.',
      // In development, return the OTP for testing
      ...(process.env.NODE_ENV === 'development' && { otp })
    });

  } catch (error) {
    console.error('Forgot password request error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Verify password reset OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    const db = dbConfig.db;

    // Find valid OTP for this email
    const otpResult = await db.query(
      `SELECT otp_id, user_id, email, expires_at, used 
       FROM password_reset_otps 
       WHERE email = $1 AND otp_code = $2 AND used = FALSE AND expires_at > NOW()`,
      [email.toLowerCase(), otp]
    );

    if (otpResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    const otpData = otpResult.rows[0];

    res.json({
      success: true,
      message: 'OTP verified successfully',
      email: otpData.email,
      resetToken: otpData.otp_id // Use otp_id as a temporary token for the reset step
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Reset password using OTP
router.post('/reset', async (req, res) => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;

    if (!email || !otp || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, OTP, new password, and confirm password are required'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    const db = dbConfig.db;

    // Find and validate the OTP
    const otpResult = await db.query(
      `SELECT otp_id, user_id, email, expires_at, used 
       FROM password_reset_otps 
       WHERE email = $1 AND otp_code = $2 AND used = FALSE AND expires_at > NOW()`,
      [email.toLowerCase(), otp]
    );

    if (otpResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    const otpData = otpResult.rows[0];

    // Hash the new password using email-based salt
    const hashedPassword = hashPasswordWithEmail(newPassword, otpData.email);

    // Update user's password
    await db.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2',
      [hashedPassword, otpData.user_id]
    );

    // Mark the OTP as used
    await db.query(
      'UPDATE password_reset_otps SET used = TRUE WHERE otp_id = $1',
      [otpData.otp_id]
    );

    // Clean up expired OTPs for this email
    await db.query(
      'DELETE FROM password_reset_otps WHERE email = $1 AND (used = TRUE OR expires_at < NOW())',
      [otpData.email]
    );

    res.json({
      success: true,
      message: 'Password has been reset successfully'
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get all active OTPs (development only)
router.get('/otps', async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ message: 'Not found' });
  }

  try {
    const db = dbConfig.db;
    
    const otpsResult = await db.query(`
      SELECT otp_id, email, otp_code, expires_at, used, created_at,
             (expires_at < NOW()) AS is_expired
      FROM password_reset_otps 
      ORDER BY created_at DESC
    `);

    const otps = otpsResult.rows.map(otp => ({
      otp_id: otp.otp_id,
      email: otp.email,
      otp_code: otp.otp_code,
      expires_at: otp.expires_at,
      used: otp.used,
      created_at: otp.created_at,
      is_expired: otp.is_expired
    }));

    res.json({ otps });
  } catch (error) {
    console.error('Get OTPs error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
