const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getSystemStats,
  getAllBusinesses,
  approveBusiness,
  rejectBusiness,
  getAllPayments,
  getAllTransactions,
  generateReport
} = require('../controllers/adminController');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');

// All routes require admin authentication
router.use(authenticateToken);
router.use(requireAdmin);

// User management
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Business management
router.get('/businesses', getAllBusinesses);
router.post('/businesses/:id/approve', approveBusiness);
router.post('/businesses/:id/reject', rejectBusiness);

// Financial management
router.get('/payments', getAllPayments);
router.get('/transactions', getAllTransactions);

// System statistics
router.get('/stats', getSystemStats);

// Generate reports
router.get('/reports/:type', generateReport);

module.exports = router;
