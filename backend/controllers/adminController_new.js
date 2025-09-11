const dbConfig = require('../config/db');

class AdminController {
  // Get admin dashboard statistics
  async getDashboardStats(req, res) {
    try {
      const db = dbConfig.db;
      
      const statsQuery = `
        SELECT 
          (SELECT COUNT(*) FROM users WHERE role_id IN (SELECT role_id FROM roles WHERE role_name IN ('student', 'user'))) as total_users,
          (SELECT COUNT(*) FROM businesses WHERE is_verified = true) as verified_businesses,
          (SELECT COUNT(*) FROM business_applications WHERE status = 'pending') as pending_business_applications,
          (SELECT COUNT(*) FROM food_vendors WHERE is_verified = true) as verified_food_vendors,
          (SELECT COUNT(*) FROM food_vendors WHERE is_verified = false) as pending_food_vendors,
          (SELECT COUNT(*) FROM secondhand_items WHERE is_active = true) as active_secondhand_items,
          (SELECT COUNT(*) FROM rental_products WHERE is_active = true) as active_rental_products,
          (SELECT COUNT(*) FROM accommodation_properties WHERE is_available = true) as available_accommodations,
          (SELECT COUNT(*) FROM free_marketplace_items WHERE is_available = true) as available_free_items,
          (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'success' AND created_at >= CURRENT_DATE - INTERVAL '30 days') as monthly_transaction_volume,
          (SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as new_users_this_week
      `;
      
      const result = await db.query(statsQuery);
      
      // Get recent activities
      const recentActivitiesQuery = `
        SELECT 'business_application' as type, business_name as title, applied_at as created_at, status
        FROM business_applications 
        ORDER BY applied_at DESC LIMIT 5
        UNION ALL
        SELECT 'food_vendor' as type, shop_name as title, applied_at as created_at, 
               CASE WHEN is_verified THEN 'verified' ELSE 'pending' END as status
        FROM food_vendors 
        ORDER BY applied_at DESC LIMIT 5
        ORDER BY created_at DESC
      `;
      
      const activitiesResult = await db.query(recentActivitiesQuery);
      
      res.json({
        success: true,
        data: {
          stats: result.rows[0],
          recent_activities: activitiesResult.rows
        }
      });
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboard statistics'
      });
    }
  }

  // Get pending business applications
  async getPendingBusinessApplications(req, res) {
    try {
      const db = dbConfig.db;
      
      const query = `
        SELECT 
          ba.*,
          u.full_name,
          u.email,
          u.phone,
          u.institution
        FROM business_applications ba
        JOIN users u ON ba.user_id = u.user_id
        WHERE ba.status = 'pending'
        ORDER BY ba.applied_at DESC
      `;
      
      const result = await db.query(query);
      
      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Get pending business applications error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch pending applications'
      });
    }
  }

  // Verify business application
  async verifyBusinessApplication(req, res) {
    try {
      const { applicationId } = req.params;
      const { status, comments } = req.body; // 'approved' or 'rejected'
      const adminId = req.user.userId;
      
      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Status must be either approved or rejected'
        });
      }
      
      const db = dbConfig.db;
      
      await db.query('BEGIN');
      
      try {
        // Update application status
        const updateResult = await db.query(
          `UPDATE business_applications 
           SET status = $1, reviewed_at = NOW(), review_comments = $2
           WHERE application_id = $3
           RETURNING *`,
          [status, comments, applicationId]
        );
        
        if (updateResult.rows.length === 0) {
          await db.query('ROLLBACK');
          return res.status(404).json({
            success: false,
            message: 'Application not found'
          });
        }
        
        const application = updateResult.rows[0];
        
        // If approved, create business and update user role
        if (status === 'approved') {
          // Create business
          await db.query(
            `INSERT INTO businesses (owner_id, business_name, business_type, is_verified)
             VALUES ($1, $2, $3, true)`,
            [application.user_id, application.business_name, application.business_type]
          );
          
          // Update user role to business_owner
          const roleResult = await db.query(
            'SELECT role_id FROM roles WHERE role_name = $1',
            ['business_owner']
          );
          
          if (roleResult.rows.length > 0) {
            await db.query(
              'UPDATE users SET role_id = $1 WHERE user_id = $2',
              [roleResult.rows[0].role_id, application.user_id]
            );
          }
        }
        
        // Log admin action
        await db.query(
          `INSERT INTO admin_logs (admin_id, action, target_type, target_id, description)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            adminId,
            `business_application_${status}`,
            'business_application',
            applicationId,
            `${status === 'approved' ? 'Approved' : 'Rejected'} business application: ${application.business_name}`
          ]
        );
        
        await db.query('COMMIT');
        
        res.json({
          success: true,
          message: `Business application ${status} successfully`,
          data: application
        });
        
      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }
      
    } catch (error) {
      console.error('Verify business application error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process application'
      });
    }
  }

  // Get pending food vendor applications
  async getPendingFoodVendors(req, res) {
    try {
      const db = dbConfig.db;
      
      const query = `
        SELECT 
          fv.*,
          u.full_name,
          u.email,
          u.phone,
          u.institution
        FROM food_vendors fv
        JOIN users u ON fv.user_id = u.user_id
        WHERE fv.is_verified = false
        ORDER BY fv.applied_at DESC
      `;
      
      const result = await db.query(query);
      
      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Get pending food vendors error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch pending food vendors'
      });
    }
  }

  // Verify food vendor
  async verifyFoodVendor(req, res) {
    try {
      const { vendorId } = req.params;
      const { approved, comments } = req.body;
      const adminId = req.user.userId;
      
      const db = dbConfig.db;
      
      await db.query('BEGIN');
      
      try {
        if (approved) {
          // Approve vendor
          const updateResult = await db.query(
            `UPDATE food_vendors 
             SET is_verified = true, verified_at = NOW()
             WHERE vendor_id = $1
             RETURNING *`,
            [vendorId]
          );
          
          if (updateResult.rows.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({
              success: false,
              message: 'Food vendor not found'
            });
          }
          
          const vendor = updateResult.rows[0];
          
          // Update user role to food_vendor
          const roleResult = await db.query(
            'SELECT role_id FROM roles WHERE role_name = $1',
            ['food_vendor']
          );
          
          if (roleResult.rows.length > 0) {
            await db.query(
              'UPDATE users SET role_id = $1 WHERE user_id = $2',
              [roleResult.rows[0].role_id, vendor.user_id]
            );
          }
          
          await db.query(
            `INSERT INTO admin_logs (admin_id, action, target_type, target_id, description)
             VALUES ($1, $2, $3, $4, $5)`,
            [adminId, 'food_vendor_approved', 'food_vendor', vendorId, `Approved food vendor: ${vendor.shop_name}`]
          );
          
        } else {
          // Reject vendor - delete the application
          await db.query('DELETE FROM food_vendors WHERE vendor_id = $1', [vendorId]);
          
          await db.query(
            `INSERT INTO admin_logs (admin_id, action, target_type, target_id, description)
             VALUES ($1, $2, $3, $4, $5)`,
            [adminId, 'food_vendor_rejected', 'food_vendor', vendorId, `Rejected food vendor application: ${comments || 'No reason provided'}`]
          );
        }
        
        await db.query('COMMIT');
        
        res.json({
          success: true,
          message: `Food vendor ${approved ? 'approved' : 'rejected'} successfully`
        });
        
      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }
      
    } catch (error) {
      console.error('Verify food vendor error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process food vendor application'
      });
    }
  }

  // Get all users with pagination
  async getAllUsers(req, res) {
    try {
      const { page = 1, limit = 20, role, search } = req.query;
      const offset = (page - 1) * limit;
      const db = dbConfig.db;
      
      let query = `
        SELECT 
          u.user_id,
          u.full_name,
          u.email,
          u.phone,
          u.institution,
          u.location,
          u.created_at,
          r.role_name,
          us.login_count,
          us.last_login,
          us.total_purchases,
          us.total_sales
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.role_id
        LEFT JOIN user_statistics us ON u.user_id = us.user_id
        WHERE 1=1
      `;
      
      const queryParams = [];
      let paramIndex = 1;
      
      if (role) {
        query += ` AND r.role_name = $${paramIndex}`;
        queryParams.push(role);
        paramIndex++;
      }
      
      if (search) {
        query += ` AND (u.full_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
        queryParams.push(`%${search}%`);
        paramIndex++;
      }
      
      query += ` ORDER BY u.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(parseInt(limit), parseInt(offset));
      
      const result = await db.query(query, queryParams);
      
      // Get total count
      let countQuery = `
        SELECT COUNT(*) 
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.role_id
        WHERE 1=1
      `;
      
      const countParams = [];
      let countParamIndex = 1;
      
      if (role) {
        countQuery += ` AND r.role_name = $${countParamIndex}`;
        countParams.push(role);
        countParamIndex++;
      }
      
      if (search) {
        countQuery += ` AND (u.full_name ILIKE $${countParamIndex} OR u.email ILIKE $${countParamIndex})`;
        countParams.push(`%${search}%`);
      }
      
      const countResult = await db.query(countQuery, countParams);
      const totalUsers = parseInt(countResult.rows[0].count);
      
      res.json({
        success: true,
        data: {
          users: result.rows,
          pagination: {
            current_page: parseInt(page),
            total_pages: Math.ceil(totalUsers / limit),
            total_users: totalUsers,
            per_page: parseInt(limit)
          }
        }
      });
      
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch users'
      });
    }
  }

  // Create or update notice
  async manageNotice(req, res) {
    try {
      const { title, content, category, is_pinned = false } = req.body;
      const adminId = req.user.userId;
      const { noticeId } = req.params;
      
      if (!title || !content) {
        return res.status(400).json({
          success: false,
          message: 'Title and content are required'
        });
      }
      
      const db = dbConfig.db;
      
      let result;
      let action;
      
      if (noticeId) {
        // Update existing notice
        result = await db.query(
          `UPDATE notices 
           SET title = $1, content = $2, category = $3, is_pinned = $4
           WHERE notice_id = $5
           RETURNING *`,
          [title, content, category, is_pinned, noticeId]
        );
        action = 'updated';
      } else {
        // Create new notice
        result = await db.query(
          `INSERT INTO notices (posted_by, title, content, category, is_pinned)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [adminId, title, content, category, is_pinned]
        );
        action = 'created';
      }
      
      // Log admin action
      await db.query(
        `INSERT INTO admin_logs (admin_id, action, target_type, target_id, description)
         VALUES ($1, $2, $3, $4, $5)`,
        [adminId, `notice_${action}`, 'notice', result.rows[0].notice_id, `${action} notice: ${title}`]
      );
      
      res.json({
        success: true,
        message: `Notice ${action} successfully`,
        data: result.rows[0]
      });
      
    } catch (error) {
      console.error('Manage notice error:', error);
      res.status(500).json({
        success: false,
        message: `Failed to ${noticeId ? 'update' : 'create'} notice`
      });
    }
  }

  // Legacy compatibility methods
  async getUserById(req, res) {
    try {
      const { id } = req.params;
      const db = dbConfig.db;
      
      const query = `
        SELECT 
          u.*,
          r.role_name,
          us.login_count,
          us.last_login,
          us.total_purchases,
          us.total_sales
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.role_id
        LEFT JOIN user_statistics us ON u.user_id = us.user_id
        WHERE u.user_id = $1
      `;
      
      const result = await db.query(query, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      res.json({
        success: true,
        data: result.rows[0]
      });
      
    } catch (error) {
      console.error('Get user by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user'
      });
    }
  }

  async getSystemStats(req, res) {
    return this.getDashboardStats(req, res);
  }

  async getAllBusinesses(req, res) {
    try {
      const db = dbConfig.db;
      
      const query = `
        SELECT 
          b.*,
          u.full_name as owner_name,
          u.email as owner_email,
          (SELECT COUNT(*) FROM business_products WHERE business_id = b.business_id) as product_count
        FROM businesses b
        JOIN users u ON b.owner_id = u.user_id
        ORDER BY b.created_at DESC
      `;
      
      const result = await db.query(query);
      
      res.json({
        success: true,
        data: result.rows
      });
      
    } catch (error) {
      console.error('Get all businesses error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch businesses'
      });
    }
  }

  async getAllPayments(req, res) {
    try {
      const db = dbConfig.db;
      
      const query = `
        SELECT 
          p.*,
          u1.full_name as buyer_name,
          u2.full_name as seller_name
        FROM payments p
        JOIN users u1 ON p.buyer_id = u1.user_id
        JOIN users u2 ON p.seller_id = u2.user_id
        ORDER BY p.created_at DESC
        LIMIT 100
      `;
      
      const result = await db.query(query);
      
      res.json({
        success: true,
        data: result.rows
      });
      
    } catch (error) {
      console.error('Get all payments error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch payments'
      });
    }
  }

  async getAllTransactions(req, res) {
    try {
      const db = dbConfig.db;
      
      const query = `
        SELECT 
          t.*,
          u.full_name as user_name
        FROM transactions t
        JOIN wallets w ON t.wallet_id = w.wallet_id
        JOIN users u ON w.user_id = u.user_id
        ORDER BY t.created_at DESC
        LIMIT 100
      `;
      
      const result = await db.query(query);
      
      res.json({
        success: true,
        data: result.rows
      });
      
    } catch (error) {
      console.error('Get all transactions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch transactions'
      });
    }
  }

  // Placeholder methods for compatibility
  async updateUser(req, res) {
    res.status(501).json({ success: false, message: 'Not implemented yet' });
  }

  async deleteUser(req, res) {
    res.status(501).json({ success: false, message: 'Not implemented yet' });
  }

  async approveBusiness(req, res) {
    res.status(501).json({ success: false, message: 'Use verifyBusinessApplication instead' });
  }

  async rejectBusiness(req, res) {
    res.status(501).json({ success: false, message: 'Use verifyBusinessApplication instead' });
  }

  async generateReport(req, res) {
    res.status(501).json({ success: false, message: 'Not implemented yet' });
  }
}

module.exports = new AdminController();
