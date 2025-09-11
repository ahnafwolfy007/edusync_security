const express = require('express');
const router = express.Router();
const businessController = require('../controllers/businessController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { requireFields, rateLimit } = require('../middlewares/validationMiddleware');
const { requireBusinessOwner, requireOwnershipOrAdmin } = require('../middlewares/adminMiddleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Business application routes
router.post('/apply', rateLimit({ max:5, windowMs:60000 }), requireFields(['businessName','businessType']), businessController.applyForBusiness);
router.get('/application-status', businessController.getApplicationStatus);
router.get('/applications/history', businessController.getApplicationHistory);

// Business management routes
router.post('/create', rateLimit({ max:10, windowMs:60000 }), requireFields(['businessName','businessType']), businessController.createBusiness);
router.get('/my-businesses', businessController.getUserBusinesses);
router.get('/:businessId', businessController.getBusinessDetails);
router.put('/:businessId', businessController.updateBusiness);

// Product management routes
router.post('/:businessId/products', rateLimit({ max:30, windowMs:60000 }), requireFields(['productName','price']), businessController.addProduct);
router.put('/:businessId/products/:productId', rateLimit({ max:60, windowMs:60000 }), businessController.updateProduct);

// Order management routes
router.get('/:businessId/orders', businessController.getBusinessOrders);
router.put('/:businessId/orders/:orderId/status', businessController.updateOrderStatus);

// Analytics routes
router.get('/:businessId/analytics', businessController.getBusinessAnalytics);

module.exports = router;
