const adminMiddleware = (requiredRole = 'admin') => {
  return (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userRole = req.user.role;

      // Define role hierarchy
      const roleHierarchy = {
        'admin': 4,
        'moderator': 3,
        'business_owner': 2,
        'food_vendor': 2,
        'student': 1
      };

      const userRoleLevel = roleHierarchy[userRole] || 0;
      const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

      // Check if user has sufficient permissions
      if (userRoleLevel < requiredRoleLevel) {
        return res.status(403).json({
          success: false,
          message: `Access denied. ${requiredRole} role or higher required.`
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
};

// Specific middleware functions for different roles
const requireAdmin = adminMiddleware('admin');
const requireModerator = adminMiddleware('moderator');
const requireBusinessOwner = adminMiddleware('business_owner');

// Check if user is admin or moderator
const requireAdminOrModerator = (req, res, next) => {
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
        message: 'Admin or moderator access required'
      });
    }

    next();

  } catch (error) {
    console.error('Admin or moderator middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during role verification'
    });
  }
};

// Check if user owns the resource or is admin/moderator
const requireOwnershipOrAdmin = (idField = 'userId') => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userRole = req.user.role;
      const userId = req.user.userId;

      // Admins and moderators can access any resource
      if (userRole === 'admin' || userRole === 'moderator') {
        return next();
      }

      // Get the resource owner ID from request parameters or body
      const resourceOwnerId = req.params[idField] || req.body[idField];

      // Check if user owns the resource
      if (parseInt(userId) !== parseInt(resourceOwnerId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only access your own resources.'
        });
      }

      next();

    } catch (error) {
      console.error('Ownership middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during ownership verification'
      });
    }
  };
};

module.exports = {
  adminMiddleware,
  requireAdmin,
  requireModerator,
  requireBusinessOwner,
  requireAdminOrModerator,
  requireOwnershipOrAdmin
};
