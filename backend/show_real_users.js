const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function getUsersForFrontend() {
  try {
    console.log('🔄 Fetching users in the format expected by frontend...');
    
    // This is the exact query used in adminController.js
    const query = `
      SELECT 
        u.user_id,
        u.full_name,
        u.email,
        u.phone,
        u.institution,
        u.location,
        u.created_at,
        u.updated_at,
        u.is_email_verified,
        u.profile_picture,
        r.role_name,
        COALESCE(u.login_count, 0) as login_count,
        u.last_login,
        0 as total_purchases,
        0 as total_sales
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.role_id
      ORDER BY u.created_at DESC 
      LIMIT 10
    `;
    
    const result = await pool.query(query);
    
    console.log('\n📊 Users data that should be displayed in frontend:');
    console.log('='.repeat(60));
    
    result.rows.forEach((user, index) => {
      console.log(`\n👤 User ${index + 1}:`);
      console.log(`   ID: ${user.user_id}`);
      console.log(`   Name: ${user.full_name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Phone: ${user.phone || 'Not provided'}`);
      console.log(`   Role: ${user.role_name}`);
      console.log(`   Institution: ${user.institution || 'Not provided'}`);
      console.log(`   Location: ${user.location || 'Not provided'}`);
      console.log(`   Login Count: ${user.login_count}`);
      console.log(`   Last Login: ${user.last_login || 'Never'}`);
      console.log(`   Email Verified: ${user.is_email_verified ? 'Yes' : 'No'}`);
      console.log(`   Joined: ${new Date(user.created_at).toLocaleDateString()}`);
    });
    
    console.log('\n📝 Sample JSON format for frontend:');
    console.log(JSON.stringify(result.rows[0], null, 2));
    
    // Count by roles
    const roleQuery = `
      SELECT r.role_name, COUNT(*) as count
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.role_id
      GROUP BY r.role_name
      ORDER BY count DESC
    `;
    
    const roleResult = await pool.query(roleQuery);
    console.log('\n📈 User distribution by role:');
    roleResult.rows.forEach(role => {
      console.log(`   ${role.role_name}: ${role.count} users`);
    });
    
  } catch (error) {
    console.error('❌ Error fetching users:', error);
  } finally {
    await pool.end();
  }
}

getUsersForFrontend();