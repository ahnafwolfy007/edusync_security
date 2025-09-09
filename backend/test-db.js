#!/usr/bin/env node

/**
 * Database Connection Test Script
 * Tests the connection to Aiven.io PostgreSQL database
 */

require('dotenv').config();
const dbConfig = require('./config/db');

async function testDatabaseConnection() {
  console.log('🔗 Testing EduSync Database Connection...\n');
  
  try {
    // Initialize database connection
    console.log('⏳ Initializing database connection...');
    const db = await dbConfig.init();
    
    // Test basic query
    console.log('⏳ Testing basic query...');
    const result = await db.query('SELECT version(), current_database(), current_user');
    
    console.log('✅ Database Connection Successful!\n');
    console.log('📊 Connection Details:');
    console.log(`   PostgreSQL Version: ${result.rows[0].version.split(' ')[1]}`);
    console.log(`   Database: ${result.rows[0].current_database}`);
    console.log(`   User: ${result.rows[0].current_user}`);
    console.log(`   Host: ${process.env.DB_HOST}`);
    console.log(`   Port: ${process.env.DB_PORT}\n`);
    
    // Test table creation
    console.log('⏳ Testing table creation...');
    await db.createTables();
    console.log('✅ Tables created/verified successfully!\n');
    
    // Test statistics query
    console.log('⏳ Testing statistics query...');
    const stats = await db.getStats();
    console.log('✅ Statistics query successful!');
    console.log('📈 Current Statistics:');
    console.log(`   Total Users: ${stats.totals.users}`);
    console.log(`   Total Businesses: ${stats.totals.businesses}`);
    console.log(`   Total Products: ${stats.totals.products}`);
    console.log(`   Pending Applications: ${stats.totals.pendingApplications}\n`);
    
    // Test CRUD operations
    console.log('⏳ Testing CRUD operations...');
    
    // Create a test user
    const testUser = await db.create('users', {
      full_name: 'Test User',
      email: `test${Date.now()}@edusync.edu`,
      password_hash: 'test_hash',
      phone: '+8801700000000',
      institution: 'Test University',
      location: 'Test City'
    });
    console.log('✅ User created successfully:', testUser.email);
    
    // Find the test user
    const foundUser = await db.findById('users', testUser.user_id, 'user_id');
    console.log('✅ User retrieved successfully:', foundUser.full_name);
    
    // Update the test user
    const updatedUser = await db.update('users', testUser.user_id, {
      full_name: 'Updated Test User'
    }, 'user_id');
    console.log('✅ User updated successfully:', updatedUser.full_name);
    
    // Delete the test user
    const deletedUser = await db.delete('users', testUser.user_id, 'user_id');
    console.log('✅ User deleted successfully:', deletedUser.email);
    
    console.log('\n🎉 All database tests passed successfully!');
    console.log('✅ EduSync is ready to use with Aiven.io PostgreSQL database.');
    
  } catch (error) {
    console.error('\n❌ Database Connection Failed!');
    console.error('Error Details:', error.message);
    
    if (error.code) {
      console.error('Error Code:', error.code);
    }
    
    console.log('\n🔧 Troubleshooting Tips:');
    console.log('1. Check your internet connection');
    console.log('2. Verify database credentials in .env file');
    console.log('3. Ensure Aiven.io database is running');
    console.log('4. Check firewall settings');
    console.log('5. Verify SSL configuration');
    
    process.exit(1);
  } finally {
    // Close database connection
    await dbConfig.close();
  }
}

// Run the test
if (require.main === module) {
  testDatabaseConnection();
}

module.exports = testDatabaseConnection;
