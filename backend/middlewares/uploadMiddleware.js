const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const ensureUploadDirs = () => {
  const uploadDirs = [
    'uploads/profiles',
    'uploads/shops', 
    'uploads/products',
    'uploads/secondhand',
    'uploads/marketplace',
    'uploads/free-items',
    'uploads/rentals',
    'uploads/accommodations',
    'uploads/lost-found',
    'uploads/businesses',
    'uploads/temp'
  ];

  uploadDirs.forEach(dir => {
    const fullPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  });
};

// Initialize upload directories
ensureUploadDirs();

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/temp'; // Default to temp folder

    // Determine upload path based on route or request parameters
    if (req.route && req.route.path) {
      const routePath = req.route.path;
      
      if (routePath.includes('/profile')) {
        uploadPath = 'uploads/profiles';
      } else if (routePath.includes('/shop') || routePath.includes('/business')) {
        uploadPath = 'uploads/shops';
      } else if (routePath.includes('/product')) {
        uploadPath = 'uploads/products';
      } else if (routePath.includes('/marketplace')) {
        uploadPath = 'uploads/marketplace';
      } else if (routePath.includes('/secondhand')) {
        uploadPath = 'uploads/secondhand';
      } else if (routePath.includes('/free')) {
        uploadPath = 'uploads/free-items';
      } else if (routePath.includes('/rental')) {
        uploadPath = 'uploads/rentals';
      } else if (routePath.includes('/accommodation')) {
        uploadPath = 'uploads/accommodations';
      } else if (routePath.includes('/lost-found')) {
        uploadPath = 'uploads/lost-found';
      } else if (routePath.includes('/business-doc')) {
        uploadPath = 'uploads/businesses';
      }
    }

    // Check for explicit folder in request body
    if (req.body.uploadFolder) {
      const allowedFolders = [
        'profiles', 'shops', 'products', 'secondhand', 'marketplace', 'free-items',
        'rentals', 'accommodations', 'lost-found', 'businesses', 'temp'
      ];
      
      if (allowedFolders.includes(req.body.uploadFolder)) {
        uploadPath = `uploads/${req.body.uploadFolder}`;
      }
    }

    const fullPath = path.join(__dirname, '..', uploadPath);
    
    // Ensure directory exists
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }

    cb(null, fullPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, extension).toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    cb(null, `${baseName}-${uniqueSuffix}${extension}`);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Check file type
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and documents are allowed.'), false);
  }
};

// Create multer instance with configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB file size limit
    files: 10 // Maximum 10 files per request
  }
});

// Middleware functions for different upload scenarios
const uploadMiddleware = {
  // Single file upload
  single: (fieldName = 'file') => {
    return (req, res, next) => {
      upload.single(fieldName)(req, res, (err) => {
        if (err) {
          return res.status(400).json({
            success: false,
            message: err.message || 'File upload failed'
          });
        }
        next();
      });
    };
  },

  // Multiple files upload
  multiple: (fieldName = 'files', maxCount = 10) => {
    return (req, res, next) => {
      upload.array(fieldName, maxCount)(req, res, (err) => {
        if (err) {
          return res.status(400).json({
            success: false,
            message: err.message || 'File upload failed'
          });
        }
        next();
      });
    };
  },

  // Multiple fields upload
  fields: (fields) => {
    return (req, res, next) => {
      upload.fields(fields)(req, res, (err) => {
        if (err) {
          return res.status(400).json({
            success: false,
            message: err.message || 'File upload failed'
          });
        }
        next();
      });
    };
  },

  // Profile picture upload
  profilePicture: (req, res, next) => {
    req.body.uploadFolder = 'profiles';
    upload.single('profilePicture')(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'Profile picture upload failed'
        });
      }
      next();
    });
  },

  // Business document upload
  businessDocument: (req, res, next) => {
    req.body.uploadFolder = 'businesses';
    upload.single('document')(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'Document upload failed'
        });
      }
      next();
    });
  },

  // Product images upload
  productImages: (req, res, next) => {
    req.body.uploadFolder = 'products';
    upload.array('images', 5)(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'Product images upload failed'
        });
      }
      next();
    });
  },

  // Second-hand item images
  secondhandImages: (req, res, next) => {
    req.body.uploadFolder = 'secondhand';
    upload.array('images', 5)(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'Item images upload failed'
        });
      }
      next();
    });
  },

  // Rental images
  rentalImages: (req, res, next) => {
    req.body.uploadFolder = 'rentals';
    upload.array('images', 8)(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'Rental images upload failed'
        });
      }
      next();
    });
  },

  // Marketplace item images
  marketplaceImages: (req, res, next) => {
    req.body.uploadFolder = 'marketplace';
    upload.array('images', 8)(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'Marketplace images upload failed'
        });
      }
      next();
    });
  },

  // Lost and found images
  lostFoundImages: (req, res, next) => {
    req.body.uploadFolder = 'lost-found';
    upload.array('images', 3)(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'Lost/found images upload failed'
        });
      }
      next();
    });
  }
};

// Error handling middleware for multer errors
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum allowed size is 10MB.'
      });
    }
    
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum allowed is 10 files.'
      });
    }
    
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field.'
      });
    }
  }

  if (err.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: 'Invalid file type. Only images and documents are allowed.'
    });
  }

  next(err);
};

module.exports = {
  uploadMiddleware,
  handleUploadError,
  ensureUploadDirs
};
