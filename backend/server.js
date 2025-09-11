const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

// Import configurations
const dbConfig = require('./config/db');
const authConfig = require('./config/auth');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const businessRoutes = require('./routes/businessRoutes');
const marketplaceRoutes = require('./routes/marketplaceRoutes');
const secondhandRoutes = require('./routes/secondhandRoutes');
const freeMarketRoutes = require('./routes/freeMarketRoutes');
const rentalsRoutes = require('./routes/rentalsRoutes');
const jobsRoutes = require('./routes/jobsRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const walletRoutes = require('./routes/walletRoutes');
const adminRoutes = require('./routes/adminRoutes');
const lostFoundRoutes = require('./routes/lostFoundRoutes');
const noticeRoutes = require('./routes/noticeRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const accommodationRoutes = require('./routes/accommodationRoutes');
const freeMarketplaceRoutes = require('./routes/freeMarketplaceRoutes');
const foodVendorRoutes = require('./routes/foodVendorRoutes');
const foodOrderRoutes = require('./routes/foodOrderRoutes');
const businessMarketplaceRoutes = require('./routes/businessMarketplaceRoutes');
const chatRoutes = require('./routes/chatRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Static file serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: require('./package.json').version
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/secondhand', secondhandRoutes);
app.use('/api/free-market', freeMarketRoutes);
app.use('/api/rentals', rentalsRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/lost-found', lostFoundRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/accommodation', accommodationRoutes);
app.use('/api/free-marketplace', freeMarketplaceRoutes);
app.use('/api/food-vendors', foodVendorRoutes);
app.use('/api/food-orders', foodOrderRoutes);
app.use('/api/business-marketplace', businessMarketplaceRoutes);
app.use('/api/chats', chatRoutes);

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'EduSync Campus Marketplace API',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      upload: '/api/upload',
      business: '/api/business',
      marketplace: '/api/marketplace',
      secondhand: '/api/secondhand',
      freeMarket: '/api/free-market',
      rentals: '/api/rentals',
      jobs: '/api/jobs',
      payment: '/api/payment',
      wallet: '/api/wallet',
      admin: '/api/admin',
      lostFound: '/api/lost-found',
      notices: '/api/notices',
      accommodation: '/api/accommodation',
      freeMarketplace: '/api/free-marketplace',
      foodVendors: '/api/food-vendors',
      foodOrders: '/api/food-orders',
      businessMarketplace: '/api/business-marketplace'
  ,chats: '/api/chats'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: err.errors
    });
  }
  
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File size too large'
    });
  }
  
  // Default error response
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Initialize database and start server
async function startServer() {
  try {
    // Try to initialize database
    try {
      await dbConfig.init();
      console.log('✅ Database initialized successfully');
    } catch (dbError) {
      console.log('⚠️ Database connection failed, running in offline mode');
      console.log('Database error:', dbError.message);
    }
    
    // Start server regardless of database status
    app.listen(PORT, () => {
      console.log(`🚀 EduSync Backend Server running on port ${PORT}`);
      console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
      console.log(`📊 Health Check: http://localhost:${PORT}/api/health`);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 Development mode - Detailed logging enabled');
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await dbConfig.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await dbConfig.close();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Don't exit in development mode for database errors
  if (process.env.NODE_ENV !== 'development' || !err.message.includes('database') || !err.message.includes('password authentication')) {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit in development mode for database errors
  if (process.env.NODE_ENV !== 'development' || !reason.message.includes('database') || !reason.message.includes('password authentication')) {
    process.exit(1);
  }
});

// Start the server
startServer();

module.exports = app;
