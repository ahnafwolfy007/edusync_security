# EduSync Security Implementation Guide

## Overview
This document describes the comprehensive security measures implemented throughout the EduSync platform to protect against common vulnerabilities and attacks.

## 🛡️ Security Features Implemented

### 1. Brute-Force Protection
**Location:** `backend/utils/bruteForceGuard.js`

**Features:**
- **Sliding Window Tracking**: Monitors failed login attempts within a 10-minute window
- **Multi-Level Protection**:
  - Per-account tracking (max 5 failures)
  - Per-IP tracking (max 20 failures)
  - Per-account+IP pair tracking (max 3 failures)
- **Progressive Penalties**:
  - Exponential backoff (5s base, up to 1 minute)
  - Temporary account locks (2 minutes after threshold)
- **Automatic Reset**: Successful authentication clears all failure counters

**Protected Endpoints:**
```javascript
POST /api/auth/register          // Prevents mass account creation
POST /api/auth/request-otp       // Prevents OTP spam
POST /api/auth/verify-otp        // Prevents OTP brute-forcing
POST /api/auth/login             // Prevents password guessing
POST /api/auth/verify-admin-otp  // Protects admin 2FA
PUT  /api/auth/change-password   // Prevents password change abuse
```

**Configuration (Environment Variables):**
```env
BF_WINDOW_MS=600000              # 10 minutes
BF_MAX_FAILS_ACCOUNT=5           # Max failures per account
BF_MAX_FAILS_IP=20               # Max failures per IP
BF_BASE_COOLDOWN_MS=5000         # Initial cooldown (5 seconds)
BF_MAX_COOLDOWN_MS=60000         # Maximum cooldown (1 minute)
BF_TEMP_LOCK_MS=120000           # Temporary lock duration (2 minutes)
BF_PAIR_THRESHOLD=3              # Account+IP pair threshold
```

**Usage Example:**
```javascript
const { bruteForceGuard, recordBruteForceResult } = require('../utils/bruteForceGuard');

// In routes
router.post('/login', bruteForceGuard(), authController.login);

// In controller
async login(req, res) {
  const bfCtx = res.locals._bf; // Context from middleware
  
  // On failure
  recordBruteForceResult({ success: false }, bfCtx);
  
  // On success
  recordBruteForceResult({ success: true }, bfCtx);
}
```

---

### 2. Input Sanitization & Validation
**Location:** `backend/utils/inputSanitization.js`

**Features:**
- **HTML Sanitization**: Removes dangerous tags and scripts
- **SQL Injection Prevention**: Sanitizes SQL-unsafe characters
- **XSS Protection**: Encodes special characters
- **Domain-Specific Validation**:
  - Email validation with institutional domain enforcement (`@bscse.uiu.ac.bd`)
  - Phone number validation (10-15 digits)
  - Password strength validation (min 8 chars, uppercase, lowercase, number, special char)
  - URL validation with protocol enforcement
  - Date validation with range checking
  - Price validation with decimal precision
- **File Security**:
  - Filename sanitization (removes path traversal)
  - File type validation by extension
  - MIME type checking

**Available Methods:**

#### Text Sanitization
```javascript
InputSanitizer.sanitizeHTML(input)           // Removes HTML tags and scripts
InputSanitizer.sanitizeText(text, maxLength) // General text sanitization
InputSanitizer.sanitizeSQL(input)            // Prevents SQL injection
```

#### Validation Methods
```javascript
InputSanitizer.validateEmail(email)          // Returns sanitized email or false
InputSanitizer.validatePassword(password)    // Returns { valid, errors }
InputSanitizer.validatePhone(phone)          // Returns formatted phone or false
InputSanitizer.validateNumber(num, options)  // Validates with min/max/default
InputSanitizer.validateDate(dateStr)         // Returns Date object or false
InputSanitizer.validatePrice(price)          // Returns float with 2 decimals
InputSanitizer.validateObjectId(id)          // Validates MongoDB-style IDs
```

#### File & URL Security
```javascript
InputSanitizer.sanitizeFilename(filename)    // Removes path traversal
InputSanitizer.validateFileType(filename, allowedExts) // Checks extension
InputSanitizer.sanitizeURL(url)              // Validates and sanitizes URLs
```

#### Search & Query Protection
```javascript
InputSanitizer.sanitizeSearchQuery(query)    // Removes regex and MongoDB operators
InputSanitizer.sanitizeJSON(jsonStr)         // Parses and sanitizes JSON
```

#### Rate Limiting
```javascript
const limiter = InputSanitizer.createRateLimiter(maxRequests, windowMs);
if (!limiter(identifier)) {
  // Rate limit exceeded
}
```

**Applied in Controllers:**
- **authController.js**: Email, password, text field validation
- **marketplaceController.js**: Search queries, prices, text inputs
- **businessController.js**: Business names, license info
- **userController.js**: Profile updates (name, phone, location)
- **uploadController.js**: Filename sanitization
- **chatController.js**: Message sanitization, ObjectId validation

