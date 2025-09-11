const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');

// All routes require admin authentication
router.use(authenticateToken);
router.use(requireAdmin);

// Dashboard and statistics
router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/stats', adminController.getSystemStats); // Alias for compatibility

// User management
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// Business verification
router.get('/business-applications/pending', adminController.getPendingBusinessApplications);
router.put('/business-applications/:applicationId/verify', adminController.verifyBusinessApplication);
router.get('/businesses', adminController.getAllBusinesses);
router.post('/businesses/:id/approve', adminController.approveBusiness); // Legacy
router.post('/businesses/:id/reject', adminController.rejectBusiness); // Legacy

// Food vendor verification
router.get('/food-vendors/pending', adminController.getPendingFoodVendors);
router.put('/food-vendors/:vendorId/verify', adminController.verifyFoodVendor);

// Notice management
router.post('/notices', adminController.manageNotice);
router.put('/notices/:noticeId', adminController.manageNotice);

// Financial management
router.get('/payments', adminController.getAllPayments);
router.get('/transactions', adminController.getAllTransactions);

// Generate reports
router.get('/reports/:type', adminController.generateReport);

module.exports = router;
