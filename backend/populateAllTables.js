#!/usr/bin/env node
/**
 * populateAllTables.js
 * One-off comprehensive population script inserting representative rows into every major table.
 * Safe to re-run: checks presence / skips or appends with deterministic keys where viable.
 * NOTE: For large volume/performance data use performanceLoadData.js after running this.
 */
require('dotenv').config();
const dbConfig = require('./config/db');
const { aaa_7, generateSaltFromEmail } = require('./utils/simpleHash');

// Canonical hash builder aligned with registration flow (password only, full deterministic salt)
function buildHash(email, password='Password123!'){
  const salt = generateSaltFromEmail(email.toLowerCase());
  const work = 1000; // align with authConfig default
  const bits = 128;
  const { hash } = aaa_7(password, salt, work, bits);
  return `aaa_7$${work}$${bits}$${salt}$${hash}`;
}
function randInt(min,max){return Math.floor(Math.random()*(max-min+1))+min;}

async function ensureUsers(client){
  const baseUsers=[
    ['Super Admin','full_admin@demo.local','admin'],
    ['Campus Mod','campus_mod@demo.local','moderator'],
    ['Shop Owner A','owner_a@demo.local','business_owner'],
    ['Food Vendor A','vendor_a@demo.local','food_vendor'],
    ['Student One','student1@demo.local','student'],
    ['Student Two','student2@demo.local','student'],
    ['Student Three','student3@demo.local','student']
  ];
  const roles=await client.query('SELECT role_id, role_name FROM roles');
  const roleMap={}; roles.rows.forEach(r=>roleMap[r.role_name]=r.role_id);
  for(const [name,email,role] of baseUsers){
    await client.query(`INSERT INTO users (full_name,email,password_hash,role_id,institution,location,is_email_verified,created_at,updated_at)
      VALUES ($1,$2,$3,$4,'Demo University','Main Campus',true,NOW(),NOW()) ON CONFLICT (email) DO NOTHING`,
      [name,email,buildHash(email),roleMap[role]]);
  }
}

