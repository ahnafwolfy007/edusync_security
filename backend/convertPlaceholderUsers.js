#!/usr/bin/env node
/**
 * convertPlaceholderUsers.js
 * Converts users with non-compliant placeholder password_hash values into the unified aaa_7 format
 * instead of deleting them. Skips users already using aaa_7$... or $2a$... (bcrypt) formats.
 *
 * Detection heuristic for placeholder: password_hash NOT LIKE 'aaa_7$%' AND NOT LIKE '$2a$%'
 * New hash: aaa_7$<work>$<bits>$<salt>$<hash>
 * Uses deterministic salt derived from email (educational only) for reproducibility.
 *
 * Safety: requires --yes flag or CONVERT_CONFIRM=YES env variable to proceed.
 */
require('dotenv').config();
const dbConfig = require('./config/db');
const { aaa_7, generateSaltFromEmail } = require('./utils/simpleHash');

function buildCustomHash(password, email) {
  const salt = generateSaltFromEmail(email).slice(0, 8);
  const work = 1200; const bits = 128;
  const { hash } = aaa_7(password + email, salt, work, bits);
  return `aaa_7$${work}$${bits}$${salt}$${hash}`;
}

async function run() {
  const confirm = process.argv.includes('--yes') || process.env.CONVERT_CONFIRM === 'YES';
  if (!confirm) {
    console.log('❌ Confirmation missing. Run with --yes or set CONVERT_CONFIRM=YES');
    process.exit(1);
  }
  await dbConfig.init();
  const db = dbConfig.db;
  const client = await db.pool.connect();
  try {
    console.log('🔍 Locating placeholder users to convert...');
    const { rows } = await client.query(`SELECT user_id,email FROM users WHERE password_hash NOT LIKE 'aaa_7$%' AND password_hash NOT LIKE '$2a$%'`);
    if (!rows.length) {
      console.log('✅ No placeholder users found. Nothing to convert.');
      return;
    }
    console.log(`Found ${rows.length} placeholder users. Converting...`);
    let converted = 0; const failures = [];
    for (const u of rows) {
      const newHash = buildCustomHash('Password123!', u.email); // unified demo password
      try {
        await client.query('UPDATE users SET password_hash=$1, updated_at=NOW() WHERE user_id=$2', [newHash, u.user_id]);
        converted++;
      } catch (e) {
        failures.push({ user_id: u.user_id, email: u.email, error: e.message });
      }
    }
    console.log(`✅ Converted ${converted} users. Failures: ${failures.length}`);
    if (failures.length) console.table(failures);
  } catch (e) {
    console.error('❌ Conversion failed:', e.message);
    process.exit(1);
  } finally {
    client.release();
    await dbConfig.close();
  }
}

run();
