const express = require('express');
const router = express.Router();
const freeMarketplaceController = require('../controllers/freeMarketplaceController');
const { authenticateToken } = require('../middlewares/auth');

// Public routes (no authentication required)
router.get('/items', freeMarketplaceController.getAllFreeItems);
router.get('/items/:id', freeMarketplaceController.getFreeItem);

// Protected routes (authentication required)
router.use(authenticateToken);

// Item management
router.post('/items', freeMarketplaceController.createFreeItem);
router.get('/my-items', freeMarketplaceController.getMyFreeItems);
router.put('/items/:id', freeMarketplaceController.updateFreeItem);
router.delete('/items/:id', freeMarketplaceController.deleteFreeItem);

// Favorites
router.get('/favorites', freeMarketplaceController.getFavorites);
router.post('/favorites', freeMarketplaceController.addFavorite);
router.delete('/favorites/:itemId', freeMarketplaceController.removeFavorite);

// Request management
router.post('/items/:id/request', freeMarketplaceController.requestFreeItem);
router.get('/items/:id/requests', freeMarketplaceController.getMyItemRequests);
router.put('/requests/:requestId', freeMarketplaceController.manageRequest);

module.exports = router;
