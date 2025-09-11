const dbConfig = require('../config/db');

class BusinessController {
  // Apply for business verification
  async applyForBusiness(req, res) {
    try {
      const userId = req.user.userId;
      const { businessName, businessType, licenseInfo } = req.body;

      if (!businessName || !businessType) {
        return res.status(400).json({
          success: false,
          message: 'Business name and type are required'
        });
      }

      const db = dbConfig.db;

      // Check if user already has a pending or approved application
      const existingApplication = await db.query(
        'SELECT * FROM business_applications WHERE user_id = $1 AND status IN ($2, $3)',
        [userId, 'pending', 'approved']
      );

      if (existingApplication.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'You already have a pending or approved business application'
        });
      }

      // Create new application
      const applicationResult = await db.query(
        `INSERT INTO business_applications (user_id, business_name, business_type, license_info, status, applied_at)
         VALUES ($1, $2, $3, $4, 'pending', NOW())
         RETURNING *`,
        [userId, businessName, businessType, licenseInfo]
      );

      res.status(201).json({
        success: true,
        message: 'Business application submitted successfully',
        data: { application: applicationResult.rows[0] }
      });

    } catch (error) {
      console.error('Business application error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get business application status
  async getApplicationStatus(req, res) {
    try {
      const userId = req.user.userId;
      const db = dbConfig.db;

      const applicationResult = await db.query(
        'SELECT * FROM business_applications WHERE user_id = $1 ORDER BY applied_at DESC LIMIT 1',
        [userId]
      );

      if (applicationResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No business application found'
        });
      }

      res.json({
        success: true,
        data: { application: applicationResult.rows[0] }
      });

    } catch (error) {
      console.error('Get application status error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get application history for user
  async getApplicationHistory(req, res) {
    try {
      const userId = req.user.userId;
      const db = dbConfig.db;
      const { rows } = await db.query('SELECT * FROM business_applications WHERE user_id = $1 ORDER BY applied_at DESC LIMIT 20', [userId]);
      res.json({ success:true, data:{ applications: rows } });
    } catch (e) {
      console.error('Get business application history error:', e);
      res.status(500).json({ success:false, message:'Failed to fetch history' });
    }
  }

  // Create business (after approval)
  async createBusiness(req, res) {
    try {
      const userId = req.user.userId;
      const { businessName, businessType, description } = req.body;

      if (!businessName || !businessType) {
        return res.status(400).json({
          success: false,
          message: 'Business name and type are required'
        });
      }

      const db = dbConfig.db;

      // Check if user has approved application
      const applicationResult = await db.query(
        'SELECT * FROM business_applications WHERE user_id = $1 AND status = $2',
        [userId, 'approved']
      );

      if (applicationResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'No approved business application found'
        });
      }

      // Check if business already exists
      const existingBusiness = await db.query(
        'SELECT * FROM businesses WHERE owner_id = $1',
        [userId]
      );

      if (existingBusiness.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Business already exists for this user'
        });
      }

      // Create business
      const businessResult = await db.query(
        `INSERT INTO businesses (owner_id, business_name, business_type, description, is_verified, created_at, updated_at)
         VALUES ($1, $2, $3, $4, true, NOW(), NOW())
         RETURNING *`,
        [userId, businessName, businessType, description]
      );

      res.status(201).json({
        success: true,
        message: 'Business created successfully',
        data: { business: businessResult.rows[0] }
      });

    } catch (error) {
      console.error('Create business error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get user's businesses
  async getUserBusinesses(req, res) {
    try {
      const userId = req.user.userId;
      const db = dbConfig.db;

      const businessesResult = await db.query(
        `SELECT b.*, 
         (SELECT COUNT(*) FROM business_products WHERE business_id = b.business_id) as product_count,
         (SELECT COUNT(*) FROM business_orders WHERE business_id = b.business_id) as order_count
         FROM businesses b
         WHERE b.owner_id = $1
         ORDER BY b.created_at DESC`,
        [userId]
      );

      res.json({
        success: true,
        data: { businesses: businessesResult.rows }
      });

    } catch (error) {
      console.error('Get user businesses error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get business details
  async getBusinessDetails(req, res) {
    try {
      const { businessId } = req.params;
      const db = dbConfig.db;

      const businessResult = await db.query(
        `SELECT b.*, u.full_name as owner_name, u.email as owner_email
         FROM businesses b
         JOIN users u ON b.owner_id = u.user_id
         WHERE b.business_id = $1`,
        [businessId]
      );

      if (businessResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Business not found'
        });
      }

      const business = businessResult.rows[0];

      // Get business products
      const productsResult = await db.query(
        'SELECT * FROM business_products WHERE business_id = $1 AND is_active = true ORDER BY created_at DESC',
        [businessId]
      );

      business.products = productsResult.rows;

      res.json({
        success: true,
        data: { business }
      });

    } catch (error) {
      console.error('Get business details error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Update business
  async updateBusiness(req, res) {
    try {
      const { businessId } = req.params;
      const userId = req.user.userId;
      const { businessName, businessType, description } = req.body;

      const db = dbConfig.db;

      // Check if user owns the business
      const businessResult = await db.query(
        'SELECT * FROM businesses WHERE business_id = $1 AND owner_id = $2',
        [businessId, userId]
      );

      if (businessResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Business not found or you do not have permission to update it'
        });
      }

      // Build update query
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (businessName !== undefined) {
        updates.push(`business_name = $${paramCount++}`);
        values.push(businessName);
      }
      if (businessType !== undefined) {
        updates.push(`business_type = $${paramCount++}`);
        values.push(businessType);
      }
      if (description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        values.push(description);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No fields to update'
        });
      }

      updates.push(`updated_at = NOW()`);
      values.push(businessId);

      const query = `UPDATE businesses SET ${updates.join(', ')} WHERE business_id = $${paramCount} RETURNING *`;

      const result = await db.query(query, values);

      res.json({
        success: true,
        message: 'Business updated successfully',
        data: { business: result.rows[0] }
      });

    } catch (error) {
      console.error('Update business error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Add business product
  async addProduct(req, res) {
    try {
      const { businessId } = req.params;
      const userId = req.user.userId;
      const { productName, description, price, stockQuantity, termsConditions } = req.body;

      if (!productName || !price) {
        return res.status(400).json({
          success: false,
          message: 'Product name and price are required'
        });
      }

      const db = dbConfig.db;

      // Check if user owns the business
      const businessResult = await db.query(
        'SELECT * FROM businesses WHERE business_id = $1 AND owner_id = $2',
        [businessId, userId]
      );

      if (businessResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Business not found or you do not have permission'
        });
      }

      // Add product
      const productResult = await db.query(
        `INSERT INTO business_products (business_id, product_name, description, price, stock_quantity, terms_conditions, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
         RETURNING *`,
        [businessId, productName, description, parseFloat(price), parseInt(stockQuantity) || 0, termsConditions]
      );

      res.status(201).json({
        success: true,
        message: 'Product added successfully',
        data: { product: productResult.rows[0] }
      });

    } catch (error) {
      console.error('Add product error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Update business product
  async updateProduct(req, res) {
    try {
      const { businessId, productId } = req.params;
      const userId = req.user.userId;
      const { productName, description, price, stockQuantity, termsConditions, isActive } = req.body;

      const db = dbConfig.db;

      // Check if user owns the business and product
      const productResult = await db.query(
        `SELECT bp.* FROM business_products bp
         JOIN businesses b ON bp.business_id = b.business_id
         WHERE bp.product_id = $1 AND bp.business_id = $2 AND b.owner_id = $3`,
        [productId, businessId, userId]
      );

      if (productResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Product not found or you do not have permission'
        });
      }

      // Build update query
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (productName !== undefined) {
        updates.push(`product_name = $${paramCount++}`);
        values.push(productName);
      }
      if (description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        values.push(description);
      }
      if (price !== undefined) {
        updates.push(`price = $${paramCount++}`);
        values.push(parseFloat(price));
      }
      if (stockQuantity !== undefined) {
        updates.push(`stock_quantity = $${paramCount++}`);
        values.push(parseInt(stockQuantity));
      }
      if (termsConditions !== undefined) {
        updates.push(`terms_conditions = $${paramCount++}`);
        values.push(termsConditions);
      }
      if (isActive !== undefined) {
        updates.push(`is_active = $${paramCount++}`);
        values.push(isActive);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No fields to update'
        });
      }

      updates.push(`updated_at = NOW()`);
      values.push(productId);

      const query = `UPDATE business_products SET ${updates.join(', ')} WHERE product_id = $${paramCount} RETURNING *`;

      const result = await db.query(query, values);

      res.json({
        success: true,
        message: 'Product updated successfully',
        data: { product: result.rows[0] }
      });

    } catch (error) {
      console.error('Update product error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get business orders
  async getBusinessOrders(req, res) {
    try {
      const { businessId } = req.params;
      const userId = req.user.userId;
      const { status, page = 1, limit = 10 } = req.query;

      const db = dbConfig.db;

      // Check if user owns the business
      const businessResult = await db.query(
        'SELECT * FROM businesses WHERE business_id = $1 AND owner_id = $2',
        [businessId, userId]
      );

      if (businessResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Business not found or you do not have permission'
        });
      }

      // Build query for orders
      let query = `
        SELECT bo.*, u.full_name as customer_name, u.email as customer_email,
        (SELECT json_agg(
          json_build_object(
            'product_name', bp.product_name,
            'quantity', boi.quantity,
            'price', bp.price,
            'total', bp.price * boi.quantity
          )
        ) FROM business_order_items boi
        JOIN business_products bp ON boi.product_id = bp.product_id
        WHERE boi.order_id = bo.order_id) as order_items
        FROM business_orders bo
        JOIN users u ON bo.user_id = u.user_id
        WHERE bo.business_id = $1
      `;

      const queryParams = [businessId];
      let paramCount = 2;

      if (status) {
        query += ` AND bo.status = $${paramCount++}`;
        queryParams.push(status);
      }

      query += ` ORDER BY bo.created_at DESC`;

      // Add pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);
      query += ` LIMIT $${paramCount++} OFFSET $${paramCount}`;
      queryParams.push(parseInt(limit), offset);

      const ordersResult = await db.query(query, queryParams);

      // Get total count for pagination
      let countQuery = 'SELECT COUNT(*) as total FROM business_orders WHERE business_id = $1';
      const countParams = [businessId];
      
      if (status) {
        countQuery += ' AND status = $2';
        countParams.push(status);
      }

      const countResult = await db.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / parseInt(limit));

      res.json({
        success: true,
        data: {
          orders: ordersResult.rows,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalOrders: total,
            hasNextPage: parseInt(page) < totalPages,
            hasPrevPage: parseInt(page) > 1
          }
        }
      });

    } catch (error) {
      console.error('Get business orders error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Update order status
  async updateOrderStatus(req, res) {
    try {
      const { businessId, orderId } = req.params;
      const userId = req.user.userId;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status is required'
        });
      }

      const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status'
        });
      }

      const db = dbConfig.db;

      // Check if user owns the business and order exists
      const orderResult = await db.query(
        `SELECT bo.* FROM business_orders bo
         JOIN businesses b ON bo.business_id = b.business_id
         WHERE bo.order_id = $1 AND bo.business_id = $2 AND b.owner_id = $3`,
        [orderId, businessId, userId]
      );

      if (orderResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Order not found or you do not have permission'
        });
      }

      // Update order status
      const updateResult = await db.query(
        'UPDATE business_orders SET status = $1 WHERE order_id = $2 RETURNING *',
        [status, orderId]
      );

      res.json({
        success: true,
        message: 'Order status updated successfully',
        data: { order: updateResult.rows[0] }
      });

    } catch (error) {
      console.error('Update order status error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get business analytics
  async getBusinessAnalytics(req, res) {
    try {
      const { businessId } = req.params;
      const userId = req.user.userId;
      const db = dbConfig.db;

      // Check if user owns the business
      const businessResult = await db.query(
        'SELECT * FROM businesses WHERE business_id = $1 AND owner_id = $2',
        [businessId, userId]
      );

      if (businessResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Business not found or you do not have permission'
        });
      }

      // Get analytics data
      const analyticsResult = await db.query(
        `SELECT 
          (SELECT COUNT(*) FROM business_orders WHERE business_id = $1) as total_orders,
          (SELECT COUNT(*) FROM business_orders WHERE business_id = $1 AND status = 'delivered') as completed_orders,
          (SELECT COUNT(*) FROM business_orders WHERE business_id = $1 AND status = 'pending') as pending_orders,
          (SELECT COUNT(*) FROM business_products WHERE business_id = $1 AND is_active = true) as active_products,
          (SELECT COALESCE(SUM(bp.price * boi.quantity), 0) 
           FROM business_order_items boi
           JOIN business_products bp ON boi.product_id = bp.product_id
           JOIN business_orders bo ON boi.order_id = bo.order_id
           WHERE bp.business_id = $1 AND bo.status = 'delivered') as total_revenue`,
        [businessId]
      );

      const analytics = analyticsResult.rows[0];

      // Get monthly revenue data for charts
      const monthlyRevenueResult = await db.query(
        `SELECT 
          DATE_TRUNC('month', bo.created_at) as month,
          COALESCE(SUM(bp.price * boi.quantity), 0) as revenue
         FROM business_orders bo
         JOIN business_order_items boi ON bo.order_id = boi.order_id
         JOIN business_products bp ON boi.product_id = bp.product_id
         WHERE bp.business_id = $1 AND bo.status = 'delivered'
         AND bo.created_at >= NOW() - INTERVAL '12 months'
         GROUP BY DATE_TRUNC('month', bo.created_at)
         ORDER BY month`,
        [businessId]
      );

      analytics.monthlyRevenue = monthlyRevenueResult.rows;

      res.json({
        success: true,
        data: { analytics }
      });

    } catch (error) {
      console.error('Get business analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new BusinessController();
