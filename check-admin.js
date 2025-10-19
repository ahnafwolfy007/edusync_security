/**
 * Admin Account Checker and Creator
 * This script checks if admin accounts exist and can create test admin accounts
 */

const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'edusync',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD
});

async function checkAdminAccounts() {
  try {
    console.log('🔍 Checking for admin accounts...\n');
    
    const result = await pool.query(`
      SELECT 
        u.user_id,
        u.full_name,
        u.email,
        u.phone,
        r.role_name,
        u.is_email_verified,
        u.created_at
      FROM users u
      JOIN roles r ON u.role_id = r.role_id
      WHERE r.role_name = 'admin'
      ORDER BY u.created_at DESC
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ No admin accounts found in the database.\n');
      console.log('💡 To create an admin account, you can:');
      console.log('   1. Register a new user through the registration page');
      console.log('   2. Update their role to admin using SQL:');
      console.log('      UPDATE users SET role_id = (SELECT role_id FROM roles WHERE role_name = \'admin\')');
      console.log('      WHERE email = \'your-email@domain.com\';\n');
      return false;
    }
    
    console.log(`✅ Found ${result.rows.length} admin account(s):\n`);
    result.rows.forEach((admin, index) => {
      console.log(`📋 Admin #${index + 1}:`);
      console.log(`   ID: ${admin.user_id}`);
      console.log(`   Name: ${admin.full_name}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Phone: ${admin.phone || 'N/A'}`);
      console.log(`   Email Verified: ${admin.is_email_verified ? '✅ Yes' : '❌ No'}`);
      console.log(`   Created: ${new Date(admin.created_at).toLocaleString()}`);
      console.log('');
    });
    
    console.log('✨ To test admin 2FA login:');
    console.log('   1. Navigate to http://localhost:5174/login');
    console.log(`   2. Enter email: ${result.rows[0].email}`);
    console.log('   3. Enter password (the one used during registration)');
    console.log('   4. Check your email for the OTP code');
    console.log('   5. Enter the 6-digit OTP to complete login\n');
    
    return true;
  } catch (error) {
    console.error('❌ Error checking admin accounts:', error.message);
    return false;
  }
}

async function makeUserAdmin(email) {
  try {
    console.log(`🔄 Converting user ${email} to admin...`);
    
    // Check if user exists
    const userCheck = await pool.query(
      'SELECT user_id, full_name FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (userCheck.rows.length === 0) {
      console.log('❌ User not found with that email.');
      return false;
    }
    
    const user = userCheck.rows[0];
    
    // Update to admin role
    await pool.query(`
      UPDATE users 
      SET role_id = (SELECT role_id FROM roles WHERE role_name = 'admin'),
          is_email_verified = TRUE,
          email_verified_at = NOW()
      WHERE email = $1
    `, [email.toLowerCase()]);
    
    console.log(`✅ Successfully made ${user.full_name} (${email}) an admin!`);
    return true;
  } catch (error) {
    console.error('❌ Error making user admin:', error.message);
    return false;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('     EduSync Admin Account Management Tool');
  console.log('═══════════════════════════════════════════════\n');
  
  const args = process.argv.slice(2);
  
  if (args[0] === 'make-admin' && args[1]) {
    await makeUserAdmin(args[1]);
  } else if (args[0] === 'check' || args.length === 0) {
    await checkAdminAccounts();
  } else {
    console.log('Usage:');
    console.log('  node check-admin.js                  - Check existing admin accounts');
    console.log('  node check-admin.js check            - Check existing admin accounts');
    console.log('  node check-admin.js make-admin <email> - Make user admin\n');
    console.log('Example:');
    console.log('  node check-admin.js make-admin user@example.com\n');
  }
  
  await pool.end();
}

main().catch(console.error);
