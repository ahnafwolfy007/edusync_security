const express = require('express');
const router = express.Router();
const marketplaceController = require('../controllers/marketplaceController');
const { authenticateToken } = require('../middlewares/auth');
const { uploadMiddleware } = require('../middlewares/uploadMiddleware');

// Public routes (no authentication required)
router.get('/items', marketplaceController.getAllMarketplaceItems);
router.get('/items/:id', marketplaceController.getMarketplaceItemById);

// Protected routes (require authentication)
router.use(authenticateToken);

// User marketplace operations
router.get('/my-items', marketplaceController.getUserMarketplaceItems);

// Marketplace item creation with image upload support
router.post('/items', 
  uploadMiddleware.multiple('images', 8), // Support up to 8 images
  marketplaceController.createMarketplaceItem
);

router.put('/items/:id', marketplaceController.updateMarketplaceItem);
router.delete('/items/:id', marketplaceController.deleteMarketplaceItem);

// Purchase operations
router.post('/items/:id/purchase', marketplaceController.purchaseMarketplaceItem);

module.exports = router;
