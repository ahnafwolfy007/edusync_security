const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

// Get wallet details
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    let walletResult = await pool.query(
      'SELECT * FROM wallets WHERE user_id = $1',
      [userId]
    );
    
    // Create wallet if it doesn't exist
    if (walletResult.rows.length === 0) {
      await pool.query(
        'INSERT INTO wallets (user_id, balance) VALUES ($1, $2)',
        [userId, 0]
      );
      walletResult = await pool.query(
        'SELECT * FROM wallets WHERE user_id = $1',
        [userId]
      );
    }
    
    res.json({
      success: true,
      data: walletResult.rows[0]
    });
  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wallet details'
    });
  }
});

// Get wallet transactions
router.get('/transactions', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;
    
    const result = await pool.query(
      `SELECT * FROM transactions 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, parseInt(limit), parseInt(offset)]
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions'
    });
  }
});

// Add money to wallet
router.post('/add-money', auth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { amount, paymentMethod = 'demo_bkash', paymentDetails } = req.body;
    const userId = req.user.id;
    
    if (!amount || amount <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Invalid amount'
      });
    }
    
    // Get or create wallet
    let walletResult = await client.query(
      'SELECT * FROM wallets WHERE user_id = $1',
      [userId]
    );
    
    if (walletResult.rows.length === 0) {
      await client.query(
        'INSERT INTO wallets (user_id, balance) VALUES ($1, $2)',
        [userId, 0]
      );
      walletResult = await client.query(
        'SELECT * FROM wallets WHERE user_id = $1',
        [userId]
      );
    }
    
    const wallet = walletResult.rows[0];
    
    // Calculate fees based on payment method
    let fee = 0;
    const feeRates = {
      'demo_bkash': 0.018,
      'demo_nagad': 0.015,
      'demo_rocket': 0.02,
      'demo_card': 0.025
    };
    
    if (feeRates[paymentMethod]) {
      fee = amount * feeRates[paymentMethod];
    }
    
    const netAmount = amount - fee;
    
    // Update wallet balance
    await client.query(
      'UPDATE wallets SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [netAmount, userId]
    );
    
    // Create transaction record
    const transactionResult = await client.query(
      `INSERT INTO transactions (
        user_id, type, amount, description, payment_method, 
        reference_number, status, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        userId,
        'credit',
        netAmount,
        `Money added via ${paymentMethod}`,
        paymentMethod,
        paymentDetails?.transactionId || `ADD-${Date.now()}`,
        'completed',
        JSON.stringify({
          gross_amount: amount,
          fee,
          net_amount: netAmount,
          payment_details: paymentDetails
        })
      ]
    );
    
    // Get updated wallet
    const updatedWallet = await client.query(
      'SELECT * FROM wallets WHERE user_id = $1',
      [userId]
    );
    
    await client.query('COMMIT');
    
    res.status(201).json({
      success: true,
      data: {
        wallet: updatedWallet.rows[0],
        transaction: transactionResult.rows[0]
      },
      message: 'Money added successfully'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Add money error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add money to wallet'
    });
  } finally {
    client.release();
  }
});