async function ensureBusinessFlow(client){
  // Application by student
  const {rows: student}=await client.query(`SELECT user_id FROM users u JOIN roles r ON u.role_id=r.role_id WHERE r.role_name='student' ORDER BY user_id LIMIT 1`);
  if(student[0]){
    await client.query(`INSERT INTO business_applications (user_id,business_name,business_type,license_info,status,applied_at,reviewed_at,review_comments)
      VALUES ($1,'Campus Print Hub','printing','LIC-PRN-001','approved',NOW()-INTERVAL '7 days',NOW()-INTERVAL '6 days','Approved for pilot')
      ON CONFLICT DO NOTHING`,[student[0].user_id]);
  }
  // Actual businesses from owner(s)
  const owners=await client.query(`SELECT user_id FROM users u JOIN roles r ON u.role_id=r.role_id WHERE r.role_name='business_owner'`);
  const businessSeeds=[
    { name:'Quick Snacks Corner', type:'food', desc:'Fast tasty campus snacks'},
    { name:'Campus Print Hub Live', type:'printing', desc:'High quality, fast printing services'},
    { name:'Study Supplies Store', type:'stationery', desc:'Notebooks, pens, study accessories'},
    { name:'Campus Fashion Spot', type:'apparel', desc:'Trendy student apparel'}
  ];
  let ownerIdx=0;
  for(const seed of businessSeeds){
    if(!owners.rows.length) break;
    const ownerId = owners.rows[ownerIdx % owners.rows.length].user_id;
    ownerIdx++;
    const biz = await client.query(`INSERT INTO businesses (owner_id,business_name,business_type,description,is_verified,created_at,updated_at)
      VALUES ($1,$2,$3,$4,true,NOW()-INTERVAL '10 days',NOW())
      ON CONFLICT DO NOTHING RETURNING business_id`,[ownerId,seed.name,seed.type,seed.desc]);
    const bizId = biz.rows[0]?.business_id || (await client.query('SELECT business_id FROM businesses WHERE owner_id=$1 AND business_name=$2 LIMIT 1',[ownerId,seed.name])).rows[0].business_id;
    const baseProducts = [
      ['Bundle Pack','Value bundle', randInt(100,400), seed.type],
      ['Premium Item','Top quality item', randInt(300,900), seed.type],
      ['Essential Kit','Daily use kit', randInt(150,600), seed.type]
    ];
    for(const p of baseProducts){
      await client.query(`INSERT INTO business_products (business_id,product_name,description,price,stock_quantity,category,is_active,created_at,updated_at)
        VALUES ($1,$2,$3,$4,100,$5,true,NOW()-INTERVAL '5 days',NOW()) ON CONFLICT DO NOTHING`,[bizId,p[0],p[1],p[2],p[3]]);
    }
  }
  // Create sample orders for first business
  const firstBiz = await client.query('SELECT business_id FROM businesses ORDER BY business_id ASC LIMIT 1');
  if(firstBiz.rows.length){
    const bizId = firstBiz.rows[0].business_id;
    const students = await client.query(`SELECT user_id FROM users u JOIN roles r ON u.role_id=r.role_id WHERE r.role_name='student'`);
    const prodRows = await client.query('SELECT product_id, price FROM business_products WHERE business_id=$1',[bizId]);
    if(students.rows.length && prodRows.rows.length){
      const loop = Math.min(5, prodRows.rows.length * 2);
      for(let i=0;i<loop;i++){
        const buyer=students.rows[i%students.rows.length];
        const prod=prodRows.rows[i%prodRows.rows.length];
        const order=await client.query(`INSERT INTO business_orders (user_id,business_id,total_amount,status,payment_method,payment_status,created_at)
          VALUES ($1,$2,$3,'delivered','wallet','paid',NOW()-($4 * INTERVAL '1 day')) RETURNING order_id`,[buyer.user_id,bizId,prod.price, i+1]);
        await client.query(`INSERT INTO business_order_items (order_id,product_id,quantity,price,terms_accepted) VALUES ($1,$2,1,$3,true)`,[order.rows[0].order_id,prod.product_id,prod.price]);
        await client.query(`UPDATE business_orders SET rating=$1, review=$2, reviewed_at=NOW()-($3 * INTERVAL '1 day') WHERE order_id=$4`,[5 - (i%5),'Great item!',i+1,order.rows[0].order_id]);
      }
    }
  }
}

