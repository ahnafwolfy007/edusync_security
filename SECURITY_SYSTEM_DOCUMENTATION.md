# EduSync Security System Documentation

## Overview

The EduSync security system consists of two main components working together to protect the platform from abuse and maintain performance:

1. **Activity Monitoring System** - Detects suspicious user behavior patterns
2. **Concurrent Request Checker** - Prevents system overload and abuse through request management

## Features Implemented

### 🔍 Activity Monitoring System (`activityMonitor.js`)

**Purpose**: Rule-based suspicious activity detection without machine learning

**Key Features**:
- **Login Monitoring**: Tracks failed login attempts and unusual patterns
- **Content Spam Detection**: Analyzes posts for spam keywords and patterns
- **Rate Limiting**: Prevents rapid posting and excessive actions
- **IP Blocking**: Temporarily blocks suspicious IP addresses
- **Activity Reporting**: Generates comprehensive security reports

**Configuration**:
```javascript
{
    maxFailedLogins: 5,           // Failed logins before blocking
    maxPostsPerMinute: 8,         // Posts allowed per minute
    maxPostsPerHour: 80,          // Posts allowed per hour
    spamKeywordThreshold: 3,      // Spam keywords to trigger alert
    maxActionsPerMinute: 50       // General actions per minute
}
```

### 🚦 Concurrent Request Checker (`concurrentRequestChecker.js`)

**Purpose**: Prevents brute-force data scraping while keeping platform responsive

**Key Features**:
- **Per-User Limits**: Limits concurrent requests per user
- **Global System Limits**: Prevents system-wide overload
- **Request Prioritization**: High-priority routes get preference
- **Load Balancing**: Distributes requests efficiently
- **Bulk Request Detection**: Identifies and limits scraping attempts

**Configuration**:
```javascript
{
    maxConcurrentRequests: 4,     // Per user concurrent limit
    maxGlobalConcurrent: 80,      // System-wide limit
    requestTimeoutMs: 30000,      // Request timeout
    bulkRequestThreshold: 10      // Bulk detection threshold
}
```

## API Endpoints

### Security Dashboard (Admin Only)

#### GET `/api/security/dashboard`
Returns comprehensive security overview
```json
{
    "success": true,
    "data": {
        "activityMonitor": {
            "suspiciousActivities": [...],
            "report": {...}
        },
        "concurrentChecker": {
            "systemStatus": {...},
            "analytics": {...}
        }
    }
}
```

#### GET `/api/security/analytics?timeframe=3600000`
Returns security analytics for specified timeframe
```json
{
    "success": true,
    "data": {
        "timeframe": 60,
        "activeUsers": 25,
        "heavyUsers": 3,
        "totalRequests": 1205,
        "currentLoad": {...}
    }
}
```

#### GET `/api/security/suspicious-activities`
Returns recent suspicious activities with optional filters
```json
{
    "success": true,
    "data": {
        "activities": [...],
        "count": 15,
        "filters": {...}
    }
}
```

#### GET `/api/security/status/:userId`
Returns security status for specific user

#### POST `/api/security/block/:userId`
Emergency block user (admin action)

#### POST `/api/security/unblock/:userId`
Manually unblock user (admin action)

#### POST `/api/security/reset`
Emergency reset of security systems

## How It Works

### 1. Request Flow with Security

```
Incoming Request
      ↓
Concurrent Request Check ← Blocks if too many concurrent
      ↓
Action Monitor ← Tracks and limits actions
      ↓
Content Monitor ← Checks for spam (POST requests)
      ↓
Login Monitor ← Special monitoring for auth routes
      ↓
Route Handler
      ↓
Response + Cleanup
```

### 2. Activity Detection

**Login Monitoring**:
- Tracks failed login attempts per IP/user
- Detects multiple location logins
- Automatically blocks after threshold
- Monitors for brute force patterns

**Content Analysis**:
- Scans for spam keywords
- Checks for excessive capitalization
- Detects repeated characters
- Monitors posting frequency

**Action Tracking**:
- Monitors delete operations
- Tracks admin access attempts
- Rate limits bulk operations
- Flags suspicious patterns

### 3. Request Management

**Priority System**:
- **High Priority**: Login, logout, health checks
- **Medium Priority**: Standard user operations
- **Low Priority**: Search, listing operations

**Load Balancing**:
- Limits concurrent requests per user
- Maintains global system limits
- Queues low-priority requests when busy
- Provides informative error messages

## Integration Points

### Server Integration
The security system is integrated into `server.js` with:
```javascript
// Initialize security
const security = new SecurityMiddleware({...});

// Apply middleware
app.use('/api', security.securityMiddleware());
app.use('/api', security.actionMonitor());
app.use('/api', security.contentMonitor());
app.use('/api/auth', security.loginMonitor(), authRoutes);
```

### Route-Specific Security
Different routes have different security levels:
- Authentication routes: Login monitoring + concurrent limiting
- Content creation: Spam detection + rate limiting
- Admin routes: Enhanced monitoring + audit trails
- Public routes: Basic concurrent limiting

## Testing

Run the security test script:
```bash
node test_security_systems.js
```

This will test:
- Login attempt monitoring
- Content spam detection
- Rapid posting prevention
- Concurrent request limiting
- System status reporting

## Monitoring & Alerts

### Console Logging
Security events are logged to console with severity levels:
```
[SECURITY ALERT] excessive_failed_logins: { userId: 'user123', severity: 'high' }
```

### Activity Reports
Generate periodic reports:
```javascript
const report = activityMonitor.generateActivityReport(86400000); // 24 hours
```

### System Status
Monitor real-time system health:
```javascript
const status = concurrentChecker.getSystemStatus();
// Returns: load percentage, active users, blocked users, etc.
```

## Configuration Tips

### For High-Traffic Sites
```javascript
{
    maxConcurrentRequests: 8,
    maxGlobalConcurrent: 200,
    maxPostsPerMinute: 15,
    bulkRequestThreshold: 20
}
```

### For Strict Security
```javascript
{
    maxFailedLogins: 3,
    maxConcurrentRequests: 3,
    maxPostsPerMinute: 5,
    spamKeywordThreshold: 2
}
```

### For Development
```javascript
{
    maxConcurrentRequests: 10,
    maxPostsPerMinute: 20,
    maxFailedLogins: 10
}
```

## Best Practices

1. **Monitor Regularly**: Check security dashboard daily
2. **Adjust Thresholds**: Tune based on legitimate usage patterns
3. **Review Alerts**: Investigate high-severity security events
4. **Clean Data**: The system auto-cleans old data every 5 minutes
5. **Emergency Actions**: Use emergency reset sparingly
6. **User Communication**: Provide clear error messages to users

## Emergency Procedures

### High Load Situation
1. Check `/api/security/analytics` for patterns
2. Temporarily reduce limits if needed
3. Use `/api/security/reset` if system is stuck

### Security Breach Suspected
1. Review `/api/security/suspicious-activities`
2. Block suspicious users via `/api/security/block/:userId`
3. Check system logs for patterns
4. Adjust security thresholds if needed

### System Performance Issues
1. Monitor concurrent request levels
2. Check for users with excessive requests
3. Temporarily block heavy users
4. Review and adjust global limits

## Future Enhancements

The system is designed to be extensible. Future additions could include:
- Machine learning-based pattern detection
- Integration with external threat intelligence
- Advanced user behavior profiling
- Automated response systems
- Integration with notification systems

## Support

For issues or questions about the security system:
1. Check console logs for detailed error messages
2. Use the test script to verify functionality
3. Review the security dashboard for system health
4. Monitor suspicious activities for patterns