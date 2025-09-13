// customSecurityMiddleware.js
// Complete custom security integration for EduSync
// Implements all custom security functions without external library dependencies

const { 
  customInputValidator, 
  customRateLimiter,
  customSessionManager, 
  customActivityMonitor, 
  customDataEncryption,
  customAccessController,
  customFileValidator, 
  customAuditLogger 
} = require('../security/customSecurity');

// Initialize session manager
const sessionManager = customSessionManager();
const encryption = customDataEncryption();

// ============================================================================
// STAGE 1: INPUT VALIDATION & RATE LIMITING MIDDLEWARE
// ============================================================================

const inputValidationMiddleware = (req, res, next) => {
  try {
    // Skip validation for certain endpoints
    const skipValidation = ['/auth/login', '/auth/register'].includes(req.path);
    if (skipValidation && req.method === 'GET') {
      return next();
    }

    // Validate all string inputs in body, query, and params
    const validateObject = (obj, objName) => {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string' && value.length > 0) {
          const validation = customInputValidator(value, key);
          if (!validation.isValid) {
            return res.status(400).json({
              success: false,
              message: `Invalid ${objName}.${key}: ${validation.error}`,
              securityViolation: true
            });
          }
        }
      }
      return null;
    };

    // Validate request body
    if (req.body && typeof req.body === 'object') {
      const bodyValidation = validateObject(req.body, 'body');
      if (bodyValidation) return bodyValidation;
    }

    // Validate query parameters
    if (req.query && typeof req.query === 'object') {
      const queryValidation = validateObject(req.query, 'query');
      if (queryValidation) return queryValidation;
    }

    // Validate route parameters
    if (req.params && typeof req.params === 'object') {
      const paramsValidation = validateObject(req.params, 'params');
      if (paramsValidation) return paramsValidation;
    }

    next();
  } catch (error) {
    console.error('[Security] Input validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Security validation failed'
    });
  }
};

const rateLimitMiddleware = (maxRequests = 100, timeWindow = 60000) => {
  return (req, res, next) => {
    try {
      // Use IP address as identifier, fallback to 'anonymous'
      const identifier = req.ip || req.connection.remoteAddress || 'anonymous';
      
      const rateLimit = customRateLimiter(identifier, maxRequests, timeWindow);
      
      if (!rateLimit.allowed) {
        return res.status(429).json({
          success: false,
          message: 'Rate limit exceeded',
          retryAfter: Math.ceil(rateLimit.remainingTime / 1000),
          securityViolation: true
        });
      }

      next();
    } catch (error) {
      console.error('[Security] Rate limiting error:', error);
      next(); // Don't fail request on rate limiting errors
    }
  };
};

// ============================================================================
// STAGE 2: CUSTOM SESSION MANAGEMENT MIDDLEWARE
// ============================================================================

const customAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    // Use custom session validation instead of JWT
    const session = sessionManager.validateToken(token);
    
    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session'
      });
    }

    // Attach user information to request
    req.user = {
      userId: session.userID,
      role: session.userRole
    };

    // Log activity
    customActivityMonitor(session.userID, 'api_request', {
      path: req.path,
      method: req.method,
      ip: req.ip
    });

    next();

  } catch (error) {
    console.error('[Security] Custom auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication'
    });
  }
};

const optionalCustomAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      
      if (token) {
        const session = sessionManager.validateToken(token);
        if (session) {
          req.user = {
            userId: session.userID,
            role: session.userRole
          };
        }
      }
    }

    next();
  } catch (error) {
    console.error('[Security] Optional custom auth error:', error);
    next();
  }
};

// ============================================================================
// STAGE 3: ACCESS CONTROL MIDDLEWARE
// ============================================================================

const customAccessControlMiddleware = (requiredAction, resourceType) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userRole = req.user.role;
      const currentUser = req.user.userId;
      
      // Determine resource owner (from params, body, or query)
      let resourceOwner = null;
      if (req.params.userId) resourceOwner = req.params.userId;
      else if (req.body.userId) resourceOwner = req.body.userId;
      else if (req.query.userId) resourceOwner = req.query.userId;

      const accessControl = customAccessController(
        userRole, 
        requiredAction, 
        resourceType, 
        resourceOwner, 
        currentUser
      );

      if (!accessControl.allowed) {
        // Log access denial
        customActivityMonitor(currentUser, 'access_denied', {
          action: requiredAction,
          resource: resourceType,
          reason: accessControl.reason
        });

        return res.status(403).json({
          success: false,
          message: accessControl.reason || 'Access denied',
          securityViolation: true
        });
      }

      next();
    } catch (error) {
      console.error('[Security] Access control error:', error);
      res.status(500).json({
        success: false,
        message: 'Security validation failed'
      });
    }
  };
};

