const express = require('express');
const router = express.Router();

const {
  createPayment,
  processPayment,
  getPaymentHistory,
  verifyPayment,
  refundPayment
} = require('../controllers/paymentController');

// Existing JWT middleware in your project
const { authenticateToken } = require('../middlewares/auth');

// NEW: DB session middleware + concurrency guard
const sessionAuth = require('../middlewares/sessionAuth');
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

// -------------------- Router-level middlewares --------------------
// NOTE: ensure express.json() and cookieParser() are mounted globally in server.js before routers.
router.use(idempotencyGuard);   // Anti double-submit via Idempotency-Key
router.use(sessionOrJwt);       // Accept Session token or JWT
router.use(perUserLimiter);     // Cap concurrent requests per user

// -------------------- Routes --------------------

// Create a new payment (usually non-critical)
router.post('/create', createPayment);

// Process payment (critical: wallet/order mutation)
// - Idempotent (router-level)
// - Serialized per user via advisory lock
router.post('/process', lockWallet, withPgMutex, processPayment);

// Verify payment (read-only)
router.post('/verify', verifyPayment);

// Get payment history (read-only)
router.get('/history', getPaymentHistory);

// Refund payment (critical money out; guard with lock)
router.post('/refund', lockWallet, withPgMutex, refundPayment);

module.exports = router;
