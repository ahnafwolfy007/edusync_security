# Input Sanitization Testing Guide

## Quick Test Scenarios

### ✅ Test 1: SQL Injection in Search
**Endpoint:** `GET /api/marketplace/items?search=' OR '1'='1`

**Expected Result:**
- Search query is sanitized
- No SQL errors
- Safe search results returned

**How to Test:**
1. Open browser: `http://localhost:5174`
2. Go to Marketplace
3. In search box, type: `' OR '1'='1`
4. Check Network tab - query should be sanitized

---

### ✅ Test 2: XSS in Marketplace Item
**Endpoint:** `POST /api/marketplace/items`

**Request Body:**
```json
{
  "title": "<script>alert('XSS')</script>Laptop",
  "description": "<img src=x onerror=alert('hack')>Great laptop",
  "price": 500,
  "category": "electronics"
}
```

**Expected Result:**
- HTML tags removed from title: "Laptop"
- Script tags removed from description
- Item created safely

**How to Test:**
1. Login to your app
2. Try to create a new marketplace item
3. Put `<script>alert('test')</script>` in the title
4. Submit and check if script is removed in database

---

### ✅ Test 3: Invalid Email Domain
**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "fullName": "Test User",
  "email": "test@gmail.com",
  "password": "Test@1234",
  "otpCode": "123456"
}
```

**Expected Result:**
```json
{
  "success": false,
  "message": "Invalid email format or email does not match allowed domain"
}
```

**How to Test:**
1. Go to registration page
2. Try to register with `test@gmail.com`
3. Should see error message about invalid domain

---

### ✅ Test 4: Weak Password
**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "email": "test@bscse.uiu.ac.bd",
  "password": "weak"
}
```

**Expected Result:**
```json
{
  "success": false,
  "message": "Password requirements not met",
  "errors": [
    "Password must be at least 8 characters long",
    "Password must contain at least one uppercase letter",
    "Password must contain at least one number",
    "Password must contain at least one special character"
  ]
}
```

---

### ✅ Test 5: Negative Price
**Endpoint:** `POST /api/marketplace/items`

**Request Body:**
```json
{
  "title": "Test Product",
  "description": "Test",
  "price": -100,
  "category": "electronics"
}
```

**Expected Result:**
```json
{
  "success": false,
  "message": "Invalid price. Price must be a positive number."
}
```

---

### ✅ Test 6: Path Traversal in Filename
**Endpoint:** `POST /api/upload/profile-picture`

**Test:**
1. Create a file named: `../../../../etc/passwd.jpg`
2. Try to upload it
3. Check the saved filename in database/storage

**Expected Result:**
- Filename sanitized to: `etcpasswd.jpg` or similar
- No path traversal characters (`../`)

---

### ✅ Test 7: Invalid Phone Number
**Endpoint:** `PUT /api/users/profile`

**Request Body:**
```json
{
  "phone": "123"
}
```

**Expected Result:**
```json
{
  "success": false,
  "message": "Invalid phone number format"
}
```

---

### ✅ Test 8: MongoDB Injection in Search
**Endpoint:** `GET /api/marketplace/items?search=$where`

**Expected Result:**
- `$where` operator removed
- Safe search executed
- No database errors

---

### ✅ Test 9: HTML Injection in Business Application
**Endpoint:** `POST /api/businesses/apply`

**Request Body:**
```json
{
  "businessName": "<h1>My Business</h1>",
  "businessType": "<script>alert('xss')</script>Restaurant",
  "licenseInfo": "'; DROP TABLE businesses; --"
}
```

**Expected Result:**
- HTML tags stripped from businessName: "My Business"
- Script tags removed from businessType: "Restaurant"
- SQL injection characters removed from licenseInfo

---

### ✅ Test 10: Long Input (DoS Prevention)
**Endpoint:** `POST /api/marketplace/items`

**Request Body:**
```json
{
  "title": "A".repeat(10000),
  "description": "B".repeat(50000),
  "price": 100,
  "category": "electronics"
}
```

**Expected Result:**
- Title truncated to max length (200 chars)
- Description truncated to max length (2000 chars)
- Item created with truncated values

---

## 🧪 Automated Testing Script

Save this as `test-sanitization.js` in your backend folder:

```javascript
// test-sanitization.js
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
let authToken = '';

async function testSanitization() {
  console.log('🧪 Starting Input Sanitization Tests...\n');

  // Test 1: SQL Injection in Search
  console.log('Test 1: SQL Injection in Search');
  try {
    const res = await axios.get(`${BASE_URL}/marketplace/items?search=' OR '1'='1`);
    console.log('✅ Search sanitized - no errors\n');
  } catch (err) {
    console.log('❌ Search failed:', err.response?.data || err.message, '\n');
  }

  // Test 2: Invalid Email Domain
  console.log('Test 2: Invalid Email Domain');
  try {
    const res = await axios.post(`${BASE_URL}/auth/register`, {
      fullName: 'Test User',
      email: 'test@gmail.com',
      password: 'Test@1234'
    });
    console.log('❌ Should have rejected invalid domain\n');
  } catch (err) {
    if (err.response?.status === 400) {
      console.log('✅ Invalid email rejected:', err.response.data.message, '\n');
    } else {
      console.log('❌ Unexpected error:', err.response?.data || err.message, '\n');
    }
  }

  // Test 3: Weak Password
  console.log('Test 3: Weak Password');
  try {
    const res = await axios.post(`${BASE_URL}/auth/register`, {
      fullName: 'Test User',
      email: 'test@bscse.uiu.ac.bd',
      password: 'weak'
    });
    console.log('❌ Should have rejected weak password\n');
  } catch (err) {
    if (err.response?.status === 400) {
      console.log('✅ Weak password rejected:', err.response.data.message, '\n');
    } else {
      console.log('❌ Unexpected error:', err.response?.data || err.message, '\n');
    }
  }

  // Test 4: XSS in Text Input (requires login)
  // Add more tests as needed...

  console.log('🎉 Sanitization tests completed!');
}

testSanitization();
```

Run it with:
```bash
cd backend
node test-sanitization.js
```

---

## 🔍 Manual Verification Checklist

After testing, verify in the database:

### Check PostgreSQL Database:
```sql
-- Check if HTML/SQL was stored (it shouldn't be)
SELECT title, description FROM marketplace_items ORDER BY created_at DESC LIMIT 5;

-- Check user data
SELECT full_name, email, phone FROM users ORDER BY created_at DESC LIMIT 5;

-- Check business applications
SELECT business_name, business_type FROM business_applications ORDER BY applied_at DESC LIMIT 5;
```

**What to Look For:**
- ❌ No `<script>` tags in any text fields
- ❌ No SQL injection characters (`;`, `--`, `'`)
- ❌ No path traversal (`../`, `..\\`)
- ✅ Clean, sanitized data only

---

## 🎯 Expected Sanitization Behavior

| Input Type | Malicious Input | Sanitized Output |
|------------|----------------|------------------|
| Email | `test' OR 1=1@bscse.uiu.ac.bd` | Rejected (invalid format) |
| Text | `<script>alert('xss')</script>Hello` | `Hello` (tags removed) |
| Search | `' OR '1'='1` | `OR 11` (quotes removed) |
| Price | `-100` | Rejected (must be positive) |
| Price | `"100 OR 1=1"` | Rejected (not a number) |
| Phone | `abc1234567890` | Rejected (invalid format) |
| Phone | `01712345678` | `01712345678` (accepted) |
| Filename | `../../../etc/passwd` | `etcpasswd` (sanitized) |
| SQL | `'; DROP TABLE users; --` | ` DROP TABLE users --` (quotes removed) |

---

## 🚀 Quick Visual Test (Easiest!)

1. **Start your servers:**
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm start

   # Terminal 2 - Frontend
   cd client
   npm run dev
   ```

2. **Open browser:** `http://localhost:5174`

3. **Try these in order:**

   **a) Register with invalid email:**
   - Go to registration
   - Email: `test@gmail.com`
   - Should see error: "Invalid email format..."

   **b) Register with weak password:**
   - Email: `valid@bscse.uiu.ac.bd`
   - Password: `weak`
   - Should see error listing requirements

   **c) Create marketplace item with XSS:**
   - Login
   - Create new item
   - Title: `<script>alert('test')</script>Laptop`
   - Check database - should see `Laptop` only

   **d) Search with SQL injection:**
   - Go to marketplace
   - Search: `' OR '1'='1`
   - Should work safely (no errors, sanitized query)

4. **Check browser console:**
   - Open DevTools (F12)
   - Console tab
   - Should see NO XSS alerts
   - Should see NO errors

5. **Check Network tab:**
   - Look at API responses
   - Should see validation error messages
   - Should see 400/429 status codes for invalid inputs

---

## ✅ Success Indicators

Your sanitization is working if:

- ✅ Invalid emails are rejected
- ✅ Weak passwords show specific error messages
- ✅ HTML tags are stripped from text inputs
- ✅ SQL injection attempts don't cause errors
- ✅ Negative prices are rejected
- ✅ Invalid phone numbers are rejected
- ✅ Path traversal in filenames is prevented
- ✅ Search with special characters works safely
- ✅ No XSS alerts appear in browser
- ✅ Database contains only clean data

---

## 📊 What to Show in Your Project Demo

1. **Show XSS Prevention:**
   - Type `<script>alert('hack')</script>` in a form
   - Show it gets sanitized
   - Show database has clean data

2. **Show SQL Injection Prevention:**
   - Search with `' OR '1'='1`
   - Show it doesn't break the app
   - Show results are safe

3. **Show Password Validation:**
   - Try weak password
   - Show detailed error messages
   - Show strong password requirements

4. **Show Email Validation:**
   - Try non-institutional email
   - Show domain enforcement

5. **Show Price Validation:**
   - Try negative price
   - Show validation error
   - Try valid price - works

This demonstrates comprehensive input sanitization! 🎯
