const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middlewares/authMiddleware');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh-token', authController.refreshToken);

// Protected routes
router.use(authMiddleware); // Apply auth middleware to all routes below

router.post('/logout', authController.logout);
router.get('/profile', authController.getProfile);
router.put('/change-password', authController.changePassword);

module.exports = router;
