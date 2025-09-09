import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import api from '../api';

const WalletContext = createContext();

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export const WalletProvider = ({ children }) => {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user, isAuthenticated } = useAuth();

  // Fetch wallet data when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchWallet();
    } else {
      setWallet(null);
      setTransactions([]);
    }
  }, [isAuthenticated, user]);

  const fetchWallet = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/wallet');
      
      if (response.data.success) {
        setWallet(response.data.data.wallet);
      }
    } catch (error) {
      console.error('Fetch wallet error:', error);
      setError(error.response?.data?.message || 'Failed to fetch wallet data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/wallet/transactions', { params });
      
      if (response.data.success) {
        setTransactions(response.data.data.transactions);
        return response.data.data;
      }
    } catch (error) {
      console.error('Fetch transactions error:', error);
      setError(error.response?.data?.message || 'Failed to fetch transactions');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const addMoney = async (amount, paymentMethod = 'demo_bkash') => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate demo payment processing
      const demoPaymentResponse = await simulatePayment(amount, paymentMethod);
      
      if (!demoPaymentResponse.success) {
        throw new Error(demoPaymentResponse.message);
      }
      
      const response = await api.post('/wallet/add-money', {
        amount: parseFloat(amount),
        paymentMethod,
        paymentDetails: demoPaymentResponse.data
      });
      
      if (response.data.success) {
        setWallet(response.data.data.wallet);
        
        // Add new transaction to the list if transactions are loaded
        if (transactions.length > 0) {
          setTransactions(prev => [response.data.data.transaction, ...prev]);
        }
        
        return { success: true, data: response.data.data };
      }
      
      return { success: false, message: response.data.message };
    } catch (error) {
      console.error('Add money error:', error);
      const message = error.response?.data?.message || error.message || 'Failed to add money';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  // Demo payment simulation
  const simulatePayment = async (amount, method) => {
    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const transactionId = `DEMO_${method.toUpperCase()}_${Date.now()}`;
    
    switch (method) {
      case 'demo_bkash':
        return {
          success: true,
          data: {
            transactionId,
            gateway: 'bKash',
            status: 'completed',
            fee: amount * 0.018, // 1.8% fee
            referenceNumber: `bKash-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            processedAt: new Date().toISOString()
          }
        };
      
      case 'demo_nagad':
        return {
          success: true,
          data: {
            transactionId,
            gateway: 'Nagad',
            status: 'completed',
            fee: amount * 0.015, // 1.5% fee
            referenceNumber: `NGD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            processedAt: new Date().toISOString()
          }
        };
      
      case 'demo_rocket':
        return {
          success: true,
          data: {
            transactionId,
            gateway: 'Rocket',
            status: 'completed',
            fee: amount * 0.02, // 2% fee
            referenceNumber: `RKT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            processedAt: new Date().toISOString()
          }
        };
      
      case 'demo_card':
        return {
          success: true,
          data: {
            transactionId,
            gateway: 'Visa/Mastercard',
            status: 'completed',
            fee: amount * 0.025, // 2.5% fee
            referenceNumber: `CARD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            processedAt: new Date().toISOString()
          }
        };
      
      default:
        return {
          success: false,
          message: 'Unsupported payment method'
        };
    }
  };

  const makePayment = async (sellerId, amount, productId, productType = 'marketplace') => {
    try {
      setLoading(true);
      setError(null);
      
      if (!wallet || wallet.balance < amount) {
        throw new Error('Insufficient wallet balance');
      }
      
      const response = await api.post('/wallet/make-payment', {
        sellerId,
        amount: parseFloat(amount),
        productId,
        productType,
        paymentMethod: 'wallet'
      });
      
      if (response.data.success) {
        // Update wallet balance
        setWallet(prev => ({
          ...prev,
          balance: prev.balance - parseFloat(amount)
        }));
        
        // Refresh transactions
        if (transactions.length > 0) {
          fetchTransactions();
        }
        
        return { success: true, data: response.data.data };
      }
      
      return { success: false, message: response.data.message };
    } catch (error) {
      console.error('Make payment error:', error);
      const message = error.response?.data?.message || error.message || 'Payment failed';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const withdrawMoney = async (amount, bankAccount, withdrawalMethod = 'bank_transfer') => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post('/wallet/withdraw-money', {
        amount: parseFloat(amount),
        bankAccount,
        withdrawalMethod
      });
      
      if (response.data.success) {
        setWallet(response.data.data.wallet);
        
        // Refresh transactions to show the withdrawal
        if (transactions.length > 0) {
          fetchTransactions();
        }
        
        return { success: true, data: response.data.data };
      }
      
      return { success: false, message: response.data.message };
    } catch (error) {
      console.error('Withdraw money error:', error);
      const message = error.response?.data?.message || 'Failed to withdraw money';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const transferMoney = async (recipientEmail, amount, description = '') => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post('/wallet/transfer-money', {
        recipientEmail,
        amount: parseFloat(amount),
        description
      });
      
      if (response.data.success) {
        // Refresh wallet balance
        await fetchWallet();
        
        // Refresh transactions to show the transfer
        if (transactions.length > 0) {
          fetchTransactions();
        }
        
        return { success: true, data: response.data.data };
      }
      
      return { success: false, message: response.data.message };
    } catch (error) {
      console.error('Transfer money error:', error);
      const message = error.response?.data?.message || 'Failed to transfer money';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const getWalletStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/wallet/stats');
      
      if (response.data.success) {
        return { success: true, data: response.data.data.stats };
      }
      
      return { success: false, message: response.data.message };
    } catch (error) {
      console.error('Get wallet stats error:', error);
      const message = error.response?.data?.message || 'Failed to fetch wallet statistics';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'credit':
        return '↗️';
      case 'debit':
        return '↙️';
      default:
        return '💰';
    }
  };

  const getTransactionColor = (type) => {
    switch (type) {
      case 'credit':
        return 'text-green-600';
      case 'debit':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const clearError = () => setError(null);

  const value = {
    wallet,
    transactions,
    loading,
    error,
    fetchWallet,
    fetchTransactions,
    addMoney,
    withdrawMoney,
    transferMoney,
    makePayment,
    simulatePayment,
    getWalletStats,
    formatAmount,
    getTransactionIcon,
    getTransactionColor,
    clearError
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};
