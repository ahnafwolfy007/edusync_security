const dbConfig = require('../config/db');
const authConfig = require('../config/auth');

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
      // Recent activities (limit each source separately then combine)
      const recentActivitiesQuery = `
        WITH ba AS (
          SELECT 'business_application' AS type, business_name AS title, applied_at AS created_at, status
          FROM business_applications
          ORDER BY applied_at DESC
          LIMIT 5
        ), fv AS (
          SELECT 'food_vendor' AS type, shop_name AS title, applied_at AS created_at,
                 CASE WHEN is_verified THEN 'verified' ELSE 'pending' END AS status
          FROM food_vendors
          ORDER BY applied_at DESC
          LIMIT 5
        )
        SELECT * FROM (
          SELECT * FROM ba
          UNION ALL
          SELECT * FROM fv
        ) t
        ORDER BY created_at DESC
        LIMIT 10;`;

      const activitiesResult = await db.query(recentActivitiesQuery);

      const statsRow = result.rows && result.rows[0] ? result.rows[0] : {};
      res.json({
        success: true,
        data: {
          stats: statsRow,
          recent_activities: activitiesResult.rows,
          recentActivities: activitiesResult.rows
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

  // Time-series analytics scaffold (daily aggregates for last 14 days)
  async getTimeSeriesAnalytics(req, res) {
    try {
      const db = dbConfig.db;
      const days = parseInt(req.query.days || '14', 10);
      const limitDays = Math.min(Math.max(days, 1), 30);
      const seriesQuery = `
        WITH days AS (
          SELECT generate_series::date AS day
          FROM generate_series(CURRENT_DATE - INTERVAL '${limitDays - 1} days', CURRENT_DATE, '1 day')
        )
        SELECT d.day,
          COALESCE(u.cnt,0) AS new_users,
          COALESCE(l.cnt,0) AS logins,
          COALESCE(p.cnt,0) AS payments,
          COALESCE(p.total_amount,0) AS payment_amount,
          COALESCE(b.orders,0) AS business_orders,
          COALESCE(f.orders,0) AS food_orders
        FROM days d
        LEFT JOIN (
          SELECT date(created_at) AS day, COUNT(*) cnt FROM users
          WHERE created_at >= CURRENT_DATE - INTERVAL '${limitDays - 1} days'
          GROUP BY 1
        ) u ON u.day = d.day
        LEFT JOIN (
          SELECT date(last_login) AS day, COUNT(*) cnt FROM user_statistics
          WHERE last_login >= CURRENT_DATE - INTERVAL '${limitDays - 1} days'
          GROUP BY 1
        ) l ON l.day = d.day
        LEFT JOIN (
          SELECT date(created_at) AS day, COUNT(*) cnt, SUM(amount) total_amount FROM payments
          WHERE status='success' AND created_at >= CURRENT_DATE - INTERVAL '${limitDays - 1} days'
          GROUP BY 1
        ) p ON p.day = d.day
        LEFT JOIN (
          SELECT date(created_at) AS day, COUNT(*) orders FROM business_orders
          WHERE created_at >= CURRENT_DATE - INTERVAL '${limitDays - 1} days'
          GROUP BY 1
        ) b ON b.day = d.day
        LEFT JOIN (
          SELECT date(order_placed_at) AS day, COUNT(*) orders FROM food_orders
          WHERE order_placed_at >= CURRENT_DATE - INTERVAL '${limitDays - 1} days'
          GROUP BY 1
        ) f ON f.day = d.day
        ORDER BY d.day ASC`;
      const result = await db.query(seriesQuery);
      res.json({ success: true, data: { days: limitDays, series: result.rows } });
    } catch (error) {
      console.error('Get time series analytics error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
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

  // Business revenue time-series (per business_id, last N days)
  async getBusinessRevenueSeries(req, res) {
    try {
      const db = dbConfig.db;
      const businessId = parseInt(req.params.businessId, 10);
      if (!businessId) return res.status(400).json({ success:false, message:'businessId required'});
      const days = Math.min(Math.max(parseInt(req.query.days || '30',10),1),90);
      const q = `WITH days AS (
        SELECT generate_series::date AS day FROM generate_series(CURRENT_DATE - INTERVAL '${days-1} days', CURRENT_DATE, '1 day')
      )
      SELECT d.day,
        COALESCE(r.revenue,0) AS revenue,
        COALESCE(r.orders,0) AS orders
      FROM days d
      LEFT JOIN (
        SELECT date(bo.created_at) day, COUNT(*) orders, SUM(bp.price * boi.quantity) revenue
        FROM business_orders bo
        JOIN business_order_items boi ON bo.order_id = boi.order_id
        JOIN business_products bp ON boi.product_id = bp.product_id
        WHERE bo.business_id = $1 AND bo.status = 'delivered'
          AND bo.created_at >= CURRENT_DATE - INTERVAL '${days-1} days'
        GROUP BY 1
      ) r ON r.day = d.day
      ORDER BY d.day;`;
      const { rows } = await db.query(q, [businessId]);
      res.json({ success:true, data:{ businessId, days, series: rows } });
    } catch (e) {
      console.error('Business revenue series error', e);
      res.status(500).json({ success:false, message:'Failed to fetch business revenue series' });
    }
  }

  // Food vendor revenue/time-series (per vendor_id)
  async getVendorRevenueSeries(req, res) {
    try {
      const db = dbConfig.db;
      const vendorId = parseInt(req.params.vendorId, 10);
      if (!vendorId) return res.status(400).json({ success:false, message:'vendorId required'});
      const days = Math.min(Math.max(parseInt(req.query.days || '30',10),1),90);
      const q = `WITH days AS (
        SELECT generate_series::date AS day FROM generate_series(CURRENT_DATE - INTERVAL '${days-1} days', CURRENT_DATE, '1 day')
      )
      SELECT d.day,
        COALESCE(r.revenue,0) AS revenue,
        COALESCE(r.orders,0) AS orders
      FROM days d
      LEFT JOIN (
        SELECT date(created_at) day, COUNT(*) orders, SUM(total_amount) revenue
        FROM food_orders
        WHERE vendor_id = $1 AND status = 'delivered'
          AND created_at >= CURRENT_DATE - INTERVAL '${days-1} days'
        GROUP BY 1
      ) r ON r.day = d.day
      ORDER BY d.day;`;
      const { rows } = await db.query(q, [vendorId]);
      res.json({ success:true, data:{ vendorId, days, series: rows } });
    } catch (e) {
      console.error('Vendor revenue series error', e);
      res.status(500).json({ success:false, message:'Failed to fetch vendor revenue series' });
    }
  }

  // Server-Sent Events stream for live admin dashboard stats (token via ?token=)
  async streamDashboardStats(req, res) {
    try {
      const token = req.query.token;
      if (!token) return res.status(401).end();
      let decoded;
      try {
        decoded = authConfig.verifyToken(token);
      } catch (e) {
        return res.status(401).end();
      }
  if (decoded.role !== 'admin' && decoded.role !== 'moderator') return res.status(403).end();

      // SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders && res.flushHeaders();

      const db = dbConfig.db;

      const sendStats = async () => {
        try {
          const statsQuery = `
            SELECT 
              (SELECT COUNT(*) FROM users WHERE role_id IN (SELECT role_id FROM roles WHERE role_name IN ('student', 'user'))) as total_users,
              (SELECT COUNT(*) FROM businesses WHERE is_verified = true) as verified_businesses,
              (SELECT COUNT(*) FROM business_applications WHERE status = 'pending') as pending_business_applications,
              (SELECT COUNT(*) FROM food_vendors WHERE is_verified = true) as verified_food_vendors,
              (SELECT COUNT(*) FROM food_vendors WHERE is_verified = false) as pending_food_vendors,
              (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'success' AND created_at >= CURRENT_DATE - INTERVAL '30 days') as monthly_transaction_volume
          `;
          const result = await db.query(statsQuery);
          const payload = { ts: Date.now(), stats: result.rows[0] };
          res.write(`event: stats\n`);
          res.write(`data: ${JSON.stringify(payload)}\n\n`);
        } catch (err) {
          res.write(`event: error\n`);
          res.write(`data: {"message":"failed"}\n\n`);
        }
      };

      // initial
      await sendStats();
      const interval = setInterval(sendStats, 10000);
      req.on('close', () => {
        clearInterval(interval);
      });
    } catch (e) {
      // If headers not sent, send error
      if (!res.headersSent) {
        res.status(500).json({ success:false, message:'Failed to start stats stream'});
      }
    }
  }
}

module.exports = new AdminController();
