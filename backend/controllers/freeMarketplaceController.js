const dbConfig = require('../config/db');

class FreeMarketplaceController {
  // Get all free items
  async getAllFreeItems(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        category, 
        search,
        location 
      } = req.query;
      
      const offset = (page - 1) * limit;
      const db = dbConfig.db;
      
      let query = `
        SELECT 
          fmi.*,
          u.full_name as giver_name,
          u.institution as giver_institution,
          c.category_name
        FROM free_marketplace_items fmi
        JOIN users u ON fmi.giver_id = u.user_id
        LEFT JOIN categories c ON fmi.category_id = c.category_id
        WHERE fmi.is_available = true
      `;
      
      const queryParams = [];
      let paramIndex = 1;
      
      if (category) {
        query += ` AND c.category_name = $${paramIndex}`;
        queryParams.push(category);
        paramIndex++;
      }
      
      if (search) {
        query += ` AND (fmi.item_name ILIKE $${paramIndex} OR fmi.description ILIKE $${paramIndex})`;
        queryParams.push(`%${search}%`);
        paramIndex++;
      }
      
      if (location) {
        query += ` AND fmi.pickup_location ILIKE $${paramIndex}`;
        queryParams.push(`%${location}%`);
        paramIndex++;
      }
      
      query += ` ORDER BY fmi.posted_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(parseInt(limit), parseInt(offset));
      
      const result = await db.query(query, queryParams);
      
      res.json({
        success: true,
        data: result.rows
      });
      
    } catch (error) {
      console.error('Get free marketplace items error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch free items'
      });
    }
  }

  // Get single free item
  async getFreeItem(req, res) {
    try {
      const { id } = req.params;
      const db = dbConfig.db;
      
      const query = `
        SELECT 
          fmi.*,
          u.full_name as giver_name,
          u.phone as giver_phone,
          u.institution as giver_institution,
          c.category_name
        FROM free_marketplace_items fmi
        JOIN users u ON fmi.giver_id = u.user_id
        LEFT JOIN categories c ON fmi.category_id = c.category_id
        WHERE fmi.item_id = $1
      `;
      
      const result = await db.query(query, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Free item not found'
        });
      }
      
      res.json({
        success: true,
        data: result.rows[0]
      });
      
    } catch (error) {
      console.error('Get free marketplace item error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch item details'
      });
    }
  }

  // Post new free item
  async createFreeItem(req, res) {
    try {
      const userId = req.user.userId;
      const {
        category_id,
        item_name,
        description,
        condition_note,
        pickup_location,
        contact_info
      } = req.body;
      
      if (!item_name || !pickup_location || !contact_info) {
        return res.status(400).json({
          success: false,
          message: 'Item name, pickup location, and contact info are required'
        });
      }
      
      const db = dbConfig.db;
      
      const query = `
        INSERT INTO free_marketplace_items (
          giver_id, category_id, item_name, description, 
          condition_note, pickup_location, contact_info, posted_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING *
      `;
      
      const values = [
        userId,
        category_id || null,
        item_name.trim(),
        description?.trim() || null,
        condition_note?.trim() || null,
        pickup_location.trim(),
        contact_info.trim()
      ];
      
      const result = await db.query(query, values);
      
      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Free item posted successfully'
      });
      
    } catch (error) {
      console.error('Create free marketplace item error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to post free item'
      });
    }
  }

  // Request a free item
  async requestFreeItem(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const { message } = req.body;
      
      const db = dbConfig.db;
      
      // Check if item exists and is available
      const itemCheck = await db.query(
        'SELECT giver_id FROM free_marketplace_items WHERE item_id = $1 AND is_available = true',
        [id]
      );
      
      if (itemCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Item not found or no longer available'
        });
      }
      
      // Check if user is not the giver
      if (itemCheck.rows[0].giver_id === userId) {
        return res.status(400).json({
          success: false,
          message: 'You cannot request your own item'
        });
      }
      
      // Check if user has already requested this item
      const existingRequest = await db.query(
        'SELECT request_id FROM free_marketplace_requests WHERE item_id = $1 AND requester_id = $2',
        [id, userId]
      );
      
      if (existingRequest.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'You have already requested this item'
        });
      }
      
      // Create request
      const requestQuery = `
        INSERT INTO free_marketplace_requests (
          item_id, requester_id, message, created_at
        ) VALUES ($1, $2, $3, NOW())
        RETURNING *
      `;
      
      const result = await db.query(requestQuery, [id, userId, message || '']);
      
      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Request submitted successfully'
      });
      
    } catch (error) {
      console.error('Request free marketplace item error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit request'
      });
    }
  }

  // Get user's posted free items
  async getMyFreeItems(req, res) {
    try {
      const userId = req.user.userId;
      const db = dbConfig.db;
      
      const query = `
        SELECT 
          fmi.*,
          c.category_name,
          (SELECT COUNT(*) FROM free_marketplace_requests WHERE item_id = fmi.item_id) as request_count
        FROM free_marketplace_items fmi
        LEFT JOIN categories c ON fmi.category_id = c.category_id
        WHERE fmi.giver_id = $1
        ORDER BY fmi.posted_at DESC
      `;
      
      const result = await db.query(query, [userId]);
      
      res.json({
        success: true,
        data: result.rows
      });
      
    } catch (error) {
      console.error('Get my free marketplace items error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch your free items'
      });
    }
  }

  // Get requests for user's free items
  async getMyItemRequests(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const db = dbConfig.db;
      
      // Check if user owns the item
      const ownershipCheck = await db.query(
        'SELECT item_id FROM free_marketplace_items WHERE item_id = $1 AND giver_id = $2',
        [id, userId]
      );
      
      if (ownershipCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'You can only view requests for your own items'
        });
      }
      
      const query = `
        SELECT 
          fmr.*,
          u.full_name as requester_name,
          u.email as requester_email,
          u.phone as requester_phone,
          u.institution as requester_institution
        FROM free_marketplace_requests fmr
        JOIN users u ON fmr.requester_id = u.user_id
        WHERE fmr.item_id = $1
        ORDER BY fmr.created_at DESC
      `;
      
      const result = await db.query(query, [id]);
      
      res.json({
        success: true,
        data: result.rows
      });
      
    } catch (error) {
      console.error('Get free item requests error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch requests'
      });
    }
  }

  // Approve/reject a request for free item
  async manageRequest(req, res) {
    try {
      const { requestId } = req.params;
      const { status } = req.body; // 'approved' or 'rejected'
      const userId = req.user.userId;
      
      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Status must be either approved or rejected'
        });
      }
      
      const db = dbConfig.db;
      
      await db.query('BEGIN');
      
      try {
        // Check if user owns the item
        const requestCheck = await db.query(`
          SELECT fmr.*, fmi.giver_id, fmi.item_name
          FROM free_marketplace_requests fmr
          JOIN free_marketplace_items fmi ON fmr.item_id = fmi.item_id
          WHERE fmr.request_id = $1
        `, [requestId]);
        
        if (requestCheck.rows.length === 0) {
          await db.query('ROLLBACK');
          return res.status(404).json({
            success: false,
            message: 'Request not found'
          });
        }
        
        const request = requestCheck.rows[0];
        
        if (request.giver_id !== userId) {
          await db.query('ROLLBACK');
          return res.status(403).json({
            success: false,
            message: 'You can only manage requests for your own items'
          });
        }
        
        // Update request status
        await db.query(
          'UPDATE free_marketplace_requests SET status = $1 WHERE request_id = $2',
          [status, requestId]
        );
        
        // If approved, mark item as no longer available
        if (status === 'approved') {
          await db.query(
            'UPDATE free_marketplace_items SET is_available = false WHERE item_id = $1',
            [request.item_id]
          );
          
          // Reject all other pending requests for this item
          await db.query(`
            UPDATE free_marketplace_requests 
            SET status = 'rejected' 
            WHERE item_id = $1 AND request_id != $2 AND status = 'pending'
          `, [request.item_id, requestId]);
        }
        
        await db.query('COMMIT');
        
        res.json({
          success: true,
          message: `Request ${status} successfully`
        });
        
      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }
      
    } catch (error) {
      console.error('Manage free item request error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process request'
      });
    }
  }

  // Update free item
  async updateFreeItem(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const updateData = req.body;
      
      const db = dbConfig.db;
      
      // Check ownership
      const ownershipCheck = await db.query(
        'SELECT item_id FROM free_marketplace_items WHERE item_id = $1 AND giver_id = $2',
        [id, userId]
      );
      
      if (ownershipCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own items'
        });
      }
      
      const updateFields = [];
      const values = [];
      let paramIndex = 1;
      
      const allowedFields = [
        'item_name', 'description', 'condition_note', 
        'pickup_location', 'contact_info', 'is_available'
      ];
      
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          updateFields.push(`${field} = $${paramIndex}`);
          values.push(updateData[field]);
          paramIndex++;
        }
      });
      
      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No fields to update'
        });
      }
      
      values.push(id);
      
      const query = `
        UPDATE free_marketplace_items 
        SET ${updateFields.join(', ')}
        WHERE item_id = $${paramIndex}
        RETURNING *
      `;
      
      const result = await db.query(query, values);
      
      res.json({
        success: true,
        data: result.rows[0],
        message: 'Item updated successfully'
      });
      
    } catch (error) {
      console.error('Update free marketplace item error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update item'
      });
    }
  }

  // Delete free item
  async deleteFreeItem(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const db = dbConfig.db;
      
      // Check ownership
      const ownershipCheck = await db.query(
        'SELECT item_id FROM free_marketplace_items WHERE item_id = $1 AND giver_id = $2',
        [id, userId]
      );
      
      if (ownershipCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own items'
        });
      }
      
      await db.query('DELETE FROM free_marketplace_items WHERE item_id = $1', [id]);
      
      res.json({
        success: true,
        message: 'Item deleted successfully'
      });
      
    } catch (error) {
      console.error('Delete free marketplace item error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete item'
      });
    }
  }

  // Get favorites for current user
  async getFavorites(req, res) {
    try {
      const userId = req.user.userId;
      const db = dbConfig.db;
      const result = await db.query(
        `SELECT fmf.item_id
         FROM free_marketplace_favorites fmf
         JOIN free_marketplace_items fmi ON fmf.item_id = fmi.item_id
         WHERE fmf.user_id = $1
         ORDER BY fmf.created_at DESC`,
        [userId]
      );
      res.json({ success: true, data: { favorites: result.rows } });
    } catch (error) {
      console.error('Get favorites error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch favorites' });
    }
  }

  // Add favorite
  async addFavorite(req, res) {
    try {
      const userId = req.user.userId;
      const { item_id } = req.body;
      if (!item_id) return res.status(400).json({ success: false, message: 'item_id required' });
      const db = dbConfig.db;
      await db.query(
        `INSERT INTO free_marketplace_favorites (user_id, item_id) VALUES ($1, $2)
         ON CONFLICT (user_id, item_id) DO NOTHING`,
        [userId, item_id]
      );
      res.status(201).json({ success: true, message: 'Added to favorites' });
    } catch (error) {
      console.error('Add favorite error:', error);
      res.status(500).json({ success: false, message: 'Failed to add favorite' });
    }
  }

  // Remove favorite
  async removeFavorite(req, res) {
    try {
      const userId = req.user.userId;
      const { itemId } = req.params;
      const db = dbConfig.db;
      await db.query(
        'DELETE FROM free_marketplace_favorites WHERE user_id = $1 AND item_id = $2',
        [userId, itemId]
      );
      res.json({ success: true, message: 'Removed from favorites' });
    } catch (error) {
      console.error('Remove favorite error:', error);
      res.status(500).json({ success: false, message: 'Failed to remove favorite' });
    }
  }
}

module.exports = new FreeMarketplaceController();
