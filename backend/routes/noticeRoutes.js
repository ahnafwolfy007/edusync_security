const express = require('express');
const router = express.Router();
const {
  getAllNotices,
  getNoticeById,
  createNotice,
  updateNotice,
  deleteNotice,
  getUserNotices,
  markNoticeAsRead
} = require('../controllers/noticeController');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');
const { upload } = require('../middlewares/upload');

// Public routes
router.get('/', getAllNotices);
router.get('/:id', getNoticeById);

// Protected routes
router.use(authenticateToken);

// Mark notice as read
router.post('/:id/read', markNoticeAsRead);

// Get user's read notices
router.get('/user/read-notices', getUserNotices);

// Admin only routes
router.use(requireAdmin);

// Create notice with attachments
router.post('/', upload.array('attachments', 3), createNotice);

// Update and delete notices
router.put('/:id', upload.array('attachments', 3), updateNotice);
router.delete('/:id', deleteNotice);

module.exports = router;
