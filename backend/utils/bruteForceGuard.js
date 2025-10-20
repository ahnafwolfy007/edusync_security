// utils/bruteForceGuard.js
// Manual brute-force protection: sliding window + backoff + temp lock
// Single-process in-memory. For multi-instance deployments, persist in Redis/DB.

const WINDOW_MS = parseInt(process.env.BF_WINDOW_MS || `${10 * 60 * 1000}`); // 10 min
const MAX_FAILS_ACCOUNT = parseInt(process.env.BF_MAX_FAILS_ACCOUNT || '5'); // per account in window
const MAX_FAILS_IP = parseInt(process.env.BF_MAX_FAILS_IP || '20');          // per IP in window
const BASE_COOLDOWN_MS = parseInt(process.env.BF_BASE_COOLDOWN_MS || '5000'); // 5s
const MAX_COOLDOWN_MS = parseInt(process.env.BF_MAX_COOLDOWN_MS || `${1 * 60 * 1000}`); // 5 min
const TEMP_LOCK_MS = parseInt(process.env.BF_TEMP_LOCK_MS || `${2 * 60 * 1000}`); // 15 min
const PAIR_TIGHT_THRESHOLD = parseInt(process.env.BF_PAIR_THRESHOLD || '3'); // Account+IP: 3 attempts triggers lock

// In-memory state maps
const byAccount = new Map();   // key: normalized email/username
const byIP = new Map();        // key: req.ip
const byAccountIP = new Map(); // key: `${account}|${ip}`

function now() { return Date.now(); }

function purgeOld(timestamps, windowMs) {
  const t = now();
  while (timestamps.length && (t - timestamps) > windowMs) timestamps.shift();
}

function getRec(map, key) {
  let rec = map.get(key);
  if (!rec) {
    rec = { fails: [], cooldownUntil: 0, lockedUntil: 0 };
    map.set(key, rec);
  }
  return rec;
}

function isBlocked(rec) {
  const t = now();
  // Only check for temporary locks, not cooldowns
  // This allows users to retry immediately until they hit the failure threshold
  return (rec.lockedUntil && t < rec.lockedUntil);
}

function remainingMs(rec) {
  const t = now();
  return Math.max(0, rec.lockedUntil - t, rec.cooldownUntil - t);
}

function noteFailure(rec, threshold) {
  const t = now();
  rec.fails.push(t);
  purgeOld(rec.fails, WINDOW_MS);
  const strikes = rec.fails.length;

  // Exponential backoff (capped)
  const cooldown = Math.min(MAX_COOLDOWN_MS, BASE_COOLDOWN_MS * Math.pow(2, Math.max(0, strikes - 1)));
  rec.cooldownUntil = Math.max(rec.cooldownUntil, t + cooldown);

  // Temporary lock after threshold within window
  if (strikes >= threshold) {
    rec.lockedUntil = Math.max(rec.lockedUntil, t + TEMP_LOCK_MS);
  }
}

function reset(rec) {
  rec.fails = [];
  rec.cooldownUntil = 0;
  rec.lockedUntil = 0;
}

// Middleware to run BEFORE login handler
function bruteForceGuard() {
  return function (req, res, next) {
    // Normalize account key from incoming credentials without leaking details
    const accountKey = String((req.body?.email || req.body?.username || '')).trim().toLowerCase();
    const ipKey = req.ip || req.connection?.remoteAddress || 'unknown';

    const acc = getRec(byAccount, accountKey || 'empty');
    const ipr = getRec(byIP, ipKey);
    const pair = getRec(byAccountIP, `${accountKey}|${ipKey}`);

    // purge old entries
    purgeOld(acc.fails, WINDOW_MS);
    purgeOld(ipr.fails, WINDOW_MS);
    purgeOld(pair.fails, WINDOW_MS);

    // deny if any dimension currently blocked
    if (isBlocked(acc) || isBlocked(ipr) || isBlocked(pair)) {
      const wait = Math.max(remainingMs(acc), remainingMs(ipr), remainingMs(pair));
      return res.status(429).json({
        success: false,
        message: 'Too many login attempts. Try again later.',
        retry_after_ms: wait
      });
    }

    // pass context to the login handler
    res.locals._bf = { acc, ipr, pair };
    next();
  };
}

// To be called by the login handler AFTER verifying credentials
// Returns true if should block (hit threshold), false otherwise
function recordBruteForceResult({ success }, ctx) {
  if (!ctx) return false;
  const { acc, ipr, pair } = ctx;
  if (success) {
    reset(acc); reset(ipr); reset(pair);
    return false;
  } else {
    noteFailure(acc, MAX_FAILS_ACCOUNT);
    noteFailure(ipr, MAX_FAILS_IP);
    noteFailure(pair, Math.min(PAIR_TIGHT_THRESHOLD, MAX_FAILS_ACCOUNT));
    
    // Check if account+IP pair has EXACTLY hit the threshold (3 attempts)
    // Show "too many attempts" message only on the 3rd failed attempt
    return pair.fails.length === PAIR_TIGHT_THRESHOLD;
  }
}

module.exports = {
  bruteForceGuard,
  recordBruteForceResult,
  // exported for tests/metrics
  _state: { byAccount, byIP, byAccountIP }
};
