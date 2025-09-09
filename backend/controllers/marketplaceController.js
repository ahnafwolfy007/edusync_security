const dbConfig = require('../config/db');

class MarketplaceController {
  // Get all marketplace items (public)
  async getAllItems(req, res) {
    try {
      const { category, search, limit = 20, offset = 0 } = req.query;
      const db = dbConfig.db;
      
      let query = `
        SELECT 
          mi.*,
          u.full_name as seller_name,
          u.email as seller_email
        FROM marketplace_items mi
        JOIN users u ON mi.seller_id = u.id
        WHERE mi.status = 'available'
      `;
      
      const queryParams = [];
      let paramIndex = 1;
      
      if (category && category !== 'all') {
        query += ` AND mi.category = $${paramIndex}`;
        queryParams.push(category);
        paramIndex++;
      }
      
      if (search) {
        query += ` AND (mi.title ILIKE $${paramIndex} OR mi.description ILIKE $${paramIndex})`;
        queryParams.push(`%${search}%`);
        paramIndex++;
      }
      
      query += ` ORDER BY mi.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(parseInt(limit), parseInt(offset));
      
      const result = await db.query(query, queryParams);
      
      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Get marketplace items error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch marketplace items'
      });
    }
  }

  // Get single marketplace item (public)
  async getItem(req, res) {
    try {
      const { id } = req.params;
      const db = dbConfig.db;
      
      const query = `
        SELECT 
          mi.*,
          u.full_name as seller_name,
          u.email as seller_email
        FROM marketplace_items mi
        JOIN users u ON mi.seller_id = u.id
        WHERE mi.id = $1
      `;
      
      const result = await db.query(query, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Item not found'
        });
      }
      
      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Get marketplace item error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch item'
      });
    }
  }

  // Get user's marketplace items
  async getMyItems(req, res) {
    try {
      const userId = req.user.userId;
      const db = dbConfig.db;
      
      const query = `
        SELECT * FROM marketplace_items 
        WHERE seller_id = $1 
        ORDER BY created_at DESC
      `;
      
      const result = await db.query(query, [userId]);
      
      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Get user marketplace items error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch your items'
      });
    }
  }

  // Create new marketplace item
  async createItem(req, res) {
    try {
      const userId = req.user.userId;
      const { title, description, price, category, condition, images = [] } = req.body;
      const db = dbConfig.db;
      
      if (!title || !description || !price || !category) {
        return res.status(400).json({
          success: false,
          message: 'Title, description, price, and category are required'
        });
      }
      
      if (price <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Price must be greater than 0'
        });
      }
      
      const query = `
        INSERT INTO marketplace_items (
          seller_id, title, description, price, category, condition, images, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'available', NOW(), NOW())
        RETURNING *
      `;
      
      const values = [
        userId,
        title.trim(),
        description.trim(),
        parseFloat(price),
        category,
        condition || 'good',
        JSON.stringify(images)
      ];
      
      const result = await db.query(query, values);
      
      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Item posted successfully'
      });
    } catch (error) {
      console.error('Post marketplace item error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to post item'
      });
    }
  }

  // Update marketplace item
  async updateItem(req, res) {
    try {
      const userId = req.user.userId;
      const { id } = req.params;
      const { title, description, price, category, condition, images, status } = req.body;
      const db = dbConfig.db;
      
      // Check if user owns the item
      const ownershipCheck = await db.query(
        'SELECT seller_id FROM marketplace_items WHERE id = $1',
        [id]
      );
      
      if (ownershipCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Item not found'
        });
      }
      
      if (ownershipCheck.rows[0].seller_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own items'
        });
      }
      
      const updateFields = [];
      const values = [];
      let paramIndex = 1;
      
      if (title !== undefined) {
        updateFields.push(`title = $${paramIndex}`);
        values.push(title.trim());
        paramIndex++;
      }
      
      if (description !== undefined) {
        updateFields.push(`description = $${paramIndex}`);
        values.push(description.trim());
        paramIndex++;
      }
      
      if (price !== undefined) {
        if (price <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Price must be greater than 0'
          });
        }
        updateFields.push(`price = $${paramIndex}`);
        values.push(parseFloat(price));
        paramIndex++;
      }
      
      if (category !== undefined) {
        updateFields.push(`category = $${paramIndex}`);
        values.push(category);
        paramIndex++;
      }
      
      if (condition !== undefined) {
        updateFields.push(`condition = $${paramIndex}`);
        values.push(condition);
        paramIndex++;
      }
      
      if (images !== undefined) {
        updateFields.push(`images = $${paramIndex}`);
        values.push(JSON.stringify(images));
        paramIndex++;
      }
      
      if (status !== undefined) {
        updateFields.push(`status = $${paramIndex}`);
        values.push(status);
        paramIndex++;
      }
      
      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No fields to update'
        });
      }
      
      updateFields.push(`updated_at = NOW()`);
      values.push(id);
      
      const query = `
        UPDATE marketplace_items 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      
      const result = await db.query(query, values);
      
      res.json({
        success: true,
        data: result.rows[0],
        message: 'Item updated successfully'
      });
    } catch (error) {
      console.error('Update marketplace item error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update item'
      });
    }
  }

  // Delete marketplace item
  async deleteItem(req, res) {
    try {
      const userId = req.user.userId;
      const { id } = req.params;
      const db = dbConfig.db;
      
      // Check if user owns the item
      const ownershipCheck = await db.query(
        'SELECT seller_id FROM marketplace_items WHERE id = $1',
        [id]
      );
      
      if (ownershipCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Item not found'
        });
      }
      
      if (ownershipCheck.rows[0].seller_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own items'
        });
      }
      
      await db.query('DELETE FROM marketplace_items WHERE id = $1', [id]);
      
      res.json({
        success: true,
        message: 'Item deleted successfully'
      });
    } catch (error) {
      console.error('Delete marketplace item error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete item'
      });
    }
  }

  // Purchase marketplace item
  async purchaseItem(req, res) {
    const client = await dbConfig.db.connect();
    
    try {
      await client.query('BEGIN');
      
      const { id } = req.params;
      const buyerId = req.user.userId;
      
      // Get item details
      const itemResult = await client.query(
        'SELECT * FROM marketplace_items WHERE id = $1 AND status = $2',
        [id, 'available']
      );
      
      if (itemResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          message: 'Item not found or no longer available'
        });
      }
      
      const item = itemResult.rows[0];
      
      if (item.seller_id === buyerId) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'You cannot buy your own item'
        });
      }
      
      // Check buyer's wallet balance
      const buyerWallet = await client.query(
        'SELECT * FROM wallets WHERE user_id = $1',
        [buyerId]
      );
      
      if (buyerWallet.rows.length === 0 || buyerWallet.rows[0].balance < item.price) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Insufficient wallet balance'
        });
      }
      
      // Get or create seller's wallet
      let sellerWallet = await client.query(
        'SELECT * FROM wallets WHERE user_id = $1',
        [item.seller_id]
      );
      
      if (sellerWallet.rows.length === 0) {
        await client.query(
          'INSERT INTO wallets (user_id, balance, created_at, updated_at) VALUES ($1, 0.00, NOW(), NOW())',
          [item.seller_id]
        );
        sellerWallet = await client.query(
          'SELECT * FROM wallets WHERE user_id = $1',
          [item.seller_id]
        );
      }
      
      // Calculate marketplace fee (2% of sale price)
      const marketplaceFee = item.price * 0.02;
      const sellerAmount = item.price - marketplaceFee;
      
      // Update buyer's wallet (deduct money)
      await client.query(
        'UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE user_id = $2',
        [item.price, buyerId]
      );
      
      // Update seller's wallet (add money minus fee)
      await client.query(
        'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2',
        [sellerAmount, item.seller_id]
      );
      
      // Mark item as sold
      await client.query(
        'UPDATE marketplace_items SET status = $1, updated_at = NOW() WHERE id = $2',
        ['sold', id]
      );
      
      // Create transaction record for buyer
      await client.query(
        `INSERT INTO transactions (
          user_id, type, amount, description, payment_method, 
          reference_number, status, metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        [
          buyerId,
          'debit',
          item.price,
          `Purchase: ${item.title}`,
          'wallet',
          `MKT-${Date.now()}`,
          'completed',
          JSON.stringify({
            marketplace_item_id: item.id,
            seller_id: item.seller_id,
            item_title: item.title
          })
        ]
      );
      
      // Create transaction record for seller
      await client.query(
        `INSERT INTO transactions (
          user_id, type, amount, description, payment_method, 
          reference_number, status, metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        [
          item.seller_id,
          'credit',
          sellerAmount,
          `Sale: ${item.title}`,
          'marketplace',
          `MKT-SALE-${Date.now()}`,
          'completed',
          JSON.stringify({
            marketplace_item_id: item.id,
            buyer_id: buyerId,
            item_title: item.title,
            marketplace_fee: marketplaceFee
          })
        ]
      );
      
      // Create marketplace transaction record if table exists
      try {
        await client.query(
          `INSERT INTO marketplace_transactions (
            item_id, buyer_id, seller_id, amount, marketplace_fee, status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
          [id, buyerId, item.seller_id, item.price, marketplaceFee, 'completed']
        );
      } catch (err) {
        // Table might not exist, continue without it
        console.log('Marketplace transactions table not found, continuing...');
      }
      
      await client.query('COMMIT');
      
      res.json({
        success: true,
        message: 'Purchase completed successfully',
        data: {
          item_id: item.id,
          item_title: item.title,
          amount_paid: item.price,
          seller_received: sellerAmount,
          marketplace_fee: marketplaceFee
        }
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Purchase marketplace item error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to complete purchase'
      });
    } finally {
      client.release();
    }
  }
}

// Export compatible with both class and function exports
const marketplaceController = new MarketplaceController();

module.exports = {
  getAllMarketplaceItems: marketplaceController.getAllItems.bind(marketplaceController),
  getMarketplaceItemById: marketplaceController.getItem.bind(marketplaceController),
  createMarketplaceItem: marketplaceController.createItem.bind(marketplaceController),
  updateMarketplaceItem: marketplaceController.updateItem.bind(marketplaceController),
  deleteMarketplaceItem: marketplaceController.deleteItem.bind(marketplaceController),
  getUserMarketplaceItems: marketplaceController.getMyItems.bind(marketplaceController),
  searchMarketplaceItems: marketplaceController.getAllItems.bind(marketplaceController),
  purchaseMarketplaceItem: marketplaceController.purchaseItem.bind(marketplaceController)
};
