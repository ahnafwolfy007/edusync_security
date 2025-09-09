const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { uploadMiddleware } = require('../middlewares/uploadMiddleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// User profile routes
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.put('/profile-picture', uploadMiddleware.profilePicture, userController.updateProfilePicture);

// User listings and orders
router.get('/listings', userController.getUserListings);
router.get('/orders', userController.getUserOrders);

// User statistics
router.get('/stats', userController.getUserStats);

// Account management
router.delete('/account', userController.deleteAccount);

module.exports = router;
