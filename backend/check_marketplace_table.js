const dbConfig = require('./config/db');

async function checkMarketplaceTable() {
  try {
    // Initialize the database properly
    await dbConfig.init();
    const db = dbConfig.getDB();
    
    // Check if marketplace_items table exists
    const checkTable = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'marketplace_items'
    `);
    
    if (checkTable.rows.length > 0) {
      console.log('✅ marketplace_items table exists');
      
      // Check table structure
      const structure = await db.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'marketplace_items' 
        ORDER BY ordinal_position
      `);
      
      console.log('📋 Table structure:');
      structure.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    } else {
      console.log('❌ marketplace_items table does not exist');
      console.log('Creating table...');
      
      // Create the table
      await db.query(`
        CREATE TABLE marketplace_items (
          id SERIAL PRIMARY KEY,
          seller_id INTEGER NOT NULL REFERENCES users(user_id),
          title VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          price DECIMAL(12,2) NOT NULL,
          category VARCHAR(100) NOT NULL,
          condition VARCHAR(50) DEFAULT 'good',
          images JSONB DEFAULT '[]',
          location VARCHAR(255),
          tags JSONB DEFAULT '[]',
          status VARCHAR(50) DEFAULT 'available',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      console.log('✅ marketplace_items table created successfully');
      
      // Create indexes for better performance
      await db.query('CREATE INDEX IF NOT EXISTS idx_marketplace_seller ON marketplace_items(seller_id)');
      await db.query('CREATE INDEX IF NOT EXISTS idx_marketplace_category ON marketplace_items(category)');
      await db.query('CREATE INDEX IF NOT EXISTS idx_marketplace_status ON marketplace_items(status)');
      
      console.log('✅ Indexes created successfully');
    }
    
    // Test the API endpoint by fetching items
    console.log('\n🔍 Testing marketplace items fetch...');
    const items = await db.query('SELECT COUNT(*) as count FROM marketplace_items');
    console.log(`📊 Found ${items.rows[0].count} items in marketplace`);
    
    // Test insert capability
    console.log('\n🧪 Testing marketplace item creation...');
    
    // First check if we have any users
    const users = await db.query('SELECT user_id FROM users LIMIT 1');
    if (users.rows.length > 0) {
      const testUserId = users.rows[0].user_id;
      console.log(`📍 Using test user ID: ${testUserId}`);
      
      // Try to create a test item
      const testItem = await db.query(`
        INSERT INTO marketplace_items (
          seller_id, title, description, price, category, condition, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, title
      `, [
        testUserId,
        'Test Upload Item',
        'This is a test item to verify the upload mechanism works',
        25.99,
        'books',
        'good',
        'available'
      ]);
      
      console.log(`✅ Test item created with ID: ${testItem.rows[0].id}`);
      console.log(`📝 Item title: ${testItem.rows[0].title}`);
      
      // Clean up test item
      await db.query('DELETE FROM marketplace_items WHERE id = $1', [testItem.rows[0].id]);
      console.log('🧹 Test item cleaned up');
    } else {
      console.log('⚠️  No users found in database - cannot test item creation');
    }
    
    console.log('\n✅ All marketplace table checks completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database error:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

checkMarketplaceTable();
