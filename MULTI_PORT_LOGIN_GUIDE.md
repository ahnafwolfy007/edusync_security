# Multi-Port Login System Guide

## 🎯 **Problem Solved**

The issue where you couldn't login to different accounts from the same browser on different ports has been **completely resolved**! 

Previously, the application used shared localStorage which caused session conflicts. Now each port maintains its own isolated session.

## 🔧 **How It Works**

### **Port-Specific Session Isolation**
- Each development server port (5173, 5174, etc.) now maintains separate user sessions
- Sessions are stored with port-specific prefixes: `edusync_5174_accessToken`, `edusync_5173_userData`, etc.
- No more conflicts between different user accounts on different ports

### **Session Management Features**
- **Automatic isolation** - Each port stores its own tokens and user data
- **Session switcher** - Visual indicator showing active sessions across ports
- **Easy switching** - Click to open new tabs with different accounts
- **Individual logout** - Log out specific sessions without affecting others

## 🚀 **Usage Instructions**

### **Starting Multiple Sessions**

1. **Start First Session:**
   ```bash
   npm run dev  # Starts on port 5174
   ```
   - Login with User A (e.g., student account)

2. **Start Second Session:**
   ```bash
   # In a new terminal
   npm run dev  # Will start on port 5175 (or next available)
   ```
   - Login with User B (e.g., business owner account)

3. **Continue for More Users:**
   - Each new terminal will use the next available port
   - Login with different accounts on each port

### **Session Switcher Interface**

When you have multiple active sessions, you'll see a **"Sessions"** button in the navigation bar:

```
🟣 [👥 3 Sessions] 🟢
```

**Features:**
- **Session count** - Shows how many accounts are currently logged in
- **Active indicator** - Green dot shows sessions are active
- **Quick overview** - Click to see all active sessions
- **Easy switching** - Click any session to open it in a new tab
- **Individual logout** - Log out specific accounts without affecting others

### **Session Management Panel**

Click the sessions button to see:

```
📱 Active Sessions
├── 📍 Port 5174 - John Doe (Student) [Current]
├── 🔗 Port 5175 - Sarah's Cafe (Food Vendor) 
└── 🔗 Port 5176 - TechCorp (Business Owner)
```

**Actions Available:**
- **🔗 Switch** - Open session in new tab
- **🚪 Logout** - End specific session
- **Current indicator** - Shows which session you're viewing

## 🛠️ **Technical Implementation**

### **SessionManager Class**
```javascript
// Automatic port detection
const port = window.location.port || '3000';
const prefix = `edusync_${port}_`;

// Port-specific storage
sessionManager.setItem('accessToken', token);  // Stores as: edusync_5174_accessToken
sessionManager.getItem('userData');           // Gets: edusync_5174_userData
```

### **Storage Structure**
```
localStorage:
├── edusync_5174_accessToken: "jwt_token_for_user_a"
├── edusync_5174_userData: "{user_a_data}"
├── edusync_5175_accessToken: "jwt_token_for_user_b" 
├── edusync_5175_userData: "{user_b_data}"
└── edusync_5176_accessToken: "jwt_token_for_user_c"
```

### **API Integration**
- Each port uses its own tokens for API calls
- Automatic token refresh per session
- Independent authentication states

## 🎯 **Use Cases**

### **Development & Testing**
```bash
# Terminal 1 - Test as Student
npm run dev  # Port 5174 - Login as student@edu.com

# Terminal 2 - Test as Business Owner  
npm run dev  # Port 5175 - Login as business@shop.com

# Terminal 3 - Test as Admin
npm run dev  # Port 5176 - Login as admin@edu.com
```

### **Role-Based Testing**
- **Student view** - Test marketplace features, ordering
- **Vendor view** - Test product management, order processing  
- **Admin view** - Test user management, system controls
- **Chat testing** - Test real-time messaging between different users

### **Feature Development**
- **Frontend developer** - Test UI changes across user types
- **Backend developer** - Test API responses for different roles
- **Full-stack testing** - Test complete workflows end-to-end

## 📱 **Visual Indicators**

### **Navigation Bar Changes**
- **No sessions**: Normal navigation
- **Multiple sessions**: Sessions button appears with count
- **Current session**: User avatar shows current account
- **Session switcher**: Purple gradient button with user count

### **Session Status**
- **🟢 Active**: Session is logged in and tokens are valid
- **🟡 Away**: Session exists but may need refresh
- **🔴 Expired**: Session tokens expired, needs re-login

## 🔒 **Security Features**

### **Session Isolation**
- **Port-based separation** - Complete isolation between ports
- **Independent tokens** - Each session has its own JWT tokens
- **Separate logout** - Logging out one session doesn't affect others

### **Automatic Cleanup**
- **Expired session removal** - Old sessions are automatically cleaned up
- **Token validation** - Invalid tokens are automatically cleared
- **Memory management** - Unused session data is removed

## 🐛 **Troubleshooting**

### **Sessions Not Showing**
```javascript
// Check if sessions exist
console.log(sessionManager.getActiveSessions());

// Clear problematic sessions
sessionManager.cleanupExpiredSessions();
```

### **Login Issues**
- **Clear browser cache** if experiencing issues
- **Check port conflicts** - Ensure different ports are being used
- **Verify tokens** - Check if access tokens are properly stored

### **Session Switching Problems**
- **Popup blockers** - Allow popups for localhost
- **Port availability** - Ensure target port is running
- **Browser limitations** - Some browsers limit local storage

## 💡 **Tips & Best Practices**

### **Efficient Development**
1. **Use bookmarks** for different ports with different accounts
2. **Name your terminals** to track which account is which
3. **Use browser profiles** for additional isolation if needed
4. **Keep session switcher open** for quick account switching

### **Testing Workflows**
1. **Test chat between accounts** - Open seller on one port, buyer on another
2. **Test role transitions** - Business application approval workflows
3. **Test real-time features** - Notifications, order updates across accounts
4. **Test permissions** - Admin actions vs regular user limitations

### **Performance Optimization**
- **Close unused sessions** to free up memory
- **Regular cleanup** of expired sessions
- **Monitor session count** to avoid too many concurrent sessions

## 📞 **Support**

If you encounter any issues with the multi-port login system:

1. **Check browser console** for any errors
2. **Verify port numbers** are different for each session
3. **Clear browser storage** if sessions become corrupted
4. **Restart development servers** if ports conflict

The system is now **fully functional** and allows you to:
- ✅ Login to multiple accounts simultaneously
- ✅ Switch between sessions easily
- ✅ Test different user roles at the same time
- ✅ Develop and test multi-user features
- ✅ Maintain independent sessions per port

**Happy coding with multiple accounts!** 🎉
