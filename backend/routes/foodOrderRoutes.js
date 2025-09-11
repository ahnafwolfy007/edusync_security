const express = require('express');
const router = express.Router();
const foodOrderController = require('../controllers/foodOrderController');
const { authMiddleware } = require('../middlewares/authMiddleware');

// Place food order
router.post('/place', authMiddleware, foodOrderController.placeFoodOrder);

// Get user's food orders
router.get('/my-orders', authMiddleware, foodOrderController.getUserFoodOrders);

// Get food order details
router.get('/:orderId/details', authMiddleware, foodOrderController.getFoodOrderDetails);

// Cancel food order
router.put('/:orderId/cancel', authMiddleware, foodOrderController.cancelFoodOrder);

// Rate and review food order
router.post('/:orderId/rate', authMiddleware, foodOrderController.rateFoodOrder);

// Track food order
router.get('/:orderId/track', authMiddleware, foodOrderController.trackFoodOrder);

// Get food order history with filters
router.get('/history', authMiddleware, foodOrderController.getFoodOrderHistory);

module.exports = router;
