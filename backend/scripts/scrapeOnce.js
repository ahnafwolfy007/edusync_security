#!/usr/bin/env node

// One-off runner to scrape notices and upsert into DB for verification
require('dotenv').config();
const path = require('path');
const dbConfig = require('../config/db');
const { scrapeNotices, upsertNotice } = require('../services/noticeScraper');

async function main() {
  try {
    console.log('🔎 Scrape test starting...');
    const db = await dbConfig.init();

    const cfg = {
      url: process.env.NOTICES_SOURCE_URL || 'https://www.uiu.ac.bd/notice/',
      listSelector: process.env.NOTICES_LIST_SELECTOR,
      titleSelector: process.env.NOTICES_TITLE_SELECTOR,
      linkSelector: process.env.NOTICES_LINK_SELECTOR,
      contentSelector: process.env.NOTICES_CONTENT_SELECTOR,
      dateSelector: process.env.NOTICES_DATE_SELECTOR,
    };
    console.log('Config:', { url: cfg.url, hasSelectors: !!(cfg.listSelector || cfg.titleSelector || cfg.linkSelector) });

    const list = await scrapeNotices(cfg);
    console.log(`Scraped ${list.length} notices from ${cfg.url}`);
    let upserted = 0;
    for (const n of list) {
      const row = await upsertNotice(n);
      if (row) upserted++;
    }
    console.log(`Upserted ${upserted} notices.`);

    // Verify by counting rows from this domain
    const hostLike = cfg.url.replace(/^(https?:\/\/[^\/]+).*/, '$1');
    const { rows } = await db.query('SELECT COUNT(*)::int AS c FROM notices WHERE source_url LIKE $1', [`${hostLike}%`]);
    console.log(`DB now has ${rows[0].c} notices from ${hostLike}`);

    // Show a few sample titles
    const sample = await db.query('SELECT title, slug, created_at FROM notices WHERE source_url LIKE $1 ORDER BY created_at DESC LIMIT 5', [`${hostLike}%`]);
    console.table(sample.rows);
  } catch (e) {
    console.error('Scrape run failed:', e.message);
    process.exitCode = 1;
  } finally {
    try { await dbConfig.close(); } catch {}
  }
}

main();