async function ensureFoodVendorFlow(client){
  try {
    const colsRes = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='food_vendors'`);
    const colSet = new Set(colsRes.rows.map(r=>r.column_name));
    // If vendor_id missing something is fundamentally wrong; abort silently
    if(!colSet.has('vendor_id')) return;
    const vendorUser = await client.query(`SELECT user_id FROM users u JOIN roles r ON u.role_id=r.role_id WHERE r.role_name='food_vendor' LIMIT 1`);
    if(!vendorUser.rows.length) return;
    const ownerId = vendorUser.rows[0].user_id;
    // Build dynamic insert
    const insertCols = []; const values = []; let idx=1;
    function add(col,val){ if(colSet.has(col)){ insertCols.push(col); values.push(val); }}
  // Support legacy schema where column may be user_id instead of owner_id
  if(colSet.has('owner_id')) add('owner_id', ownerId);
  if(colSet.has('user_id')) add('user_id', ownerId); // also populate legacy or parallel column
    add('shop_name','Vendor Tasty');
    add('restaurant_name','Vendor Tasty'); // fallback name
    add('cuisine','Snacks');
    add('address','Food Court');
    add('phone','+123456');
    add('is_verified', true);
    add('is_active', true);
    if(colSet.has('created_at')) add('created_at', new Date(Date.now()-3*86400000));
    if(colSet.has('updated_at')) add('updated_at', new Date());
    if(insertCols.length > 0){
      const placeholders = values.map((_,i)=>`$${i+1}`).join(',');
      await client.query(`INSERT INTO food_vendors (${insertCols.join(',')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`, values);
    }
    // Retrieve vendor id (assumes at least one name column present)
    const vendRow = await client.query('SELECT vendor_id FROM food_vendors ORDER BY vendor_id ASC LIMIT 1');
    if(!vendRow.rows.length) return; const vendorId = vendRow.rows[0].vendor_id;
    // Only proceed with food_items if mandatory columns exist
    const fiColsRes = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='food_items'`);
    const fiColSet = new Set(fiColsRes.rows.map(r=>r.column_name));
    if(!(fiColSet.has('vendor_id') && fiColSet.has('item_name') && fiColSet.has('price'))) return;
    const items=[['Spicy Wrap','Veg wrap',180],['Sweet Donut','Fresh donut',90]];
    for(const it of items){
      await client.query(`INSERT INTO food_items (vendor_id,item_name,description,price${fiColSet.has('created_at')?',created_at':''}${fiColSet.has('updated_at')?',updated_at':''},is_active)
        VALUES ($1,$2,$3,$4${fiColSet.has('created_at')?',NOW()-INTERVAL \'2 days\'':''}${fiColSet.has('updated_at')?',NOW()':''},true) ON CONFLICT DO NOTHING`,[vendorId,it[0],it[1],it[2]]);
    }
    // Food orders only if food_orders exists with expected columns
    const foColsRes = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='food_orders'`);
    const foSet = new Set(foColsRes.rows.map(r=>r.column_name));
    if(!(foSet.has('user_id') && foSet.has('vendor_id') && foSet.has('total_amount'))) return;
    const foodItems=await client.query('SELECT food_item_id, price FROM food_items WHERE vendor_id=$1',[vendorId]);
    const students=await client.query(`SELECT user_id FROM users u JOIN roles r ON u.role_id=r.role_id WHERE r.role_name='student'`);
    if(foodItems.rows.length && students.rows.length){
      for(let i=0;i<3;i++){
        const fi=foodItems.rows[i%foodItems.rows.length];
        const stu=students.rows[i%students.rows.length];
        const fo=await client.query(`INSERT INTO food_orders (user_id,vendor_id,total_amount,status${foSet.has('created_at')?',created_at':''}${foSet.has('order_date')?',order_date':''}${foSet.has('delivered_at')?',delivered_at':''})
          VALUES ($1,$2,$3,'delivered'${foSet.has('created_at')?',NOW()-($4 * INTERVAL \'1 day\')':''}${foSet.has('order_date')?',(NOW()-($4 * INTERVAL \'1 day\'))::date':''}${foSet.has('delivered_at')?',NOW()-($4 * INTERVAL \'1 day\')':''}) RETURNING order_id`,[stu.user_id,vendorId,fi.price,i+1]);
        // Items
        await client.query(`INSERT INTO food_order_items (order_id,food_item_id,quantity) VALUES ($1,$2,1)`,[fo.rows[0].order_id,fi.food_item_id]);
        if(foSet.has('rating') && foSet.has('reviewed_at')){
          await client.query(`UPDATE food_orders SET rating=$1, review='Tasty!'${foSet.has('reviewed_at')?', reviewed_at=NOW()-($2 * INTERVAL \'1 day\')':''} WHERE order_id=$3`,[5-i,i+1,fo.rows[0].order_id]);
        }
      }
    }
  } catch(err){
    console.warn('⚠️ Food vendor flow skipped due to schema mismatch:', err.message);
  }
}

async function ensureSecondhand(client){
  const sellers=await client.query(`SELECT user_id FROM users u JOIN roles r ON u.role_id=r.role_id WHERE r.role_name='student' LIMIT 2`);
  if(sellers.rows.length){
    await client.query(`INSERT INTO secondhand_items (seller_id,item_name,description,price,condition,terms_conditions,is_active,posted_at)
      VALUES ($1,'Used Laptop','Still works',15000,'Fair','As-is',true,NOW()-INTERVAL '4 days'),($2,'Math Textbook','Calculus book',600,'Good','No returns',true,NOW()-INTERVAL '3 days') ON CONFLICT DO NOTHING`,[sellers.rows[0].user_id,sellers.rows[1].user_id]);
  }
}

async function ensureRentals(client){
  const owners=await client.query(`SELECT user_id FROM users u JOIN roles r ON u.role_id=r.role_id WHERE r.role_name='student' LIMIT 2`);
  if(owners.rows.length===2){
    await client.query(`INSERT INTO rental_products (owner_id,product_name,description,rent_per_day,terms_conditions,is_active)
      VALUES ($1,'DSLR Camera','High quality',400,'Handle carefully',true),($2,'Projector','Portable',350,'Deposit needed',true) ON CONFLICT DO NOTHING`,[owners.rows[0].user_id,owners.rows[1].user_id]);
  }
}

async function ensureAccommodation(client){
  const owners=await client.query(`SELECT user_id FROM users u JOIN roles r ON u.role_id=r.role_id WHERE r.role_name='student' LIMIT 2`);
  if(owners.rows.length===2){
    const res=await client.query(`INSERT INTO accommodation_properties (owner_id,property_type,title,description,location,rent_amount,deposit_amount,is_available,created_at,updated_at)
      VALUES ($1,'room','Shared Room','Cozy shared room','Dorm A',5000,1000,true,NOW()-INTERVAL '10 days',NOW()),($2,'apartment','Studio Apartment','Compact studio','Campus Edge',9000,2000,true,NOW()-INTERVAL '8 days',NOW()) ON CONFLICT DO NOTHING RETURNING property_id`,[owners.rows[0].user_id,owners.rows[1].user_id]);
    const propId = res.rows[0]?.property_id;
    if(propId){
  // Dynamic accommodation_images insert (skip created_at if column absent)
  const colsRes = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='accommodation_images'`);
  const colSet = new Set(colsRes.rows.map(r=>r.column_name));
  const baseCols = ['property_id','image_url','is_primary'];
  const baseVals = [propId,'/img/property1.jpg',true];
  let colList = baseCols.slice();
  let placeholders = ['$1','$2','$3'];
  let vals = baseVals.slice();
  if(colSet.has('created_at')){ colList.push('created_at'); placeholders.push(`NOW()-INTERVAL '9 days'`); }
  await client.query(`INSERT INTO accommodation_images (${colList.join(',')}) VALUES (${placeholders.join(',')}) ON CONFLICT DO NOTHING`, vals);
    }
  }
}

