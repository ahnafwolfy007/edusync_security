const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, requireAdmin, requireModerator } = require('../middlewares/auth');

// All routes require authentication first
router.use(authenticateToken);

/**
 * Routes accessible by BOTH admins and moderators.
 * Moderators have operational review powers (approvals, read-only analytics & user viewing)
 * but not destructive system / financial / configuration capabilities.
 */

// Dashboard & stats (read-only)
router.get('/dashboard/stats', requireModerator, adminController.getDashboardStats);
router.get('/stats', requireModerator, adminController.getSystemStats); // Alias
router.get('/analytics/time-series', requireModerator, adminController.getTimeSeriesAnalytics);
router.get('/analytics/business/:businessId/revenue-series', requireModerator, adminController.getBusinessRevenueSeries);
router.get('/analytics/vendor/:vendorId/revenue-series', requireModerator, adminController.getVendorRevenueSeries);
// Live stats stream (SSE)
router.get('/dashboard/stats/stream', requireModerator, adminController.streamDashboardStats);

// User management (read-only for moderators, write requires admin below)
router.get('/users', requireModerator, adminController.getAllUsers);
router.get('/users/:id', requireModerator, adminController.getUserById);

// Business & vendor verification (moderators can process)
router.get('/business-applications/pending', requireModerator, adminController.getPendingBusinessApplications);
router.put('/business-applications/:applicationId/verify', requireModerator, adminController.verifyBusinessApplication);
router.get('/businesses', requireModerator, adminController.getAllBusinesses);
// Legacy approval endpoints kept for backward compatibility
router.post('/businesses/:id/approve', requireModerator, adminController.approveBusiness); // Legacy
router.post('/businesses/:id/reject', requireModerator, adminController.rejectBusiness); // Legacy

// Food vendor verification
router.get('/food-vendors/pending', requireModerator, adminController.getPendingFoodVendors);
router.put('/food-vendors/:vendorId/verify', requireModerator, adminController.verifyFoodVendor);

/**
 * Admin-only routes start here (mutations, financial, configuration, reports)
 */
router.put('/users/:id', requireAdmin, adminController.updateUser);
router.delete('/users/:id', requireAdmin, adminController.deleteUser);

// Notice management
router.post('/notices', requireAdmin, adminController.manageNotice);
router.put('/notices/:noticeId', requireAdmin, adminController.manageNotice);

// Financial management
router.get('/payments', requireAdmin, adminController.getAllPayments);
router.get('/transactions', requireAdmin, adminController.getAllTransactions);

// Reports
router.get('/reports/:type', requireAdmin, adminController.generateReport);

module.exports = router;
