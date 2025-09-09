const authConfig = require('../config/auth');

// Basic authentication middleware
const authenticateToken = async (req, res, next) => {
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
const optionalAuth = async (req, res, next) => {
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

// Admin middleware
const requireAdmin = (req, res, next) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userRole = req.user.role;

    // Check if user has admin role
    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    next();

  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during role verification'
    });
  }
};

// Moderator or admin middleware
const requireModerator = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userRole = req.user.role;
    
    if (userRole !== 'admin' && userRole !== 'moderator') {
      return res.status(403).json({
        success: false,
        message: 'Moderator or admin access required'
      });
    }

    next();

  } catch (error) {
    console.error('Moderator middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during role verification'
    });
  }
};

// Business owner middleware
const requireBusinessOwner = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userRole = req.user.role;
    
    if (userRole !== 'admin' && userRole !== 'business_owner' && userRole !== 'food_vendor') {
      return res.status(403).json({
        success: false,
        message: 'Business owner access required'
      });
    }

    next();

  } catch (error) {
    console.error('Business owner middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during role verification'
    });
  }
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireAdmin,
  requireModerator,
  requireBusinessOwner
};