// ============================================================================
// STAGE 4: FILE VALIDATION & AUDIT MIDDLEWARE
// ============================================================================

const fileValidationMiddleware = (req, res, next) => {
  try {
    if (!req.files && !req.file) {
      return next(); // No files to validate
    }

    const userRole = req.user?.role || 'student';
    const files = req.files ? Object.values(req.files).flat() : [req.file];

    for (const file of files) {
      if (file) {
        const validation = customFileValidator(file, file.buffer, userRole);
        
        if (!validation.isValid) {
          return res.status(400).json({
            success: false,
            message: `File validation failed: ${validation.reason}`,
            securityViolation: true
          });
        }

        // Sanitize filename
        file.originalname = validation.sanitizedName;
      }
    }

    next();
  } catch (error) {
    console.error('[Security] File validation error:', error);
    res.status(500).json({
      success: false,
      message: 'File security validation failed'
    });
  }
};

const auditMiddleware = (req, res, next) => {
  try {
    // Capture original res.json to log response data
    const originalJson = res.json;
    
    res.json = function(data) {
      try {
        const userID = req.user?.userId || 'anonymous';
        const dataSize = JSON.stringify(data).length;
        
        // Log the request/response
        const auditResult = customAuditLogger(
          userID,
          `${req.method} ${req.path}`,
          'api_response',
          dataSize,
          'client',
          {
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            statusCode: res.statusCode
          }
        );

        // If suspicious activity detected, log additional warning
        if (auditResult.suspicious) {
          console.warn(`[SECURITY ALERT] Suspicious activity detected for user ${userID}`);
        }

      } catch (auditError) {
        console.error('[Security] Audit logging error:', auditError);
      }

      // Call original json method
      return originalJson.call(this, data);
    };

    next();
  } catch (error) {
    console.error('[Security] Audit middleware error:', error);
    next(); // Don't fail request on audit errors
  }
};

// ============================================================================
// DATA ENCRYPTION UTILITIES
// ============================================================================

const encryptSensitiveData = (data) => {
  try {
    return encryption.encrypt(data);
  } catch (error) {
    console.error('[Security] Encryption error:', error);
    throw new Error('Failed to encrypt sensitive data');
  }
};

const decryptSensitiveData = (encryptedData) => {
  try {
    return encryption.decrypt(encryptedData);
  } catch (error) {
    console.error('[Security] Decryption error:', error);
    return null;
  }
};

// ============================================================================
// COMBINED SECURITY MIDDLEWARE
// ============================================================================

const fullSecurityMiddleware = [
  inputValidationMiddleware,
  rateLimitMiddleware(100, 60000), // 100 requests per minute
  auditMiddleware
];

const authenticatedSecurityMiddleware = [
  inputValidationMiddleware,
  rateLimitMiddleware(200, 60000), // Higher limit for authenticated users
  customAuthMiddleware,
  auditMiddleware
];

// ============================================================================
// CUSTOM LOGIN/LOGOUT FUNCTIONS
// ============================================================================

const customLogin = (userID, userRole) => {
  try {
    // Generate custom session token
    const token = sessionManager.generateToken(userID, userRole);
    
    // Log login activity
    const activityResult = customActivityMonitor(userID, 'login', {
      timestamp: new Date().toISOString(),
      method: 'custom_auth'
    });

    return {
      token,
      isAnomalous: activityResult.isAnomalous,
      anomalyReason: activityResult.reason
    };
  } catch (error) {
    console.error('[Security] Custom login error:', error);
    throw new Error('Login failed');
  }
};

const customLogout = (token) => {
  try {
    // In a real implementation, you might want to invalidate the token
    // For now, we'll just log the logout
    const session = sessionManager.validateToken(token);
    if (session) {
      customActivityMonitor(session.userID, 'logout', {
        timestamp: new Date().toISOString()
      });
      // Remove from active sessions (if you modify customSecurity.js to support this)
      return true;
    }
    return false;
  } catch (error) {
    console.error('[Security] Custom logout error:', error);
    return false;
  }
};

module.exports = {
  // Individual middleware components
  inputValidationMiddleware,
  rateLimitMiddleware,
  customAuthMiddleware,
  optionalCustomAuthMiddleware,
  customAccessControlMiddleware,
  fileValidationMiddleware,
  auditMiddleware,
  
  // Combined middleware
  fullSecurityMiddleware,
  authenticatedSecurityMiddleware,
  
  // Utility functions
  encryptSensitiveData,
  decryptSensitiveData,
  customLogin,
  customLogout,
  sessionManager,
  
  // Access control helpers
  requireRole: (role) => customAccessControlMiddleware('read', 'any'),
  requireReadAccess: (resource) => customAccessControlMiddleware('read', resource),
  requireWriteAccess: (resource) => customAccessControlMiddleware('write', resource)
};
