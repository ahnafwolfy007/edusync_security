#!/usr/bin/env node
/**
 * Dummy data seeding script for EduSync
 * Populates roles (if empty), users (admin, moderator, students),
 * businesses, products, business orders, food vendors, food items,
 * secondhand items, rental products, accommodations, payments, wallets,
 * transactions, notices, lost & found, free marketplace items.
 */
require('dotenv').config();
const dbConfig = require('./config/db');
const crypto = require('crypto');

// Simple password hash placeholder (use same field name as existing schema expects: password_hash)
function hashPassword(pw) {
  return crypto.createHash('sha256').update(pw).digest('hex');
}

async function seed() {
  await dbConfig.init();
  const db = dbConfig.db;

  const now = new Date();
  const dateISO = now.toISOString();

  // Helper to get role_id by name
  async function getRoleId(roleName) {
    const { rows } = await db.query('SELECT role_id FROM roles WHERE role_name = $1', [roleName]);
    if (!rows.length) throw new Error('Role missing: ' + roleName);
    return rows[0].role_id;
  }

  // Seed Users
  const existingUsers = await db.query('SELECT COUNT(*) FROM users');
  if (parseInt(existingUsers.rows[0].count, 10) === 0) {
    console.log('Seeding users...');
    const roles = ['admin','moderator','student','business_owner','food_vendor'];
    const roleMap = {};
    for (const r of roles) roleMap[r] = await getRoleId(r);

    const usersData = [
      { full_name: 'Alice Admin', email: 'admin@demo.local', role: 'admin' },
      { full_name: 'Mona Moderator', email: 'moderator@demo.local', role: 'moderator' },
      { full_name: 'Bob Student', email: 'bob@demo.local', role: 'student' },
      { full_name: 'Carol Student', email: 'carol@demo.local', role: 'student' },
      { full_name: 'Dan Student', email: 'dan@demo.local', role: 'student' }
    ];

    for (const u of usersData) {
      await db.query(`INSERT INTO users (full_name,email,password_hash,role_id,institution,location,created_at,updated_at,is_email_verified)
        VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW(),true)`, [
        u.full_name,
        u.email,
        hashPassword('Password123!'),
        roleMap[u.role],
        'EduSync University',
        'Campus North'
      ]);
    }
  } else {
    console.log('Users already exist, skipping user seed.');
  }

  // Fetch some user ids for relationships
  const { rows: userRows } = await db.query('SELECT user_id, email FROM users ORDER BY user_id ASC');
  const adminUser = userRows.find(u => u.email === 'admin@demo.local') || userRows[0];
  const moderatorUser = userRows.find(u => u.email === 'moderator@demo.local') || userRows[1];
  const studentUsers = userRows.filter(u => !['admin@demo.local','moderator@demo.local'].includes(u.email));

  // Businesses & Applications
  const existingBusinesses = await db.query('SELECT COUNT(*) FROM businesses');
  if (parseInt(existingBusinesses.rows[0].count,10) === 0) {
    console.log('Seeding businesses & applications...');
    // Create a pending application for first student
    if (studentUsers[0]) {
      await db.query(`INSERT INTO business_applications (user_id,business_name,business_type,license_info,status) VALUES ($1,$2,$3,$4,'pending')`,[
        studentUsers[0].user_id,'Campus Prints','printing','LIC-PRINT-001'
      ]);
    }
    // Create approved business directly
    if (studentUsers[1]) {
      await db.query(`INSERT INTO businesses (owner_id,business_name,business_type,is_verified,created_at,updated_at)
        VALUES ($1,$2,$3,true,NOW(),NOW())`, [studentUsers[1].user_id,'Quick Snacks','food']);
    }
  } else {
    console.log('Businesses already exist, skipping.');
  }

  // Business Products
  const { rows: bizRows } = await db.query('SELECT business_id FROM businesses');
  if (bizRows.length) {
    const { rows: productCount } = await db.query('SELECT COUNT(*) FROM business_products');
    if (parseInt(productCount[0].count,10) === 0) {
      console.log('Seeding business products...');
      for (const b of bizRows) {
        await db.query(`INSERT INTO business_products (business_id,product_name,description,price,stock_quantity,is_active,created_at,updated_at)
          VALUES ($1,'Notebook Pack','Pack of 5 notebooks',250,100,true,NOW(),NOW()),($1,'Campus Hoodie','Warm hoodie',1500,25,true,NOW(),NOW())`,[b.business_id]);
      }
    }
  }

  // Business Orders (dummy delivered)
  const { rows: productRows } = await db.query('SELECT product_id,business_id FROM business_products');
  if (productRows.length) {
    const { rows: orderCount } = await db.query('SELECT COUNT(*) FROM business_orders');
    if (parseInt(orderCount[0].count,10) === 0) {
      console.log('Seeding business orders...');
      for (let i=0;i<Math.min(5, productRows.length);i++) {
        const prod = productRows[i];
        const buyer = studentUsers[i % studentUsers.length] || studentUsers[0];
        const orderRes = await db.query(`INSERT INTO business_orders (user_id,business_id,status,total_amount,created_at) VALUES ($1,$2,'delivered',$3,NOW()) RETURNING order_id`,[
          buyer.user_id, prod.business_id,  prod.product_id % 2 === 0 ? 1500 : 250
        ]);
        await db.query(`INSERT INTO business_order_items (order_id,product_id,quantity,price,terms_accepted) VALUES ($1,$2,1,$3,true)`,[
          orderRes.rows[0].order_id, prod.product_id, prod.product_id % 2 === 0 ? 1500 : 250
        ]);
      }
    }
  }

  // Food Vendors
  const vendorCount = await db.query('SELECT COUNT(*) FROM food_vendors');
  if (parseInt(vendorCount.rows[0].count,10) === 0) {
    console.log('Seeding food vendors...');
    if (studentUsers[2]) {
      await db.query(`INSERT INTO food_vendors (owner_id,shop_name,cuisine,address,phone,is_verified,created_at,updated_at)
        VALUES ($1,'Tasty Corner','Snacks','Main Hall','+123456789',true,NOW(),NOW())`,[studentUsers[2].user_id]);
    }
  }

  // Food Items
  const { rows: vendorRows } = await db.query('SELECT vendor_id FROM food_vendors');
  if (vendorRows.length) {
    const fiCount = await db.query('SELECT COUNT(*) FROM food_items');
    if (parseInt(fiCount.rows[0].count,10) === 0) {
      console.log('Seeding food items...');
      for (const v of vendorRows) {
        await db.query(`INSERT INTO food_items (vendor_id,item_name,description,price,is_active,created_at,updated_at)
          VALUES ($1,'Burger Combo','Burger with fries',250,true,NOW(),NOW()),($1,'Veg Wrap','Fresh vegetables wrap',180,true,NOW(),NOW())`,[v.vendor_id]);
      }
    }
  }

  // Secondhand Items
  const shCount = await db.query('SELECT COUNT(*) FROM secondhand_items');
  if (parseInt(shCount.rows[0].count,10) === 0) {
    console.log('Seeding secondhand items...');
    for (const s of studentUsers.slice(0,3)) {
      await db.query(`INSERT INTO secondhand_items (seller_id,item_name,description,price,condition,terms_conditions,is_active,posted_at)
        VALUES ($1,'Used Textbook','Intro to Algorithms',500,'Good','No returns',true,NOW()),($1,'Old Laptop','Still works fine',12000,'Fair','As-is',true,NOW())`,[s.user_id]);
    }
  }

  // Rental Products
  const rentCount = await db.query('SELECT COUNT(*) FROM rental_products');
  if (parseInt(rentCount.rows[0].count,10) === 0) {
    console.log('Seeding rental products...');
    await db.query(`INSERT INTO rental_products (owner_id,product_name,description,rent_per_day,terms_conditions,is_active)
      VALUES ($1,'DSLR Camera','High quality camera',400,'Handle with care',true),($2,'Projector','Portable projector',350,'Deposit required',true)`,[
        studentUsers[0].user_id, studentUsers[1].user_id
      ]);
  }

  // Accommodation Properties
  const accCount = await db.query('SELECT COUNT(*) FROM accommodation_properties');
  if (parseInt(accCount.rows[0].count,10) === 0) {
    console.log('Seeding accommodation properties...');
    await db.query(`INSERT INTO accommodation_properties (owner_id,property_type,title,description,location,rent_amount,deposit_amount,is_available,created_at,updated_at)
      VALUES ($1,'room','Shared Room','Cozy shared room','Dorm A',5000,1000,true,NOW(),NOW()),($2,'apartment','Studio Apartment','Compact studio','Campus Edge',9000,2000,true,NOW(),NOW())`,[
        studentUsers[0].user_id, studentUsers[1].user_id
      ]);
  }

  // Wallets & Transactions
  const walletCount = await db.query('SELECT COUNT(*) FROM wallets');
  if (parseInt(walletCount.rows[0].count,10) === 0) {
    console.log('Seeding wallets & transactions...');
    for (const u of userRows) {
      const { rows: w } = await db.query(`INSERT INTO wallets (user_id,balance,created_at,updated_at) VALUES ($1,1000,NOW(),NOW()) RETURNING wallet_id`,[u.user_id]);
      await db.query(`INSERT INTO transactions (wallet_id,amount,transaction_type,status,description,created_at) VALUES ($1,1000,'credit','completed','Initial top-up',NOW())`,[w[0].wallet_id]);
    }
  }

  // Payments
  const payCount = await db.query('SELECT COUNT(*) FROM payments');
  if (parseInt(payCount.rows[0].count,10) === 0 && productRows.length) {
    console.log('Seeding payments...');
    const seller = studentUsers[1] || adminUser;
    const buyer = studentUsers[2] || moderatorUser;
    await db.query(`INSERT INTO payments (buyer_id,seller_id,product_id,amount,payment_method,platform_fee,status,created_at)
      VALUES ($1,$2,$3,250,'wallet',10,'success',NOW())`,[
      buyer.user_id, seller.user_id, productRows[0].product_id
    ]);
  }

  // Notices
  const noticeCount = await db.query('SELECT COUNT(*) FROM notices');
  if (parseInt(noticeCount.rows[0].count,10) === 0) {
    console.log('Seeding notices...');
    await db.query(`INSERT INTO notices (posted_by,title,content,category,is_pinned,created_at)
      VALUES ($1,'Welcome to EduSync','Platform initialized with demo data','Administration',true,NOW())`,[adminUser.user_id]);
  }

  // Lost & Found
  const lfCount = await db.query('SELECT COUNT(*) FROM lost_found_items');
  if (parseInt(lfCount.rows[0].count,10) === 0) {
    console.log('Seeding lost & found...');
    await db.query(`INSERT INTO lost_found_items (user_id,item_type,title,description,location,contact_info,is_claimed,created_at)
      VALUES ($1,'lost','Lost USB Drive','Black 32GB USB','Library','email@example.com',false,NOW()),($2,'found','Found Calculator','Casio calculator','Lab 3','email@example.com',false,NOW())`,[
        studentUsers[0].user_id, studentUsers[1].user_id
      ]);
  }

  // Free marketplace items
  const freeCount = await db.query('SELECT COUNT(*) FROM free_marketplace_items');
  if (parseInt(freeCount.rows[0].count,10) === 0) {
    console.log('Seeding free marketplace items...');
    await db.query(`INSERT INTO free_marketplace_items (giver_id,item_name,description,pickup_location,contact_info,is_available,posted_at)
      VALUES ($1,'Old Notebook','Some used pages','Student Center','giver@example.com',true,NOW()),($2,'Spare Mouse','USB mouse working','Dorm B','giver@example.com',true,NOW())`,[
        studentUsers[0].user_id, studentUsers[1].user_id
      ]);
  }

  console.log('✅ Dummy data seeding complete');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seeding failed:', err.message);
  process.exit(1);
});
