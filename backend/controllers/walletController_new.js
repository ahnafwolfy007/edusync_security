const dbConfig = require('../config/db');

class WalletController {
  // Get wallet balance and details
  async getWallet(req, res) {
    try {
      const userId = req.user.userId;
      const db = dbConfig.db;

      let walletResult = await db.query(
        'SELECT * FROM wallets WHERE user_id = $1',
        [userId]
      );

      if (walletResult.rows.length === 0) {
        // Create wallet if it doesn't exist
        await db.query(
          'INSERT INTO wallets (user_id, balance, created_at, updated_at) VALUES ($1, 0.00, NOW(), NOW())',
          [userId]
        );
        walletResult = await db.query(
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
  }

  // Get wallet transactions
  async getTransactions(req, res) {
    try {
      const userId = req.user.userId;
      const { limit = 20, offset = 0 } = req.query;
      const db = dbConfig.db;

      const result = await db.query(
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
  }

  // Add money to wallet with demo payment methods
  async addMoney(req, res) {
    const client = await dbConfig.db.connect();
    
    try {
      await client.query('BEGIN');
      
      const userId = req.user.userId;
      const { amount, paymentMethod = 'demo_bkash', paymentDetails } = req.body;

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
          'INSERT INTO wallets (user_id, balance, created_at, updated_at) VALUES ($1, 0.00, NOW(), NOW())',
          [userId]
        );
        walletResult = await client.query(
          'SELECT * FROM wallets WHERE user_id = $1',
          [userId]
        );
      }

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
        'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2',
        [netAmount, userId]
      );

      // Create transaction record
      const transactionResult = await client.query(
        `INSERT INTO transactions (
          user_id, type, amount, description, payment_method, 
          reference_number, status, metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()) RETURNING *`,
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
  }

  // Withdraw money from wallet
  async withdrawMoney(req, res) {
    const client = await dbConfig.db.connect();
    
    try {
      await client.query('BEGIN');
      
      const userId = req.user.userId;
      const { amount, paymentMethod = 'bank_transfer', paymentDetails } = req.body;

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
        'UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE user_id = $2',
        [amount, userId]
      );

      // Create transaction record
      const transactionResult = await client.query(
        `INSERT INTO transactions (
          user_id, type, amount, description, payment_method, 
          reference_number, status, metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()) RETURNING *`,
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
  }

  // Transfer money to another user
  async transferMoney(req, res) {
    const client = await dbConfig.db.connect();
    
    try {
      await client.query('BEGIN');
      
      const { recipientEmail, amount, note } = req.body;
      const senderId = req.user.userId;

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
          'INSERT INTO wallets (user_id, balance, created_at, updated_at) VALUES ($1, 0.00, NOW(), NOW())',
          [recipientId]
        );
      }

      // Update sender's wallet
      await client.query(
        'UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE user_id = $2',
        [amount, senderId]
      );

      // Update recipient's wallet
      await client.query(
        'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2',
        [amount, recipientId]
      );

      const transferRef = `TXN-${Date.now()}`;

      // Create transaction record for sender
      const senderTransaction = await client.query(
        `INSERT INTO transactions (
          user_id, type, amount, description, payment_method, 
          reference_number, status, metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()) RETURNING *`,
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
          reference_number, status, metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        [
          recipientId,
          'credit',
          amount,
          `Transfer from ${req.user.fullName || 'User'}`,
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
  }

  // Get wallet statistics
  async getWalletStats(req, res) {
    try {
      const userId = req.user.userId;
      const db = dbConfig.db;

      // Get wallet info
      const walletResult = await db.query(
        'SELECT * FROM wallets WHERE user_id = $1',
        [userId]
      );

      if (walletResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }

      const wallet = walletResult.rows[0];

      // Get transaction stats
      const statsResult = await db.query(
        `SELECT 
          COUNT(*) as total_transactions,
          COUNT(CASE WHEN type = 'credit' THEN 1 END) as total_credits,
          COUNT(CASE WHEN type = 'debit' THEN 1 END) as total_debits,
          COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END), 0) as total_credited,
          COALESCE(SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END), 0) as total_debited
         FROM transactions 
         WHERE user_id = $1`,
        [userId]
      );

      const stats = statsResult.rows[0];

      res.json({
        success: true,
        data: {
          wallet,
          stats: {
            balance: wallet.balance,
            total_transactions: parseInt(stats.total_transactions),
            total_credits: parseInt(stats.total_credits),
            total_debits: parseInt(stats.total_debits),
            total_credited: parseFloat(stats.total_credited),
            total_debited: parseFloat(stats.total_debited)
          }
        }
      });

    } catch (error) {
      console.error('Get wallet stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch wallet statistics'
      });
    }
  }

  // Get specific transaction
  async getTransaction(req, res) {
    try {
      const userId = req.user.userId;
      const { transactionId } = req.params;
      const db = dbConfig.db;

      const result = await db.query(
        'SELECT * FROM transactions WHERE id = $1 AND user_id = $2',
        [transactionId, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      res.json({
        success: true,
        data: result.rows[0]
      });

    } catch (error) {
      console.error('Get transaction error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch transaction'
      });
    }
  }
}

module.exports = new WalletController();
