// middlewares/concurrencyGuard.js
const crypto = require('crypto');
const dbConfig = require('../config/db');

const IDEMPOTENCY_TTL_MS = parseInt(process.env.IDEMPOTENCY_TTL_MS || String(5 * 60 * 1000), 10); // 5 minutes
const MAX_INFLIGHT_PER_USER = parseInt(process.env.MAX_INFLIGHT_PER_USER || '2', 10);

// In-memory per-process counter of in-flight requests per user.
// Resets on server restart; it's just a guardrail to reduce stampedes.
const inflight = new Map();

function hashBody(req) {
  try {
    return crypto.createHash('sha256').update(JSON.stringify(req.body || {})).digest('hex');
  } catch {
    return null;
  }
}

/**
 * 1) Per-user in-flight limiter
 *    Rejects requests when a user exceeds MAX_INFLIGHT_PER_USER concurrent requests.
 *    Works for authenticated users (via either req.user.userId or req.session.user_id).
 */
async function perUserLimiter(req, res, next) {
  // Read user id from either JWT middleware or session middleware.
  const userId = (req.user && req.user.userId) || (req.session && req.session.user_id) || null;
  if (!userId) return next(); // only enforce for authenticated users

  const cur = inflight.get(userId) || 0;
  if (cur >= MAX_INFLIGHT_PER_USER) {
    return res.status(429).json({ success: false, message: 'Too many concurrent requests' });
  }
  inflight.set(userId, cur + 1);

  // Decrement after response completes
  res.on('finish', () => {
    const v = inflight.get(userId) || 1;
    inflight.set(userId, Math.max(0, v - 1));
  });

  next();
}

/**
 * 2) Idempotency Guard
 *    If client sends `Idempotency-Key`, we:
 *      - Return a previously stored response for the same key (replay)
 *      - Or store the response the first time and replay later duplicates.
 *    This must run AFTER body parsing so we can hash req.body.
 */
async function idempotencyGuard(req, res, next) {
  const key = req.header('Idempotency-Key');
  if (!key) return next();

  const db = dbConfig.db;
  const method = req.method.toUpperCase();
  const path = req.path;
  const userId = (req.user && req.user.userId) || (req.session && req.session.user_id) || null;
  const reqHash = hashBody(req);

  // Check existing key
  try {
    const existing = await db.query(
      `SELECT status_code, response_body FROM idempotency_keys WHERE key = $1`,
      [key]
    );
    if (existing.rows.length) {
      const r = existing.rows[0];
      // Replay saved response
      return res.status(r.status_code || 200).json(r.response_body || {});
    }
  } catch (e) {
    // If DB check fails, we just proceed (best-effort idempotency)
    console.warn('[Idempotency] lookup failed:', e.message);
  }

  // Wrap res.json to store the first successful response
  const originalJson = res.json.bind(res);
  res.json = async (body) => {
    try {
      await db.query(
        `INSERT INTO idempotency_keys (key, user_id, method, path, request_hash, status_code, response_body, expires_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (key) DO NOTHING`,
        [
          key,
          userId,
          method,
          path,
          reqHash,
          res.statusCode,
          body,
          new Date(Date.now() + IDEMPOTENCY_TTL_MS)
        ]
      );
    } catch (e) {
      // Ignore races; another request may have just inserted it.
      console.warn('[Idempotency] insert failed:', e.message);
    }
    return originalJson(body);
  };

  next();
}

/**
 * 3) Advisory lock (critical section)
 *    Use for wallet/payment/order flows to serialize operations per resource (e.g., wallet:<userId>).
 *    Set `req.mutexKey = 'wallet:' + userId` in a small pre-handler, then attach this middleware.
 */
async function withPgMutex(req, res, next) {
  if (!req.mutexKey) return next();

  const db = dbConfig.db;
  // Create a 64-bit lock key from string
  const hash = crypto.createHash('sha256').update(req.mutexKey).digest();
  const keyBig = BigInt('0x' + hash.subarray(0, 8).toString('hex')); // first 64 bits
  const keyHi = Number((keyBig >> 32n) & 0xffffffffn);
  const keyLo = Number(keyBig & 0xffffffffn);

  try {
    await db.query('SELECT pg_advisory_lock($1::int, $2::int)', [keyHi, keyLo]);

    // Release lock automatically when response finishes
    res.on('finish', () => {
      db.query('SELECT pg_advisory_unlock($1::int, $2::int)', [keyHi, keyLo]).catch(() => {});
    });

    next();
  } catch (e) {
    console.error('[Mutex] Failed to acquire lock:', e.message);
    return res.status(503).json({ success: false, message: 'Service busy, please retry' });
  }
}

module.exports = {
  perUserLimiter,
  idempotencyGuard,
  withPgMutex,
};
