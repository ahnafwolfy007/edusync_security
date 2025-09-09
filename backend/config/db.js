const { Pool } = require('pg');

// PostgreSQL Database Configuration for Aiven.io
class Database {
  constructor() {
    // Initialize PostgreSQL connection pool for local database
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'edusync',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'your_postgres_password',
      // Remove SSL for local development
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
      console.error('❌ Database connection failed:', error.message);
      throw error;
    }
  }

  // Initialize database tables
  async initializeDatabase() {
    try {
      await this.testConnection();
      await this.createTables();
      await this.seedInitialData();
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
      await client.query('BEGIN');

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

      // Create BUSINESS_ORDERS table
      await client.query(`
        CREATE TABLE IF NOT EXISTS business_orders (
          order_id SERIAL PRIMARY KEY,
          user_id INT NOT NULL REFERENCES users(user_id),
          business_id INT NOT NULL REFERENCES businesses(business_id),
          order_date TIMESTAMP DEFAULT NOW(),
          payment_method VARCHAR(20) NOT NULL,
          status VARCHAR(20) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Create BUSINESS_ORDER_ITEMS table
      await client.query(`
        CREATE TABLE IF NOT EXISTS business_order_items (
          order_item_id SERIAL PRIMARY KEY,
          order_id INT NOT NULL REFERENCES business_orders(order_id) ON DELETE CASCADE,
          product_id INT NOT NULL REFERENCES business_products(product_id),
          quantity INT NOT NULL CHECK (quantity > 0)
        )
      `);

      // Create CATEGORIES table
      await client.query(`
        CREATE TABLE IF NOT EXISTS categories (
          category_id SERIAL PRIMARY KEY,
          category_name VARCHAR(100) UNIQUE NOT NULL
        )
      `);

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
          user_id INT NOT NULL REFERENCES users(user_id),
          shop_name VARCHAR(150) NOT NULL,
          description TEXT,
          is_verified BOOLEAN DEFAULT FALSE,
          applied_at TIMESTAMP DEFAULT NOW(),
          verified_at TIMESTAMP
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
          order_date DATE NOT NULL CHECK (order_date <= NOW() + INTERVAL '7 days'),
          order_placed_at TIMESTAMP DEFAULT NOW(),
          status VARCHAR(20) NOT NULL DEFAULT 'pending'
        )
      `);

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
          posted_by INT NOT NULL REFERENCES users(user_id),
          title VARCHAR(150),
          content TEXT,
          category VARCHAR(100),
          is_pinned BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

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

      await client.query('COMMIT');
      console.log('✅ All tables created successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error creating tables:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Seed initial data
  async seedInitialData() {
    const client = await this.pool.connect();
    
    try {
      // Check if roles already exist
      const rolesResult = await client.query('SELECT COUNT(*) FROM roles');
      if (parseInt(rolesResult.rows[0].count) === 0) {
        // Insert default roles
        await client.query(`
          INSERT INTO roles (role_name) VALUES 
          ('admin'),
          ('moderator'),
          ('student'),
          ('business_owner'),
          ('food_vendor')
        `);

        // Insert default categories
        await client.query(`
          INSERT INTO categories (category_name, category_type) VALUES 
          ('Electronics', 'secondhand'),
          ('Books', 'secondhand'),
          ('Clothing', 'secondhand'),
          ('Furniture', 'secondhand'),
          ('Sports Equipment', 'secondhand'),
          ('Laptops & Computers', 'rental'),
          ('Books & Study Materials', 'rental'),
          ('Accommodation', 'rental'),
          ('Vehicles', 'rental'),
          ('Party & Events', 'rental'),
          ('Lost Items', 'lost_found'),
          ('Found Items', 'lost_found'),
          ('Academic', 'notices'),
          ('Events', 'notices'),
          ('Administration', 'notices'),
          ('Lost & Found', 'notices')
        `);

        console.log('✅ Initial data seeded successfully');
      }
    } catch (error) {
      console.error('❌ Error seeding initial data:', error);
      throw error;
    } finally {
      client.release();
    }
  }

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