---

### 3. Admin Two-Factor Authentication (2FA)
**Location:** `backend/controllers/authController.js`, `backend/routes/authRoutes.js`

**Features:**
- **Email OTP for Admin Logins**: Admins receive a 6-digit OTP via email
- **Temporary Session Tokens**: Secure token-based OTP verification
- **10-Minute Expiry**: OTPs expire after 10 minutes
- **One-Time Use**: OTPs are marked as used after verification
- **Brute-Force Protected**: OTP verification endpoint is protected

**Database Schema:**
```sql
CREATE TABLE admin_login_otps (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id),
  session_token TEXT NOT NULL UNIQUE,
  otp_code VARCHAR(6) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE
);
```

**Flow:**
1. Admin enters credentials
2. Backend validates credentials
3. If valid, generates OTP and temporary token
4. Sends OTP via email
5. Returns `requiresOtp: true` and `tempToken` to frontend
6. Admin enters OTP
7. Backend validates OTP against tempToken
8. Issues JWT tokens on success

---

### 4. User Account Security
**Location:** `backend/config/db.js`, `backend/controllers/adminController.js`

**Features:**
- **Account Blocking**: Admins can block/unblock users
- **Account Activation**: Support for active/inactive states
- **Login Enforcement**: Blocked users cannot log in
- **Clear Error Messages**: Banned users see "Your account is banned" message

**Database Columns:**
```sql
ALTER TABLE users 
ADD COLUMN is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN is_blocked BOOLEAN DEFAULT FALSE;
```

**Admin Controls:**
- View all users with status indicators
- Block/unblock users via admin panel
- Activate/suspend user accounts
- View detailed user profiles

---

### 5. File Upload Security
**Location:** `backend/middlewares/uploadMiddleware.js`, `backend/utils/inputSanitization.js`

**Features:**
- **Filename Sanitization**: Removes path traversal attempts (`../`, `..\\`)
- **Extension Validation**: Whitelist-based file type checking
- **MIME Type Validation**: Server-side MIME type verification
- **Size Limits**: Configurable file size restrictions
- **Organized Storage**: Separate directories for different upload types

**Protected Upload Types:**
- Profile pictures (images only, 5MB max)
- Business documents (PDF, images, 10MB max)
- Product images (images only, 5MB each, max 10 files)
- Rental/secondhand images (images only, 5MB each, max 5 files)
- Lost & found images (images only, 5MB each, max 5 files)

**Example:**
```javascript
const sanitizedFilename = InputSanitizer.sanitizeFilename(file.originalname);
const isValidType = InputSanitizer.validateFileType(sanitizedFilename, ['.jpg', '.jpeg', '.png']);

if (!isValidType) {
  return res.status(400).json({ 
    success: false, 
    message: 'Invalid file type. Only JPEG and PNG allowed.' 
  });
}
```

---

### 6. Search Query Protection
**Location:** Applied in all search endpoints

**Features:**
- **Regex Injection Prevention**: Removes special regex characters
- **MongoDB Operator Filtering**: Strips `$` operators that could manipulate queries
- **Parameterized Queries**: All database queries use parameter binding
- **Length Limits**: Search queries are limited to prevent DoS

**Example:**
```javascript
// In marketplace search
let { search } = req.query;
if (search) {
  search = InputSanitizer.sanitizeSearchQuery(search);
}

// Parameterized query prevents SQL injection
const query = `
  SELECT * FROM items 
  WHERE title ILIKE $1 OR description ILIKE $1
`;
const result = await db.query(query, [`%${search}%`]);
```

---

### 7. Password Security
**Location:** `backend/utils/simpleHash.js`, `backend/utils/inputSanitization.js`

**Features:**
- **Strong Password Requirements**:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character
- **Common Password Detection**: Blocks easily guessable passwords
- **Email-Based Salting**: Deterministic salt generation from email
- **Work Factor Control**: Configurable hashing iterations

**Validation Example:**
```javascript
const passwordValidation = InputSanitizer.validatePassword('MyP@ssw0rd');

if (!passwordValidation.valid) {
  return res.status(400).json({
    success: false,
    message: 'Password requirements not met',
    errors: passwordValidation.errors
  });
}
```

---

## 🔒 Security Best Practices Applied

### 1. **Defense in Depth**
- Multiple layers of security (brute-force, sanitization, validation)
- No single point of failure
- Progressive security measures

### 2. **Least Privilege**
- Role-based access control (admin, moderator, business, student)
- Users only access their own resources
- Admin-only sensitive operations

### 3. **Input Validation**
- All user inputs are validated and sanitized
- Whitelist-based validation where possible
- Type checking and range validation

### 4. **Output Encoding**
- HTML encoding to prevent XSS
- Parameterized queries to prevent SQL injection
- JSON sanitization for API responses

