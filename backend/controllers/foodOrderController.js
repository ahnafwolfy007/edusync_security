const dbConfig = require('../config/db');

class FoodOrderController {
  // Place food order
  async placeFoodOrder(req, res) {
    try {
      const userId = req.user.userId;
      const { 
        vendorId, 
        items, 
        deliveryAddress, 
        paymentMethod, 
        specialInstructions,
        deliveryType = 'delivery' // 'delivery' or 'pickup'
      } = req.body;

      if (!vendorId || !items || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Vendor ID and items are required'
        });
      }

      if (deliveryType === 'delivery' && !deliveryAddress) {
        return res.status(400).json({
          success: false,
          message: 'Delivery address is required for delivery orders'
        });
      }

      const db = dbConfig.db;

      // Start transaction
      await db.query('BEGIN');

      try {
        // Verify vendor exists and is active
        const vendorResult = await db.query(
          'SELECT * FROM food_vendors WHERE vendor_id = $1 AND is_verified = true AND is_active = true',
          [vendorId]
        );

        if (vendorResult.rows.length === 0) {
          throw new Error('Vendor not found or not available');
        }

        const vendor = vendorResult.rows[0];

        // Verify all items exist and are available
        const itemIds = items.map(item => item.itemId);
        const itemsResult = await db.query(
          'SELECT * FROM food_items WHERE item_id = ANY($1) AND vendor_id = $2 AND is_available = true',
          [itemIds, vendorId]
        );

        if (itemsResult.rows.length !== itemIds.length) {
          throw new Error('Some items are not available');
        }

        // Calculate total amount
        let totalAmount = 0;
        const orderItems = [];

        for (const orderItem of items) {
          const dbItem = itemsResult.rows.find(item => item.item_id === orderItem.itemId);
          if (!dbItem) {
            throw new Error(`Item ${orderItem.itemId} not found`);
          }

          const itemTotal = dbItem.price * orderItem.quantity;
          totalAmount += itemTotal;

          orderItems.push({
            itemId: orderItem.itemId,
            quantity: orderItem.quantity,
            price: dbItem.price,
            specialInstructions: orderItem.specialInstructions || null
          });
        }

        // Check minimum order amount
        if (totalAmount < vendor.minimum_order) {
          throw new Error(`Minimum order amount is ৳${vendor.minimum_order}`);
        }

        // Create the order
        const orderResult = await db.query(
          `INSERT INTO food_orders 
           (user_id, vendor_id, total_amount, delivery_address, payment_method, delivery_type, special_instructions, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW())
           RETURNING *`,
          [userId, vendorId, totalAmount, deliveryAddress, paymentMethod, deliveryType, specialInstructions]
        );

        const order = orderResult.rows[0];

        // Add order items
        for (const item of orderItems) {
          await db.query(
            `INSERT INTO food_order_items (order_id, item_id, quantity, price, special_instructions)
             VALUES ($1, $2, $3, $4, $5)`,
            [order.order_id, item.itemId, item.quantity, item.price, item.specialInstructions]
          );
        }

        // If payment method is not cash on delivery, handle payment processing here
        if (paymentMethod !== 'cash_on_delivery') {
          // For demo purposes, we'll mark as paid
          await db.query(
            'UPDATE food_orders SET payment_status = $1 WHERE order_id = $2',
            ['paid', order.order_id]
          );
        }

        await db.query('COMMIT');

        // Get complete order details for response
        const completeOrderResult = await db.query(
          `SELECT fo.*, fv.restaurant_name, fv.phone as vendor_phone,
           (SELECT json_agg(
             json_build_object(
               'item_name', fi.item_name,
               'quantity', foi.quantity,
               'price', foi.price,
               'total', foi.price * foi.quantity,
               'special_instructions', foi.special_instructions
             )
           ) FROM food_order_items foi
           JOIN food_items fi ON foi.item_id = fi.item_id
           WHERE foi.order_id = fo.order_id) as order_items
           FROM food_orders fo
           JOIN food_vendors fv ON fo.vendor_id = fv.vendor_id
           WHERE fo.order_id = $1`,
          [order.order_id]
        );

        res.status(201).json({
          success: true,
          message: 'Food order placed successfully',
          data: { order: completeOrderResult.rows[0] }
        });

      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }

    } catch (error) {
      console.error('Place food order error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to place order'
      });
    }
  }

  // Get user's food orders
  async getUserFoodOrders(req, res) {
    try {
      const userId = req.user.userId;
      const { status, page = 1, limit = 10 } = req.query;
      const db = dbConfig.db;

      let query = `
        SELECT fo.*, fv.restaurant_name, fv.phone as vendor_phone,
        (SELECT json_agg(
          json_build_object(
            'item_name', fi.item_name,
            'quantity', foi.quantity,
            'price', foi.price,
            'total', foi.price * foi.quantity,
            'special_instructions', foi.special_instructions
          )
        ) FROM food_order_items foi
        JOIN food_items fi ON foi.item_id = fi.item_id
        WHERE foi.order_id = fo.order_id) as order_items
        FROM food_orders fo
        JOIN food_vendors fv ON fo.vendor_id = fv.vendor_id
        WHERE fo.user_id = $1
      `;

      const queryParams = [userId];
      let paramCount = 2;

      if (status) {
        query += ` AND fo.status = $${paramCount++}`;
        queryParams.push(status);
      }

      query += ` ORDER BY fo.created_at DESC`;

      // Add pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);
      query += ` LIMIT $${paramCount++} OFFSET $${paramCount}`;
      queryParams.push(parseInt(limit), offset);

      const ordersResult = await db.query(query, queryParams);

      // Get total count for pagination
      let countQuery = 'SELECT COUNT(*) as total FROM food_orders WHERE user_id = $1';
      const countParams = [userId];
      
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
      console.error('Get user food orders error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get food order details
  async getFoodOrderDetails(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user.userId;
      const db = dbConfig.db;

      const orderResult = await db.query(
        `SELECT fo.*, fv.restaurant_name, fv.phone as vendor_phone, fv.address as vendor_address,
         u.full_name as customer_name, u.phone as customer_phone,
         (SELECT json_agg(
           json_build_object(
             'item_name', fi.item_name,
             'quantity', foi.quantity,
             'price', foi.price,
             'total', foi.price * foi.quantity,
             'special_instructions', foi.special_instructions
           )
         ) FROM food_order_items foi
         JOIN food_items fi ON foi.item_id = fi.item_id
         WHERE foi.order_id = fo.order_id) as order_items
         FROM food_orders fo
         JOIN food_vendors fv ON fo.vendor_id = fv.vendor_id
         JOIN users u ON fo.user_id = u.user_id
         WHERE fo.order_id = $1 AND fo.user_id = $2`,
        [orderId, userId]
      );

      if (orderResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      res.json({
        success: true,
        data: { order: orderResult.rows[0] }
      });

    } catch (error) {
      console.error('Get food order details error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Cancel food order
  async cancelFoodOrder(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user.userId;
      const { reason } = req.body;

      const db = dbConfig.db;

      // Check if order exists and belongs to user
      const orderResult = await db.query(
        'SELECT * FROM food_orders WHERE order_id = $1 AND user_id = $2',
        [orderId, userId]
      );

      if (orderResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      const order = orderResult.rows[0];

      // Check if order can be cancelled
      if (!['pending', 'confirmed'].includes(order.status)) {
        return res.status(400).json({
          success: false,
          message: 'Order cannot be cancelled at this stage'
        });
      }

      // Update order status
      const updateResult = await db.query(
        'UPDATE food_orders SET status = $1, cancellation_reason = $2 WHERE order_id = $3 RETURNING *',
        ['cancelled', reason, orderId]
      );

      res.json({
        success: true,
        message: 'Order cancelled successfully',
        data: { order: updateResult.rows[0] }
      });

    } catch (error) {
      console.error('Cancel food order error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Rate and review food order
  async rateFoodOrder(req, res) {
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

      const db = dbConfig.db;

      // Check if order exists, belongs to user, and is delivered
      const orderResult = await db.query(
        'SELECT * FROM food_orders WHERE order_id = $1 AND user_id = $2 AND status = $3',
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
        'UPDATE food_orders SET rating = $1, review = $2, reviewed_at = NOW() WHERE order_id = $3 RETURNING *',
        [rating, review, orderId]
      );

      res.json({
        success: true,
        message: 'Rating submitted successfully',
        data: { order: updateResult.rows[0] }
      });

    } catch (error) {
      console.error('Rate food order error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Track food order
  async trackFoodOrder(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user.userId;
      const db = dbConfig.db;

      const orderResult = await db.query(
        `SELECT fo.order_id, fo.status, fo.created_at, fo.estimated_delivery_time, fo.delivered_at,
         fo.delivery_type, fv.restaurant_name, fv.phone as vendor_phone,
         CASE 
           WHEN fo.status = 'pending' THEN 'Order received and being processed'
           WHEN fo.status = 'confirmed' THEN 'Order confirmed by restaurant'
           WHEN fo.status = 'preparing' THEN 'Your food is being prepared'
           WHEN fo.status = 'ready' THEN 'Order is ready for pickup/delivery'
           WHEN fo.status = 'picked_up' THEN 'Order picked up by delivery person'
           WHEN fo.status = 'delivered' THEN 'Order delivered successfully'
           WHEN fo.status = 'cancelled' THEN 'Order has been cancelled'
           ELSE 'Unknown status'
         END as status_message
         FROM food_orders fo
         JOIN food_vendors fv ON fo.vendor_id = fv.vendor_id
         WHERE fo.order_id = $1 AND fo.user_id = $2`,
        [orderId, userId]
      );

      if (orderResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      const order = orderResult.rows[0];

      // Create timeline based on status
      const timeline = [
        {
          status: 'pending',
          title: 'Order Placed',
          description: 'Your order has been placed successfully',
          timestamp: order.created_at,
          completed: true
        }
      ];

      const statusOrder = ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivered'];
      const currentStatusIndex = statusOrder.indexOf(order.status);

      if (currentStatusIndex >= 1) {
        timeline.push({
          status: 'confirmed',
          title: 'Order Confirmed',
          description: 'Restaurant has confirmed your order',
          completed: true
        });
      }

      if (currentStatusIndex >= 2) {
        timeline.push({
          status: 'preparing',
          title: 'Preparing',
          description: 'Your food is being prepared',
          completed: true
        });
      }

      if (currentStatusIndex >= 3) {
        timeline.push({
          status: 'ready',
          title: 'Ready',
          description: order.delivery_type === 'pickup' ? 'Ready for pickup' : 'Ready for delivery',
          completed: true
        });
      }

      if (order.delivery_type === 'delivery' && currentStatusIndex >= 4) {
        timeline.push({
          status: 'picked_up',
          title: 'Out for Delivery',
          description: 'Your order is on the way',
          completed: true
        });
      }

      if (currentStatusIndex >= 5 || order.status === 'delivered') {
        timeline.push({
          status: 'delivered',
          title: 'Delivered',
          description: 'Order delivered successfully',
          timestamp: order.delivered_at,
          completed: true
        });
      }

      res.json({
        success: true,
        data: {
          order: {
            orderId: order.order_id,
            status: order.status,
            statusMessage: order.status_message,
            restaurantName: order.restaurant_name,
            vendorPhone: order.vendor_phone,
            estimatedDeliveryTime: order.estimated_delivery_time,
            deliveryType: order.delivery_type
          },
          timeline
        }
      });

    } catch (error) {
      console.error('Track food order error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get food order history with filters
  async getFoodOrderHistory(req, res) {
    try {
      const userId = req.user.userId;
      const { 
        startDate, 
        endDate, 
        vendorId, 
        minAmount, 
        maxAmount,
        page = 1, 
        limit = 20 
      } = req.query;

      const db = dbConfig.db;

      let query = `
        SELECT fo.order_id, fo.status, fo.total_amount, fo.created_at, fo.rating,
        fv.restaurant_name, fv.cuisine,
        (SELECT COUNT(*) FROM food_order_items WHERE order_id = fo.order_id) as item_count
        FROM food_orders fo
        JOIN food_vendors fv ON fo.vendor_id = fv.vendor_id
        WHERE fo.user_id = $1
      `;

      const queryParams = [userId];
      let paramCount = 2;

      if (startDate) {
        query += ` AND fo.created_at >= $${paramCount++}`;
        queryParams.push(startDate);
      }

      if (endDate) {
        query += ` AND fo.created_at <= $${paramCount++}`;
        queryParams.push(endDate);
      }

      if (vendorId) {
        query += ` AND fo.vendor_id = $${paramCount++}`;
        queryParams.push(vendorId);
      }

      if (minAmount) {
        query += ` AND fo.total_amount >= $${paramCount++}`;
        queryParams.push(parseFloat(minAmount));
      }

      if (maxAmount) {
        query += ` AND fo.total_amount <= $${paramCount++}`;
        queryParams.push(parseFloat(maxAmount));
      }

      query += ` ORDER BY fo.created_at DESC`;

      // Add pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);
      query += ` LIMIT $${paramCount++} OFFSET $${paramCount}`;
      queryParams.push(parseInt(limit), offset);

      const ordersResult = await db.query(query, queryParams);

      // Get total count for pagination
      let countQuery = 'SELECT COUNT(*) as total FROM food_orders fo WHERE fo.user_id = $1';
      const countParams = [userId];
      let countParamIndex = 2;

      if (startDate) {
        countQuery += ` AND fo.created_at >= $${countParamIndex++}`;
        countParams.push(startDate);
      }

      if (endDate) {
        countQuery += ` AND fo.created_at <= $${countParamIndex++}`;
        countParams.push(endDate);
      }

      if (vendorId) {
        countQuery += ` AND fo.vendor_id = $${countParamIndex++}`;
        countParams.push(vendorId);
      }

      if (minAmount) {
        countQuery += ` AND fo.total_amount >= $${countParamIndex++}`;
        countParams.push(parseFloat(minAmount));
      }

      if (maxAmount) {
        countQuery += ` AND fo.total_amount <= $${countParamIndex++}`;
        countParams.push(parseFloat(maxAmount));
      }

      const countResult = await db.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / parseInt(limit));

      // Get spending summary
      const summaryResult = await db.query(
        `SELECT 
          COUNT(*) as total_orders,
          COALESCE(SUM(total_amount), 0) as total_spent,
          COALESCE(AVG(total_amount), 0) as avg_order_value,
          COUNT(CASE WHEN rating IS NOT NULL THEN 1 END) as rated_orders
         FROM food_orders
         WHERE user_id = $1`,
        [userId]
      );

      res.json({
        success: true,
        data: {
          orders: ordersResult.rows,
          summary: summaryResult.rows[0],
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
      console.error('Get food order history error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new FoodOrderController();
