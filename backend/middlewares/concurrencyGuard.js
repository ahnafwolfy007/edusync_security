// middlewares/concurrencyGuard.js
let dbConfig;
try { dbConfig = require('../config/db'); } catch (e) { dbConfig = require('../db'); }

function getDB() { return dbConfig.db || dbConfig.getDB?.() || dbConfig; }
function getJti(req) { return req.user?.jti || req.headers['x-session-jti'] || null; }
function sessionKey(userId, jti) { return `${userId}|${jti || 'none'}`; }

const PER_SESSION = parseInt(process.env.MAX_CONCURRENT_PER_SESSION || '4', 10);
const PER_USER    = parseInt(process.env.MAX_CONCURRENT_PER_USER || '12', 10);
const RETRY_AFTER = parseInt(process.env.CONCURRENCY_RETRY_AFTER_SECONDS || '2', 10);

async function ensureSchema(db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS session_counters (
      session_key     TEXT PRIMARY KEY,
      user_id         BIGINT NOT NULL,
      jti             TEXT,
      active_requests INTEGER NOT NULL DEFAULT 0,
      updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_counters (
      user_id         BIGINT PRIMARY KEY,
      active_requests INTEGER NOT NULL DEFAULT 0,
      updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  // Optional: tiny view for debugging
  await db.query(`
    CREATE TABLE IF NOT EXISTS request_ledger (
      id BIGSERIAL PRIMARY KEY,
      session_key TEXT NOT NULL,
      path TEXT,
      started_at TIMESTAMP NOT NULL DEFAULT NOW(),
      finished_at TIMESTAMP NULL,
      status INT NULL,
      over_limit BOOLEAN NOT NULL DEFAULT FALSE
    );
  `);
}

// Choose the least-loaded session for a user (soft suggestion)
async function pickLeastLoadedSession(db, userId) {
  const { rows } = await db.query(
    `SELECT jti, active_requests FROM session_counters WHERE user_id=$1 ORDER BY active_requests ASC, updated_at ASC LIMIT 1`,
    [userId]
  );
  return rows[0]?.jti || null;
}

async function increment(db, skey, userId, jti) {
  // Single transaction to check & increment
  await db.query('BEGIN');
  try {
    await db.query(`INSERT INTO session_counters(session_key, user_id, jti, active_requests)
                    VALUES ($1,$2,$3,0)
                    ON CONFLICT (session_key) DO NOTHING`,
      [skey, userId, jti]);

    await db.query(`INSERT INTO user_counters(user_id, active_requests)
                    VALUES ($1,0)
                    ON CONFLICT (user_id) DO NOTHING`, [userId]);

    // Check current values
    const s = await db.query(`SELECT active_requests FROM session_counters WHERE session_key=$1 FOR UPDATE`, [skey]);
    const u = await db.query(`SELECT active_requests FROM user_counters WHERE user_id=$1 FOR UPDATE`, [userId]);
    const scur = s.rows[0]?.active_requests ?? 0;
    const ucur = u.rows[0]?.active_requests ?? 0;

    if (scur + 1 > PER_SESSION || ucur + 1 > PER_USER) {
      await db.query(`INSERT INTO request_ledger(session_key, over_limit) VALUES ($1, TRUE)`, [skey]);
      await db.query('ROLLBACK');
      return { allowed: false };
    }

    // Increment both
    await db.query(`UPDATE session_counters SET active_requests=active_requests+1, updated_at=NOW() WHERE session_key=$1`, [skey]);
    await db.query(`UPDATE user_counters SET active_requests=active_requests+1, updated_at=NOW() WHERE user_id=$1`, [userId]);
    await db.query(`INSERT INTO request_ledger(session_key, over_limit) VALUES ($1, FALSE)`, [skey]);
    await db.query('COMMIT');
    return { allowed: true };
  } catch (e) {
    await db.query('ROLLBACK');
    throw e;
  }
}

async function decrement(db, skey, userId) {
  try {
    await db.query('BEGIN');
    await db.query(`UPDATE session_counters SET active_requests=GREATEST(active_requests-1,0), updated_at=NOW() WHERE session_key=$1`, [skey]);
    await db.query(`UPDATE user_counters SET active_requests=GREATEST(active_requests-1,0), updated_at=NOW() WHERE user_id=$1`, [userId]);
    await db.query(`UPDATE request_ledger SET finished_at=NOW() WHERE session_key=$1 AND finished_at IS NULL ORDER BY id DESC LIMIT 1`, [skey]);
    await db.query('COMMIT');
  } catch (e) {
    await db.query('ROLLBACK');
    console.error('decrement counters failed:', e);
  }
}

const ConcurrencyGuard = {
  guard: async (req, res, next) => {
    try {
      const db = getDB();
      await ensureSchema(db);

      const userId = req.user?.userId;
      if (!userId) return next(); // public routes unaffected

      const jti = getJti(req);
      const skey = sessionKey(userId, jti);

      // If client didn't pin to a session, suggest the least-loaded one
      if (!jti) {
        const suggested = await pickLeastLoadedSession(db, userId);
        if (suggested) res.setHeader('x-suggested-session-jti', suggested);
      }

      const resv = await increment(db, skey, userId, jti);
      if (!resv.allowed) {
        res.setHeader('Retry-After', String(RETRY_AFTER));
        return res.status(429).json({
          success: false,
          message: 'Too many concurrent requests. Please retry shortly.',
          per_session_limit: PER_SESSION,
          per_user_limit: PER_USER
        });
      }

      // Decrement when the response completes
      const done = () => decrement(db, skey, userId);
      res.on('finish', done);
      res.on('close', done);

      next();
    } catch (e) {
      console.error('ConcurrencyGuard error:', e);
      // On failure, do not block normal traffic
      next();
    }
  }
};

module.exports = ConcurrencyGuard;
