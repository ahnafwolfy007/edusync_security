// middlewares/sessionTokenManager.js
let dbConfig;
try { dbConfig = require('../config/db'); } catch (e) { dbConfig = require('../db'); }

function getDB() { return dbConfig.db || dbConfig.getDB?.() || dbConfig; }
function getJti(req) { return req.user?.jti || req.headers['x-session-jti'] || null; }

async function ensureSchema(db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      session_id   BIGSERIAL PRIMARY KEY,
      user_id      BIGINT NOT NULL,
      jti          TEXT,
      user_agent   TEXT,
      ip_address   TEXT,
      device_label TEXT,
      meta         JSONB DEFAULT '{}'::jsonb,
      created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
      last_seen    TIMESTAMP NOT NULL DEFAULT NOW(),
      expires_at   TIMESTAMP NULL,
      revoked      BOOLEAN NOT NULL DEFAULT FALSE
    );
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_user_sessions_jti ON user_sessions(jti);`);
}

async function attachOrCreateSession(req) {
  const db = getDB();
  await ensureSchema(db);

  const userId = req.user?.userId;
  if (!userId) return null;

  const jti = getJti(req);
  const ua = req.headers['user-agent'] || null;
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString();
  const device = req.headers['x-device-label'] || req.body?.deviceLabel || null;

  // Reuse an active not-revoked row when possible
  const { rows } = await db.query(
    `SELECT * FROM user_sessions 
     WHERE user_id=$1 AND (jti IS NOT DISTINCT FROM $2) AND revoked=FALSE
     ORDER BY created_at DESC LIMIT 1`,
    [userId, jti]
  );

  if (rows.length) {
    const s = rows[0];
    await db.query(`UPDATE user_sessions SET last_seen=NOW(), ip_address=$1, user_agent=$2 WHERE session_id=$3`,
      [ip, ua, s.session_id]);
    return s;
  }

  const ins = await db.query(
    `INSERT INTO user_sessions (user_id, jti, user_agent, ip_address, device_label)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [userId, jti, ua, ip, device]
  );
  return ins.rows[0];
}

const SessionTokenManager = {
  // Middleware: ensures req.sessionRecord is set (if authenticated)
  ensure: async (req, res, next) => {
    try {
      if (!req.user?.userId) return next();
      req.sessionRecord = await attachOrCreateSession(req);
      next();
    } catch (e) {
      console.error('SessionTokenManager.ensure error:', e);
      next(); // never block request on session bookkeeping
    }
  },

  // Controller helpers you can mount on routes if you want admin/user controls:
  listMine: async (req, res) => {
    try {
      if (!req.user?.userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const db = getDB();
      const { rows } = await db.query(
        `SELECT * FROM user_sessions WHERE user_id=$1 ORDER BY revoked ASC, last_seen DESC`,
        [req.user.userId]
      );
      res.json({ success: true, data: rows });
    } catch (e) {
      console.error('listMine error:', e);
      res.status(500).json({ success: false, message: 'Failed to load sessions' });
    }
  },

  revokeById: async (req, res) => {
    try {
      if (!req.user?.userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const { sessionId } = req.params;
      const db = getDB();
      const { rows } = await db.query(`SELECT user_id, revoked FROM user_sessions WHERE session_id=$1`, [sessionId]);
      if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' });

      const owner = rows[0].user_id;
      const role = req.user?.role || req.user?.role_name;
      if (owner !== req.user.userId && !['admin','moderator'].includes(role)) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
      if (rows[0].revoked) return res.json({ success: true, message: 'Already revoked' });

      await db.query(`UPDATE user_sessions SET revoked=TRUE, last_seen=NOW() WHERE session_id=$1`, [sessionId]);
      res.json({ success: true, message: 'Session revoked' });
    } catch (e) {
      console.error('revokeById error:', e);
      res.status(500).json({ success: false, message: 'Failed to revoke session' });
    }
  },

  revokeAllMine: async (req, res) => {
    try {
      if (!req.user?.userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const db = getDB();
      await db.query(`UPDATE user_sessions SET revoked=TRUE, last_seen=NOW() WHERE user_id=$1 AND revoked=FALSE`, [req.user.userId]);
      res.json({ success: true, message: 'All sessions revoked' });
    } catch (e) {
      console.error('revokeAllMine error:', e);
      res.status(500).json({ success: false, message: 'Failed to revoke sessions' });
    }
  }
};

module.exports = SessionTokenManager;
