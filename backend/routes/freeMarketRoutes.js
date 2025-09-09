const express = require('express');
const router = express.Router();
const {
  getAllFreeMarketItems,
  getFreeMarketItemById,
  createFreeMarketItem,
  updateFreeMarketItem,
  deleteFreeMarketItem,
  getUserFreeMarketItems,
  searchFreeMarketItems,
  claimItem
} = require('../controllers/freeMarketController');
const { authenticateToken } = require('../middlewares/auth');
const { upload } = require('../middlewares/upload');

// Public routes
router.get('/', getAllFreeMarketItems);
router.get('/search', searchFreeMarketItems);
router.get('/:id', getFreeMarketItemById);

// Protected routes
router.use(authenticateToken);

// Create free market item with images
router.post('/', upload.array('images', 5), createFreeMarketItem);

// Get user's free market items
router.get('/user/my-items', getUserFreeMarketItems);

// Claim item
router.post('/:id/claim', claimItem);

// Update and delete items
router.put('/:id', upload.array('images', 5), updateFreeMarketItem);
router.delete('/:id', deleteFreeMarketItem);

module.exports = router;
