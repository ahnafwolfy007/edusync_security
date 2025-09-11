const express = require('express');
const router = express.Router();
const businessMarketplaceController = require('../controllers/businessMarketplaceController');
// Prefer authenticateToken from unified auth middleware for consistency
const { authenticateToken } = require('../middlewares/auth');

// Get all business shops (Foodpanda-style)
router.get('/shops', businessMarketplaceController.getAllBusinessShops);

// Get business shop details with products
router.get('/shops/:businessId', businessMarketplaceController.getBusinessShopDetails);

// Get business types/categories
router.get('/types', businessMarketplaceController.getBusinessTypes);

// Place business order
router.post('/orders/place', authenticateToken, businessMarketplaceController.placeBusinesOrder);

// Get user's business orders
// Provide both legacy and expected route for user orders
router.get('/orders/my', authenticateToken, businessMarketplaceController.getUserBusinessOrders);
router.get('/orders/my-orders', authenticateToken, businessMarketplaceController.getUserBusinessOrders);

// Rate and review business order
router.post('/orders/:orderId/rate', authenticateToken, businessMarketplaceController.rateBusinessOrder);

// Search products across all businesses
router.get('/search/products', businessMarketplaceController.searchProducts);

// Get trending/featured businesses
router.get('/trending', businessMarketplaceController.getTrendingBusinesses);

module.exports = router;
