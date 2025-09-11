const dbConfig = require('../config/db');
const { verify_aaa_7, generateSaltFromEmail } = require('../utils/simpleHash');

function parseAaa7(stored) {
  if (!stored || typeof stored !== 'string') return null;
  const rawParts = stored.split('$').filter(p => p !== '');
  if (rawParts[0] !== 'aaa_7') return null;
  if (rawParts.length < 5) return null;
  const [prefix, wf, bits, salt, hash] = rawParts;
  if (!wf || !bits || !salt || !hash) return null;
  return { workFactor: parseInt(wf,10), outputBits: parseInt(bits,10), salt, hash };
}
const fs = require('fs');
const path = require('path');

class UserController {
  // Get user profile
  async getProfile(req, res) {
    try {
      const userId = req.user.userId;
      const db = dbConfig.db;

      const userResult = await db.query(
        `SELECT u.user_id, u.full_name, u.email, u.phone, u.institution, u.location, 
                u.created_at, u.updated_at, u.profile_picture, r.role_name,
                w.balance as wallet_balance
         FROM users u 
         JOIN roles r ON u.role_id = r.role_id 
         LEFT JOIN wallets w ON u.user_id = w.user_id
         WHERE u.user_id = $1`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const rawUser = userResult.rows[0];
      const user = {
        user_id: rawUser.user_id,
        full_name: rawUser.full_name,
        name: rawUser.full_name, // frontend convenience
        email: rawUser.email,
        phone: rawUser.phone,
        institution: rawUser.institution,
        location: rawUser.location,
        role_name: rawUser.role_name,
        wallet_balance: rawUser.wallet_balance,
        profile_picture: rawUser.profile_picture,
        avatar: rawUser.profile_picture,
        created_at: rawUser.created_at,
        updated_at: rawUser.updated_at
      };

      // Get user's listings count
      const listingsResult = await db.query(
        `SELECT 
          (SELECT COUNT(*) FROM secondhand_items WHERE seller_id = $1 AND is_active = true) as secondhand_count,
          (SELECT COUNT(*) FROM rental_products WHERE owner_id = $1 AND is_active = true) as rental_count,
          (SELECT COUNT(*) FROM businesses WHERE owner_id = $1) as business_count,
          (SELECT COUNT(*) FROM food_vendors WHERE user_id = $1) as vendor_count`,
        [userId]
      );

      const listings = listingsResult.rows[0];

      res.json({
        success: true,
        data: { 
          user,
          listings
        }
      });

    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      const userId = req.user.userId;
      const { fullName, phone, institution, location } = req.body;

      const db = dbConfig.db;

      // Build update query dynamically
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (fullName !== undefined) {
        updates.push(`full_name = $${paramCount++}`);
        values.push(fullName);
      }
      if (phone !== undefined) {
        updates.push(`phone = $${paramCount++}`);
        values.push(phone);
      }
      if (institution !== undefined) {
        updates.push(`institution = $${paramCount++}`);
        values.push(institution);
      }
      if (location !== undefined) {
        updates.push(`location = $${paramCount++}`);
        values.push(location);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No fields to update'
        });
      }

      updates.push(`updated_at = NOW()`);
      values.push(userId);

      const query = `UPDATE users SET ${updates.join(', ')} WHERE user_id = $${paramCount} RETURNING *`;

      const result = await db.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const { password_hash, profile_picture, ...updatedUser } = result.rows[0];

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { 
          user: { 
            ...updatedUser, 
            profile_picture, 
            avatar: profile_picture, 
            full_name: updatedUser.full_name,
            name: updatedUser.full_name 
          } 
        }
      });

    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get user's listings
  async getUserListings(req, res) {
    try {
      const userId = req.user.userId;
      const { type = 'all' } = req.query;
      const db = dbConfig.db;

      let listings = {};

      if (type === 'all' || type === 'secondhand') {
        const secondhandResult = await db.query(
          `SELECT s.*, c.category_name
           FROM secondhand_items s
           LEFT JOIN categories c ON s.category_id = c.category_id
           WHERE s.seller_id = $1
           ORDER BY s.posted_at DESC`,
          [userId]
        );
        listings.secondhand = secondhandResult.rows;
      }

      if (type === 'all' || type === 'rentals') {
        const rentalResult = await db.query(
          `SELECT r.*, c.category_name
           FROM rental_products r
           LEFT JOIN categories c ON r.category_id = c.category_id
           WHERE r.owner_id = $1
           ORDER BY r.created_at DESC`,
          [userId]
        );
        listings.rentals = rentalResult.rows;
      }

      if (type === 'all' || type === 'businesses') {
        const businessResult = await db.query(
          `SELECT b.*, 
           (SELECT COUNT(*) FROM business_products WHERE business_id = b.business_id) as product_count
           FROM businesses b
           WHERE b.owner_id = $1
           ORDER BY b.created_at DESC`,
          [userId]
        );
        listings.businesses = businessResult.rows;
      }

      if (type === 'all' || type === 'food_vendors') {
        const vendorResult = await db.query(
          `SELECT fv.*, 
           (SELECT COUNT(*) FROM food_items WHERE vendor_id = fv.vendor_id) as item_count
           FROM food_vendors fv
           WHERE fv.user_id = $1
           ORDER BY fv.applied_at DESC`,
          [userId]
        );
        listings.food_vendors = vendorResult.rows;
      }

      res.json({
        success: true,
        data: { listings }
      });

    } catch (error) {
      console.error('Get user listings error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get user's orders
  async getUserOrders(req, res) {
    try {
      const userId = req.user.userId;
      const { type = 'all' } = req.query;
      const db = dbConfig.db;

      let orders = {};

      if (type === 'all' || type === 'business') {
        const businessOrdersResult = await db.query(
          `SELECT bo.*, b.business_name,
           (SELECT json_agg(
             json_build_object(
               'product_name', bp.product_name,
               'quantity', boi.quantity,
               'price', bp.price
             )
           ) FROM business_order_items boi
           JOIN business_products bp ON boi.product_id = bp.product_id
           WHERE boi.order_id = bo.order_id) as items
           FROM business_orders bo
           JOIN businesses b ON bo.business_id = b.business_id
           WHERE bo.user_id = $1
           ORDER BY bo.created_at DESC`,
          [userId]
        );
        orders.business = businessOrdersResult.rows;
      }

      if (type === 'all' || type === 'secondhand') {
        const secondhandOrdersResult = await db.query(
          `SELECT so.*, si.item_name, si.price, u.full_name as seller_name
           FROM secondhand_orders so
           JOIN secondhand_items si ON so.item_id = si.item_id
           JOIN users u ON si.seller_id = u.user_id
           WHERE so.buyer_id = $1
           ORDER BY so.order_date DESC`,
          [userId]
        );
        orders.secondhand = secondhandOrdersResult.rows;
      }

      if (type === 'all' || type === 'rentals') {
        const rentalOrdersResult = await db.query(
          `SELECT ro.*, rp.product_name, rp.rent_per_day, u.full_name as owner_name
           FROM rental_orders ro
           JOIN rental_products rp ON ro.rental_id = rp.rental_id
           JOIN users u ON rp.owner_id = u.user_id
           WHERE ro.renter_id = $1
           ORDER BY ro.created_at DESC`,
          [userId]
        );
        orders.rentals = rentalOrdersResult.rows;
      }

      if (type === 'all' || type === 'food') {
        const foodOrdersResult = await db.query(
          `SELECT fo.*, fv.shop_name,
           (SELECT json_agg(
             json_build_object(
               'item_name', fi.item_name,
               'quantity', foi.quantity,
               'price', fi.price
             )
           ) FROM food_order_items foi
           JOIN food_items fi ON foi.food_item_id = fi.food_item_id
           WHERE foi.order_id = fo.order_id) as items
           FROM food_orders fo
           JOIN food_vendors fv ON fo.vendor_id = fv.vendor_id
           WHERE fo.user_id = $1
           ORDER BY fo.order_placed_at DESC`,
          [userId]
        );
        orders.food = foodOrdersResult.rows;
      }

      // Seller-side (business owner) orders
      if (type === 'all' || type === 'business') {
        const ownedBizResult = await db.query('SELECT business_id, business_name FROM businesses WHERE owner_id = $1', [userId]);
        if (ownedBizResult.rows.length) {
          const businessIds = ownedBizResult.rows.map(r => r.business_id);
          const placeholders = businessIds.map((_, i) => `$${i + 1}`).join(',');
          const sellerOrdersQuery = `SELECT bo.*, b.business_name,
             (SELECT json_agg(
               json_build_object(
                 'product_name', bp.product_name,
                 'quantity', boi.quantity,
                 'price', bp.price
               )
             ) FROM business_order_items boi
             JOIN business_products bp ON boi.product_id = bp.product_id
             WHERE boi.order_id = bo.order_id) as items
             FROM business_orders bo
             JOIN businesses b ON bo.business_id = b.business_id
             WHERE bo.business_id IN (${placeholders})
             ORDER BY bo.created_at DESC`;
          const sellerOrdersResult = await db.query(sellerOrdersQuery, businessIds);
          // Flag as seller side
          orders.business_sales = sellerOrdersResult.rows.map(r => ({ ...r, is_seller: true }));
        }
      }

      // Seller-side (food vendor) orders
      if (type === 'all' || type === 'food') {
        const vendorResult = await db.query('SELECT vendor_id, shop_name FROM food_vendors WHERE user_id = $1', [userId]);
        if (vendorResult.rows.length) {
          const vendorIds = vendorResult.rows.map(r => r.vendor_id);
          const placeholders = vendorIds.map((_, i) => `$${i + 1}`).join(',');
          const sellerFoodQuery = `SELECT fo.*, fv.shop_name,
            (SELECT json_agg(
              json_build_object(
                'item_name', fi.item_name,
                'quantity', foi.quantity,
                'price', fi.price
              )
            ) FROM food_order_items foi
            JOIN food_items fi ON foi.food_item_id = fi.food_item_id
            WHERE foi.order_id = fo.order_id) as items
            FROM food_orders fo
            JOIN food_vendors fv ON fo.vendor_id = fv.vendor_id
            WHERE fo.vendor_id IN (${placeholders})
            ORDER BY COALESCE(fo.order_placed_at, fo.created_at) DESC`;
          const sellerFoodResult = await db.query(sellerFoodQuery, vendorIds);
            orders.food_sales = sellerFoodResult.rows.map(r => ({ ...r, is_seller: true }));
        }
      }

      // Seller-side secondhand sales
      if (type === 'all' || type === 'secondhand') {
        const secondhandSalesResult = await db.query(
          `SELECT so.*, si.item_name, si.price, u.full_name as buyer_name
           FROM secondhand_orders so
           JOIN secondhand_items si ON so.item_id = si.item_id
           JOIN users u ON so.buyer_id = u.user_id
           WHERE si.seller_id = $1
           ORDER BY so.order_date DESC`,
          [userId]
        );
        if (secondhandSalesResult.rows.length) {
          orders.secondhand_sales = secondhandSalesResult.rows.map(r => ({ ...r, is_seller: true }));
        }
      }

      // Seller-side rental bookings (as owner)
      if (type === 'all' || type === 'rentals') {
        const rentalSalesResult = await db.query(
          `SELECT ro.*, rp.product_name, rp.rent_per_day, u.full_name as renter_name
           FROM rental_orders ro
           JOIN rental_products rp ON ro.rental_id = rp.rental_id
           JOIN users u ON ro.renter_id = u.user_id
           WHERE rp.owner_id = $1
           ORDER BY ro.created_at DESC`,
          [userId]
        );
        if (rentalSalesResult.rows.length) {
          orders.rental_sales = rentalSalesResult.rows.map(r => ({ ...r, is_seller: true }));
        }
      }

      res.json({
        success: true,
        data: { orders }
      });

    } catch (error) {
      console.error('Get user orders error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Update profile picture
  async updateProfilePicture(req, res) {
    try {
      const userId = req.user.userId;
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image file provided'
        });
      }
      const db = dbConfig.db;

      // Fetch existing profile picture to delete it
      const existingResult = await db.query('SELECT profile_picture FROM users WHERE user_id = $1', [userId]);
      const existingPath = existingResult.rows[0]?.profile_picture;

      const profilePicturePath = `/uploads/profiles/${req.file.filename}`;

      // Delete old file if it exists and is inside the expected directory
      if (existingPath && existingPath !== profilePicturePath && existingPath.startsWith('/uploads/profiles/')) {
        const absoluteOldPath = path.join(__dirname, '..', existingPath.replace(/^\//, ''));
        fs.stat(absoluteOldPath, (err, stats) => {
          if (!err && stats.isFile()) {
            fs.unlink(absoluteOldPath, (unlinkErr) => {
              if (unlinkErr) {
                console.warn('Failed to delete old profile picture:', unlinkErr.message);
              }
            });
          }
        });
      }

      await db.query(
        'UPDATE users SET profile_picture = $1, updated_at = NOW() WHERE user_id = $2',
        [profilePicturePath, userId]
      );

      const absoluteUrl = `${req.protocol}://${req.get('host')}${profilePicturePath}`;

      res.json({
        success: true,
        message: 'Profile picture updated successfully',
        data: { profilePicture: profilePicturePath, avatar: profilePicturePath, absoluteProfilePicture: absoluteUrl }
      });

    } catch (error) {
      console.error('Update profile picture error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get user statistics
  async getUserStats(req, res) {
    try {
      const userId = req.user.userId;
      const db = dbConfig.db;

      const statsResult = await db.query(
        `SELECT 
          (SELECT COUNT(*) FROM secondhand_items WHERE seller_id = $1) as total_secondhand_items,
          (SELECT COUNT(*) FROM secondhand_orders so 
           JOIN secondhand_items si ON so.item_id = si.item_id 
           WHERE si.seller_id = $1) as secondhand_sales,
          (SELECT COUNT(*) FROM rental_products WHERE owner_id = $1) as total_rental_items,
          (SELECT COUNT(*) FROM rental_orders ro 
           JOIN rental_products rp ON ro.rental_id = rp.rental_id 
           WHERE rp.owner_id = $1) as rental_bookings,
          (SELECT COUNT(*) FROM businesses WHERE owner_id = $1) as total_businesses,
          (SELECT COUNT(*) FROM food_vendors WHERE user_id = $1) as total_food_vendors,
          (SELECT COALESCE(SUM(t.amount), 0) FROM transactions t 
           JOIN wallets w ON t.wallet_id = w.wallet_id 
           WHERE w.user_id = $1 AND t.transaction_type = 'credit') as total_earnings,
          (SELECT COUNT(*) FROM business_orders WHERE user_id = $1) as total_orders_placed`,
        [userId]
      );

      const stats = statsResult.rows[0];

      res.json({
        success: true,
        data: { stats }
      });

    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Delete user account
  async deleteAccount(req, res) {
    try {
      const userId = req.user.userId;
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({
          success: false,
          message: 'Password is required to delete account'
        });
      }

      const db = dbConfig.db;

      // Verify password
      const userResult = await db.query(
        'SELECT password_hash, email FROM users WHERE user_id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      let valid = false;
      const stored = userResult.rows[0].password_hash;
      if (stored && stored.includes('aaa_7')) {
        const parsed = parseAaa7(stored.trim());
        if (parsed) {
          const emailDerivedSalt = generateSaltFromEmail(userResult.rows[0].email.toLowerCase());
          const saltToUse = parsed.salt === emailDerivedSalt ? emailDerivedSalt : parsed.salt; // fallback
          valid = verify_aaa_7(password, parsed.hash, saltToUse, parsed.workFactor, parsed.outputBits);
        }
      }
      if (!valid) {
        console.warn('[DeleteAccount] Password verification failed. Stored value:', stored);
      }
      if (!valid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid password'
        });
      }

      // Begin transaction for account deletion
      await db.query('BEGIN');

      try {
        // Delete user's data in proper order
        await db.query('DELETE FROM transactions WHERE wallet_id IN (SELECT wallet_id FROM wallets WHERE user_id = $1)', [userId]);
        await db.query('DELETE FROM wallets WHERE user_id = $1', [userId]);
        await db.query('DELETE FROM business_applications WHERE user_id = $1', [userId]);
        await db.query('DELETE FROM secondhand_items WHERE seller_id = $1', [userId]);
        await db.query('DELETE FROM rental_products WHERE owner_id = $1', [userId]);
        await db.query('DELETE FROM businesses WHERE owner_id = $1', [userId]);
        await db.query('DELETE FROM food_vendors WHERE user_id = $1', [userId]);
        await db.query('DELETE FROM lost_found_items WHERE user_id = $1', [userId]);
        await db.query('DELETE FROM notices WHERE posted_by = $1', [userId]);
        await db.query('DELETE FROM users WHERE user_id = $1', [userId]);

        await db.query('COMMIT');

        res.json({
          success: true,
          message: 'Account deleted successfully'
        });

      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }

    } catch (error) {
      console.error('Delete account error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = new UserController();
