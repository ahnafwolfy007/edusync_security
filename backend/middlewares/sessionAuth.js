const { verifySession, touchSession } = require('../utils/sessionManager');

function extractSessionToken(req) {
  const h = req.headers['authorization'];
  if (h && h.startsWith('Session ')) return h.slice('Session '.length).trim();
  return req.cookies?.session_token || null;
}

module.exports = async function sessionAuth(req, res, next) {
  try {
    const token = extractSessionToken(req);
    const result = await verifySession(token);
    if (!result.ok) {
      return res.status(401).json({ message: 'Invalid session', reason: result.reason });
    }
    req.session = { token, user_id: result.session.user_id, session_id: result.session.session_id };
    await touchSession(token); // sliding TTL
    next();
  } catch (err) {
    next(err);
  }
};
