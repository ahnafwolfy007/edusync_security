const dbConfig = require('../config/db');

class FoodVendorController {
  // Apply for food vendor verification
  async applyForFoodVendor(req, res) {
    try {
      const userId = req.user.userId;
      const { 
        restaurantName, 
        cuisine, 
        address, 
        phone, 
        licenseInfo, 
        operatingHours,
        deliveryAreas 
      } = req.body;

      if (!restaurantName || !cuisine || !address || !phone) {
        return res.status(400).json({
          success: false,
          message: 'Restaurant name, cuisine, address, and phone are required'
        });
      }

      const db = dbConfig.db;

      // Check if user already has a pending or approved food vendor application
      const existingApplication = await db.query(
        'SELECT * FROM food_vendor_applications WHERE user_id = $1 AND status IN ($2, $3)',
        [userId, 'pending', 'approved']
      );

      if (existingApplication.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'You already have a pending or approved food vendor application'
        });
      }

      // Create new application
      const applicationResult = await db.query(
        `INSERT INTO food_vendor_applications 
         (user_id, restaurant_name, cuisine, address, phone, license_info, operating_hours, delivery_areas, status, applied_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', NOW())
         RETURNING *`,
        [userId, restaurantName, cuisine, address, phone, licenseInfo, operatingHours, JSON.stringify(deliveryAreas)]
      );

