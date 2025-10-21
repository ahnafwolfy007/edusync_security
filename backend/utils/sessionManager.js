const crypto = require('crypto');
const dbConfig = require('../config/db');

// TTL from .env (ms), default 30 minutes
const SESSION_TTL_MS = parseInt(process.env.SESSION_TIMEOUT || '1800000', 10);

function nowPlus(ms) { return new Date(Date.now() + ms); }
function randomToken(bytes = 48) { return crypto.randomBytes(bytes).toString('base64url'); }

async function createSession({ userId, ip, ua, singleSession = true }) {
  const db = dbConfig.db;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    if (singleSession) {
      await client.query(
        `UPDATE session_tokens SET is_active = FALSE WHERE user_id = $1 AND is_active = TRUE`,
        [userId]
      );
    }
    const token = randomToken();
    const expiresAt = nowPlus(SESSION_TTL_MS);
    const { rows } = await client.query(
      `INSERT INTO session_tokens (user_id, token, user_agent, ip_address, expires_at)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING session_id, token, user_id, expires_at`,
      [userId, token, ua || null, ip || null, expiresAt]
    );
    await client.query('COMMIT');
    return rows[0];
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function verifySession(token) {
  if (!token) return { ok: false, reason: 'MISSING' };
  const db = dbConfig.db;
  const { rows } = await db.query(
    `SELECT session_id, user_id, is_active, expires_at FROM session_tokens WHERE token = $1`,
    [token]
  );
  if (!rows.length) return { ok: false, reason: 'NOT_FOUND' };
  const s = rows[0];
  if (!s.is_active) return { ok: false, reason: 'INACTIVE' };
  if (new Date(s.expires_at).getTime() <= Date.now()) return { ok: false, reason: 'EXPIRED' };
  return { ok: true, session: s };
}

async function touchSession(token) {
  const db = dbConfig.db;
  const expiresAt = nowPlus(SESSION_TTL_MS);
  const { rowCount } = await db.query(
    `UPDATE session_tokens SET expires_at = $2 WHERE token = $1 AND is_active = TRUE`,
    [token, expiresAt]
  );
  return rowCount > 0;
}

async function revokeSession(tokenOrId) {
  const db = dbConfig.db;
  if (!tokenOrId) return 0;
  const isId = Number.isInteger(tokenOrId) || /^\d+$/.test(String(tokenOrId));
  const sql = isId
    ? `UPDATE session_tokens SET is_active = FALSE WHERE session_id = $1`
    : `UPDATE session_tokens SET is_active = FALSE WHERE token = $1`;
  const { rowCount } = await db.query(sql, [tokenOrId]);
  return rowCount;
}

module.exports = { createSession, verifySession, touchSession, revokeSession };
