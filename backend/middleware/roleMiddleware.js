// Role-based access control middleware
const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userRole = req.user.role || 'user';
      
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Insufficient permissions.'
        });
      }

      next();
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};

// Check if user is admin
const requireAdmin = (req, res, next) => {
  return checkRole(['admin'])(req, res, next);
};

// Check if user is admin or moderator
const requireModerator = (req, res, next) => {
  return checkRole(['admin', 'moderator'])(req, res, next);
};

// Check if user is business owner
const requireBusinessOwner = (req, res, next) => {
  return checkRole(['admin', 'business_owner'])(req, res, next);
};

// Check if user is food vendor
const requireFoodVendor = (req, res, next) => {
  return checkRole(['admin', 'food_vendor'])(req, res, next);
};

module.exports = {
  checkRole,
  requireAdmin,
  requireModerator,
  requireBusinessOwner,
  requireFoodVendor
};
