const express = require('express');
const router = express.Router();
const foodVendorController = require('../controllers/foodVendorController');
const { authMiddleware } = require('../middlewares/authMiddleware');

// Apply for food vendor verification
router.post('/apply', authMiddleware, foodVendorController.applyForFoodVendor);

// Get food vendor application status
router.get('/application/status', authMiddleware, foodVendorController.getApplicationStatus);

// Create food vendor (after approval)
router.post('/create', authMiddleware, foodVendorController.createFoodVendor);

// Get all food vendors (public)
router.get('/all', foodVendorController.getAllFoodVendors);

// Get food vendor details with menu (public)
router.get('/:vendorId/details', foodVendorController.getFoodVendorDetails);

// Get user's food vendor
router.get('/my-vendor', authMiddleware, foodVendorController.getMyFoodVendor);

// Update food vendor
router.put('/:vendorId', authMiddleware, foodVendorController.updateFoodVendor);

// Food item management
router.post('/:vendorId/items', authMiddleware, foodVendorController.addFoodItem);
router.get('/:vendorId/items', authMiddleware, foodVendorController.getVendorFoodItems);
router.put('/:vendorId/items/:itemId', authMiddleware, foodVendorController.updateFoodItem);

// Order management for vendors
router.get('/:vendorId/orders', authMiddleware, foodVendorController.getVendorOrders);
router.put('/:vendorId/orders/:orderId/status', authMiddleware, foodVendorController.updateOrderStatus);

// Analytics for vendors
router.get('/:vendorId/analytics', authMiddleware, foodVendorController.getVendorAnalytics);

module.exports = router;
