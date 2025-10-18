// middleware/sessionAuth.js
const { verifySession, touchSession } = require('../utils/sessionManager');

function extractSessionToken(req) {
  // Preferred: Authorization: Session <token>
  const h = req.headers['authorization'];
  if (h && h.startsWith('Session ')) return h.slice('Session '.length).trim();
  // Fallback: cookie named 'session_token'
  return req.cookies?.session_token || null;
}

module.exports = async function sessionAuth(req, res, next) {
  try {
    const token = extractSessionToken(req);
    const result = await verifySession(token);
    if (!result.ok) {
      return res.status(401).json({ message: 'Invalid session', reason: result.reason });
    }
    // Attach to request
    req.session = {
      token,
      user_id: result.session.user_id,
      session_id: result.session.session_id,
    };
    // Sliding expiration
    await touchSession(token);
    next();
  } catch (err) {
    next(err);
  }
};
