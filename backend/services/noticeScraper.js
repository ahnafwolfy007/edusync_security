const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');
const dbConfig = require('../config/db');

// Helpers
const slugify = (str = '') => str
  .toString()
  .toLowerCase()
  .replace(/[^a-z0-9\s-]/g, '')
  .trim()
  .replace(/\s+/g, '-')
  .slice(0, 120);

async function upsertNotice({ title, content, excerpt, source_url, external_id, published_at }) {
  const db = dbConfig.getDB();
  const slug = slugify(title || external_id || Date.now().toString());
  const category = 'external';
  const params = [title, content, excerpt, source_url, external_id, published_at, slug, category];
  const insertQuery = `
    INSERT INTO notices (title, content, excerpt, source_url, external_id, published_at, slug, category)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    ON CONFLICT (external_id)
    DO UPDATE SET title=EXCLUDED.title, content=EXCLUDED.content, excerpt=EXCLUDED.excerpt, published_at=EXCLUDED.published_at, slug=EXCLUDED.slug, category=EXCLUDED.category
    RETURNING *;
  `;
  try {
    const { rows } = await db.query(insertQuery, params);
    return rows[0];
  } catch (e) {
    // If unique slug constraint is hit (existing row with same slug but different/no external_id), update by slug
    if (e && e.code === '23505' && (e.constraint === 'idx_notices_slug' || /slug/.test(String(e.detail)))) {
      const updateBySlug = `
        UPDATE notices
        SET title=$1, content=$2, excerpt=$3, source_url=$4, external_id=$5, published_at=$6, category=$8
        WHERE slug=$7
        RETURNING *;
      `;
      const { rows } = await db.query(updateBySlug, params);
      return rows[0];
    }
    throw e;
  }
}

// Parse a human date string into Date or null
function parseDateFlexible(text = '') {
  try {
    const cleaned = text.replace(/\s+/g, ' ').trim();
    // Try direct Date parse first
    const direct = new Date(cleaned);
    if (!isNaN(direct.getTime())) return direct;
    // Try formats like: September 15, 2025 or Sep 15, 2025 10:30 AM
    const m = cleaned.match(/([A-Za-z]{3,9})\s+(\d{1,2}),\s*(\d{4})(?:[^\d]*(\d{1,2}):(\d{2})\s*(AM|PM)?)?/i);
    if (m) {
      const monthName = m[1];
      const day = parseInt(m[2], 10);
      const year = parseInt(m[3], 10);
      const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
      const mi = months.indexOf(monthName.toLowerCase());
      const date = new Date(year, Math.max(0, mi), day);
      if (!isNaN(date.getTime())) return date;
    }
  } catch { }
  return null;
}

