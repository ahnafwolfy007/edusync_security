# Admin 2FA (Two-Factor Authentication) Login Guide

## Overview
The EduSync platform implements a secure Two-Factor Authentication (2FA) system for admin accounts. When an admin attempts to login, they must verify their identity using a One-Time Password (OTP) sent to their registered email address.

## How It Works

### 1. Admin Login Flow
```
1. Admin enters email and password on login page
2. Backend verifies credentials
3. If credentials are valid and user is admin:
   - Generate 6-digit OTP code
   - Send OTP to admin's email
   - Create temporary session token
   - Return requiresOtp: true to frontend
4. Frontend displays OTP input form
5. Admin enters OTP from email
6. Backend verifies OTP matches stored value
7. If valid, issue access & refresh tokens
8. Admin is logged in successfully
```

### 2. Backend Implementation

#### Database Table: `admin_login_otps`
```sql
CREATE TABLE admin_login_otps (
  otp_id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(user_id),
  email VARCHAR(255) NOT NULL,
  otp_code VARCHAR(10) NOT NULL,
  session_token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Key Backend Files:
- **`backend/controllers/authController.js`**: 
  - `login()` method checks if user is admin
  - Generates OTP and sends email
  - Returns temp token instead of access token
  
- **`backend/services/emailService.js`**:
  - `sendAdminLoginOtpEmail()` function
  - Sends professional email with OTP code
  
- **`backend/routes/authRoutes.js`**:
  - `POST /api/auth/verify-admin-otp` endpoint
  - Verifies OTP and issues tokens

### 3. Frontend Implementation

#### Key Frontend Files:
- **`client/src/pages/Login.jsx`**:
  - Displays OTP input form when `adminOtpRequired` is true
  - Handles OTP submission
  - Shows success/error messages
  
- **`client/src/context/AuthContext.jsx`**:
  - `login()` function checks for `requiresOtp` flag
  - `verifyAdminOtp()` function sends OTP for verification

### 4. Security Features

1. **Time-Limited OTPs**: 
   - OTPs expire after 10 minutes
   - Prevents replay attacks

2. **One-Time Use**:
   - Each OTP can only be used once
   - Marked as `used` after verification

3. **Secure Token Storage**:
   - Temporary session tokens are cryptographically random
   - 32-byte random hex strings

4. **Email Verification**:
   - OTP sent only to registered admin email
   - Verifies admin has access to email account

5. **Rate Limiting**:
   - Brute force protection on login attempts
   - Progressive cooldown on failed attempts

## Testing the Admin 2FA

### Prerequisites:
1. Admin account in database with role='admin'
2. Valid email configured in EMAIL_USER/.env
3. SMTP credentials set up for sending emails

### Test Admin Account Creation:

```javascript
// Create test admin using Node.js
const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'edusync',
  user: 'postgres',
  password: '235933'
});

// Hash password (use same method as registration)
const password = 'Admin@123';
const email = 'admin@test.com';