async function ensureWalletsTransactions(client){
  const users=await client.query('SELECT user_id FROM users');
  for(const u of users.rows){
    const w=await client.query(`INSERT INTO wallets (user_id,balance,created_at,updated_at) VALUES ($1,2000,NOW()-INTERVAL '5 days',NOW()) ON CONFLICT (user_id) DO NOTHING RETURNING wallet_id`,[u.user_id]);
    const walletId=w.rows[0]?.wallet_id || (await client.query('SELECT wallet_id FROM wallets WHERE user_id=$1',[u.user_id])).rows[0].wallet_id;
    await client.query(`INSERT INTO transactions (wallet_id,amount,transaction_type,status,description,created_at) VALUES ($1,2000,'credit','completed','Initial credit',NOW()-INTERVAL '5 days') ON CONFLICT DO NOTHING`,[walletId]);
  }
}

async function ensurePayments(client){
  const buyers=await client.query(`SELECT user_id FROM users u JOIN roles r ON u.role_id=r.role_id WHERE r.role_name='student' LIMIT 2`);
  const product=await client.query('SELECT product_id, price FROM business_products LIMIT 1');
  if(buyers.rows.length===2 && product.rows.length){
    await client.query(`INSERT INTO payments (buyer_id,seller_id,product_id,amount,payment_method,platform_fee,status,created_at)
      VALUES ($1,$2,$3,$4,'wallet',10,'success',NOW()-INTERVAL '2 days') ON CONFLICT DO NOTHING`,[buyers.rows[0].user_id,buyers.rows[1].user_id,product.rows[0].product_id,product.rows[0].price]);
  }
}

