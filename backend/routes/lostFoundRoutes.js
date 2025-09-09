const express = require('express');
const router = express.Router();
const {
  getAllLostFoundItems,
  getLostFoundItemById,
  createLostFoundItem,
  updateLostFoundItem,
  deleteLostFoundItem,
  getUserLostFoundItems,
  searchLostFoundItems,
  markAsFound,
  claimItem
} = require('../controllers/lostFoundController');
const { authenticateToken } = require('../middlewares/auth');
const { upload } = require('../middlewares/upload');

// Public routes
router.get('/', getAllLostFoundItems);
router.get('/search', searchLostFoundItems);
router.get('/:id', getLostFoundItemById);

// Protected routes
router.use(authenticateToken);

// Create lost/found item with images
router.post('/', upload.array('images', 5), createLostFoundItem);

// Get user's lost/found items
router.get('/user/my-items', getUserLostFoundItems);

// Mark item as found
router.post('/:id/found', markAsFound);

// Claim found item
router.post('/:id/claim', claimItem);

// Update and delete items
router.put('/:id', upload.array('images', 5), updateLostFoundItem);
router.delete('/:id', deleteLostFoundItem);

module.exports = router;
