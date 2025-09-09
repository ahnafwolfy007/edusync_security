const dbConfig = require('../config/db');

class ProductsController {
  // Get all businesses (marketplace view)
  async getAllBusinesses(req, res) {
    try {
      const { 
        search, 
        businessType, 
        page = 1, 
        limit = 12,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = req.query;

      const db = dbConfig.db;
      let query = `
        SELECT b.*, u.full_name as owner_name,
        (SELECT COUNT(*) FROM business_products WHERE business_id = b.business_id AND is_active = true) as product_count,
        (SELECT COUNT(*) FROM business_orders WHERE business_id = b.business_id) as order_count
        FROM businesses b
        JOIN users u ON b.owner_id = u.user_id
        WHERE b.is_verified = true
      `;

      const queryParams = [];
      let paramCount = 1;

      // Add search filter
      if (search) {
        query += ` AND (b.business_name ILIKE $${paramCount} OR b.description ILIKE $${paramCount})`;
        queryParams.push(`%${search}%`);
        paramCount++;
      }

      // Add business type filter
      if (businessType) {
        query += ` AND b.business_type = $${paramCount}`;
        queryParams.push(businessType);
        paramCount++;
      }

      // Add sorting
      const validSortFields = ['business_name', 'created_at', 'product_count', 'order_count'];
      const validSortOrders = ['asc', 'desc'];

      if (validSortFields.includes(sortBy) && validSortOrders.includes(sortOrder)) {
        query += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
      } else {
        query += ` ORDER BY b.created_at DESC`;
      }

      // Add pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);
      query += ` LIMIT $${paramCount++} OFFSET $${paramCount}`;
      queryParams.push(parseInt(limit), offset);

      const businessesResult = await db.query(query, queryParams);

      // Get total count for pagination
      let countQuery = 'SELECT COUNT(*) as total FROM businesses b WHERE b.is_verified = true';
      const countParams = [];
      let countParamCount = 1;

      if (search) {
        countQuery += ` AND (b.business_name ILIKE $${countParamCount} OR b.description ILIKE $${countParamCount})`;
        countParams.push(`%${search}%`);
        countParamCount++;
      }

      if (businessType) {
        countQuery += ` AND b.business_type = $${countParamCount}`;
        countParams.push(businessType);
        countParamCount++;
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
      console.error('Get all businesses error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get business details with products
  async getBusinessDetails(req, res) {
    try {
      const { businessId } = req.params;
      const { 
        productSearch, 
        page = 1, 
        limit = 20,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = req.query;

      const db = dbConfig.db;

      // Get business details
      const businessResult = await db.query(
        `SELECT b.*, u.full_name as owner_name, u.phone as owner_phone,
         (SELECT COUNT(*) FROM business_orders WHERE business_id = b.business_id) as total_orders
         FROM businesses b
         JOIN users u ON b.owner_id = u.user_id
         WHERE b.business_id = $1 AND b.is_verified = true`,
        [businessId]
      );

      if (businessResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Business not found'
        });
      }

      const business = businessResult.rows[0];

      // Get business products with pagination and search
      let productQuery = `
        SELECT * FROM business_products 
        WHERE business_id = $1 AND is_active = true
      `;

      const productParams = [businessId];
      let paramCount = 2;

      if (productSearch) {
        productQuery += ` AND (product_name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
        productParams.push(`%${productSearch}%`);
        paramCount++;
      }

      // Add sorting
      const validSortFields = ['product_name', 'price', 'created_at', 'stock_quantity'];
      const validSortOrders = ['asc', 'desc'];

      if (validSortFields.includes(sortBy) && validSortOrders.includes(sortOrder)) {
        productQuery += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
      } else {
        productQuery += ` ORDER BY created_at DESC`;
      }

      // Add pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);
      productQuery += ` LIMIT $${paramCount++} OFFSET $${paramCount}`;
      productParams.push(parseInt(limit), offset);

      const productsResult = await db.query(productQuery, productParams);

      // Get total product count
      let countQuery = 'SELECT COUNT(*) as total FROM business_products WHERE business_id = $1 AND is_active = true';
      const countParams = [businessId];

      if (productSearch) {
        countQuery += ' AND (product_name ILIKE $2 OR description ILIKE $2)';
        countParams.push(`%${productSearch}%`);
      }

      const countResult = await db.query(countQuery, countParams);
      const totalProducts = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(totalProducts / parseInt(limit));

      business.products = productsResult.rows;
      business.productPagination = {
        currentPage: parseInt(page),
        totalPages,
        totalProducts,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      };

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

  // Get product details
  async getProductDetails(req, res) {
    try {
      const { productId } = req.params;
      const db = dbConfig.db;

      const productResult = await db.query(
        `SELECT bp.*, b.business_name, b.business_type, u.full_name as owner_name
         FROM business_products bp
         JOIN businesses b ON bp.business_id = b.business_id
         JOIN users u ON b.owner_id = u.user_id
         WHERE bp.product_id = $1 AND bp.is_active = true AND b.is_verified = true`,
        [productId]
      );

      if (productResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      const product = productResult.rows[0];

      res.json({
        success: true,
        data: { product }
      });

    } catch (error) {
      console.error('Get product details error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Create business order
  async createOrder(req, res) {
    try {
      const userId = req.user.userId;
      const { businessId, items, paymentMethod = 'wallet' } = req.body;

      if (!businessId || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Business ID and items are required'
        });
      }

      const db = dbConfig.db;

      // Begin transaction
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

        // Verify all products exist and calculate total
        let totalAmount = 0;
        const orderItems = [];

        for (const item of items) {
          const productResult = await db.query(
            'SELECT * FROM business_products WHERE product_id = $1 AND business_id = $2 AND is_active = true',
            [item.productId, businessId]
          );

          if (productResult.rows.length === 0) {
            throw new Error(`Product with ID ${item.productId} not found`);
          }

          const product = productResult.rows[0];
          const quantity = parseInt(item.quantity) || 1;

          if (product.stock_quantity < quantity) {
            throw new Error(`Insufficient stock for product: ${product.product_name}`);
          }

          const itemTotal = product.price * quantity;
          totalAmount += itemTotal;

          orderItems.push({
            productId: product.product_id,
            quantity,
            price: product.price,
            total: itemTotal
          });
        }

        // Check user wallet balance if paying with wallet
        if (paymentMethod === 'wallet') {
          const walletResult = await db.query(
            'SELECT balance FROM wallets WHERE user_id = $1',
            [userId]
          );

          if (walletResult.rows.length === 0 || walletResult.rows[0].balance < totalAmount) {
            throw new Error('Insufficient wallet balance');
          }
        }

        // Create order
        const orderResult = await db.query(
          `INSERT INTO business_orders (user_id, business_id, order_date, payment_method, status, created_at)
           VALUES ($1, $2, NOW(), $3, 'pending', NOW())
           RETURNING *`,
          [userId, businessId, paymentMethod]
        );

        const order = orderResult.rows[0];

        // Create order items
        for (const item of orderItems) {
          await db.query(
            'INSERT INTO business_order_items (order_id, product_id, quantity) VALUES ($1, $2, $3)',
            [order.order_id, item.productId, item.quantity]
          );

          // Update product stock
          await db.query(
            'UPDATE business_products SET stock_quantity = stock_quantity - $1 WHERE product_id = $2',
            [item.quantity, item.productId]
          );
        }

        // Process payment if using wallet
        if (paymentMethod === 'wallet') {
          // Deduct from user wallet
          await db.query(
            'UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE user_id = $2',
            [totalAmount, userId]
          );

          // Add to business owner wallet
          const businessOwnerResult = await db.query(
            'SELECT owner_id FROM businesses WHERE business_id = $1',
            [businessId]
          );

          const ownerId = businessOwnerResult.rows[0].owner_id;

          await db.query(
            'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2',
            [totalAmount * 0.95, ownerId] // 95% after 5% platform fee
          );

          // Record transactions
          const userWalletResult = await db.query(
            'SELECT wallet_id FROM wallets WHERE user_id = $1',
            [userId]
          );

          const ownerWalletResult = await db.query(
            'SELECT wallet_id FROM wallets WHERE user_id = $1',
            [ownerId]
          );

          // User payment transaction
          await db.query(
            `INSERT INTO transactions (wallet_id, amount, transaction_type, status, description, created_at)
             VALUES ($1, $2, 'debit', 'completed', $3, NOW())`,
            [userWalletResult.rows[0].wallet_id, totalAmount, `Order payment - Business: ${businessResult.rows[0].business_name}`]
          );

          // Business owner earning transaction
          await db.query(
            `INSERT INTO transactions (wallet_id, amount, transaction_type, status, description, created_at)
             VALUES ($1, $2, 'credit', 'completed', $3, NOW())`,
            [ownerWalletResult.rows[0].wallet_id, totalAmount * 0.95, `Order earning - Order ID: ${order.order_id}`]
          );
        }

        await db.query('COMMIT');

        // Get complete order details
        const completeOrderResult = await db.query(
          `SELECT bo.*, b.business_name,
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
           JOIN businesses b ON bo.business_id = b.business_id
           WHERE bo.order_id = $1`,
          [order.order_id]
        );

        res.status(201).json({
          success: true,
          message: 'Order created successfully',
          data: { 
            order: completeOrderResult.rows[0],
            totalAmount
          }
        });

      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }

    } catch (error) {
      console.error('Create order error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  // Get business types
  async getBusinessTypes(req, res) {
    try {
      const db = dbConfig.db;

      const typesResult = await db.query(
        `SELECT business_type, COUNT(*) as count 
         FROM businesses 
         WHERE is_verified = true 
         GROUP BY business_type 
         ORDER BY count DESC`
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

  // Search products across all businesses
  async searchProducts(req, res) {
    try {
      const { 
        search, 
        businessType,
        minPrice,
        maxPrice,
        page = 1, 
        limit = 20,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = req.query;

      if (!search) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const db = dbConfig.db;

      let query = `
        SELECT bp.*, b.business_name, b.business_type
        FROM business_products bp
        JOIN businesses b ON bp.business_id = b.business_id
        WHERE bp.is_active = true AND b.is_verified = true
        AND (bp.product_name ILIKE $1 OR bp.description ILIKE $1)
      `;

      const queryParams = [`%${search}%`];
      let paramCount = 2;

      // Add filters
      if (businessType) {
        query += ` AND b.business_type = $${paramCount}`;
        queryParams.push(businessType);
        paramCount++;
      }

      if (minPrice) {
        query += ` AND bp.price >= $${paramCount}`;
        queryParams.push(parseFloat(minPrice));
        paramCount++;
      }

      if (maxPrice) {
        query += ` AND bp.price <= $${paramCount}`;
        queryParams.push(parseFloat(maxPrice));
        paramCount++;
      }

      // Add sorting
      const validSortFields = ['product_name', 'price', 'created_at'];
      const validSortOrders = ['asc', 'desc'];

      if (validSortFields.includes(sortBy) && validSortOrders.includes(sortOrder)) {
        query += ` ORDER BY bp.${sortBy} ${sortOrder.toUpperCase()}`;
      } else {
        query += ` ORDER BY bp.created_at DESC`;
      }

      // Add pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);
      query += ` LIMIT $${paramCount++} OFFSET $${paramCount}`;
      queryParams.push(parseInt(limit), offset);

      const productsResult = await db.query(query, queryParams);

      // Get total count
      let countQuery = `
        SELECT COUNT(*) as total
        FROM business_products bp
        JOIN businesses b ON bp.business_id = b.business_id
        WHERE bp.is_active = true AND b.is_verified = true
        AND (bp.product_name ILIKE $1 OR bp.description ILIKE $1)
      `;

      const countParams = [`%${search}%`];
      let countParamCount = 2;

      if (businessType) {
        countQuery += ` AND b.business_type = $${countParamCount}`;
        countParams.push(businessType);
        countParamCount++;
      }

      if (minPrice) {
        countQuery += ` AND bp.price >= $${countParamCount}`;
        countParams.push(parseFloat(minPrice));
        countParamCount++;
      }

      if (maxPrice) {
        countQuery += ` AND bp.price <= $${countParamCount}`;
        countParams.push(parseFloat(maxPrice));
        countParamCount++;
      }

      const countResult = await db.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / parseInt(limit));

      res.json({
        success: true,
        data: {
          products: productsResult.rows,
          searchQuery: search,
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
}

module.exports = new ProductsController();