async function ensureNoticesLFJobs(client){
  const admin=await client.query(`SELECT user_id FROM users u JOIN roles r ON u.role_id=r.role_id WHERE r.role_name='admin' LIMIT 1`);
  const student=await client.query(`SELECT user_id FROM users u JOIN roles r ON u.role_id=r.role_id WHERE r.role_name='student' LIMIT 1`);
  if(admin.rows.length){
    await client.query(`INSERT INTO notices (posted_by,title,content,category,is_pinned,created_at) VALUES ($1,'Welcome','System initialized','Administration',true,NOW()-INTERVAL '5 days') ON CONFLICT DO NOTHING`,[admin.rows[0].user_id]);
  }
  if(student.rows.length){
    await client.query(`INSERT INTO lost_found_items (user_id,item_type,title,description,location,contact_info,is_claimed,created_at)
      VALUES ($1,'lost','Lost USB','Black 32GB USB','Library','contact@example.com',false,NOW()-INTERVAL '3 days') ON CONFLICT DO NOTHING`,[student.rows[0].user_id]);
    const job=await client.query(`INSERT INTO jobs (user_id,title,description,location,job_type,salary_range,is_active,created_at,updated_at)
      VALUES ($1,'Campus Ambassador','Promote events','Campus','part-time','Stipend',true,NOW()-INTERVAL '4 days',NOW()) ON CONFLICT DO NOTHING RETURNING job_id`,[student.rows[0].user_id]);
    if(job.rows[0]){
      await client.query(`INSERT INTO job_applications (job_id,applicant_id,cover_letter,status,applied_at) VALUES ($1,$2,'Excited to join!','pending',NOW()-INTERVAL '2 days') ON CONFLICT DO NOTHING`,[job.rows[0].job_id,student.rows[0].user_id]);
    }
  }
}

async function ensureFreeMarketplace(client){
  const givers=await client.query(`SELECT user_id FROM users LIMIT 2`);
  if(givers.rows.length===2){
    await client.query(`INSERT INTO free_marketplace_items (giver_id,item_name,description,pickup_location,contact_info,is_available,posted_at)
      VALUES ($1,'Notebook Stack','Few pages left','Student Center','giver@demo.local',true,NOW()-INTERVAL '2 days'),($2,'Spare Mouse','Works fine','Dorm B','giver@demo.local',true,NOW()-INTERVAL '1 day') ON CONFLICT DO NOTHING`,[givers.rows[0].user_id,givers.rows[1].user_id]);
  }
}

async function ensureChats(client){
  const items=await client.query('SELECT item_id,seller_id FROM secondhand_items LIMIT 1');
  const buyers=await client.query(`SELECT user_id FROM users u JOIN roles r ON u.role_id=r.role_id WHERE r.role_name='student' LIMIT 2`);
  if(items.rows.length && buyers.rows.length===2){
    const chat=await client.query(`INSERT INTO chats (item_id,seller_id,buyer_id,created_at,updated_at) VALUES ($1,$2,$3,NOW()-INTERVAL '1 day',NOW()) ON CONFLICT DO NOTHING RETURNING chat_id`,[items.rows[0].item_id,items.rows[0].seller_id,buyers.rows[1].user_id]);
    const chatId= chat.rows[0]?.chat_id || (await client.query('SELECT chat_id FROM chats WHERE item_id=$1 LIMIT 1',[items.rows[0].item_id])).rows[0].chat_id;
    await client.query(`INSERT INTO chat_messages (chat_id,sender_id,content,is_read,created_at) VALUES ($1,$2,'Hi, is this still available?',false,NOW()-INTERVAL '23 hours'),($1,$3,'Yes, it is.',true,NOW()-INTERVAL '22 hours') ON CONFLICT DO NOTHING`,[chatId,buyers.rows[1].user_id,items.rows[0].seller_id]);
  }
}

async function run(){
  await dbConfig.init();
  const client = await dbConfig.db.pool.connect();
  try{
  // Small delay to ensure async migration logging completes (avoids rare race in some environments)
  await new Promise(r=>setTimeout(r,200));
    await ensureUsers(client);
    await ensureBusinessFlow(client);
    await ensureFoodVendorFlow(client);
    await ensureSecondhand(client);
    await ensureRentals(client);
    await ensureAccommodation(client);
    await ensureWalletsTransactions(client);
    await ensurePayments(client);
    await ensureNoticesLFJobs(client);
    await ensureFreeMarketplace(client);
    await ensureChats(client);
    console.log('✅ All tables populated with representative data');
  }catch(e){
    console.error('❌ Population failed:', e.message);
    if(e.message.includes('owner_id')){
      console.error('Hint: food_vendors schema may not have been fully migrated yet. Re-run after server start or verify migrations.');
    }
    process.exit(1);
  }finally{
    client.release();
    await dbConfig.close();
  }
}

run();

// Deprecated: seed script removed per user request.
module.exports = {};
