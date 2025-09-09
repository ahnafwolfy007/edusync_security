const { Pool } = require('pg');
require('dotenv').config();

async function testDatabaseConnection() {
  // Create connection pool
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'edusync',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    ssl: false // Local development
  });

  try {
    console.log('🔄 Testing database connection...');
    
    // Test connection
    const client = await pool.connect();
    console.log('✅ Successfully connected to PostgreSQL database!');
    
    // Test basic query
    const result = await client.query('SELECT NOW() as current_time, version() as db_version');
    console.log('📅 Current time:', result.rows[0].current_time);
    console.log('🗄️  Database version:', result.rows[0].db_version.split(' ')[0] + ' ' + result.rows[0].db_version.split(' ')[1]);
    
    // Check if tables exist
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    if (tableCheck.rows.length > 0) {
      console.log('📋 Existing tables:');
      tableCheck.rows.forEach(table => {
        console.log(`   - ${table.table_name}`);
      });
    } else {
      console.log('⚠️  No tables found. Run the schema creation script first.');
    }
    
    client.release();
    await pool.end();
    console.log('✅ Database connection test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('💡 Please check:');
    console.error('   1. PostgreSQL is running on localhost:5432');
    console.error('   2. Database "edusync" exists');
    console.error('   3. Username and password are correct in .env file');
    console.error('   4. User has proper permissions');
    process.exit(1);
  }
}

// Run the test
testDatabaseConnection();
