const express = require('express');
const router = express.Router();

const {
  createPayment,
  processPayment,
  getPaymentHistory,
  verifyPayment,
  refundPayment
} = require('../controllers/paymentController');

// Auth middlewares
const { authenticateToken } = require('../middlewares/auth');       // JWT-based
const sessionAuth = require('../middlewares/sessionAuth');          // DB session-based

// Concurrency guard pieces
const {
  idempotencyGuard,
  perUserLimiter,
  withPgMutex,
} = require('../middlewares/concurrencyGuard');

/**
 * Prefer Session token; fallback to JWT.
 * - Session: Authorization: "Session <token>" OR cookie "session_token"
 * - JWT:     Authorization: "Bearer <token>"
 */
function sessionOrJwt(req, res, next) {
  const h = req.headers.authorization || '';
  const hasSessionHeader = h.startsWith('Session ');
  const hasSessionCookie = !!(req.cookies && req.cookies.session_token);
  if (hasSessionHeader || hasSessionCookie) return sessionAuth(req, res, next);
  return authenticateToken(req, res, next);
}

// Helper to read userId from either auth style
function getUserId(req) {
  return (req.user && req.user.userId) || (req.session && req.session.user_id) || null;
}

// Set a per-user wallet mutex before critical money ops
function lockWallet(req, res, next) {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
  req.mutexKey = `wallet:${userId}`;
  next();
}

// -------------------- Global middlewares for this router --------------------
// Body must be parsed before idempotencyGuard (ensure app uses express.json() earlier)
router.use(idempotencyGuard);   // Anti double-submit via Idempotency-Key
router.use(sessionOrJwt);       // Accept Session token or JWT
router.use(perUserLimiter);     // Cap concurrent requests per user

// -------------------- Routes --------------------

// Create a new payment (usually just enqueues/creates intent; not critical section)
router.post('/create', createPayment);

// Process payment (critical: wallet/order mutation)
// - Idempotent via router.use(idempotencyGuard)
// - Serialized per user via advisory lock
router.post('/process', lockWallet, withPgMutex, processPayment);

// Verify payment (typically read/confirm; keep simple)
router.post('/verify', verifyPayment);

// Get payment history (read-only)
router.get('/history', getPaymentHistory);

// Refund payment (critical: money out; lock required)
router.post('/refund', lockWallet, withPgMutex, refundPayment);

module.exports = router;
