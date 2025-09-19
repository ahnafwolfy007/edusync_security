const { Pool } = require('pg');

// PostgreSQL Database Configuration for Aiven.io
class Database {
  constructor() {
    // Defensive: show which env vars are present (sanitized)
    const missing = ['DB_HOST','DB_PORT','DB_NAME','DB_USER','DB_PASSWORD'].filter(k => !process.env[k]);
    if (missing.length) {
      console.warn('⚠️ Missing DB env vars:', missing.join(', '));
    }
    // Initialize PostgreSQL connection pool for local database
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'edusync',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'your_postgres_password',
      ssl: false,
      connectionTimeoutMillis: 20000,
      idleTimeoutMillis: 30000,
      max: 20, // Maximum number of clients in the pool
      min: 2,  // Minimum number of clients in the pool
    });

    // Test connection and initialize tables
    this.initializeDatabase();
  }

  // Test database connection
  async testConnection() {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      console.log('✅ Database connected successfully at:', result.rows[0].now);
      client.release();
      return true;
    } catch (error) {
      if (error.code === '28P01') {
        console.error('❌ Authentication failed: Check DB_USER/DB_PASSWORD in .env (user=' + (process.env.DB_USER||'postgres') + ')');
      } else {
        console.error('❌ Database connection failed:', error.message);
      }
      throw error;
    }
  }

  // Initialize database tables
  async initializeDatabase() {
    try {
      await this.testConnection();
  await this.createTables();
  // Seeding removed per cleanup request; ensure roles/categories present via idempotent creation
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  // Create all necessary tables based on the complete schema
  async createTables() {
    const client = await this.pool.connect();
    
    try {
      // Lightweight migration logger (no manual transaction to avoid COMMIT/ROLLBACK errors)
      const originalQuery = client.query.bind(client);
      client.query = async (text, params) => {
        const preview = (text || '').toString().split('\n').map(l=>l.trim()).filter(Boolean)[0];
        if (preview) console.log('[MIGRATION]', preview);
        try {
          return await originalQuery(text, params);
        } catch (err) {
          console.error('[MIGRATION ERROR]', preview, err.code, err.message);
          throw err;
        }
      };

      // Create ROLES table
      await client.query(`
        CREATE TABLE IF NOT EXISTS roles (
          role_id SERIAL PRIMARY KEY,
          role_name VARCHAR(50) UNIQUE NOT NULL
        )
      `);

      // Create USERS table
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          user_id SERIAL PRIMARY KEY,
          full_name VARCHAR(100) NOT NULL,
          email VARCHAR(150) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          phone VARCHAR(20),
          role_id INT NOT NULL REFERENCES roles(role_id),
          institution VARCHAR(100),
          location VARCHAR(255),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

  // Ensure profile picture column exists for user avatars
  await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture TEXT`);
  // Ensure email verification fields
  await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT FALSE`);
  await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP`);

      // Create BUSINESS_APPLICATIONS table
      await client.query(`
        CREATE TABLE IF NOT EXISTS business_applications (
          application_id SERIAL PRIMARY KEY,
          user_id INT NOT NULL REFERENCES users(user_id),
          business_name VARCHAR(150) NOT NULL,
          business_type VARCHAR(100),
          license_info TEXT,
          status VARCHAR(20) NOT NULL DEFAULT 'pending',
          applied_at TIMESTAMP DEFAULT NOW(),
          reviewed_at TIMESTAMP,
          review_comments TEXT
        )
      `);

      // Create BUSINESSES table
      await client.query(`
        CREATE TABLE IF NOT EXISTS businesses (
          business_id SERIAL PRIMARY KEY,
          owner_id INT NOT NULL REFERENCES users(user_id),
          business_name VARCHAR(150) NOT NULL,
          business_type VARCHAR(100),
          description TEXT,
          is_verified BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

  // Ensure optional branding/image column exists
  await client.query(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS image TEXT`);

      // Create BUSINESS_PRODUCTS table
      await client.query(`
        CREATE TABLE IF NOT EXISTS business_products (
          product_id SERIAL PRIMARY KEY,
          business_id INT NOT NULL REFERENCES businesses(business_id),
          product_name VARCHAR(150) NOT NULL,
          description TEXT,
          price DECIMAL(12,2) NOT NULL CHECK (price >= 0),
          stock_quantity INT NOT NULL DEFAULT 1 CHECK (stock_quantity >= 0),
          terms_conditions TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

  // Ensure category & image columns for filtering / UI
  await client.query(`ALTER TABLE business_products ADD COLUMN IF NOT EXISTS category VARCHAR(100)`);
  await client.query(`ALTER TABLE business_products ADD COLUMN IF NOT EXISTS image TEXT`);

      // Create BUSINESS_ORDERS table
      await client.query(`
        CREATE TABLE IF NOT EXISTS business_orders (
          order_id SERIAL PRIMARY KEY,
          user_id INT NOT NULL REFERENCES users(user_id),
          business_id INT NOT NULL REFERENCES businesses(business_id),
      order_date TIMESTAMP DEFAULT NOW(),
      payment_method VARCHAR(50) NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW()
        )
      `);

    // Ensure newer expected columns exist on business_orders
    await client.query(`ALTER TABLE business_orders ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12,2) DEFAULT 0`);
    await client.query(`ALTER TABLE business_orders ADD COLUMN IF NOT EXISTS delivery_address TEXT`);
    await client.query(`ALTER TABLE business_orders ADD COLUMN IF NOT EXISTS special_instructions TEXT`);
    await client.query(`ALTER TABLE business_orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending'`);
    await client.query(`ALTER TABLE business_orders ADD COLUMN IF NOT EXISTS rating INT`);
    await client.query(`ALTER TABLE business_orders ADD COLUMN IF NOT EXISTS review TEXT`);
    await client.query(`ALTER TABLE business_orders ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP`);

      // Create BUSINESS_ORDER_ITEMS table
      await client.query(`
        CREATE TABLE IF NOT EXISTS business_order_items (
          order_item_id SERIAL PRIMARY KEY,
          order_id INT NOT NULL REFERENCES business_orders(order_id) ON DELETE CASCADE,
          product_id INT NOT NULL REFERENCES business_products(product_id),
      quantity INT NOT NULL CHECK (quantity > 0)
        )
      `);

    // Ensure newer expected columns exist on business_order_items
    await client.query(`ALTER TABLE business_order_items ADD COLUMN IF NOT EXISTS price DECIMAL(12,2)`);
    await client.query(`ALTER TABLE business_order_items ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT FALSE`);

      // Create CATEGORIES table
      await client.query(`
        CREATE TABLE IF NOT EXISTS categories (
          category_id SERIAL PRIMARY KEY,
      category_name VARCHAR(100) UNIQUE NOT NULL
        )
      `);
    // Ensure category_type column exists (seed uses it)
    await client.query(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS category_type VARCHAR(50)`);

      // Create SECONDHAND_ITEMS table
      await client.query(`
        CREATE TABLE IF NOT EXISTS secondhand_items (
          item_id SERIAL PRIMARY KEY,
          seller_id INT NOT NULL REFERENCES users(user_id),
          category_id INT REFERENCES categories(category_id),
          item_name VARCHAR(150) NOT NULL,
          description TEXT,
          price DECIMAL(12,2) NOT NULL CHECK (price >= 0),
          condition VARCHAR(50),
          terms_conditions TEXT,
          posted_at TIMESTAMP DEFAULT NOW(),
          is_active BOOLEAN DEFAULT TRUE
        )
      `);

      // Create SECONDHAND_ORDERS table
      await client.query(`
        CREATE TABLE IF NOT EXISTS secondhand_orders (
          order_id SERIAL PRIMARY KEY,
          buyer_id INT NOT NULL REFERENCES users(user_id),
          item_id INT NOT NULL REFERENCES secondhand_items(item_id),
          order_date TIMESTAMP DEFAULT NOW(),
          status VARCHAR(20) DEFAULT 'pending'
        )
      `);

      // Create RENTAL_PRODUCTS table
      await client.query(`
        CREATE TABLE IF NOT EXISTS rental_products (
          rental_id SERIAL PRIMARY KEY,
          owner_id INT NOT NULL REFERENCES users(user_id),
          category_id INT REFERENCES categories(category_id),
          product_name VARCHAR(150) NOT NULL,
          description TEXT,
          rent_per_day DECIMAL(12,2) NOT NULL CHECK (rent_per_day >= 0),
          available_from DATE,
          terms_conditions TEXT,
          is_active BOOLEAN DEFAULT TRUE
        )
      `);

      // Create RENTAL_ORDERS table
      await client.query(`
        CREATE TABLE IF NOT EXISTS rental_orders (
          rental_order_id SERIAL PRIMARY KEY,
          renter_id INT NOT NULL REFERENCES users(user_id),
          rental_id INT NOT NULL REFERENCES rental_products(rental_id),
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          status VARCHAR(20) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Create FOOD_VENDORS table
      await client.query(`
        CREATE TABLE IF NOT EXISTS food_vendors (
          vendor_id SERIAL PRIMARY KEY,
          owner_id INT NOT NULL REFERENCES users(user_id),
          restaurant_name VARCHAR(150),
          shop_name VARCHAR(150),
          cuisine VARCHAR(100),
          address TEXT,
          phone VARCHAR(30),
          description TEXT,
          operating_hours TEXT,
          delivery_areas JSONB,
          minimum_order DECIMAL(12,2) DEFAULT 0,
          is_verified BOOLEAN DEFAULT FALSE,
            is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Ensure backward compatibility columns
      await client.query(`ALTER TABLE food_vendors ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`);
      await client.query(`ALTER TABLE food_vendors ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`);

      // Food vendor applications table (for approval workflow)
      await client.query(`
        CREATE TABLE IF NOT EXISTS food_vendor_applications (
          application_id SERIAL PRIMARY KEY,
          user_id INT NOT NULL REFERENCES users(user_id),
          restaurant_name VARCHAR(150) NOT NULL,
          cuisine VARCHAR(100) NOT NULL,
          address TEXT NOT NULL,
          phone VARCHAR(30) NOT NULL,
          license_info TEXT,
          operating_hours TEXT,
          delivery_areas JSONB,
          status VARCHAR(20) DEFAULT 'pending',
          applied_at TIMESTAMP DEFAULT NOW(),
          reviewed_at TIMESTAMP,
          review_comments TEXT
        )
      `);

      // Create FOOD_ITEMS table
      await client.query(`
        CREATE TABLE IF NOT EXISTS food_items (
          food_item_id SERIAL PRIMARY KEY,
          vendor_id INT NOT NULL REFERENCES food_vendors(vendor_id),
          item_name VARCHAR(150) NOT NULL,
          description TEXT,
          price DECIMAL(12, 2) NOT NULL CHECK (price >= 0),
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Create FOOD_ITEM_IMAGES table
      await client.query(`
        CREATE TABLE IF NOT EXISTS food_item_images (
          image_id SERIAL PRIMARY KEY,
          food_item_id INT NOT NULL REFERENCES food_items(food_item_id) ON DELETE CASCADE,
          image_url TEXT NOT NULL
        )
      `);

      // Create FOOD_ORDERS table
      await client.query(`
        CREATE TABLE IF NOT EXISTS food_orders (
          order_id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(user_id),
      vendor_id INT NOT NULL REFERENCES food_vendors(vendor_id),
      total_amount DECIMAL(12,2) DEFAULT 0,
      order_date DATE NOT NULL DEFAULT CURRENT_DATE,
      created_at TIMESTAMP DEFAULT NOW(),
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      rating INT,
      review TEXT,
      reviewed_at TIMESTAMP,
      estimated_delivery_time TIMESTAMP,
      delivered_at TIMESTAMP
        )
      `);

    // Add missing columns if legacy rows exist
    await client.query(`ALTER TABLE food_orders ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12,2) DEFAULT 0`);
    await client.query(`ALTER TABLE food_orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`);
    await client.query(`ALTER TABLE food_orders ADD COLUMN IF NOT EXISTS rating INT`);
    await client.query(`ALTER TABLE food_orders ADD COLUMN IF NOT EXISTS review TEXT`);
    await client.query(`ALTER TABLE food_orders ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP`);
    await client.query(`ALTER TABLE food_orders ADD COLUMN IF NOT EXISTS estimated_delivery_time TIMESTAMP`);
    await client.query(`ALTER TABLE food_orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP`);

      // Create FOOD_ORDER_ITEMS table
      await client.query(`
        CREATE TABLE IF NOT EXISTS food_order_items (
          order_item_id SERIAL PRIMARY KEY,
          order_id INT NOT NULL REFERENCES food_orders(order_id) ON DELETE CASCADE,
          food_item_id INT NOT NULL REFERENCES food_items(food_item_id),
          quantity INT NOT NULL CHECK (quantity > 0)
        )
      `);

      // Create PAYMENTS table
      await client.query(`
        CREATE TABLE IF NOT EXISTS payments (
          payment_id SERIAL PRIMARY KEY,
          buyer_id INT NOT NULL REFERENCES users(user_id),
          seller_id INT NOT NULL REFERENCES users(user_id),
          product_id INT REFERENCES business_products(product_id),
          amount DECIMAL(14,2) NOT NULL,
          payment_method VARCHAR(50) NOT NULL,
          platform_fee DECIMAL(14,2) DEFAULT 0.00,
          status VARCHAR(20) NOT NULL DEFAULT 'success',
          transaction_reference VARCHAR(100),
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Create WALLETS table
      await client.query(`
        CREATE TABLE IF NOT EXISTS wallets (
          wallet_id SERIAL PRIMARY KEY,
          user_id INT UNIQUE NOT NULL REFERENCES users(user_id),
          balance DECIMAL(14,2) NOT NULL DEFAULT 0.00,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Create TRANSACTIONS table
      await client.query(`
        CREATE TABLE IF NOT EXISTS transactions (
          transaction_id SERIAL PRIMARY KEY,
          wallet_id INT NOT NULL REFERENCES wallets(wallet_id),
          amount DECIMAL(14,2) NOT NULL,
          transaction_type VARCHAR(50) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'completed',
          description TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

  // Ensure newer expected columns exist on transactions to match wallet controller
  await client.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(user_id)`);
  await client.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS type VARCHAR(50)`);
  await client.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50)`);
  await client.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reference_number VARCHAR(100)`);
  await client.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS metadata JSONB`);
  await client.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`);

      // Create LOST_FOUND_ITEMS table
      await client.query(`
        CREATE TABLE IF NOT EXISTS lost_found_items (
          item_id SERIAL PRIMARY KEY,
          user_id INT NOT NULL REFERENCES users(user_id),
          item_type VARCHAR(50) NOT NULL,
          title VARCHAR(150),
          description TEXT,
          location VARCHAR(255),
          contact_info VARCHAR(255),
          is_claimed BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Create NOTICES table
      await client.query(`
        CREATE TABLE IF NOT EXISTS notices (
          notice_id SERIAL PRIMARY KEY,
          posted_by INT REFERENCES users(user_id),
          title VARCHAR(150),
          content TEXT,
          category VARCHAR(100),
          is_pinned BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      // Ensure posted_by is nullable (legacy schemas may have NOT NULL)
      try { await client.query(`ALTER TABLE notices ALTER COLUMN posted_by DROP NOT NULL`); } catch (e) { /* ignore */ }
      // Additional fields for scraped notices and metadata
      await client.query(`ALTER TABLE notices ADD COLUMN IF NOT EXISTS source_url TEXT`);
      await client.query(`ALTER TABLE notices ADD COLUMN IF NOT EXISTS external_id TEXT`);
      await client.query(`ALTER TABLE notices ADD COLUMN IF NOT EXISTS slug TEXT`);
      await client.query(`ALTER TABLE notices ADD COLUMN IF NOT EXISTS excerpt TEXT`);
      await client.query(`ALTER TABLE notices ADD COLUMN IF NOT EXISTS published_at TIMESTAMP`);
      await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_notices_external ON notices(external_id)`);
      await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_notices_slug ON notices(slug)`);

      // Create JOBS table (was referenced elsewhere but not yet created)
      await client.query(`
        CREATE TABLE IF NOT EXISTS jobs (
          job_id SERIAL PRIMARY KEY,
          user_id INT NOT NULL REFERENCES users(user_id),
          title VARCHAR(150) NOT NULL,
          description TEXT,
          location VARCHAR(150),
          job_type VARCHAR(50),
          salary_range VARCHAR(100),
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Create JOB APPLICATIONS table
      await client.query(`
        CREATE TABLE IF NOT EXISTS job_applications (
          application_id SERIAL PRIMARY KEY,
          job_id INT NOT NULL REFERENCES jobs(job_id) ON DELETE CASCADE,
          applicant_id INT NOT NULL REFERENCES users(user_id),
          cover_letter TEXT,
          status VARCHAR(20) DEFAULT 'pending',
          applied_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(job_id, applicant_id)
        )
      `);

      // Create NOTIFICATIONS table (user specific)
      await client.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          notification_id SERIAL PRIMARY KEY,
          user_id INT NOT NULL REFERENCES users(user_id),
          type VARCHAR(50) DEFAULT 'system',
          title VARCHAR(150),
          message TEXT,
          data JSONB,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Email verification tokens
      await client.query(`
        CREATE TABLE IF NOT EXISTS email_verification_tokens (
          token_id SERIAL PRIMARY KEY,
          user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
          email VARCHAR(150) NOT NULL,
          otp_code VARCHAR(10) NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          used BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(email, otp_code)
        )
      `);

  // Migration safety: adjust email_verification_tokens silently (ignore failures)
  try { await client.query(`ALTER TABLE email_verification_tokens ALTER COLUMN user_id DROP NOT NULL`); } catch(e) {}
  // (Removed duplicate unique constraint migration to avoid transaction abort)

  /* FREE MARKETPLACE FAVORITES table moved below after free_marketplace_items definition */

  // Free Marketplace core tables (ensure created before favorites)
      await client.query(`
        CREATE TABLE IF NOT EXISTS free_marketplace_items (
          item_id SERIAL PRIMARY KEY,
          giver_id INT NOT NULL REFERENCES users(user_id),
          category_id INT REFERENCES categories(category_id),
          item_name VARCHAR(150) NOT NULL,
          description TEXT,
          condition_note TEXT,
          pickup_location VARCHAR(255) NOT NULL,
          contact_info VARCHAR(255) NOT NULL,
          is_available BOOLEAN DEFAULT TRUE,
          posted_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS free_marketplace_requests (
          request_id SERIAL PRIMARY KEY,
          item_id INT NOT NULL REFERENCES free_marketplace_items(item_id) ON DELETE CASCADE,
          requester_id INT NOT NULL REFERENCES users(user_id),
          message TEXT,
          status VARCHAR(20) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Indexes for free marketplace performance
      await client.query('CREATE INDEX IF NOT EXISTS idx_free_items_giver ON free_marketplace_items(giver_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_free_items_available ON free_marketplace_items(is_available)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_free_requests_item ON free_marketplace_requests(item_id)');

      // Create FREE MARKETPLACE FAVORITES table (after items table exists)
      await client.query(`
        CREATE TABLE IF NOT EXISTS free_marketplace_favorites (
          favorite_id SERIAL PRIMARY KEY,
          user_id INT NOT NULL REFERENCES users(user_id),
          item_id INT NOT NULL REFERENCES free_marketplace_items(item_id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(user_id, item_id)
        )
      `);

      // Accommodation tables (properties + images + inquiries)
      await client.query(`
        CREATE TABLE IF NOT EXISTS accommodation_properties (
          property_id SERIAL PRIMARY KEY,
          owner_id INT NOT NULL REFERENCES users(user_id),
          property_type VARCHAR(50) NOT NULL,
          title VARCHAR(150) NOT NULL,
          description TEXT,
          location VARCHAR(255) NOT NULL,
          area VARCHAR(100),
          rent_amount DECIMAL(12,2) NOT NULL CHECK (rent_amount >= 0),
          deposit_amount DECIMAL(12,2) DEFAULT 0 CHECK (deposit_amount >= 0),
          property_size VARCHAR(50),
          amenities TEXT[],
          available_from DATE,
          contact_phone VARCHAR(30),
          contact_email VARCHAR(150),
          is_available BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS accommodation_images (
          image_id SERIAL PRIMARY KEY,
          property_id INT NOT NULL REFERENCES accommodation_properties(property_id) ON DELETE CASCADE,
          image_url TEXT NOT NULL,
          is_primary BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS accommodation_inquiries (
          inquiry_id SERIAL PRIMARY KEY,
          property_id INT NOT NULL REFERENCES accommodation_properties(property_id) ON DELETE CASCADE,
          inquirer_id INT NOT NULL REFERENCES users(user_id),
          message TEXT,
          contact_phone VARCHAR(30),
          preferred_date DATE,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Indexes for accommodation
      await client.query('CREATE INDEX IF NOT EXISTS idx_accommodation_owner ON accommodation_properties(owner_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_accommodation_available ON accommodation_properties(is_available)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_accommodation_type ON accommodation_properties(property_type)');

      // Create indexes for better performance
      await client.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_businesses_owner ON businesses(owner_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_products_business ON business_products(business_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_secondhand_seller ON secondhand_items(seller_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_secondhand_category ON secondhand_items(category_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_payments_buyer ON payments(buyer_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_payments_seller ON payments(seller_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions(wallet_id)');

      // --- Chat feature tables (buyer-seller messaging for secondhand items) ---
      await client.query(`
        CREATE TABLE IF NOT EXISTS chats (
          chat_id SERIAL PRIMARY KEY,
          item_id INT REFERENCES secondhand_items(item_id),
          seller_id INT NOT NULL REFERENCES users(user_id),
          buyer_id INT NOT NULL REFERENCES users(user_id),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(item_id, seller_id, buyer_id)
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS chat_messages (
          message_id SERIAL PRIMARY KEY,
          chat_id INT NOT NULL REFERENCES chats(chat_id) ON DELETE CASCADE,
          sender_id INT NOT NULL REFERENCES users(user_id),
          content TEXT NOT NULL,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await client.query('CREATE INDEX IF NOT EXISTS idx_chats_participants ON chats(seller_id, buyer_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_chat_messages_chat ON chat_messages(chat_id)');

      // FCM Tokens table for push notifications
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_fcm_tokens (
          user_id INT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
          fcm_token TEXT NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

  console.log('✅ All tables ensured successfully');
    } catch (error) {
  // Do not rethrow to avoid crashing server; migrations are best-effort
  console.error('❌ Error ensuring tables (continuing in degraded mode):', error.message);
    } finally {
      client.release();
    }
  }

  // (Seeding function removed)

  // Generic query method
  async query(text, params) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Create operation
  async create(table, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
    const columns = keys.join(', ');
    
    const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`;
    const result = await this.query(query, values);
    return result.rows[0];
  }

  // Find by ID
  async findById(table, id, idColumn = 'id') {
    const query = `SELECT * FROM ${table} WHERE ${idColumn} = $1`;
    const result = await this.query(query, [id]);
    return result.rows[0];
  }

  // Find many with conditions
  async findMany(table, conditions = {}, options = {}) {
    let query = `SELECT * FROM ${table}`;
    const params = [];
    const whereConditions = [];

    // Build WHERE clause
    if (Object.keys(conditions).length > 0) {
      Object.entries(conditions).forEach(([key, value], index) => {
        whereConditions.push(`${key} = $${index + 1}`);
        params.push(value);
      });
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    // Add ORDER BY
    if (options.orderBy) {
      query += ` ORDER BY ${options.orderBy}`;
      if (options.orderDirection) {
        query += ` ${options.orderDirection}`;
      }
    }

    // Add LIMIT and OFFSET
    if (options.limit) {
      query += ` LIMIT ${options.limit}`;
    }
    if (options.offset) {
      query += ` OFFSET ${options.offset}`;
    }

    const result = await this.query(query, params);
    return result.rows;
  }

  // Update operation
  async update(table, id, data, idColumn = 'id') {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');
    
    const query = `UPDATE ${table} SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE ${idColumn} = $1 RETURNING *`;
    const result = await this.query(query, [id, ...values]);
    return result.rows[0];
  }

  // Delete operation
  async delete(table, id, idColumn = 'id') {
    const query = `DELETE FROM ${table} WHERE ${idColumn} = $1 RETURNING *`;
    const result = await this.query(query, [id]);
    return result.rows[0];
  }

  // Get statistics
  async getStats() {
    const client = await this.pool.connect();
    try {
      const stats = {};

      // Get user counts by role
      const userStats = await client.query(`
        SELECT r.role_name, COUNT(u.user_id) as count 
        FROM roles r 
        LEFT JOIN users u ON r.role_id = u.role_id 
        GROUP BY r.role_id, r.role_name
      `);
      stats.usersByRole = userStats.rows;

      // Get total counts
      const totalUsers = await client.query('SELECT COUNT(*) FROM users');
      const totalBusinesses = await client.query('SELECT COUNT(*) FROM businesses WHERE is_verified = true');
      const totalProducts = await client.query('SELECT COUNT(*) FROM business_products WHERE is_active = true');
      const totalSecondhand = await client.query('SELECT COUNT(*) FROM secondhand_items WHERE is_active = true');
      const totalRentals = await client.query('SELECT COUNT(*) FROM rental_products WHERE is_active = true');
      const totalJobs = await client.query('SELECT COUNT(*) FROM jobs WHERE is_active = true');
      const pendingApplications = await client.query('SELECT COUNT(*) FROM business_applications WHERE status = \'pending\'');

      stats.totals = {
        users: parseInt(totalUsers.rows[0].count),
        businesses: parseInt(totalBusinesses.rows[0].count),
        products: parseInt(totalProducts.rows[0].count),
        secondhandItems: parseInt(totalSecondhand.rows[0].count),
        rentals: parseInt(totalRentals.rows[0].count),
        jobs: parseInt(totalJobs.rows[0].count),
        pendingApplications: parseInt(pendingApplications.rows[0].count)
      };

      return stats;
    } catch (error) {
      console.error('Error getting stats:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Close database connection
  async close() {
    try {
      await this.pool.end();
      console.log('✅ Database connection closed');
    } catch (error) {
      console.error('❌ Error closing database:', error);
      throw error;
    }
  }
}

// Database configuration
const dbConfig = {
  // Local PostgreSQL connection settings
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'edusync',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'your_postgres_password',
  
  // Database instance
  db: null,
  
  // Initialize database
  init: async () => {
    try {
      dbConfig.db = new Database();
      console.log('✅ Database configuration initialized successfully');
      return dbConfig.db;
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  },
  
  // Get database instance
  getDB: () => {
    if (!dbConfig.db) {
      throw new Error('Database not initialized. Call dbConfig.init() first.');
    }
    return dbConfig.db;
  },
  
  // Close database connection
  close: async () => {
    try {
      if (dbConfig.db) {
        await dbConfig.db.close();
        dbConfig.db = null;
      }
    } catch (error) {
      console.error('❌ Error closing database:', error);
      throw error;
    }
  }
};

module.exports = dbConfig;
