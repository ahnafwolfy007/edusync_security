// Demo payment gateway configuration for EduSync
const paymentConfig = {
  // Platform settings
  platformFee: {
    percentage: 2.5, // 2.5% platform fee
    minimum: 5, // Minimum 5 BDT fee
    maximum: 100 // Maximum 100 BDT fee
  },
  
  // Supported payment methods
  paymentMethods: {
    wallet: {
      name: 'EduSync Wallet',
      enabled: true,
      processingFee: 0,
      instantTransfer: true
    },
    bkash: {
      name: 'bKash',
      enabled: true,
      processingFee: 1.5, // 1.5% processing fee
      merchantNumber: process.env.BKASH_MERCHANT || '01700000000',
      apiKey: process.env.BKASH_API_KEY || 'demo_bkash_key',
      baseUrl: 'https://checkout.sandbox.bka.sh/v1.2.0-beta'
    },
    nagad: {
      name: 'Nagad',
      enabled: true,
      processingFee: 1.2, // 1.2% processing fee
      merchantId: process.env.NAGAD_MERCHANT_ID || 'demo_merchant',
      publicKey: process.env.NAGAD_PUBLIC_KEY || 'demo_public_key',
      baseUrl: 'https://api.mynagad.com/api/dfs'
    },
    card: {
      name: 'Credit/Debit Card',
      enabled: true,
      processingFee: 2.8, // 2.8% processing fee
      stripeKey: process.env.STRIPE_PUBLIC_KEY || 'pk_test_demo',
      stripeSecret: process.env.STRIPE_SECRET_KEY || 'sk_test_demo'
    }
  },
  
  // Transaction limits
  limits: {
    wallet: {
      minimum: 10,
      maximum: 50000,
      dailyLimit: 100000
    },
    bkash: {
      minimum: 20,
      maximum: 25000,
      dailyLimit: 50000
    },
    nagad: {
      minimum: 20,
      maximum: 25000,
      dailyLimit: 50000
    },
    card: {
      minimum: 50,
      maximum: 100000,
      dailyLimit: 200000
    }
  },
  
  // Payment status types
  paymentStatus: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
    REFUNDED: 'refunded'
  },
  
  // Transaction types
  transactionTypes: {
    PAYMENT: 'payment',
    REFUND: 'refund',
    TOPUP: 'topup',
    WITHDRAWAL: 'withdrawal',
    TRANSFER: 'transfer',
    FEE: 'fee',
    COMMISSION: 'commission'
  },
  
  // Calculate platform fee
  calculatePlatformFee: (amount) => {
    const fee = (amount * paymentConfig.platformFee.percentage) / 100;
    return Math.max(
      paymentConfig.platformFee.minimum,
      Math.min(fee, paymentConfig.platformFee.maximum)
    );
  },
  
  // Calculate processing fee based on payment method
  calculateProcessingFee: (amount, method) => {
    const methodConfig = paymentConfig.paymentMethods[method];
    if (!methodConfig || methodConfig.processingFee === 0) return 0;
    
    return (amount * methodConfig.processingFee) / 100;
  },
  
  // Generate transaction reference
  generateTransactionRef: (prefix = 'TXN') => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${prefix}_${timestamp}_${random}`.toUpperCase();
  },
  
  // Mock payment processing functions
  processPayment: {
    wallet: async (amount, userId, description) => {
      // Simulate wallet payment processing
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            transactionId: paymentConfig.generateTransactionRef('WALLET'),
            amount,
            fee: 0,
            status: 'completed',
            message: 'Payment successful via EduSync Wallet'
          });
        }, 1000);
      });
    },
    
    bkash: async (amount, phone, description) => {
      // Simulate bKash payment processing
      return new Promise((resolve) => {
        setTimeout(() => {
          const fee = paymentConfig.calculateProcessingFee(amount, 'bkash');
          resolve({
            success: Math.random() > 0.1, // 90% success rate
            transactionId: paymentConfig.generateTransactionRef('BKASH'),
            amount,
            fee,
            status: Math.random() > 0.1 ? 'completed' : 'failed',
            message: Math.random() > 0.1 ? 'Payment successful via bKash' : 'Payment failed. Please try again.'
          });
        }, 2000);
      });
    },
    
    nagad: async (amount, phone, description) => {
      // Simulate Nagad payment processing
      return new Promise((resolve) => {
        setTimeout(() => {
          const fee = paymentConfig.calculateProcessingFee(amount, 'nagad');
          resolve({
            success: Math.random() > 0.05, // 95% success rate
            transactionId: paymentConfig.generateTransactionRef('NAGAD'),
            amount,
            fee,
            status: Math.random() > 0.05 ? 'completed' : 'failed',
            message: Math.random() > 0.05 ? 'Payment successful via Nagad' : 'Payment failed. Insufficient balance.'
          });
        }, 2500);
      });
    },
    
    card: async (amount, cardDetails, description) => {
      // Simulate card payment processing
      return new Promise((resolve) => {
        setTimeout(() => {
          const fee = paymentConfig.calculateProcessingFee(amount, 'card');
          resolve({
            success: Math.random() > 0.15, // 85% success rate
            transactionId: paymentConfig.generateTransactionRef('CARD'),
            amount,
            fee,
            status: Math.random() > 0.15 ? 'completed' : 'failed',
            message: Math.random() > 0.15 ? 'Payment successful via Card' : 'Card payment declined'
          });
        }, 3000);
      });
    }
  },
  
  // Withdrawal settings
  withdrawal: {
    minimumAmount: 100,
    maximumAmount: 10000,
    dailyLimit: 25000,
    processingTime: '1-3 business days',
    processingFee: 10, // Fixed 10 BDT withdrawal fee
    
    // Available withdrawal methods
    methods: {
      bank: {
        name: 'Bank Transfer',
        fee: 10,
        processingTime: '1-3 business days'
      },
      bkash: {
        name: 'bKash',
        fee: 15,
        processingTime: '30 minutes'
      },
      nagad: {
        name: 'Nagad',
        fee: 15,
        processingTime: '30 minutes'
      }
    }
  },
  
  // Currency settings
  currency: {
    code: 'BDT',
    symbol: '৳',
    decimals: 2
  },
  
  // Format currency
  formatCurrency: (amount) => {
    return `৳${amount.toLocaleString('en-BD', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    })}`;
  }
};

module.exports = paymentConfig;
