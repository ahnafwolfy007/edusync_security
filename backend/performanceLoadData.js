#!/usr/bin/env node
/**
 * performanceLoadData.js
 * Generates high-volume randomized load data to stress test queries and admin dashboards.
 * Can be run after a clean reseed to inflate dataset sizes (products, orders, transactions, etc.).
 *
 * Data Volumes (defaults; override via env vars or CLI flags):
 *  --users N (additional students) default 50
 *  --bizProducts N per existing business default 40
 *  --bizOrders N total business orders default 300
 *  --foodOrders N total food orders default 300
 *  --secondhand N items total default 150
 *  --transactions N extra wallet transactions default 500
 *  --timeSeriesDays D generate daily synthetic stats for last D days (as notices) default 30
 *
 * Safety: requires --yes or PERF_CONFIRM=YES.
 * NOTE: This script assumes schema already exists. It avoids modifying roles or base seeded admin/mod users.
 */
require('dotenv').config();
const dbConfig = require('./config/db');
const { aaa_7, generateSaltFromEmail } = require('./utils/simpleHash');

function argVal(flag, def) {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && process.argv[idx+1]) return parseInt(process.argv[idx+1],10);
  return def;
}

const ADD_USERS = argVal('--users', parseInt(process.env.LOAD_USERS||'50',10));
const PROD_PER_BIZ = argVal('--bizProducts', parseInt(process.env.LOAD_BIZ_PRODUCTS||'40',10));
const BIZ_ORDERS = argVal('--bizOrders', parseInt(process.env.LOAD_BIZ_ORDERS||'300',10));
const FOOD_ORDERS = argVal('--foodOrders', parseInt(process.env.LOAD_FOOD_ORDERS||'300',10));
const SECONDHAND_ITEMS = argVal('--secondhand', parseInt(process.env.LOAD_SECONDHAND||'150',10));
const EXTRA_TRANSACTIONS = argVal('--transactions', parseInt(process.env.LOAD_TRANSACTIONS||'500',10));
const TS_DAYS = argVal('--timeSeriesDays', parseInt(process.env.LOAD_TIMESERIES_DAYS||'30',10));

