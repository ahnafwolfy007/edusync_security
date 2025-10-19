const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkUsers() {
  try {
    console.log('🔄 Checking users in database...');
    
    // Check users table structure first
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Users table structure:');
    console.table(columnsResult.rows);
    
    // Check users table
    const usersResult = await pool.query(`
      SELECT u.user_id, u.full_name, u.email, r.role_name, u.created_at
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.role_id
      ORDER BY u.created_at DESC
      LIMIT 20
    `);
    
    console.log(`\n📊 Found ${usersResult.rows.length} users:`);
    console.table(usersResult.rows);
    
    // Check total count
    const countResult = await pool.query('SELECT COUNT(*) as total FROM users');
    console.log(`\n📈 Total users in database: ${countResult.rows[0].total}`);
    
    // Check user_statistics table
    const statsResult = await pool.query(`
      SELECT COUNT(*) as total FROM user_statistics
    `);
    console.log(`📊 User statistics records: ${statsResult.rows[0].total}`);
    
  } catch (error) {
    console.error('❌ Error checking users:', error);
  } finally {
    await pool.end();
  }
}

checkUsers();