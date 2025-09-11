const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const notificationController = require('../controllers/notificationController');

// All notification routes require auth
router.use(authenticateToken);

// Register FCM token
router.post('/register-token', notificationController.registerFCMToken);

// GET /api/notifications
router.get('/', notificationController.getNotifications);

// PUT /api/notifications/:id/read
router.put('/:id/read', notificationController.markAsRead);

// PUT /api/notifications/mark-all-read
router.put('/mark-all-read', notificationController.markAllAsRead);

// DELETE /api/notifications/:id
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