### 5. **Error Handling**
- Generic error messages to prevent information leakage
- Detailed logging for debugging (server-side only)
- No stack traces in production responses

### 6. **Rate Limiting**
- Brute-force protection on authentication endpoints
- OTP rate limiting (3 requests per minute)
- Custom rate limiters for specific operations

---

## 📊 Security Testing Checklist

### Authentication & Authorization
- [x] Brute-force protection on login
- [x] Brute-force protection on registration
- [x] Brute-force protection on OTP requests
- [x] Admin 2FA implementation
- [x] Account blocking enforcement
- [x] Role-based access control

### Input Validation
- [x] Email validation with domain enforcement
- [x] Password strength validation
- [x] Phone number validation
- [x] Search query sanitization
- [x] File upload validation
- [x] Price/number validation
- [x] Date validation
- [x] URL validation

### Data Protection
- [x] SQL injection prevention
- [x] XSS prevention
- [x] Path traversal prevention
- [x] CSRF protection (via JWT tokens)
- [x] Sensitive data encryption (passwords)

### File Security
- [x] Filename sanitization
- [x] Extension validation
- [x] MIME type checking
- [x] Size limit enforcement
- [x] Organized storage structure

---

## 🚀 Deployment Considerations

### Production Environment

1. **Enable HTTPS**
   - Use TLS 1.2 or higher
   - Enforce HTTPS redirects
   - Set secure cookie flags

2. **Environment Variables**
   - Never commit `.env` files
   - Use strong JWT secrets (32+ characters)
   - Rotate secrets periodically

3. **Database Security**
   - Use connection pooling
   - Enable SSL for database connections
   - Regular backups
   - Prepared statements only

4. **Logging & Monitoring**
   - Log all authentication attempts
   - Monitor for unusual patterns
   - Set up alerts for security events
   - Centralized logging system

5. **Rate Limiting Enhancement**
   - Use Redis for distributed rate limiting
   - Implement global rate limits
   - API key management

6. **Regular Updates**
   - Keep dependencies updated
   - Monitor security advisories
   - Patch vulnerabilities promptly

---

## 📝 Development Guidelines

### For New Endpoints

1. **Always apply input sanitization:**
```javascript
const InputSanitizer = require('../utils/inputSanitization');

async createItem(req, res) {
  let { title, description, price } = req.body;
  
  // Sanitize inputs
  title = InputSanitizer.sanitizeText(title, 200);
  description = InputSanitizer.sanitizeText(description, 2000);
  price = InputSanitizer.validatePrice(price);
  
  if (!price) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid price' 
    });
  }
  
  // Continue with database operations
}
```

2. **Add brute-force protection for sensitive operations:**
```javascript
// In routes file
const { bruteForceGuard } = require('../utils/bruteForceGuard');

router.post('/sensitive-operation', bruteForceGuard(), controller.handler);
```

3. **Record brute-force results:**
```javascript
const { recordBruteForceResult } = require('../utils/bruteForceGuard');

async handler(req, res) {
  const bfCtx = res.locals._bf;
  
  try {
    // Validate input
    if (!isValid) {
      recordBruteForceResult({ success: false }, bfCtx);
      return res.status(400).json({ error: 'Invalid input' });
    }
    
    // Perform operation
    const result = await performOperation();
    
    recordBruteForceResult({ success: true }, bfCtx);
    return res.json({ success: true, data: result });
    
  } catch (error) {
    recordBruteForceResult({ success: false }, bfCtx);
    return res.status(500).json({ error: 'Operation failed' });
  }
}
```

4. **Use parameterized queries:**
```javascript
// Good ✅
const result = await db.query(
  'SELECT * FROM items WHERE title = $1 AND price < $2',
  [title, maxPrice]
);

// Bad ❌
const result = await db.query(
  `SELECT * FROM items WHERE title = '${title}' AND price < ${maxPrice}`
);
```

---

## 🔍 Known Limitations

1. **Brute-Force Protection**
   - Currently in-memory (single instance only)
   - **Solution**: Implement Redis-backed tracking for multi-instance deployments

2. **File Upload Storage**
   - Local filesystem storage
   - **Solution**: Consider cloud storage (AWS S3, Azure Blob) for scalability

3. **Rate Limiting Scope**
   - Applied per-endpoint
   - **Solution**: Implement global rate limiting per user/IP

4. **Session Management**
   - JWT tokens with fixed expiry
   - **Solution**: Implement refresh token rotation and blacklisting

---

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

## 🤝 Contributing

When adding new features:
1. Always sanitize user inputs
2. Validate all data types
3. Apply brute-force protection to sensitive endpoints
4. Use parameterized queries
5. Document security measures
6. Test for common vulnerabilities

---

**Last Updated:** January 2025  
**Version:** 1.0.0  
**Maintained By:** EduSync Security Team
