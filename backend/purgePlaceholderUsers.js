#!/usr/bin/env node
/**
 * purgePlaceholderUsers.js
 * Removes users whose password_hash is a simple placeholder (not bcrypt and not custom aaa_7 format).
 * Placeholders detected: password_hash NOT LIKE 'aaa_7$%' AND NOT LIKE '$2a$%'
 * Safely attempts deletion; logs any constraint failures.
 */
require('dotenv').config();
const dbConfig = require('./config/db');

async function run() {
  await dbConfig.init();
  const db = dbConfig.db;
  const client = await db.pool.connect();
  try {
    console.log('🔍 Finding placeholder users...');
    const { rows } = await client.query(`SELECT user_id,email FROM users WHERE password_hash NOT LIKE 'aaa_7$%' AND password_hash NOT LIKE '$2a$%'`);
    if (!rows.length) {
      console.log('✅ No placeholder users found.');
      return;
    }
    console.log(`Found ${rows.length} placeholder users.`);
    let deleted = 0; const failed = [];
    for (const u of rows) {
      try {
        await client.query('BEGIN');
        // Attempt to remove dependent rows in minimal critical tables first (best-effort)
        // (If more relations block deletion, they will throw and we skip that user)
        await client.query('DELETE FROM wallets WHERE user_id = $1', [u.user_id]);
        await client.query('DELETE FROM notifications WHERE user_id = $1', [u.user_id]);
        await client.query('DELETE FROM lost_found_items WHERE user_id = $1', [u.user_id]);
        await client.query('DELETE FROM business_applications WHERE user_id = $1', [u.user_id]);
        await client.query('DELETE FROM businesses WHERE owner_id = $1', [u.user_id]);
        await client.query('DELETE FROM food_vendors WHERE owner_id = $1', [u.user_id]);
        await client.query('DELETE FROM secondhand_items WHERE seller_id = $1', [u.user_id]);
        await client.query('DELETE FROM rental_products WHERE owner_id = $1', [u.user_id]);
        await client.query('DELETE FROM accommodation_properties WHERE owner_id = $1', [u.user_id]);
        await client.query('DELETE FROM jobs WHERE user_id = $1', [u.user_id]);
        // Finally delete user
        await client.query('DELETE FROM users WHERE user_id = $1', [u.user_id]);
        await client.query('COMMIT');
        deleted++;
      } catch (e) {
        await client.query('ROLLBACK');
        failed.push({ user_id: u.user_id, email: u.email, error: e.message });
      }
    }
    console.log(`🗑 Deleted ${deleted} placeholder users. Failures: ${failed.length}`);
    if (failed.length) {
      console.table(failed);
    }
  } finally {
    client.release();
    await dbConfig.close();
  }
}

run().catch(e => { console.error('❌ Purge script failed:', e); process.exit(1); });
