const authConfig = require('../config/auth');

const authMiddleware = async (req, res, next) => {
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

    // Verify token
    const decoded = authConfig.verifyToken(token);
    
    // Attach user information to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    next();

  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid access token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Access token has expired'
      });
    }

    if (error.message === 'Token is blacklisted') {
      return res.status(401).json({
        success: false,
        message: 'Access token has been invalidated'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication'
    });
  }
};

// Optional auth middleware (doesn't fail if no token)
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      
      if (token) {
        try {
          const decoded = authConfig.verifyToken(token);
          req.user = {
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role
          };
        } catch (error) {
          // Token is invalid but we don't fail the request
          req.user = null;
        }
      }
    }

    next();

  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next();
  }
};

// Provide alias names for consistency with other route files expecting authenticateToken
const authenticateToken = authMiddleware;

module.exports = {
  authMiddleware,
  authenticateToken,
  optionalAuthMiddleware
};