function rand(arr){return arr[Math.floor(Math.random()*arr.length)];}
function randInt(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
function sampleWords(n){
  const words=['campus','eco','smart','quick','snack','print','tech','learn','book','gear','hub','cloud','nova','byte','pulse'];
  let out=[];for(let i=0;i<n;i++) out.push(rand(words));return out.join('-');
}

async function ensureExtraStudents(client, count){
  console.log(`👥 Ensuring ${count} additional student users...`);
  const { rows: role } = await client.query(`SELECT role_id FROM roles WHERE role_name='student'`);
  if(!role.length) throw new Error('student role missing');
  const roleId = role[0].role_id;
  const existing = await client.query(`SELECT COUNT(*) FROM users WHERE email LIKE 'load_student_%'`);
  const have = parseInt(existing.rows[0].count,10);
  const need = Math.max(0, count - have);
  for(let i=have;i<have+need;i++){
    const email=`load_student_${i}@demo.local`;
    const salt=generateSaltFromEmail(email).slice(0,8); const work=1000; const bits=128;
    const { hash } = aaa_7('Password123!'+email, salt, work, bits);
    const pw=`aaa_7$${work}$${bits}$${salt}$${hash}`;
    await client.query(`INSERT INTO users (full_name,email,password_hash,role_id,institution,location,is_email_verified,created_at,updated_at) VALUES ($1,$2,$3,$4,'Demo University','Load Zone',true,NOW(),NOW())`,[
      `Load Student ${i}`, email, pw, roleId
    ]);
  }
}

async function inflateBusinessProducts(client){
  console.log(`🛍 Adding up to ${PROD_PER_BIZ} products per business (idempotent-ish)...`);
  const { rows: biz } = await client.query('SELECT business_id FROM businesses');
  for(const b of biz){
    const { rows: countRows } = await client.query('SELECT COUNT(*) FROM business_products WHERE business_id=$1',[b.business_id]);
    const have = parseInt(countRows[0].count,10);
    for(let i=have;i<PROD_PER_BIZ;i++){
      await client.query(`INSERT INTO business_products (business_id,product_name,description,price,stock_quantity,is_active,created_at,updated_at)
        VALUES ($1,$2,$3,$4,$5,true,NOW(),NOW())`,[
          b.business_id,
          `Prod-${i}-${sampleWords(2)}`,
          'Load generated product',
          randInt(50,2000),
          randInt(5,500)
        ]);
    }
  }
}

async function generateBusinessOrders(client){
  console.log(`📦 Generating ${BIZ_ORDERS} business orders...`);
  const { rows: prods } = await client.query('SELECT product_id,business_id,price FROM business_products');
  if(!prods.length) { console.log('No products, skipping business orders'); return; }
  const { rows: students } = await client.query(`SELECT user_id FROM users u JOIN roles r ON u.role_id=r.role_id WHERE r.role_name='student'`);
  for(let i=0;i<BIZ_ORDERS;i++){
    const p = rand(prods); const buyer = rand(students);
    const qty = randInt(1,4); const total = Number(p.price||randInt(100,800))*qty;
    const daysAgo = randInt(0,20);
    const { rows: ord } = await client.query(`INSERT INTO business_orders (user_id,business_id,total_amount,status,payment_method,created_at) VALUES ($1,$2,$3,'delivered','wallet',NOW() - ($4 * INTERVAL '1 day')) RETURNING order_id`,[
      buyer.user_id, p.business_id, total, daysAgo]);
    await client.query(`INSERT INTO business_order_items (order_id,product_id,quantity,price,terms_accepted) VALUES ($1,$2,$3,$4,true)`,[
      ord[0].order_id,p.product_id,qty,total/qty
    ]);
  }
}

async function generateFoodOrders(client){
  console.log(`🍽 Generating ${FOOD_ORDERS} food orders...`);
  const { rows: items } = await client.query('SELECT food_item_id,vendor_id,price FROM food_items');
  if(!items.length){ console.log('No food items, skipping'); return; }
  const { rows: students } = await client.query(`SELECT user_id FROM users u JOIN roles r ON u.role_id=r.role_id WHERE r.role_name='student'`);
  for(let i=0;i<FOOD_ORDERS;i++){
    const it = rand(items); const buyer = rand(students); const qty = randInt(1,3);
    const total = Number(it.price||randInt(80,400))*qty;
    const daysAgo = randInt(0,20);
    const { rows: fo } = await client.query(`INSERT INTO food_orders (user_id,vendor_id,total_amount,status,created_at,order_date,delivered_at) VALUES ($1,$2,$3,'delivered',NOW() - ($4 * INTERVAL '1 day'), (NOW() - ($4 * INTERVAL '1 day'))::date, NOW() - ($4 * INTERVAL '1 day')) RETURNING order_id`,[
      buyer.user_id,it.vendor_id,total,daysAgo]);
    await client.query(`INSERT INTO food_order_items (order_id,food_item_id,quantity) VALUES ($1,$2,$3)`,[fo[0].order_id,it.food_item_id,qty]);
  }
}

async function generateSecondhandItems(client){
  console.log(`♻ Adding up to ${SECONDHAND_ITEMS} secondhand items...`);
  const { rows: students } = await client.query(`SELECT user_id FROM users u JOIN roles r ON u.role_id=r.role_id WHERE r.role_name='student'`);
  const { rows: countRows } = await client.query('SELECT COUNT(*) FROM secondhand_items');
  let have = parseInt(countRows[0].count,10);
  for(let i=have;i<SECONDHAND_ITEMS;i++){
    const seller = rand(students);
    const daysAgo = randInt(0,30);
    await client.query(`INSERT INTO secondhand_items (seller_id,item_name,description,price,condition,terms_conditions,is_active,posted_at)
      VALUES ($1,$2,$3,$4,$5,'Load demo',true,NOW() - ($6 * INTERVAL '1 day'))`,[
        seller.user_id,
        `SH-${sampleWords(2)}-${i}`,
        'Load generated secondhand item',
        randInt(100,7000),
        rand(['Good','Fair','Like New','Used']),
        daysAgo
      ]);
  }
}

async function generateTransactions(client){
  console.log(`💳 Generating ${EXTRA_TRANSACTIONS} extra wallet transactions...`);
  const { rows: wallets } = await client.query('SELECT wallet_id FROM wallets');
  if(!wallets.length) return;
  for(let i=0;i<EXTRA_TRANSACTIONS;i++){
    const w = rand(wallets); const amt = randInt(50,1000); const type = rand(['credit','debit']);
    const daysAgo = randInt(0,15);
    await client.query(`INSERT INTO transactions (wallet_id,amount,transaction_type,status,description,created_at) VALUES ($1,$2,$3,'completed',$4,NOW() - ($5 * INTERVAL '1 day'))`,[
      w.wallet_id, amt, type, type==='credit'?'Load top-up':'Load spend', daysAgo
    ]);
  }
}

async function generateTimeSeriesNotices(client){
  if (TS_DAYS <= 0) return;
  console.log(`📊 Generating ${TS_DAYS} synthetic daily stat notices (time-series placeholder)...`);
  const { rows: admin } = await client.query(`SELECT u.user_id FROM users u JOIN roles r ON u.role_id=r.role_id WHERE r.role_name='admin' LIMIT 1`);
  if(!admin.length) return;
  for(let d=0; d<TS_DAYS; d++){
    const day = `NOW() - '${d} days'::interval`;
    await client.query(`INSERT INTO notices (posted_by,title,content,category,is_pinned,created_at)
      VALUES ($1,$2,$3,'Administration',false,${day}) ON CONFLICT DO NOTHING`,[
        admin[0].user_id,
        `Daily Metrics D-${d}`,
        `Orders:${randInt(50,300)}; GMV:${randInt(5000,60000)}; NewUsers:${randInt(5,40)}; Tickets:${randInt(0,15)}`
      ]);
  }
}

async function run(){
  const confirm = process.argv.includes('--yes') || process.env.PERF_CONFIRM==='YES';
  if(!confirm){
    console.log('❌ Confirmation missing. Run with --yes or set PERF_CONFIRM=YES');
    process.exit(1);
  }
  await dbConfig.init();
  const client = await dbConfig.db.pool.connect();
  try {
    await ensureExtraStudents(client, ADD_USERS);
    await inflateBusinessProducts(client);
    await generateBusinessOrders(client);
    await generateFoodOrders(client);
    await generateSecondhandItems(client);
    await generateTransactions(client);
    await generateTimeSeriesNotices(client);
    console.log('✅ Performance load data generation complete.');
  } catch(e){
    console.error('❌ Load generation failed:', e.message);
    process.exit(1);
  } finally {
    client.release();
    await dbConfig.close();
  }
}

run();
