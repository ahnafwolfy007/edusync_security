const express = require('express');
const router = express.Router();
const {
  getAllSecondhandItems,
  getSecondhandItemById,
  createSecondhandItem,
  updateSecondhandItem,
  deleteSecondhandItem,
  getUserSecondhandItems,
  searchSecondhandItems
} = require('../controllers/secondhandController');
const { authenticateToken } = require('../middlewares/auth');
const { uploadMiddleware } = require('../middlewares/uploadMiddleware');

// Public routes
router.get('/', getAllSecondhandItems);
router.get('/search', searchSecondhandItems);
router.get('/:id', getSecondhandItemById);

// Protected routes
router.use(authenticateToken);

// Create secondhand item with images
router.post('/', uploadMiddleware.multiple('images', 5), createSecondhandItem);

// Get user's secondhand items
router.get('/user/my-items', getUserSecondhandItems);

// Update and delete items
router.put('/:id', uploadMiddleware.multiple('images', 5), updateSecondhandItem);
router.delete('/:id', deleteSecondhandItem);

module.exports = router;