      res.status(201).json({
        success: true,
        message: 'Food vendor application submitted successfully',
        data: { application: applicationResult.rows[0] }
      });

    } catch (error) {
      console.error('Food vendor application error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get food vendor application status
  async getApplicationStatus(req, res) {
    try {
      const userId = req.user.userId;
      const db = dbConfig.db;

      const applicationResult = await db.query(
        'SELECT * FROM food_vendor_applications WHERE user_id = $1 ORDER BY applied_at DESC LIMIT 1',
        [userId]
      );

      if (applicationResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No food vendor application found'
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

  // Get application history
  async getApplicationHistory(req, res) {
    try {
      const userId = req.user.userId;
      const db = dbConfig.db;
      const { rows } = await db.query('SELECT * FROM food_vendor_applications WHERE user_id = $1 ORDER BY applied_at DESC LIMIT 20', [userId]);
      res.json({ success:true, data:{ applications: rows } });
    } catch (error) {
      console.error('Get food vendor application history error:', error);
      res.status(500).json({ success:false, message:'Internal server error'});
    }
  }

  // Create food vendor (after approval)
  async createFoodVendor(req, res) {
    try {
      const userId = req.user.userId;
      const { 
        restaurantName, 
        cuisine, 
        address, 
        phone, 
        description,
        operatingHours,
        deliveryAreas,
        minimumOrder 
      } = req.body;

      if (!restaurantName || !cuisine || !address || !phone) {
        return res.status(400).json({
          success: false,
          message: 'Restaurant name, cuisine, address, and phone are required'
        });
      }

      const db = dbConfig.db;

      // Check if user has approved application
      const applicationResult = await db.query(
        'SELECT * FROM food_vendor_applications WHERE user_id = $1 AND status = $2',
        [userId, 'approved']
      );

      if (applicationResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'No approved food vendor application found'
        });
      }

      // Check if food vendor already exists
      const existingVendor = await db.query(
        'SELECT * FROM food_vendors WHERE owner_id = $1',
        [userId]
      );

      if (existingVendor.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Food vendor already exists for this user'
        });
      }

      // Create food vendor
      const vendorResult = await db.query(
        `INSERT INTO food_vendors 
         (owner_id, restaurant_name, cuisine, address, phone, description, operating_hours, 
          delivery_areas, minimum_order, is_verified, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, true, NOW(), NOW())
         RETURNING *`,
        [userId, restaurantName, cuisine, address, phone, description, operatingHours, 
         JSON.stringify(deliveryAreas), parseFloat(minimumOrder) || 0]
      );

      res.status(201).json({
        success: true,
        message: 'Food vendor created successfully',
        data: { vendor: vendorResult.rows[0] }
      });

    } catch (error) {
      console.error('Create food vendor error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get all food vendors (public)
  async getAllFoodVendors(req, res) {
    try {
      const { cuisine, area, isActive = true, page = 1, limit = 20 } = req.query;
      const db = dbConfig.db;

      let query = `
        SELECT fv.*, 
        (SELECT COUNT(*) FROM food_items WHERE vendor_id = fv.vendor_id AND is_available = true) as item_count,
        (SELECT AVG(rating) FROM food_orders WHERE vendor_id = fv.vendor_id AND rating IS NOT NULL) as avg_rating,
        (SELECT COUNT(*) FROM food_orders WHERE vendor_id = fv.vendor_id) as total_orders
        FROM food_vendors fv
        WHERE fv.is_verified = true
      `;

      const queryParams = [];
      let paramCount = 1;

      if (isActive !== undefined) {
        query += ` AND fv.is_active = $${paramCount++}`;
        queryParams.push(isActive === 'true');
      }

      if (cuisine) {
        query += ` AND LOWER(fv.cuisine) LIKE LOWER($${paramCount++})`;
        queryParams.push(`%${cuisine}%`);
      }

      if (area) {
        query += ` AND fv.delivery_areas::text LIKE $${paramCount++}`;
        queryParams.push(`%${area}%`);
      }

      query += ` ORDER BY fv.created_at DESC`;

      // Add pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);
      query += ` LIMIT $${paramCount++} OFFSET $${paramCount}`;
      queryParams.push(parseInt(limit), offset);

      const vendorsResult = await db.query(query, queryParams);

      // Get total count for pagination
      let countQuery = 'SELECT COUNT(*) as total FROM food_vendors WHERE is_verified = true';
      const countParams = [];
      let countParamIndex = 1;

      if (isActive !== undefined) {
        countQuery += ` AND is_active = $${countParamIndex++}`;
        countParams.push(isActive === 'true');
      }

      if (cuisine) {
        countQuery += ` AND LOWER(cuisine) LIKE LOWER($${countParamIndex++})`;
        countParams.push(`%${cuisine}%`);
      }

      if (area) {
        countQuery += ` AND delivery_areas::text LIKE $${countParamIndex++}`;
        countParams.push(`%${area}%`);
      }

      const countResult = await db.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / parseInt(limit));

      res.json({
        success: true,
        data: {
          vendors: vendorsResult.rows,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalVendors: total,
            hasNextPage: parseInt(page) < totalPages,
            hasPrevPage: parseInt(page) > 1
          }
        }
      });

    } catch (error) {
      console.error('Get all food vendors error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get food vendor details with menu
  async getFoodVendorDetails(req, res) {
    try {
      const { vendorId } = req.params;
      const db = dbConfig.db;

      // Get vendor details
      const vendorResult = await db.query(
        `SELECT fv.*, u.full_name as owner_name, u.email as owner_email,
         (SELECT AVG(rating) FROM food_orders WHERE vendor_id = fv.vendor_id AND rating IS NOT NULL) as avg_rating,
         (SELECT COUNT(*) FROM food_orders WHERE vendor_id = fv.vendor_id) as total_orders
         FROM food_vendors fv
         JOIN users u ON fv.owner_id = u.user_id
         WHERE fv.vendor_id = $1 AND fv.is_verified = true`,
        [vendorId]
      );

      if (vendorResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Food vendor not found'
        });
      }

      const vendor = vendorResult.rows[0];

      // Get menu items grouped by category
      const menuResult = await db.query(
        `SELECT * FROM food_items 
         WHERE vendor_id = $1 AND is_available = true 
         ORDER BY category, item_name`,
        [vendorId]
      );

      // Group items by category
      const menuByCategory = {};
      menuResult.rows.forEach(item => {
        const category = item.category || 'Others';
        if (!menuByCategory[category]) {
          menuByCategory[category] = [];
        }
        menuByCategory[category].push(item);
      });

      vendor.menu = menuByCategory;
      vendor.menuItems = menuResult.rows;

      // Get recent reviews
      const reviewsResult = await db.query(
        `SELECT fo.rating, fo.review, fo.created_at, u.full_name as customer_name
         FROM food_orders fo
         JOIN users u ON fo.user_id = u.user_id
         WHERE fo.vendor_id = $1 AND fo.rating IS NOT NULL
         ORDER BY fo.created_at DESC
         LIMIT 10`,
        [vendorId]
      );

      vendor.recentReviews = reviewsResult.rows;

      res.json({
        success: true,
        data: { vendor }
      });

    } catch (error) {
      console.error('Get food vendor details error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get user's food vendor
  async getMyFoodVendor(req, res) {
    try {
      const userId = req.user.userId;
      const db = dbConfig.db;

      const vendorResult = await db.query(
        `SELECT fv.*, 
         (SELECT COUNT(*) FROM food_items WHERE vendor_id = fv.vendor_id) as total_items,
         (SELECT COUNT(*) FROM food_items WHERE vendor_id = fv.vendor_id AND is_available = true) as available_items,
         (SELECT COUNT(*) FROM food_orders WHERE vendor_id = fv.vendor_id) as total_orders,
         (SELECT COUNT(*) FROM food_orders WHERE vendor_id = fv.vendor_id AND status = 'pending') as pending_orders,
         (SELECT AVG(rating) FROM food_orders WHERE vendor_id = fv.vendor_id AND rating IS NOT NULL) as avg_rating
         FROM food_vendors fv
         WHERE fv.owner_id = $1`,
        [userId]
      );

      if (vendorResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No food vendor found for this user'
        });
      }

      res.json({
        success: true,
        data: { vendor: vendorResult.rows[0] }
      });

    } catch (error) {
      console.error('Get my food vendor error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Update food vendor
  async updateFoodVendor(req, res) {
    try {
      const { vendorId } = req.params;
      const userId = req.user.userId;
      const { 
        restaurantName, 
        cuisine, 
        address, 
        phone, 
        description,
        operatingHours,
        deliveryAreas,
        minimumOrder,
        isActive 
      } = req.body;

      const db = dbConfig.db;

      // Check if user owns the vendor
      const vendorResult = await db.query(
        'SELECT * FROM food_vendors WHERE vendor_id = $1 AND owner_id = $2',
        [vendorId, userId]
      );

      if (vendorResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Food vendor not found or you do not have permission'
        });
      }

      // Build update query
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (restaurantName !== undefined) {
        updates.push(`restaurant_name = $${paramCount++}`);
        values.push(restaurantName);
      }
      if (cuisine !== undefined) {
        updates.push(`cuisine = $${paramCount++}`);
        values.push(cuisine);
      }
      if (address !== undefined) {
        updates.push(`address = $${paramCount++}`);
        values.push(address);
      }
      if (phone !== undefined) {
        updates.push(`phone = $${paramCount++}`);
        values.push(phone);
      }
      if (description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        values.push(description);
      }
      if (operatingHours !== undefined) {
        updates.push(`operating_hours = $${paramCount++}`);
        values.push(operatingHours);
      }
      if (deliveryAreas !== undefined) {
        updates.push(`delivery_areas = $${paramCount++}`);
        values.push(JSON.stringify(deliveryAreas));
      }
      if (minimumOrder !== undefined) {
        updates.push(`minimum_order = $${paramCount++}`);
        values.push(parseFloat(minimumOrder));
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
      values.push(vendorId);

      const query = `UPDATE food_vendors SET ${updates.join(', ')} WHERE vendor_id = $${paramCount} RETURNING *`;

      const result = await db.query(query, values);

      res.json({
        success: true,
        message: 'Food vendor updated successfully',
        data: { vendor: result.rows[0] }
      });

    } catch (error) {
      console.error('Update food vendor error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Add food item to menu
  async addFoodItem(req, res) {
    try {
      const { vendorId } = req.params;
      const userId = req.user.userId;
      const { itemName, description, price, category, isVeg, spiceLevel, preparationTime } = req.body;

      if (!itemName || !price) {
        return res.status(400).json({
          success: false,
          message: 'Item name and price are required'
        });
      }

      const db = dbConfig.db;

      // Check if user owns the vendor
      const vendorResult = await db.query(
        'SELECT * FROM food_vendors WHERE vendor_id = $1 AND owner_id = $2',
        [vendorId, userId]
      );

      if (vendorResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Food vendor not found or you do not have permission'
        });
      }

      // Add food item
      const itemResult = await db.query(
        `INSERT INTO food_items 
         (vendor_id, item_name, description, price, category, is_veg, spice_level, preparation_time, is_available, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW())
         RETURNING *`,
        [vendorId, itemName, description, parseFloat(price), category, isVeg, spiceLevel, parseInt(preparationTime) || 15]
      );

      res.status(201).json({
        success: true,
        message: 'Food item added successfully',
        data: { item: itemResult.rows[0] }
      });

    } catch (error) {
      console.error('Add food item error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get vendor's food items
  async getVendorFoodItems(req, res) {
    try {
      const { vendorId } = req.params;
      const userId = req.user.userId;
      const { category, isAvailable } = req.query;

      const db = dbConfig.db;

      // Check if user owns the vendor
      const vendorResult = await db.query(
        'SELECT * FROM food_vendors WHERE vendor_id = $1 AND owner_id = $2',
        [vendorId, userId]
      );

      if (vendorResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Food vendor not found or you do not have permission'
        });
      }

      let query = 'SELECT * FROM food_items WHERE vendor_id = $1';
      const queryParams = [vendorId];
      let paramCount = 2;

      if (category) {
        query += ` AND category = $${paramCount++}`;
        queryParams.push(category);
      }

      if (isAvailable !== undefined) {
        query += ` AND is_available = $${paramCount++}`;
        queryParams.push(isAvailable === 'true');
      }

      query += ' ORDER BY category, item_name';

      const itemsResult = await db.query(query, queryParams);

      res.json({
        success: true,
        data: { items: itemsResult.rows }
      });

    } catch (error) {
      console.error('Get vendor food items error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Update food item
  async updateFoodItem(req, res) {
    try {
      const { vendorId, itemId } = req.params;
      const userId = req.user.userId;
      const { 
        itemName, 
        description, 
        price, 
        category, 
        isVeg, 
        spiceLevel, 
        preparationTime, 
        isAvailable 
      } = req.body;

      const db = dbConfig.db;

      // Check if user owns the vendor and item
      const itemResult = await db.query(
        `SELECT fi.* FROM food_items fi
         JOIN food_vendors fv ON fi.vendor_id = fv.vendor_id
         WHERE fi.item_id = $1 AND fi.vendor_id = $2 AND fv.owner_id = $3`,
        [itemId, vendorId, userId]
      );

      if (itemResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Food item not found or you do not have permission'
        });
      }

      // Build update query
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (itemName !== undefined) {
        updates.push(`item_name = $${paramCount++}`);
        values.push(itemName);
      }
      if (description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        values.push(description);
      }
      if (price !== undefined) {
        updates.push(`price = $${paramCount++}`);
        values.push(parseFloat(price));
      }
      if (category !== undefined) {
        updates.push(`category = $${paramCount++}`);
        values.push(category);
      }
      if (isVeg !== undefined) {
        updates.push(`is_veg = $${paramCount++}`);
        values.push(isVeg);
      }
      if (spiceLevel !== undefined) {
        updates.push(`spice_level = $${paramCount++}`);
        values.push(spiceLevel);
      }
      if (preparationTime !== undefined) {
        updates.push(`preparation_time = $${paramCount++}`);
        values.push(parseInt(preparationTime));
      }
      if (isAvailable !== undefined) {
        updates.push(`is_available = $${paramCount++}`);
        values.push(isAvailable);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No fields to update'
        });
      }

      updates.push(`updated_at = NOW()`);
      values.push(itemId);

      const query = `UPDATE food_items SET ${updates.join(', ')} WHERE item_id = $${paramCount} RETURNING *`;

      const result = await db.query(query, values);

      res.json({
        success: true,
        message: 'Food item updated successfully',
        data: { item: result.rows[0] }
      });

    } catch (error) {
      console.error('Update food item error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get food orders for vendor
  async getVendorOrders(req, res) {
    try {
      const { vendorId } = req.params;
      const userId = req.user.userId;
      const { status, date, page = 1, limit = 10 } = req.query;

      const db = dbConfig.db;

      // Check if user owns the vendor
      const vendorResult = await db.query(
        'SELECT * FROM food_vendors WHERE vendor_id = $1 AND owner_id = $2',
        [vendorId, userId]
      );

      if (vendorResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Food vendor not found or you do not have permission'
        });
      }

      // Build query for orders
      let query = `
        SELECT fo.*, u.full_name as customer_name, u.phone as customer_phone,
        (SELECT json_agg(
          json_build_object(
            'item_name', fi.item_name,
            'quantity', foi.quantity,
            'price', fi.price,
            'total', fi.price * foi.quantity,
            'special_instructions', foi.special_instructions
          )
        ) FROM food_order_items foi
        JOIN food_items fi ON foi.item_id = fi.item_id
        WHERE foi.order_id = fo.order_id) as order_items
        FROM food_orders fo
        JOIN users u ON fo.user_id = u.user_id
        WHERE fo.vendor_id = $1
      `;

      const queryParams = [vendorId];
      let paramCount = 2;

      if (status) {
        query += ` AND fo.status = $${paramCount++}`;
        queryParams.push(status);
      }

      if (date) {
        query += ` AND DATE(fo.created_at) = $${paramCount++}`;
        queryParams.push(date);
      }

      query += ` ORDER BY fo.created_at DESC`;

      // Add pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);
      query += ` LIMIT $${paramCount++} OFFSET $${paramCount}`;
      queryParams.push(parseInt(limit), offset);

      const ordersResult = await db.query(query, queryParams);

      // Get total count for pagination
      let countQuery = 'SELECT COUNT(*) as total FROM food_orders WHERE vendor_id = $1';
      const countParams = [vendorId];
      
      if (status) {
        countQuery += ' AND status = $2';
        countParams.push(status);
      }

      if (date) {
        countQuery += ` AND DATE(created_at) = $${countParams.length + 1}`;
        countParams.push(date);
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
      console.error('Get vendor orders error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Update food order status
  async updateOrderStatus(req, res) {
    try {
      const { vendorId, orderId } = req.params;
      const userId = req.user.userId;
      const { status, estimatedDeliveryTime } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status is required'
        });
      }

      const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status'
        });
      }

      const db = dbConfig.db;

      // Check if user owns the vendor and order exists
      const orderResult = await db.query(
        `SELECT fo.* FROM food_orders fo
         JOIN food_vendors fv ON fo.vendor_id = fv.vendor_id
         WHERE fo.order_id = $1 AND fo.vendor_id = $2 AND fv.owner_id = $3`,
        [orderId, vendorId, userId]
      );

      if (orderResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Order not found or you do not have permission'
        });
      }

      // Build update fields
      const updates = ['status = $1'];
      const values = [status];
      let paramCount = 2;

      if (estimatedDeliveryTime) {
        updates.push(`estimated_delivery_time = $${paramCount++}`);
        values.push(estimatedDeliveryTime);
      }

      if (status === 'delivered') {
        updates.push(`delivered_at = NOW()`);
      }

      values.push(orderId);

      const query = `UPDATE food_orders SET ${updates.join(', ')} WHERE order_id = $${paramCount} RETURNING *`;

      const updateResult = await db.query(query, values);

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

  // Get vendor analytics
  async getVendorAnalytics(req, res) {
    try {
      const { vendorId } = req.params;
      const userId = req.user.userId;
      const db = dbConfig.db;

      // Check if user owns the vendor
      const vendorResult = await db.query(
        'SELECT * FROM food_vendors WHERE vendor_id = $1 AND owner_id = $2',
        [vendorId, userId]
      );

      if (vendorResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Food vendor not found or you do not have permission'
        });
      }

      // Get analytics data
      const analyticsResult = await db.query(
        `SELECT 
          (SELECT COUNT(*) FROM food_orders WHERE vendor_id = $1) as total_orders,
          (SELECT COUNT(*) FROM food_orders WHERE vendor_id = $1 AND status = 'delivered') as completed_orders,
          (SELECT COUNT(*) FROM food_orders WHERE vendor_id = $1 AND status IN ('pending', 'confirmed', 'preparing')) as active_orders,
          (SELECT COUNT(*) FROM food_items WHERE vendor_id = $1 AND is_available = true) as available_items,
          (SELECT COALESCE(AVG(rating), 0) FROM food_orders WHERE vendor_id = $1 AND rating IS NOT NULL) as avg_rating,
          (SELECT COALESCE(SUM(total_amount), 0) FROM food_orders WHERE vendor_id = $1 AND status = 'delivered') as total_revenue,
          (SELECT COALESCE(SUM(total_amount), 0) FROM food_orders WHERE vendor_id = $1 AND status = 'delivered' AND DATE(created_at) = CURRENT_DATE) as today_revenue`,
        [vendorId]
      );

      const analytics = analyticsResult.rows[0];

      // Get daily revenue for the last 30 days
      const dailyRevenueResult = await db.query(
        `SELECT 
          DATE(created_at) as date,
          COALESCE(SUM(total_amount), 0) as revenue,
          COUNT(*) as orders
         FROM food_orders
         WHERE vendor_id = $1 AND status = 'delivered'
         AND created_at >= CURRENT_DATE - INTERVAL '30 days'
         GROUP BY DATE(created_at)
         ORDER BY date`,
        [vendorId]
      );

      analytics.dailyRevenue = dailyRevenueResult.rows;

      // Get popular items
      const popularItemsResult = await db.query(
        `SELECT fi.item_name, fi.price, SUM(foi.quantity) as total_sold
         FROM food_order_items foi
         JOIN food_items fi ON foi.item_id = fi.item_id
         JOIN food_orders fo ON foi.order_id = fo.order_id
         WHERE fi.vendor_id = $1 AND fo.status = 'delivered'
         GROUP BY fi.item_id, fi.item_name, fi.price
         ORDER BY total_sold DESC
         LIMIT 10`,
        [vendorId]
      );

      analytics.popularItems = popularItemsResult.rows;

      res.json({
        success: true,
        data: { analytics }
      });

    } catch (error) {
      console.error('Get vendor analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new FoodVendorController();
