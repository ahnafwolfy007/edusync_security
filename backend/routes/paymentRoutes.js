const express = require('express');
const router = express.Router();
const {
  createPayment,
  processPayment,
  getPaymentHistory,
  verifyPayment,
  refundPayment
} = require('../controllers/paymentController');
const { authenticateToken } = require('../middlewares/auth');

// All routes require authentication
router.use(authenticateToken);

// Create a new payment
router.post('/create', createPayment);

// Process payment
router.post('/process', processPayment);

// Verify payment
router.post('/verify', verifyPayment);

// Get payment history
router.get('/history', getPaymentHistory);

// Refund payment
router.post('/refund', refundPayment);

module.exports = router;
