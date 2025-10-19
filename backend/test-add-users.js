const dbConfig = require('./config/db');
const bcrypt = require('bcrypt');

async function addTestUsers() {
  try {
    console.log('🔄 Adding test users to database...');
    
    const db = dbConfig.db;
    
    // First, let's check if we have roles in the database
    const rolesResult = await db.query('SELECT * FROM roles ORDER BY role_id');
    console.log('Available roles:', rolesResult.rows);
    
    if (rolesResult.rows.length === 0) {
      console.log('⚠️ No roles found. Creating default roles...');
      await db.query(`
        INSERT INTO roles (role_name, description) VALUES 
        ('user', 'Regular user'),
        ('business_owner', 'Business owner'),
        ('food_vendor', 'Food vendor'),
        ('moderator', 'Moderator'),
        ('admin', 'Administrator')
        ON CONFLICT (role_name) DO NOTHING
      `);
    }
    
    // Get roles for reference
    const updatedRoles = await db.query('SELECT * FROM roles ORDER BY role_id');
    const roleMap = {};
    updatedRoles.rows.forEach(role => {
      roleMap[role.role_name] = role.role_id;
    });
    
    // Test users data
    const testUsers = [
      {
        full_name: 'John Doe',
        email: 'john.doe@test.edu',
        password: 'password123',
        phone: '+8801700000001',
        role: 'user',
        institution: 'University of Technology',
        location: 'Dhaka, Bangladesh'
      },
      {
        full_name: 'Jane Smith',
        email: 'jane.smith@test.edu',
        password: 'password123',
        phone: '+8801700000002',
        role: 'business_owner',
        institution: 'Business University',
        location: 'Chittagong, Bangladesh'
      },
      {
        full_name: 'Bob Johnson',
        email: 'bob.johnson@test.edu',
        password: 'password123',
        phone: '+8801700000003',
        role: 'food_vendor',
        institution: 'Culinary Institute',
        location: 'Sylhet, Bangladesh'
      },
      {
        full_name: 'Alice Brown',
        email: 'alice.brown@test.edu',
        password: 'password123',
        phone: '+8801700000004',
        role: 'user',
        institution: 'Science University',
        location: 'Rajshahi, Bangladesh'
      },
      {
        full_name: 'Charlie Wilson',
        email: 'charlie.wilson@test.edu',
        password: 'password123',
        phone: '+8801700000005',
        role: 'moderator',
        institution: 'Admin College',
        location: 'Khulna, Bangladesh'
      }
    ];
    
    console.log('💼 Creating test users...');
    
    for (const userData of testUsers) {
      try {
        // Check if user already exists
        const existingUser = await db.query(
          'SELECT user_id FROM users WHERE email = $1',
          [userData.email]
        );
        
        if (existingUser.rows.length > 0) {
          console.log(`⚪ User ${userData.email} already exists, skipping...`);
          continue;
        }
        
        // Hash password
        const passwordHash = await bcrypt.hash(userData.password, 12);
        
        // Insert user
        const result = await db.query(`
          INSERT INTO users (
            full_name, email, password_hash, phone, role_id, 
            institution, location, login_count, is_email_verified
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING user_id, full_name, email
        `, [
          userData.full_name,
          userData.email,
          passwordHash,
          userData.phone,
          roleMap[userData.role],
          userData.institution,
          userData.location,
          Math.floor(Math.random() * 50) + 1, // Random login count 1-50
          true // Email verified
        ]);
        
        console.log(`✅ Created user: ${result.rows[0].full_name} (${result.rows[0].email})`);
        
      } catch (userError) {
        console.error(`❌ Error creating user ${userData.email}:`, userError.message);
      }
    }
    
    // Show final user count
    const userCount = await db.query('SELECT COUNT(*) as count FROM users');
    console.log(`\n📊 Total users in database: ${userCount.rows[0].count}`);
    
    // Show users by role
    const usersByRole = await db.query(`
      SELECT r.role_name, COUNT(u.user_id) as count
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.role_id
      GROUP BY r.role_name
      ORDER BY count DESC
    `);
    
    console.log('\n👥 Users by role:');
    usersByRole.rows.forEach(row => {
      console.log(`   ${row.role_name}: ${row.count} users`);
    });
    
    console.log('\n🎉 Test users added successfully!');
    
  } catch (error) {
    console.error('❌ Error adding test users:', error);
  } finally {
    process.exit(0);
  }
}

// Initialize database connection and add users
dbConfig.initializeDatabase().then(() => {
  addTestUsers();
}).catch(error => {
  console.error('Database initialization failed:', error);
  process.exit(1);
});