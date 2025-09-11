#!/usr/bin/env node
// Rehash users whose password_hash format differs from canonical registration hashing
require('dotenv').config();
const dbConfig = require('./config/db');
const { aaa_7, generateSaltFromEmail } = require('./utils/simpleHash');

async function run(){
  await dbConfig.init();
  const client = await dbConfig.db.pool.connect();
  let updated=0; let scanned=0;
  try{
    const users = await client.query('SELECT user_id,email,password_hash FROM users');
    for(const u of users.rows){
      scanned++;
      if(!u.password_hash || !u.password_hash.startsWith('aaa_7$')) continue;
      const parts = u.password_hash.split('$').filter(Boolean);
      if(parts.length < 5) continue;
      const work = parseInt(parts[1],10);
      const bits = parseInt(parts[2],10);
      const salt = parts[3];
      const emailSalt = generateSaltFromEmail(u.email.toLowerCase());
      // Criteria to rehash: workFactor !=1000 OR bits!=128 OR salt!=emailSalt
      if(work!==1000 || bits!==128 || salt!==emailSalt){
        const { hash } = aaa_7('Password123!', emailSalt, 1000, 128);
        const newHash = `aaa_7$1000$128$${emailSalt}$${hash}`;
        await client.query('UPDATE users SET password_hash=$1, updated_at=NOW() WHERE user_id=$2',[newHash,u.user_id]);
        updated++;
      }
    }
    console.log(`✅ Rehash complete. Scanned: ${scanned}, Updated: ${updated}`);
  }catch(e){
    console.error('❌ Rehash failed:', e.message);
  }finally{ client.release(); await dbConfig.close(); }
}
run();