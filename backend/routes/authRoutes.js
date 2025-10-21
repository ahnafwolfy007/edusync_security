const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const authController = require('../controllers/authController');
const { authMiddleware } = require('../middlewares/authMiddleware');  // JWT-based middleware (existing)
const { bruteForceGuard } = require('../utils/bruteForceGuard');

// NEW: DB-backed session middleware
const sessionAuth = require('../middlewares/sessionAuth');

/**
 * Prefer Session token; fallback to JWT.
 * - Session: Authorization: "Session <token>" OR cookie "session_token"
 * - JWT:     Authorization: "Bearer <token>"
 */
function sessionOrJwt(req, res, next) {
  const h = req.headers.authorization || '';
  const hasSessionHeader = h.startsWith('Session ');
  const hasSessionCookie = !!(req.cookies && req.cookies.session_token);

  if (hasSessionHeader || hasSessionCookie) {
    return sessionAuth(req, res, next);
  }
  return authMiddleware(req, res, next);
}

// Lightweight rate limiter specifically for OTP requests to prevent abuse
const otpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 3,              // max 3 OTP requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many OTP requests. Please wait a minute.' }
});

// -------------------- Public routes --------------------
router.post('/register', authController.register);
router.post('/request-otp', otpLimiter, authController.requestOtp);
router.post('/verify-otp', authController.verifyOtp);
router.post('/login', bruteForceGuard(), authController.login);
router.post('/verify-admin-otp', authController.verifyAdminLoginOtp);
router.post('/refresh-token', authController.refreshToken);
router.get('/hash-strategy', authController.hashStrategy);
// Diagnostic email test (rate limited via global mechanisms if any) - keep public but could restrict by domain later
router.post('/test-email', authController.testEmail);

// -------------------- Protected routes --------------------
// Use sessionOrJwt so clients can authenticate with either Session token or JWT.
router.post('/logout', sessionOrJwt, authController.logout);
router.get('/profile', sessionOrJwt, authController.getProfile);
router.put('/change-password', sessionOrJwt, authController.changePassword);

module.exports = router;
