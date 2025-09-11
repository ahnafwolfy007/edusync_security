#!/usr/bin/env node
/**
 * reseedAll.js
 * Forcefully wipes most domain tables and repopulates with fresh demo data.
 * USE WITH CAUTION: This is destructive. Requires --yes flag or RESEED_CONFIRM=YES.
 */
require('dotenv').config();
const dbConfig = require('./config/db');
const { aaa_7, generateSaltFromEmail } = require('./utils/simpleHash');

function buildCustomHash(password, email) {
  const salt = generateSaltFromEmail(email).slice(0, 8); // trim for brevity
  const work = 1500; const bits = 128;
  const { hash } = aaa_7(password + email, salt, work, bits);
  return `aaa_7$${work}$${bits}$${salt}$${hash}`;
}

async function truncateAll(client) {
  console.log('⚠️ Truncating tables (CASCADE)...');
  await client.query(`TRUNCATE TABLE 
    chat_messages,
    chats,
    free_marketplace_favorites,
    free_marketplace_requests,
    free_marketplace_items,
    notifications,
    job_applications,
    jobs,
    notices,
    lost_found_items,
    transactions,
    payments,
    food_order_items,
    food_orders,
    food_items,
    food_vendors,
    rental_orders,
    rental_products,
    secondhand_orders,
    secondhand_items,
    business_order_items,
    business_orders,
    business_products,
    businesses,
    business_applications,
    accommodation_images,
    accommodation_inquiries,
    accommodation_properties,
    wallets,
    users
    RESTART IDENTITY CASCADE;`);
}

async function seedRoles(client) {
  console.log('Seeding roles...');
  await client.query(`INSERT INTO roles (role_name) VALUES ('admin'),('moderator'),('student'),('business_owner'),('food_vendor') ON CONFLICT DO NOTHING`);
}

async function seedUsers(client) {
  console.log('Seeding users...');
  const base = [
    { name: 'Super Admin', email: 'admin@demo.local', role: 'admin' },
    { name: 'Op Moderator', email: 'moderator@demo.local', role: 'moderator' },
    { name: 'Bella Student', email: 'bella@demo.local', role: 'student' },
    { name: 'Carlos Owner', email: 'carlos@demo.local', role: 'business_owner' },
    { name: 'Vera Vendor', email: 'vera@demo.local', role: 'food_vendor' },
    { name: 'Eli Student', email: 'eli@demo.local', role: 'student' },
    { name: 'Nina Student', email: 'nina@demo.local', role: 'student' }
  ];
  const roleMap = {};
  const { rows: roleRows } = await client.query('SELECT role_id, role_name FROM roles');
  roleRows.forEach(r => roleMap[r.role_name] = r.role_id);
  for (const u of base) {
    const pw = buildCustomHash('Password123!', u.email);
    await client.query(`INSERT INTO users (full_name,email,password_hash,role_id,phone,institution,location,is_email_verified,created_at,updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,true,NOW(),NOW())`, [
        u.name,
        u.email,
        pw,
        roleMap[u.role],
        '+8801700000000',
        'Demo University',
        'Campus'
      ]);
  }
}

async function seedBusinesses(client) {
  console.log('Seeding business application + business...');
  const { rows: students } = await client.query(`SELECT user_id FROM users u JOIN roles r ON u.role_id=r.role_id WHERE r.role_name='student' LIMIT 2`);
  const { rows: owners } = await client.query(`SELECT user_id FROM users u JOIN roles r ON u.role_id=r.role_id WHERE r.role_name='business_owner' LIMIT 1`);
  if (students[0]) {
    await client.query(`INSERT INTO business_applications (user_id,business_name,business_type,status,applied_at)
      VALUES ($1,'Campus Prints','printing','pending',NOW())`, [students[0].user_id]);
  }
  if (owners[0]) {
    await client.query(`INSERT INTO businesses (owner_id,business_name,business_type,is_verified,created_at,updated_at)
      VALUES ($1,'Quick Snacks','food',true,NOW(),NOW())`, [owners[0].user_id]);
    const { rows: biz } = await client.query('SELECT business_id FROM businesses LIMIT 1');
    if (biz[0]) {
      await client.query(`INSERT INTO business_products (business_id,product_name,description,price,stock_quantity,is_active,created_at,updated_at)
        VALUES ($1,'Notebook Pack','Pack of 5',250,100,true,NOW(),NOW()),($1,'Campus Hoodie','Warm hoodie',1500,25,true,NOW(),NOW())`, [biz[0].business_id]);
    }
  }
}

async function seedFood(client) {
  console.log('Seeding food vendor + items...');
  const { rows: vendors } = await client.query(`SELECT user_id FROM users u JOIN roles r ON u.role_id=r.role_id WHERE r.role_name='food_vendor' LIMIT 1`);
  if (vendors[0]) {
    await client.query(`INSERT INTO food_vendors (owner_id,shop_name,cuisine,address,phone,is_verified,created_at,updated_at)
      VALUES ($1,'Tasty Corner','Snacks','Main Hall','+123456789',true,NOW(),NOW())`, [vendors[0].user_id]);
    const { rows: v } = await client.query('SELECT vendor_id FROM food_vendors LIMIT 1');
    if (v[0]) {
      await client.query(`INSERT INTO food_items (vendor_id,item_name,description,price,is_active,created_at,updated_at)
        VALUES ($1,'Burger Combo','Burger with fries',250,true,NOW(),NOW()),($1,'Veg Wrap','Healthy wrap',180,true,NOW(),NOW())`, [v[0].vendor_id]);
    }
  }
}

async function seedSecondhand(client) {
  console.log('Seeding secondhand items...');
  const { rows: sellers } = await client.query(`SELECT user_id FROM users u JOIN roles r ON u.role_id=r.role_id WHERE r.role_name='student' LIMIT 3`);
  for (const s of sellers) {
    await client.query(`INSERT INTO secondhand_items (seller_id,item_name,description,price,condition,terms_conditions,is_active,posted_at)
      VALUES ($1,'Used Textbook','Algorithms book',500,'Good','No returns',true,NOW()),($1,'Old Laptop','Legacy device',12000,'Fair','As-is',true,NOW())`, [s.user_id]);
  }
}

async function seedWallets(client) {
  console.log('Seeding wallets + initial transactions...');
  const { rows: users } = await client.query('SELECT user_id FROM users');
  for (const u of users) {
    const { rows: w } = await client.query(`INSERT INTO wallets (user_id,balance,created_at,updated_at) VALUES ($1,1500,NOW(),NOW()) RETURNING wallet_id`, [u.user_id]);
    await client.query(`INSERT INTO transactions (wallet_id,amount,transaction_type,status,description,created_at)
      VALUES ($1,1500,'credit','completed','Initial credit',NOW())`, [w[0].wallet_id]);
  }
}

async function run() {
  const confirm = process.argv.includes('--yes') || process.env.RESEED_CONFIRM === 'YES';
  if (!confirm) {
    console.log('❌ Confirmation missing. Run with --yes or set RESEED_CONFIRM=YES');
    process.exit(1);
  }
  await dbConfig.init();
  const client = await dbConfig.db.pool.connect();
  try {
    await truncateAll(client);
    await seedRoles(client);
    await seedUsers(client);
    await seedBusinesses(client);
    await seedFood(client);
    await seedSecondhand(client);
    await seedWallets(client);
    console.log('✅ Reseed complete.');
  } catch (e) {
    console.error('❌ Reseed failed:', e.message);
    process.exit(1);
  } finally {
    client.release();
    await dbConfig.close();
  }
}

run();
