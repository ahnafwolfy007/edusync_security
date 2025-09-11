const dbConfig = require('../config/db');

class BusinessMarketplaceController {
  // Get all business shops (Foodpanda-style)
  async getAllBusinessShops(req, res) {
    try {
      const { 
        businessType, 
        search, 
  sortBy = 'created_at',
  sortOrder = 'DESC',
  page = 1, 
  limit = 20,
  isVerified 
      } = req.query;

      const db = dbConfig.getDB();

      let query = `
        SELECT b.*, u.full_name as owner_name,
        (SELECT COUNT(*) FROM business_products WHERE business_id = b.business_id AND is_active = true) as product_count,
        (SELECT COUNT(*) FROM business_orders WHERE business_id = b.business_id) as order_count,
        (SELECT AVG(rating) FROM business_orders WHERE business_id = b.business_id AND rating IS NOT NULL) as avg_rating,
        (SELECT COUNT(*) FROM business_orders WHERE business_id = b.business_id AND rating IS NOT NULL) as review_count
        FROM businesses b
        JOIN users u ON b.owner_id = u.user_id
        WHERE 1=1
      `;

      const queryParams = [];
      let paramCount = 1;

      // Only apply verification filter if client provided explicit param
      if (typeof isVerified !== 'undefined' && isVerified !== 'all') {
        query += ` AND b.is_verified = $${paramCount++}`;
        queryParams.push(isVerified === 'true');
      }

      if (businessType) {
        query += ` AND LOWER(b.business_type) LIKE LOWER($${paramCount++})`;
        queryParams.push(`%${businessType}%`);
      }

      if (search) {
        query += ` AND (LOWER(b.business_name) LIKE LOWER($${paramCount++}) OR LOWER(b.description) LIKE LOWER($${paramCount++}))`;
        queryParams.push(`%${search}%`, `%${search}%`);
      }

      // Add sorting
      const validSortFields = ['created_at', 'business_name', 'product_count', 'order_count', 'avg_rating'];
      const validSortOrders = ['ASC', 'DESC'];
      
      if (validSortFields.includes(sortBy) && validSortOrders.includes(sortOrder.toUpperCase())) {
        if (sortBy === 'product_count' || sortBy === 'order_count' || sortBy === 'avg_rating') {
          query += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()} NULLS LAST`;
        } else {
          query += ` ORDER BY b.${sortBy} ${sortOrder.toUpperCase()}`;
        }
      } else {
        query += ` ORDER BY b.created_at DESC`;
      }

      // Add pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);
      query += ` LIMIT $${paramCount++} OFFSET $${paramCount}`;
      queryParams.push(parseInt(limit), offset);

      const businessesResult = await db.query(query, queryParams);

      // Get total count for pagination
      let countQuery = 'SELECT COUNT(*) as total FROM businesses b WHERE 1=1';
      const countParams = [];
      let countParamIndex = 1;

      if (typeof isVerified !== 'undefined' && isVerified !== 'all') {
        countQuery += ` AND b.is_verified = $${countParamIndex++}`;
        countParams.push(isVerified === 'true');
      }

      if (businessType) {
        countQuery += ` AND LOWER(b.business_type) LIKE LOWER($${countParamIndex++})`;
        countParams.push(`%${businessType}%`);
      }

      if (search) {
        countQuery += ` AND (LOWER(b.business_name) LIKE LOWER($${countParamIndex++}) OR LOWER(b.description) LIKE LOWER($${countParamIndex++}))`;
        countParams.push(`%${search}%`, `%${search}%`);
      }

      const countResult = await db.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / parseInt(limit));

      res.json({
        success: true,
        data: {
          businesses: businessesResult.rows,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalBusinesses: total,
            hasNextPage: parseInt(page) < totalPages,
            hasPrevPage: parseInt(page) > 1
          }
        }
      });

    } catch (error) {
      console.error('Get all business shops error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get business shop details with products
  async getBusinessShopDetails(req, res) {
    try {
      const { businessId } = req.params;
      const { category, minPrice, maxPrice, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;
      const db = dbConfig.getDB();

      // Get business details
      const showAll = req.query.showAll === 'true';
      const businessResult = await db.query(
        `SELECT b.*, u.full_name as owner_name, u.email as owner_email, u.phone as owner_phone,
         (SELECT COUNT(*) FROM business_products WHERE business_id = b.business_id AND is_active = true) as product_count,
         (SELECT COUNT(*) FROM business_orders WHERE business_id = b.business_id) as order_count,
         (SELECT AVG(rating) FROM business_orders WHERE business_id = b.business_id AND rating IS NOT NULL) as avg_rating,
         (SELECT COUNT(*) FROM business_orders WHERE business_id = b.business_id AND rating IS NOT NULL) as review_count
         FROM businesses b
         JOIN users u ON b.owner_id = u.user_id
         WHERE b.business_id = $1 ${showAll ? '' : 'AND b.is_verified = true'}`,
        [businessId]
      );

      if (businessResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Business not found'
        });
      }

      const business = businessResult.rows[0];

      // Get business products with filters
      let productQuery = `
        SELECT bp.*, 
        (SELECT COUNT(*) FROM business_order_items boi 
         JOIN business_orders bo ON boi.order_id = bo.order_id 
         WHERE boi.product_id = bp.product_id AND bo.status = 'delivered') as sales_count
        FROM business_products bp
        WHERE bp.business_id = $1 AND bp.is_active = true
      `;

      const productParams = [businessId];
      let productParamCount = 2;

      if (category) {
        productQuery += ` AND bp.category = $${productParamCount++}`;
        productParams.push(category);
      }

      if (minPrice) {
        productQuery += ` AND bp.price >= $${productParamCount++}`;
        productParams.push(parseFloat(minPrice));
      }

      if (maxPrice) {
        productQuery += ` AND bp.price <= $${productParamCount++}`;
        productParams.push(parseFloat(maxPrice));
      }

      // Add sorting for products
      const validSortFields = ['created_at', 'product_name', 'price', 'sales_count'];
      const validSortOrders = ['ASC', 'DESC'];
      
      if (validSortFields.includes(sortBy) && validSortOrders.includes(sortOrder.toUpperCase())) {
        if (sortBy === 'sales_count') {
          productQuery += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()} NULLS LAST`;
        } else {
          productQuery += ` ORDER BY bp.${sortBy} ${sortOrder.toUpperCase()}`;
        }
      } else {
        productQuery += ` ORDER BY bp.created_at DESC`;
      }

      const productsResult = await db.query(productQuery, productParams);

      // Group products by category
      const productsByCategory = {};
      productsResult.rows.forEach(product => {
        const category = product.category || 'Others';
        if (!productsByCategory[category]) {
          productsByCategory[category] = [];
        }
        productsByCategory[category].push(product);
      });

      business.products = productsResult.rows;
      business.productsByCategory = productsByCategory;

      // Get recent reviews
      const reviewsResult = await db.query(
        `SELECT bo.rating, bo.review, bo.created_at, u.full_name as customer_name,
         (SELECT json_agg(
           json_build_object(
             'product_name', bp.product_name,
             'quantity', boi.quantity
           )
         ) FROM business_order_items boi
         JOIN business_products bp ON boi.product_id = bp.product_id
         WHERE boi.order_id = bo.order_id) as ordered_items
         FROM business_orders bo
         JOIN users u ON bo.user_id = u.user_id
         WHERE bo.business_id = $1 AND bo.rating IS NOT NULL
         ORDER BY bo.created_at DESC
         LIMIT 10`,
        [businessId]
      );

      business.recentReviews = reviewsResult.rows;

      // Get available categories
      const categoriesResult = await db.query(
        `SELECT DISTINCT category, COUNT(*) as product_count
         FROM business_products
         WHERE business_id = $1 AND is_active = true AND category IS NOT NULL
         GROUP BY category
         ORDER BY category`,
        [businessId]
      );

      business.categories = categoriesResult.rows;

      res.json({
        success: true,
        data: { business }
      });

    } catch (error) {
      console.error('Get business shop details error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get business types/categories
  async getBusinessTypes(req, res) {
    try {
      const db = dbConfig.getDB();

      const typesResult = await db.query(
        `SELECT business_type, COUNT(*) as business_count,
         AVG((SELECT COUNT(*) FROM business_products WHERE business_id = b.business_id AND is_active = true)) as avg_products
         FROM businesses b
         WHERE is_verified = true
         GROUP BY business_type
         ORDER BY business_count DESC`
      );

      res.json({
        success: true,
        data: { businessTypes: typesResult.rows }
      });

    } catch (error) {
      console.error('Get business types error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Place business order
  async placeBusinesOrder(req, res) {
    try {
      const userId = req.user.userId;
      const { 
        businessId, 
        items, 
        deliveryAddress, 
        paymentMethod, 
        specialInstructions 
      } = req.body;

      if (!businessId || !items || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Business ID and items are required'
        });
      }

      const db = dbConfig.getDB();

      // Start transaction
      await db.query('BEGIN');

      try {
        // Verify business exists and is verified
        const businessResult = await db.query(
          'SELECT * FROM businesses WHERE business_id = $1 AND is_verified = true',
          [businessId]
        );

        if (businessResult.rows.length === 0) {
          throw new Error('Business not found or not verified');
        }

        // Verify all products exist and are active
        const productIds = items.map(item => item.productId);
        const productsResult = await db.query(
          'SELECT * FROM business_products WHERE product_id = ANY($1) AND business_id = $2 AND is_active = true',
          [productIds, businessId]
        );

        if (productsResult.rows.length !== productIds.length) {
          throw new Error('Some products are not available');
        }

        // Calculate total amount and check stock
        let totalAmount = 0;
        const orderItems = [];

        for (const orderItem of items) {
          const dbProduct = productsResult.rows.find(product => product.product_id === orderItem.productId);
          if (!dbProduct) {
            throw new Error(`Product ${orderItem.productId} not found`);
          }

          // Check stock if stock tracking is enabled
          if (dbProduct.stock_quantity !== null && dbProduct.stock_quantity < orderItem.quantity) {
            throw new Error(`Insufficient stock for ${dbProduct.product_name}. Available: ${dbProduct.stock_quantity}`);
          }

          const itemTotal = dbProduct.price * orderItem.quantity;
          totalAmount += itemTotal;

          orderItems.push({
            productId: orderItem.productId,
            quantity: orderItem.quantity,
            price: dbProduct.price,
            termsAccepted: orderItem.termsAccepted || false
          });
        }

        // Create the order
        const orderResult = await db.query(
          `INSERT INTO business_orders 
           (user_id, business_id, total_amount, delivery_address, payment_method, special_instructions, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())
           RETURNING *`,
          [userId, businessId, totalAmount, deliveryAddress, paymentMethod, specialInstructions]
        );

        const order = orderResult.rows[0];

        // Add order items and update stock
        for (const item of orderItems) {
          await db.query(
            `INSERT INTO business_order_items (order_id, product_id, quantity, price, terms_accepted)
             VALUES ($1, $2, $3, $4, $5)`,
            [order.order_id, item.productId, item.quantity, item.price, item.termsAccepted]
          );

          // Update stock if tracking is enabled
          const product = productsResult.rows.find(p => p.product_id === item.productId);
          if (product.stock_quantity !== null) {
            await db.query(
              'UPDATE business_products SET stock_quantity = stock_quantity - $1 WHERE product_id = $2',
              [item.quantity, item.productId]
            );
          }
        }

        // Handle payment processing
        if (paymentMethod !== 'cash_on_delivery') {
          // For demo purposes, mark as paid
          await db.query(
            'UPDATE business_orders SET payment_status = $1 WHERE order_id = $2',
            ['paid', order.order_id]
          );
        }

        await db.query('COMMIT');

        // Get complete order details for response
        const completeOrderResult = await db.query(
          `SELECT bo.*, b.business_name, b.business_type,
           (SELECT json_agg(
             json_build_object(
               'product_name', bp.product_name,
               'quantity', boi.quantity,
               'price', boi.price,
               'total', boi.price * boi.quantity,
               'terms_accepted', boi.terms_accepted
             )
           ) FROM business_order_items boi
           JOIN business_products bp ON boi.product_id = bp.product_id
           WHERE boi.order_id = bo.order_id) as order_items
           FROM business_orders bo
           JOIN businesses b ON bo.business_id = b.business_id
           WHERE bo.order_id = $1`,
          [order.order_id]
        );

        res.status(201).json({
          success: true,
          message: 'Business order placed successfully',
          data: { order: completeOrderResult.rows[0] }
        });

      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }

    } catch (error) {
      console.error('Place business order error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to place order'
      });
    }
  }

  // Get user's business orders
  async getUserBusinessOrders(req, res) {
    try {
      const userId = req.user.userId;
      const { status, businessId, page = 1, limit = 10 } = req.query;
      const db = dbConfig.getDB();

      let query = `
        SELECT bo.*, b.business_name, b.business_type,
        (SELECT json_agg(
          json_build_object(
            'product_name', bp.product_name,
            'quantity', boi.quantity,
            'price', boi.price,
            'total', boi.price * boi.quantity
          )
        ) FROM business_order_items boi
        JOIN business_products bp ON boi.product_id = bp.product_id
        WHERE boi.order_id = bo.order_id) as order_items
        FROM business_orders bo
        JOIN businesses b ON bo.business_id = b.business_id
        WHERE bo.user_id = $1
      `;

      const queryParams = [userId];
      let paramCount = 2;

      if (status) {
        query += ` AND bo.status = $${paramCount++}`;
        queryParams.push(status);
      }

      if (businessId) {
        query += ` AND bo.business_id = $${paramCount++}`;
        queryParams.push(businessId);
      }

      query += ` ORDER BY bo.created_at DESC`;

      // Add pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);
      query += ` LIMIT $${paramCount++} OFFSET $${paramCount}`;
      queryParams.push(parseInt(limit), offset);

      const ordersResult = await db.query(query, queryParams);

      // Get total count for pagination
      let countQuery = 'SELECT COUNT(*) as total FROM business_orders WHERE user_id = $1';
      const countParams = [userId];
      
      if (status) {
        countQuery += ' AND status = $2';
        countParams.push(status);
      }

      if (businessId) {
        countQuery += ` AND business_id = $${countParams.length + 1}`;
        countParams.push(businessId);
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
      console.error('Get user business orders error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Rate and review business order
  async rateBusinessOrder(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user.userId;
      const { rating, review } = req.body;

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be between 1 and 5'
        });
      }

      const db = dbConfig.getDB();

      // Check if order exists, belongs to user, and is delivered
      const orderResult = await db.query(
        'SELECT * FROM business_orders WHERE order_id = $1 AND user_id = $2 AND status = $3',
        [orderId, userId, 'delivered']
      );

      if (orderResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Order not found or not eligible for rating'
        });
      }

      // Check if already rated
      if (orderResult.rows[0].rating) {
        return res.status(400).json({
          success: false,
          message: 'Order has already been rated'
        });
      }

      // Update order with rating and review
      const updateResult = await db.query(
        'UPDATE business_orders SET rating = $1, review = $2, reviewed_at = NOW() WHERE order_id = $3 RETURNING *',
        [rating, review, orderId]
      );

      res.json({
        success: true,
        message: 'Rating submitted successfully',
        data: { order: updateResult.rows[0] }
      });

    } catch (error) {
      console.error('Rate business order error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Search products across all businesses
  async searchProducts(req, res) {
    try {
      const { 
        query: searchQuery, 
        businessType, 
        minPrice, 
        maxPrice,
        category,
        sortBy = 'relevance',
        page = 1, 
        limit = 20 
      } = req.query;

      if (!searchQuery) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const db = dbConfig.getDB();

      let query = `
        SELECT bp.*, b.business_name, b.business_type,
        (SELECT COUNT(*) FROM business_order_items boi 
         JOIN business_orders bo ON boi.order_id = bo.order_id 
         WHERE boi.product_id = bp.product_id AND bo.status = 'delivered') as sales_count,
        ts_rank(to_tsvector('english', bp.product_name || ' ' || bp.description), plainto_tsquery('english', $1)) as relevance
        FROM business_products bp
        JOIN businesses b ON bp.business_id = b.business_id
        WHERE bp.is_active = true AND b.is_verified = true
        AND (to_tsvector('english', bp.product_name || ' ' || bp.description) @@ plainto_tsquery('english', $1)
             OR LOWER(bp.product_name) LIKE LOWER($2)
             OR LOWER(bp.description) LIKE LOWER($2))
      `;

      const queryParams = [searchQuery, `%${searchQuery}%`];
      let paramCount = 3;

      if (businessType) {
        query += ` AND LOWER(b.business_type) = LOWER($${paramCount++})`;
        queryParams.push(businessType);
      }

      if (category) {
        query += ` AND bp.category = $${paramCount++}`;
        queryParams.push(category);
      }

      if (minPrice) {
        query += ` AND bp.price >= $${paramCount++}`;
        queryParams.push(parseFloat(minPrice));
      }

      if (maxPrice) {
        query += ` AND bp.price <= $${paramCount++}`;
        queryParams.push(parseFloat(maxPrice));
      }

      // Add sorting
      if (sortBy === 'price_low') {
        query += ` ORDER BY bp.price ASC`;
      } else if (sortBy === 'price_high') {
        query += ` ORDER BY bp.price DESC`;
      } else if (sortBy === 'popularity') {
        query += ` ORDER BY sales_count DESC NULLS LAST`;
      } else if (sortBy === 'newest') {
        query += ` ORDER BY bp.created_at DESC`;
      } else {
        query += ` ORDER BY relevance DESC, sales_count DESC NULLS LAST`;
      }

      // Add pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);
      query += ` LIMIT $${paramCount++} OFFSET $${paramCount}`;
      queryParams.push(parseInt(limit), offset);

      const productsResult = await db.query(query, queryParams);

      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(*) as total
        FROM business_products bp
        JOIN businesses b ON bp.business_id = b.business_id
        WHERE bp.is_active = true AND b.is_verified = true
        AND (to_tsvector('english', bp.product_name || ' ' || bp.description) @@ plainto_tsquery('english', $1)
             OR LOWER(bp.product_name) LIKE LOWER($2)
             OR LOWER(bp.description) LIKE LOWER($2))
      `;

      const countParams = [searchQuery, `%${searchQuery}%`];
      let countParamIndex = 3;

      if (businessType) {
        countQuery += ` AND LOWER(b.business_type) = LOWER($${countParamIndex++})`;
        countParams.push(businessType);
      }

      if (category) {
        countQuery += ` AND bp.category = $${countParamIndex++}`;
        countParams.push(category);
      }

      if (minPrice) {
        countQuery += ` AND bp.price >= $${countParamIndex++}`;
        countParams.push(parseFloat(minPrice));
      }

      if (maxPrice) {
        countQuery += ` AND bp.price <= $${countParamIndex++}`;
        countParams.push(parseFloat(maxPrice));
      }

      const countResult = await db.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / parseInt(limit));

      res.json({
        success: true,
        data: {
          products: productsResult.rows,
          searchQuery,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalProducts: total,
            hasNextPage: parseInt(page) < totalPages,
            hasPrevPage: parseInt(page) > 1
          }
        }
      });

    } catch (error) {
      console.error('Search products error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get trending/featured businesses
  async getTrendingBusinesses(req, res) {
    try {
      const { limit = 10 } = req.query;
      const db = dbConfig.getDB();

      const businessesResult = await db.query(
        `SELECT b.*, u.full_name as owner_name,
         (SELECT COUNT(*) FROM business_products WHERE business_id = b.business_id AND is_active = true) as product_count,
         (SELECT COUNT(*) FROM business_orders WHERE business_id = b.business_id AND created_at >= NOW() - INTERVAL '30 days') as recent_orders,
         (SELECT AVG(rating) FROM business_orders WHERE business_id = b.business_id AND rating IS NOT NULL) as avg_rating,
         (SELECT COUNT(*) FROM business_orders WHERE business_id = b.business_id AND rating IS NOT NULL) as review_count
         FROM businesses b
         JOIN users u ON b.owner_id = u.user_id
         WHERE b.is_verified = true
         ORDER BY recent_orders DESC, avg_rating DESC NULLS LAST, review_count DESC
         LIMIT $1`,
        [parseInt(limit)]
      );

      res.json({
        success: true,
        data: { businesses: businessesResult.rows }
      });

    } catch (error) {
      console.error('Get trending businesses error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new BusinessMarketplaceController();