// Execute SQL
pool.query(`
  INSERT INTO users (full_name, email, password_hash, role_id, is_email_verified, email_verified_at)
  SELECT 'Test Admin', $1, $2, role_id, TRUE, NOW()
  FROM roles WHERE role_name = 'admin'
  RETURNING user_id, email, full_name
`, [email, hashedPassword])
.then(result => {
  console.log('Admin created:', result.rows[0]);
  pool.end();
});
```

### Testing Steps:

1. **Start the application**:
   ```bash
   npm run dev
   ```

2. **Navigate to Login page**:
   - Open http://localhost:5174/
   - Click "Login" or go to /login

3. **Enter Admin Credentials**:
   - Email: your-admin@email.com
   - Password: your-admin-password
   - Click "Login"

4. **Check Console Logs**:
   - Open browser DevTools (F12)
   - Check Console tab for debug logs:
     - "Login response data"
     - "Returning OTP required response"
     - "Login result"
     - "Admin OTP required - showing form"

5. **Verify OTP Form Appears**:
   - Should see "Admin Security Verification 🔐" header
   - 6-digit OTP input field displayed
   - "Verify & Enter Admin Panel" button

6. **Check Email**:
   - Check admin's email inbox
   - Should receive email with subject "Admin Login Verification - EduSync"
   - Copy the 6-digit OTP code

7. **Enter OTP**:
   - Paste or type the 6-digit code
   - Click "Verify & Enter Admin Panel 🚀"

8. **Successful Login**:
   - Should redirect to Admin Panel
   - Access token stored in sessionStorage
   - User authenticated

## Troubleshooting

### OTP Form Not Showing

1. **Check Backend Response**:
   ```javascript
   // Should return:
   {
     success: true,
     requiresOtp: true,
     tempToken: "random-hex-string",
     message: "OTP sent to admin email..."
   }
   ```

2. **Check Frontend State**:
   - `adminOtpRequired` should be `true`
   - `adminTempToken` should have value
   - Look for console.log messages

3. **Verify Admin Role**:
   ```sql
   SELECT u.email, r.role_name 
   FROM users u 
   JOIN roles r ON u.role_id = r.role_id 
   WHERE u.email = 'your-admin@email.com';
   ```
   - Should show `role_name` as 'admin'

### OTP Email Not Received

1. **Check Email Configuration**:
   - Verify EMAIL_USER in .env
   - Verify EMAIL_PASS (app password)
   - Check EMAIL_HOST and EMAIL_PORT

2. **Check Backend Logs**:
   ```
   ✅ Email transporter ready
   ```

3. **Check Spam/Junk Folder**

4. **Test Email Service**:
   ```javascript
   const { sendAdminLoginOtpEmail } = require('./backend/services/emailService');
   await sendAdminLoginOtpEmail('test@email.com', '123456', 'Test Admin');
   ```

### OTP Verification Failing

1. **Check OTP Expiration**:
   - OTPs expire after 10 minutes
   - Request new OTP if expired

2. **Verify OTP in Database**:
   ```sql
   SELECT * FROM admin_login_otps 
   WHERE email = 'admin@email.com' 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```

3. **Check Used Status**:
   - OTP should have `used = false`
   - If `used = true`, request new OTP

## Configuration

### Environment Variables (.env):
```env
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM="EduSync Campus <your-email@gmail.com>"

# Admin Configuration
ADMIN_EMAIL=admin@edusync.edu
```

### Email Service Configuration:
- Uses Nodemailer with Gmail SMTP
- Requires App Password (not regular password)
- Enable 2-Step Verification in Google Account
- Generate App Password in Google Security settings

## API Endpoints

### POST /api/auth/login
**Request:**
```json
{
  "email": "admin@test.com",
  "password": "Admin@123"
}
```

**Response (Admin):**
```json
{
  "success": true,
  "requiresOtp": true,
  "tempToken": "abc123...",
  "message": "OTP sent to admin email. Please verify to complete login."
}
```

### POST /api/auth/verify-admin-otp
**Request:**
```json
{
  "tempToken": "abc123...",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Admin login successful",
  "data": {
    "user": {...},
    "accessToken": "jwt-token...",
    "refreshToken": "refresh-token..."
  }
}
```

## Benefits

1. **Enhanced Security**: Two layers of authentication
2. **Email Verification**: Ensures admin has access to registered email
3. **Audit Trail**: All OTP attempts logged in database
4. **Time-Limited**: OTPs expire to prevent misuse
5. **User-Friendly**: Simple 6-digit code, easy to use
6. **Professional**: Clean UI with clear instructions

## Future Enhancements

1. SMS OTP as alternative
2. Authenticator app support (TOTP)
3. Backup codes for emergency access
4. OTP resend functionality
5. Configurable OTP expiration time
6. IP-based trusted device management
7. Login notification emails
8. Suspicious activity detection

---

For support, contact: support@edusync.edu
