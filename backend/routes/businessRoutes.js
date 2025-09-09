const express = require('express');
const router = express.Router();
const businessController = require('../controllers/businessController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { requireBusinessOwner, requireOwnershipOrAdmin } = require('../middlewares/adminMiddleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Business application routes
router.post('/apply', businessController.applyForBusiness);
router.get('/application-status', businessController.getApplicationStatus);

// Business management routes
router.post('/create', businessController.createBusiness);
router.get('/my-businesses', businessController.getUserBusinesses);
router.get('/:businessId', businessController.getBusinessDetails);
router.put('/:businessId', businessController.updateBusiness);

// Product management routes
router.post('/:businessId/products', businessController.addProduct);
router.put('/:businessId/products/:productId', businessController.updateProduct);

// Order management routes
router.get('/:businessId/orders', businessController.getBusinessOrders);
router.put('/:businessId/orders/:orderId/status', businessController.updateOrderStatus);

// Analytics routes
router.get('/:businessId/analytics', businessController.getBusinessAnalytics);

module.exports = router;
