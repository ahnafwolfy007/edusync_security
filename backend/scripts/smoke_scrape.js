require('dotenv').config();
const { scrapeNotices } = require('../services/noticeScraper');

(async () => {
  try {
    const cfg = {
      url: process.env.NOTICES_SOURCE_URL || 'https://www.uiu.ac.bd/notice/',
      listSelector: process.env.NOTICES_LIST_SELECTOR,
      titleSelector: process.env.NOTICES_TITLE_SELECTOR,
      linkSelector: process.env.NOTICES_LINK_SELECTOR,
      contentSelector: process.env.NOTICES_CONTENT_SELECTOR,
      dateSelector: process.env.NOTICES_DATE_SELECTOR
    };
    console.log('Scraping from:', cfg.url);
    const list = await scrapeNotices(cfg);
    console.log(`Found ${list.length} notices`);
    list.slice(0, 5).forEach((n, i) => {
      console.log(`[${i+1}]`, n.title);
      console.log('    url:', n.source_url);
      if (n.published_at) console.log('    date:', n.published_at);
      console.log('    excerpt:', (n.excerpt || n.content || '').slice(0, 120).replace(/\s+/g,' '));
    });
    process.exit(0);
  } catch (e) {
    console.error('Scrape failed:', e.message);
    process.exit(1);
  }
})();
