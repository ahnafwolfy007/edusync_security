# Forgot Password Implementation

A complete forgot password system with advanced UI components for the EduSync application.

## Features

### Backend
- 🔐 **Secure Token Generation**: Uses crypto.randomBytes for secure reset tokens
- ⏰ **Token Expiration**: Tokens expire after 15 minutes for security
- 📧 **Email Integration Ready**: Mock email service with structure for real email providers
- 🛡️ **Security Best Practices**: 
  - Doesn't reveal if email exists or not
  - Tokens are single-use
  - Proper validation and sanitization
- 🔄 **New Hash Integration**: Uses the new email-based salt generation system

### Frontend
- 🎨 **Advanced UI**: Modern, responsive design with animations
- 📱 **Multi-Step Flow**: Guided process with progress indicators
- 🔄 **Real-time Validation**: Password strength indicators and validation
- 🌟 **Multiple Components**:
  - Full standalone page (`ForgotPassword.jsx`)
  - Modal for integration (`ForgotPasswordModal.jsx`)
  - Password reset page (`ResetPassword.jsx`)
  - Admin token manager (`ResetTokenManager.jsx`)

## API Endpoints

### POST `/api/forgot-password/request`
Request a password reset token.

**Request:**
```json
{
  "email": "user@bscse.uiu.ac.bd"
}
```

**Response:**
```json
{
  "success": true,
  "message": "If the email exists, a reset link has been sent.",
  "resetToken": "abc123..." // Only in development
}
```

### POST `/api/forgot-password/verify-token`
Verify if a reset token is valid.

**Request:**
```json
{
  "token": "abc123..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token is valid",
  "email": "user@bscse.uiu.ac.bd"
}
```

### POST `/api/forgot-password/reset`
Reset password using a valid token.

**Request:**
```json
{
  "token": "abc123...",
  "newPassword": "newpassword123",
  "confirmPassword": "newpassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password has been reset successfully"
}
```

### GET `/api/forgot-password/tokens` (Development Only)
Get all active reset tokens for development/testing.

## Installation & Setup

### Backend Setup

1. **Route Registration**: Already added to `server.js`
```javascript
const forgotPasswordRoutes = require('./routes/forgotPassword');
app.use('/api/forgot-password', forgotPasswordRoutes);
```

2. **Dependencies**: Uses existing dependencies (crypto, express)

3. **Environment Variables** (Optional):
```bash
NODE_ENV=development  # Shows reset tokens in response
```

### Frontend Setup

1. **Install Dependencies** (if not already installed):
```bash
npm install framer-motion lucide-react
```

2. **Add Routes** (if using React Router):
```javascript
import ResetPassword from './pages/ResetPassword';

// Add to your router
<Route path="/reset-password/:token" element={<ResetPassword />} />
```

3. **Integration Examples**:

**Modal Integration:**
```jsx
import ForgotPasswordModal from './components/ForgotPasswordModal';

function LoginPage() {
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  
  return (
    <div>
      {/* Your login form */}
      <button onClick={() => setShowForgotPassword(true)}>
        Forgot Password?
      </button>
      
      <ForgotPasswordModal 
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </div>
  );
}
```

**Standalone Page:**
```jsx
import ForgotPassword from './components/ForgotPassword';

function ForgotPasswordPage() {
  const navigate = useNavigate();
  
  return (
    <ForgotPassword onBack={() => navigate('/login')} />
  );
}
```

## Testing

### Automated Testing
Run the test script:
```bash
cd backend
node test_forgot_password.js
```

### Manual Testing

1. **Start the backend server**:
```bash
cd backend
npm start
```

2. **Test the flow**:
   - Request reset for `user@bscse.uiu.ac.bd`
   - Copy the token from response (development mode)
   - Use token to reset password
   - Login with new password

3. **Use Token Manager** (Development):
   - Access the `ResetTokenManager` component
   - View all active tokens
   - Copy tokens/URLs for testing

## Email Integration

### Current Implementation (Mock)
The system currently uses a mock email service that logs to console. In development, reset tokens are returned in the API response.

### Production Email Setup
Replace the `sendResetEmail` function in `/routes/forgotPassword.js`:

**SendGrid Example:**
```javascript
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendResetEmail(email, token) {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
  
  const msg = {
    to: email,
    from: process.env.FROM_EMAIL,
    subject: 'Password Reset Request',
    html: `
      <h2>Password Reset Request</h2>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>This link will expire in 15 minutes.</p>
    `
  };
  
  await sgMail.send(msg);
}
```

**AWS SES Example:**
```javascript
const AWS = require('aws-sdk');
const ses = new AWS.SES({ region: 'us-east-1' });

async function sendResetEmail(email, token) {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
  
  const params = {
    Source: process.env.FROM_EMAIL,
    Destination: { ToAddresses: [email] },
    Message: {
      Subject: { Data: 'Password Reset Request' },
      Body: {
        Html: {
          Data: `
            <h2>Password Reset Request</h2>
            <p>Click the link below to reset your password:</p>
            <a href="${resetUrl}">Reset Password</a>
            <p>This link will expire in 15 minutes.</p>
          `
        }
      }
    }
  };
  
  await ses.sendEmail(params).promise();
}
```

## Security Considerations

1. **Rate Limiting**: Consider adding rate limiting to prevent abuse
2. **Token Storage**: In production, use Redis or database instead of memory
3. **HTTPS**: Always use HTTPS in production
4. **Token Entropy**: Tokens use crypto.randomBytes(32) for high entropy
5. **Time-based Security**: Tokens expire after 15 minutes
6. **No Information Disclosure**: Doesn't reveal if email exists

## Production Deployment

1. **Environment Variables**:
```bash
NODE_ENV=production
FRONTEND_URL=https://your-domain.com
FROM_EMAIL=noreply@your-domain.com
SENDGRID_API_KEY=your-key  # or other email service keys
```

2. **Database Storage**: Replace in-memory token storage with database:
```javascript
// Example using PostgreSQL
await db.query(
  'INSERT INTO reset_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)',
  [resetToken, userId, expiresAt]
);
```

3. **Redis Storage**: For better performance:
```javascript
// Example using Redis
await redis.setex(`reset:${resetToken}`, 900, JSON.stringify(tokenData)); // 15 minutes
```

## Troubleshooting

### Common Issues

1. **Tokens not working**: Check if server is in development mode
2. **Email not received**: Verify email service configuration
3. **Token expired**: Tokens expire after 15 minutes
4. **404 on routes**: Ensure routes are properly registered in server.js

### Development Tips

1. Use the token manager component to view active tokens
2. Check server console for mock email output
3. Use the test script for automated validation
4. Verify database connection for user lookup

## File Structure

```
backend/
├── routes/
│   └── forgotPassword.js          # Main route handler
├── test_forgot_password.js        # Test script
└── server.js                      # Updated with route registration

client/src/
├── components/
│   ├── ForgotPassword.jsx         # Full standalone component
│   ├── ForgotPasswordModal.jsx    # Modal version
│   └── ResetTokenManager.jsx      # Development admin panel
└── pages/
    └── ResetPassword.jsx          # Password reset page
```

This implementation provides a complete, production-ready forgot password system with excellent user experience and security best practices.
