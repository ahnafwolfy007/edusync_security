const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { authenticateToken } = require('../middlewares/auth');

// All routes require authentication
router.use(authenticateToken);

// Get wallet information
router.get('/', walletController.getWallet);

// Add money to wallet
router.post('/add-money', walletController.addMoney);

// Withdraw money from wallet
router.post('/withdraw-money', walletController.withdrawMoney);

// Transfer money to another user
router.post('/transfer-money', walletController.transferMoney);

// Get transaction history
router.get('/transactions', walletController.getTransactions);

// Get wallet statistics
router.get('/stats', walletController.getWalletStats);

// Get specific transaction
router.get('/transactions/:transactionId', walletController.getTransaction);

module.exports = router;
