const dbConfig = require('../config/db');

class WalletController {
  // Get wallet balance and details
  async getWallet(req, res) {
    try {
      const userId = req.user.userId;
      const db = dbConfig.db;

      const walletResult = await db.query(
        'SELECT * FROM wallets WHERE user_id = $1',
        [userId]
      );

      if (walletResult.rows.length === 0) {
        // Create wallet if it doesn't exist
        const newWalletResult = await db.query(
          'INSERT INTO wallets (user_id, balance, created_at, updated_at) VALUES ($1, 0.00, NOW(), NOW()) RETURNING *',
          [userId]
        );
        
        return res.json({
          success: true,
          data: { wallet: newWalletResult.rows[0] }
        });
      }

      const wallet = walletResult.rows[0];

      res.json({
        success: true,
        data: { wallet }
      });

    } catch (error) {
      console.error('Get wallet error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Add money to wallet (simulation)
  async addMoney(req, res) {
    try {
      const userId = req.user.userId;
      const { amount, paymentMethod = 'bank_transfer' } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid amount is required'
        });
      }

      if (amount > 10000) {
        return res.status(400).json({
          success: false,
          message: 'Maximum add money limit is $10,000 per transaction'
        });
      }

      const db = dbConfig.db;

      // Begin transaction
      await db.query('BEGIN');

      try {
        // Update wallet balance
        const walletResult = await db.query(
          'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2 RETURNING *',
          [parseFloat(amount), userId]
        );

        if (walletResult.rows.length === 0) {
          // Create wallet if it doesn't exist
          const newWalletResult = await db.query(
            'INSERT INTO wallets (user_id, balance, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) RETURNING *',
            [userId, parseFloat(amount)]
          );
          
          var wallet = newWalletResult.rows[0];
        } else {
          var wallet = walletResult.rows[0];
        }

        // Record transaction
        await db.query(
          `INSERT INTO transactions (wallet_id, amount, transaction_type, status, description, created_at)
           VALUES ($1, $2, 'credit', 'completed', $3, NOW())`,
          [wallet.wallet_id, parseFloat(amount), `Money added via ${paymentMethod}`]
        );

        await db.query('COMMIT');

        res.json({
          success: true,
          message: 'Money added successfully',
          data: { 
            wallet,
            transaction: {
              amount: parseFloat(amount),
              type: 'credit',
              description: `Money added via ${paymentMethod}`,
              timestamp: new Date().toISOString()
            }
          }
        });

      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }

    } catch (error) {
      console.error('Add money error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Withdraw money from wallet (simulation)
  async withdrawMoney(req, res) {
    try {
      const userId = req.user.userId;
      const { amount, bankAccount, withdrawalMethod = 'bank_transfer' } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid amount is required'
        });
      }

      if (!bankAccount) {
        return res.status(400).json({
          success: false,
          message: 'Bank account information is required'
        });
      }

      const db = dbConfig.db;

      // Begin transaction
      await db.query('BEGIN');

      try {
        // Check wallet balance
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

        if (wallet.balance < amount) {
          return res.status(400).json({
            success: false,
            message: 'Insufficient wallet balance'
          });
        }

        // Update wallet balance
        const updatedWalletResult = await db.query(
          'UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE user_id = $2 RETURNING *',
          [parseFloat(amount), userId]
        );

        // Record transaction
        await db.query(
          `INSERT INTO transactions (wallet_id, amount, transaction_type, status, description, created_at)
           VALUES ($1, $2, 'debit', 'completed', $3, NOW())`,
          [wallet.wallet_id, parseFloat(amount), `Money withdrawn to ${bankAccount} via ${withdrawalMethod}`]
        );

        await db.query('COMMIT');

        res.json({
          success: true,
          message: 'Withdrawal request processed successfully',
          data: { 
            wallet: updatedWalletResult.rows[0],
            withdrawal: {
              amount: parseFloat(amount),
              bankAccount: bankAccount.replace(/\d(?=\d{4})/g, '*'), // Mask account number
              method: withdrawalMethod,
              status: 'processing',
              estimatedTime: '1-3 business days'
            }
          }
        });

      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }

    } catch (error) {
      console.error('Withdraw money error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get transaction history
  async getTransactions(req, res) {
    try {
      const userId = req.user.userId;
      const { 
        type, // 'credit', 'debit', or 'all'
        page = 1, 
        limit = 20,
        startDate,
        endDate
      } = req.query;

      const db = dbConfig.db;

      // Get wallet ID
      const walletResult = await db.query(
        'SELECT wallet_id FROM wallets WHERE user_id = $1',
        [userId]
      );

      if (walletResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }

      const walletId = walletResult.rows[0].wallet_id;

      // Build query
      let query = 'SELECT * FROM transactions WHERE wallet_id = $1';
      const queryParams = [walletId];
      let paramCount = 2;

      // Add type filter
      if (type && type !== 'all') {
        query += ` AND transaction_type = $${paramCount}`;
        queryParams.push(type);
        paramCount++;
      }

      // Add date filters
      if (startDate) {
        query += ` AND created_at >= $${paramCount}`;
        queryParams.push(startDate);
        paramCount++;
      }

      if (endDate) {
        query += ` AND created_at <= $${paramCount}`;
        queryParams.push(endDate);
        paramCount++;
      }

      query += ' ORDER BY created_at DESC';

      // Add pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);
      query += ` LIMIT $${paramCount++} OFFSET $${paramCount}`;
      queryParams.push(parseInt(limit), offset);

      const transactionsResult = await db.query(query, queryParams);

      // Get total count
      let countQuery = 'SELECT COUNT(*) as total FROM transactions WHERE wallet_id = $1';
      const countParams = [walletId];
      let countParamCount = 2;

      if (type && type !== 'all') {
        countQuery += ` AND transaction_type = $${countParamCount}`;
        countParams.push(type);
        countParamCount++;
      }

      if (startDate) {
        countQuery += ` AND created_at >= $${countParamCount}`;
        countParams.push(startDate);
        countParamCount++;
      }

      if (endDate) {
        countQuery += ` AND created_at <= $${countParamCount}`;
        countParams.push(endDate);
        countParamCount++;
      }

      const countResult = await db.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / parseInt(limit));

      res.json({
        success: true,
        data: {
          transactions: transactionsResult.rows,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalTransactions: total,
            hasNextPage: parseInt(page) < totalPages,
            hasPrevPage: parseInt(page) > 1
          }
        }
      });

    } catch (error) {
      console.error('Get transactions error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get wallet statistics
  async getWalletStats(req, res) {
    try {
      const userId = req.user.userId;
      const db = dbConfig.db;

      // Get wallet ID
      const walletResult = await db.query(
        'SELECT wallet_id, balance FROM wallets WHERE user_id = $1',
        [userId]
      );

      if (walletResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found'
        });
      }

      const { wallet_id: walletId, balance } = walletResult.rows[0];

      // Get statistics
      const statsResult = await db.query(
        `SELECT 
          (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE wallet_id = $1 AND transaction_type = 'credit') as total_credits,
          (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE wallet_id = $1 AND transaction_type = 'debit') as total_debits,
          (SELECT COUNT(*) FROM transactions WHERE wallet_id = $1) as total_transactions,
          (SELECT COUNT(*) FROM transactions WHERE wallet_id = $1 AND transaction_type = 'credit') as credit_count,
          (SELECT COUNT(*) FROM transactions WHERE wallet_id = $1 AND transaction_type = 'debit') as debit_count`,
        [walletId]
      );

      const stats = {
        currentBalance: parseFloat(balance),
        ...statsResult.rows[0],
        totalCredits: parseFloat(statsResult.rows[0].total_credits),
        totalDebits: parseFloat(statsResult.rows[0].total_debits),
        totalTransactions: parseInt(statsResult.rows[0].total_transactions),
        creditCount: parseInt(statsResult.rows[0].credit_count),
        debitCount: parseInt(statsResult.rows[0].debit_count)
      };

      // Get monthly transaction summary for the last 12 months
      const monthlyStatsResult = await db.query(
        `SELECT 
          DATE_TRUNC('month', created_at) as month,
          transaction_type,
          COALESCE(SUM(amount), 0) as total_amount,
          COUNT(*) as transaction_count
         FROM transactions 
         WHERE wallet_id = $1 AND created_at >= NOW() - INTERVAL '12 months'
         GROUP BY DATE_TRUNC('month', created_at), transaction_type
         ORDER BY month DESC`,
        [walletId]
      );

      stats.monthlyBreakdown = monthlyStatsResult.rows;

      res.json({
        success: true,
        data: { stats }
      });

    } catch (error) {
      console.error('Get wallet stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Transfer money to another user
  async transferMoney(req, res) {
    try {
      const senderId = req.user.userId;
      const { recipientEmail, amount, description = '' } = req.body;

      if (!recipientEmail || !amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Recipient email and valid amount are required'
        });
      }

      if (amount > 5000) {
        return res.status(400).json({
          success: false,
          message: 'Maximum transfer limit is $5,000 per transaction'
        });
      }

      const db = dbConfig.db;

      // Begin transaction
      await db.query('BEGIN');

      try {
        // Find recipient user
        const recipientResult = await db.query(
          'SELECT user_id, full_name FROM users WHERE email = $1',
          [recipientEmail.toLowerCase()]
        );

        if (recipientResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Recipient user not found'
          });
        }

        const recipient = recipientResult.rows[0];

        if (recipient.user_id === senderId) {
          return res.status(400).json({
            success: false,
            message: 'Cannot transfer money to yourself'
          });
        }

        // Check sender wallet balance
        const senderWalletResult = await db.query(
          'SELECT * FROM wallets WHERE user_id = $1',
          [senderId]
        );

        if (senderWalletResult.rows.length === 0 || senderWalletResult.rows[0].balance < amount) {
          return res.status(400).json({
            success: false,
            message: 'Insufficient wallet balance'
          });
        }

        const senderWallet = senderWalletResult.rows[0];

        // Get or create recipient wallet
        let recipientWalletResult = await db.query(
          'SELECT * FROM wallets WHERE user_id = $1',
          [recipient.user_id]
        );

        if (recipientWalletResult.rows.length === 0) {
          recipientWalletResult = await db.query(
            'INSERT INTO wallets (user_id, balance, created_at, updated_at) VALUES ($1, 0.00, NOW(), NOW()) RETURNING *',
            [recipient.user_id]
          );
        }

        const recipientWallet = recipientWalletResult.rows[0];

        // Update sender wallet
        await db.query(
          'UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE user_id = $2',
          [parseFloat(amount), senderId]
        );

        // Update recipient wallet
        await db.query(
          'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2',
          [parseFloat(amount), recipient.user_id]
        );

        // Record sender transaction
        await db.query(
          `INSERT INTO transactions (wallet_id, amount, transaction_type, status, description, created_at)
           VALUES ($1, $2, 'debit', 'completed', $3, NOW())`,
          [senderWallet.wallet_id, parseFloat(amount), `Transfer to ${recipient.full_name}: ${description}`]
        );

        // Record recipient transaction
        await db.query(
          `INSERT INTO transactions (wallet_id, amount, transaction_type, status, description, created_at)
           VALUES ($1, $2, 'credit', 'completed', $3, NOW())`,
          [recipientWallet.wallet_id, parseFloat(amount), `Transfer from ${req.user.email}: ${description}`]
        );

        await db.query('COMMIT');

        res.json({
          success: true,
          message: 'Money transferred successfully',
          data: {
            transfer: {
              amount: parseFloat(amount),
              recipient: {
                name: recipient.full_name,
                email: recipientEmail
              },
              description,
              timestamp: new Date().toISOString()
            }
          }
        });

      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }

    } catch (error) {
      console.error('Transfer money error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get transaction by ID
  async getTransaction(req, res) {
    try {
      const userId = req.user.userId;
      const { transactionId } = req.params;

      const db = dbConfig.db;

      const transactionResult = await db.query(
        `SELECT t.* FROM transactions t
         JOIN wallets w ON t.wallet_id = w.wallet_id
         WHERE t.transaction_id = $1 AND w.user_id = $2`,
        [transactionId, userId]
      );

      if (transactionResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      res.json({
        success: true,
        data: { transaction: transactionResult.rows[0] }
      });

    } catch (error) {
      console.error('Get transaction error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new WalletController();
