const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const {bruteForceGuard} = require('../utils/bruteForceGuard');

// Lightweight rate limiter specifically for OTP requests to prevent abuse
const otpLimiter = rateLimit({
	windowMs: 60 * 1000, // 1 minute window
	max: 3,              // max 3 OTP requests per minute per IP
	standardHeaders: true,
	legacyHeaders: false,
	message: { success: false, message: 'Too many OTP requests. Please wait a minute.' }
});

// Public routes
router.post('/register', authController.register);
router.post('/request-otp', otpLimiter, authController.requestOtp);
router.post('/verify-otp', authController.verifyOtp);
router.post('/login',bruteForceGuard(), authController.login);
router.post('/refresh-token', authController.refreshToken);
router.get('/hash-strategy', authController.hashStrategy);
// Diagnostic email test (rate limited via global mechanisms if any) - keep public but could restrict by domain later
router.post('/test-email', authController.testEmail);

// Protected routes (apply auth per route to avoid accidental protection of public endpoints)
router.post('/logout', authMiddleware, authController.logout);
router.get('/profile', authMiddleware, authController.getProfile);
router.put('/change-password', authMiddleware, authController.changePassword);

module.exports = router;