// Withdraw money from wallet
router.post('/withdraw', auth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { amount, paymentMethod = 'bank_transfer', paymentDetails } = req.body;
    const userId = req.user.id;
    
    if (!amount || amount <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Invalid amount'
      });
    }
    
    // Get wallet
    const walletResult = await client.query(
      'SELECT * FROM wallets WHERE user_id = $1',
      [userId]
    );
    
    if (walletResult.rows.length === 0 || walletResult.rows[0].balance < amount) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance'
      });
    }
    
    // Update wallet balance
    await client.query(
      'UPDATE wallets SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [amount, userId]
    );
    
    // Create transaction record
    const transactionResult = await client.query(
      `INSERT INTO transactions (
        user_id, type, amount, description, payment_method, 
        reference_number, status, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        userId,
        'debit',
        amount,
        `Money withdrawn via ${paymentMethod}`,
        paymentMethod,
        `WD-${Date.now()}`,
        'pending',
        JSON.stringify({
          payment_details: paymentDetails
        })
      ]
    );
    
    // Get updated wallet
    const updatedWallet = await client.query(
      'SELECT * FROM wallets WHERE user_id = $1',
      [userId]
    );
    
    await client.query('COMMIT');
    
    res.status(201).json({
      success: true,
      data: {
        wallet: updatedWallet.rows[0],
        transaction: transactionResult.rows[0]
      },
      message: 'Withdrawal request submitted successfully'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Withdraw money error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to withdraw money'
    });
  } finally {
    client.release();
  }
});

// Transfer money to another user
router.post('/transfer', auth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { recipientEmail, amount, note } = req.body;
    const senderId = req.user.id;
    
    if (!recipientEmail || !amount) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Recipient email and amount are required'
      });
    }
    
    if (amount <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Invalid amount'
      });
    }
    
    // Find recipient user
    const recipientResult = await client.query(
      'SELECT id, full_name FROM users WHERE email = $1',
      [recipientEmail]
    );
    
    if (recipientResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Recipient not found'
      });
    }
    
    const recipientId = recipientResult.rows[0].id;
    const recipientName = recipientResult.rows[0].full_name;
    
    if (senderId === recipientId) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Cannot transfer money to yourself'
      });
    }
    
    // Check sender's wallet balance
    const senderWallet = await client.query(
      'SELECT * FROM wallets WHERE user_id = $1',
      [senderId]
    );
    
    if (senderWallet.rows.length === 0 || senderWallet.rows[0].balance < amount) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance'
      });
    }
    
    // Get or create recipient wallet
    let recipientWallet = await client.query(
      'SELECT * FROM wallets WHERE user_id = $1',
      [recipientId]
    );
    
    if (recipientWallet.rows.length === 0) {
      await client.query(
        'INSERT INTO wallets (user_id, balance) VALUES ($1, $2)',
        [recipientId, 0]
      );
    }
    
    // Update sender's wallet
    await client.query(
      'UPDATE wallets SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [amount, senderId]
    );
    
    // Update recipient's wallet
    await client.query(
      'UPDATE wallets SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [amount, recipientId]
    );
    
    const transferRef = `TXN-${Date.now()}`;
    
    // Create transaction record for sender
    const senderTransaction = await client.query(
      `INSERT INTO transactions (
        user_id, type, amount, description, payment_method, 
        reference_number, status, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        senderId,
        'debit',
        amount,
        `Transfer to ${recipientName}`,
        'wallet_transfer',
        transferRef,
        'completed',
        JSON.stringify({
          recipient_id: recipientId,
          recipient_email: recipientEmail,
          note: note || ''
        })
      ]
    );
    
    // Create transaction record for recipient
    await client.query(
      `INSERT INTO transactions (
        user_id, type, amount, description, payment_method, 
        reference_number, status, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        recipientId,
        'credit',
        amount,
        `Transfer from ${req.user.full_name}`,
        'wallet_transfer',
        transferRef,
        'completed',
        JSON.stringify({
          sender_id: senderId,
          sender_email: req.user.email,
          note: note || ''
        })
      ]
    );
    
    // Get updated sender wallet
    const updatedSenderWallet = await client.query(
      'SELECT * FROM wallets WHERE user_id = $1',
      [senderId]
    );
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      data: {
        wallet: updatedSenderWallet.rows[0],
        transaction: senderTransaction.rows[0]
      },
      message: `Successfully transferred ৳${amount} to ${recipientName}`
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transfer money error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to transfer money'
    });
  } finally {
    client.release();
  }
});

// Make payment (for marketplace purchases)
router.post('/make-payment', auth, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { sellerId, amount, productId, productType = 'marketplace', paymentMethod = 'wallet' } = req.body;
    const buyerId = req.user.id;
    
    if (!sellerId || !amount || !productId) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Seller ID, amount, and product ID are required'
      });
    }
    
    if (amount <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Invalid amount'
      });
    }
    
    if (buyerId === sellerId) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Cannot make payment to yourself'
      });
    }
    
    // Check buyer's wallet balance
    const buyerWallet = await client.query(
      'SELECT * FROM wallets WHERE user_id = $1',
      [buyerId]
    );
    
    if (buyerWallet.rows.length === 0 || buyerWallet.rows[0].balance < amount) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance'
      });
    }
    
    // Get seller's wallet (create if doesn't exist)
    let sellerWallet = await client.query(
      'SELECT * FROM wallets WHERE user_id = $1',
      [sellerId]
    );
    
    if (sellerWallet.rows.length === 0) {
      await client.query(
        'INSERT INTO wallets (user_id, balance) VALUES ($1, $2)',
        [sellerId, 0]
      );
      sellerWallet = await client.query(
        'SELECT * FROM wallets WHERE user_id = $1',
        [sellerId]
      );
    }
    
    // Calculate platform fee (2% for marketplace transactions)
    const platformFee = productType === 'marketplace' ? amount * 0.02 : 0;
    const sellerAmount = amount - platformFee;
    
    // Update buyer's wallet (deduct money)
    await client.query(
      'UPDATE wallets SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [amount, buyerId]
    );
    
    // Update seller's wallet (add money minus fee)
    await client.query(
      'UPDATE wallets SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [sellerAmount, sellerId]
    );
    
    // Create transaction record for buyer
    const buyerTransaction = await client.query(
      `INSERT INTO transactions (
        user_id, type, amount, description, payment_method, 
        reference_number, status, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        buyerId,
        'debit',
        amount,
        `Payment to user ${sellerId}`,
        paymentMethod,
        `PAY-${Date.now()}`,
        'completed',
        JSON.stringify({
          product_id: productId,
          product_type: productType,
          seller_id: sellerId,
          platform_fee: platformFee
        })
      ]
    );
    
    // Create transaction record for seller
    await client.query(
      `INSERT INTO transactions (
        user_id, type, amount, description, payment_method, 
        reference_number, status, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        sellerId,
        'credit',
        sellerAmount,
        `Payment from user ${buyerId}`,
        'wallet_transfer',
        `REC-${Date.now()}`,
        'completed',
        JSON.stringify({
          product_id: productId,
          product_type: productType,
          buyer_id: buyerId,
          platform_fee: platformFee,
          gross_amount: amount
        })
      ]
    );
    
    // Get updated buyer wallet
    const updatedBuyerWallet = await client.query(
      'SELECT * FROM wallets WHERE user_id = $1',
      [buyerId]
    );
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      data: {
        wallet: updatedBuyerWallet.rows[0],
        transaction: buyerTransaction.rows[0],
        payment_details: {
          amount_paid: amount,
          seller_received: sellerAmount,
          platform_fee: platformFee
        }
      },
      message: 'Payment completed successfully'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Make payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment failed'
    });
  } finally {
    client.release();
  }
});

module.exports = router;
