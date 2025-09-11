const { customInputValidator, customRateLimiter } = require('../security');

// Simple field presence validator factory
function requireFields(fields = []) {
  return (req, res, next) => {
    const payload = {};
    fields.forEach(f => payload[f] = req.body[f]);
    const result = customInputValidator(payload);
    if (!result.valid) {
      return res.status(400).json({ success:false, message:'Validation failed', issues: result.issues });
    }
    next();
  };
}

// Attach a lightweight per-route rate limiter (in-memory educational)
function rateLimit(options = {}) {
  const limiter = customRateLimiter({ windowMs: options.windowMs || 60000, max: options.max || 30 });
  return (req, res, next) => limiter.consume(req, res, next);
}

module.exports = { requireFields, rateLimit };