// Generic scraper given a URL and CSS selectors
// Supports pagination via /page/N URL pattern when maxPages > 1
async function scrapeNotices({ url, listSelector, titleSelector, linkSelector, contentSelector, dateSelector, maxPages = 3 }) {
  const notices = [];
  const seen = new Set();

  const collectFromList = ($, pageUrl) => {
    if (listSelector) {
      $(listSelector).each((_, el) => {
        try {
          let title = '';
          let link = '';
          if (titleSelector) {
            title = $(el).find(titleSelector).first().text().trim();
          }
          if (!title) {
            // Try the link text if no explicit title selector
            const a = linkSelector ? $(el).find(linkSelector).first() : $(el).is('a') ? $(el) : $(el).find('a').first();
            title = (a && a.text && a.text().trim()) || $(el).text().trim();
          }
          if (linkSelector) {
            link = $(el).find(linkSelector).first().attr('href');
          }
          if (!link) {
            // Fallback to element itself if it's an anchor or first anchor inside
            const a = $(el).is('a') ? $(el) : $(el).find('a').first();
            link = a && a.attr('href');
          }
          const absoluteLink = link && link.startsWith('http') ? link : new URL(link, pageUrl).toString();
          // skip pagination links, listing page, and duplicates, ensure slug detail
          if (!absoluteLink || /\/notice\/page\//.test(absoluteLink)) return;
          if (/\/notice\/?$/.test(absoluteLink)) return;
          if (!/\/notice\/[a-z0-9-]+\/?$/i.test(absoluteLink)) return;
          if (seen.has(absoluteLink)) return;
          const external_id = absoluteLink; // good unique key
          const published_at_text = dateSelector ? $(el).find(dateSelector).first().text().trim() : '';
          const published_at = published_at_text ? (parseDateFlexible(published_at_text) || new Date(published_at_text)) : null;
          notices.push({ title, source_url: absoluteLink, external_id, published_at });
          seen.add(absoluteLink);
        } catch { }
      });
    } else {
      // Fallback: find all anchors that look like notice links
      $('a[href*="/notice/"]').each((_, a) => {
        try {
          let href = $(a).attr('href');
          if (!href) return;
          const u = href.startsWith('http') ? href : new URL(href, pageUrl).toString();
          // Skip pagination or view-all and listing root; require slug detail
          if (/\/notice\/page\//.test(u)) return;
          if (/\/notice\/?$/.test(u)) return;
          if (!/\/notice\/[a-z0-9-]+\/?$/i.test(u)) return;
          const text = $(a).text().replace(/\s+/g, ' ').trim();
          if (!text || text.length < 6) return;
          if (seen.has(u)) return;
          seen.add(u);
          notices.push({ title: text, source_url: u, external_id: u, published_at: null });
        } catch { }
      });
    }
  };

  for (let page = 1; page <= Number(maxPages || 1); page++) {
    const pageUrl = page === 1 ? url : new URL(`page/${page}/`, url).toString();
    try {
      const { data: html } = await axios.get(pageUrl, { timeout: 20000 });
      const $ = cheerio.load(html);
      const before = notices.length;
      collectFromList($, pageUrl);
      if (page > 1 && notices.length === before) break; // stop if no new on next pages
    } catch (e) {
      if (page > 1) break; // likely out of range
    }
  }

  // Optionally fetch each notice page to get full content (prefer HTML to preserve formatting)
  for (const n of notices) {
    try {
      const { data: page } = await axios.get(n.source_url, { timeout: 20000 });
      const _$ = cheerio.load(page);
      // Title fallback from detail page
      if (!n.title) {
        n.title = _$('.entry-title').first().text().trim() || _$('.post-title').first().text().trim() || _$('h1').first().text().trim();
      }

      // Choose a container for content
      let $container = null;
      // 1) Site-specific: UIU wraps details in .notice-details
      $container = _$('.notice-details').first();
      if (!$container || $container.length === 0) {
        // 2) Config-provided selector
        if (contentSelector) {
          const $c = _$(contentSelector).first();
          if ($c && $c.length) $container = $c;
        }
      }
      if (!$container || $container.length === 0) {
        // 3) Common WP content areas
        const candidates = ['.entry-content', '.single-content', '.content', 'article .entry-content'];
        for (const sel of candidates) {
          const $c = _$(sel).first();
          if ($c && $c.length) { $container = $c; break; }
        }
      }

      let contentHtml = '';
      let contentText = '';
      if ($container && $container.length) {
        contentHtml = $container.html() || '';
        contentText = $container.text().replace(/\s+/g, ' ').trim();
      } else {
        // Final fallback: use body text
        contentText = _$('body').text().replace(/\s+/g, ' ').trim();
      }
      n.content = contentHtml || contentText;
      n.excerpt = contentText ? contentText.slice(0, 280) : (contentHtml ? _$('<div>').html(contentHtml).text().trim().slice(0, 280) : '');

      // Try to derive publish date from detail page if missing
      if (!n.published_at) {
        let pdText = _$('.published, .post-date, time, .entry-date').first().text().trim();
        if (!pdText) {
          // Look for "Publish Date :" pattern anywhere
          const bodyText = _$('body').text();
          const m = bodyText.match(/Publish\s*Date\s*:\s*([^\n]+)/i);
          if (m) pdText = m[1].trim();
        }
        if (pdText) {
          const parsed = parseDateFlexible(pdText);
          if (parsed) n.published_at = parsed;
        }
      }
    } catch { }
  }

  return notices;
}

// Scheduler setup
let scheduled = false;
function startScheduler(getConfig) {
  if (scheduled) return;
  // Every hour at minute 5
  cron.schedule('5 * * * *', async () => {
    try {
      const cfg = getConfig();
      if (!cfg?.url) return;
      const maxPages = parseInt(process.env.NOTICES_MAX_PAGES, 10) || cfg.maxPages || 3;
      const list = await scrapeNotices({ ...cfg, maxPages });
      for (const item of list) await upsertNotice(item);
      console.log(`Notices scraped: ${list.length}`);
    } catch (e) {
      console.warn('Notice scraping failed:', e.message);
    }
  });
  scheduled = true;
}

module.exports = { scrapeNotices, upsertNotice, startScheduler };
