import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from './AuthContext';

const WalletContext = createContext();

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export const WalletProvider = ({ children }) => {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch wallet data when user changes
  useEffect(() => {
    if (user) {
      fetchWalletData();
    } else {
      setBalance(0);
      setTransactions([]);
    }
  }, [user]);

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      setError(null);
      
  const walletRes = await api.get('/wallet');
  const txRes = await api.get('/wallet/transactions');

  const walletData = walletRes.data?.data || walletRes.data;
  setBalance(walletData.balance || walletData.wallet?.balance || 0);
  setTransactions(txRes.data?.data || txRes.data?.transactions || []);
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      setError('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const addFunds = async (amount, paymentMethod = 'card') => {
    try {
      setLoading(true);
      setError(null);
      
  const response = await api.post('/wallet/add-money', {
        amount,
        paymentMethod: paymentMethod
      });
      
      if (response.data.success) {
        await fetchWalletData();
        return { success: true, transaction: response.data.data?.transaction };
      }
      
      return { success: false, error: response.data.message };
    } catch (error) {
      console.error('Error adding funds:', error);
      setError('Failed to add funds');
      return { success: false, error: 'Failed to add funds' };
    } finally {
      setLoading(false);
    }
  };

  const withdrawFunds = async (amount, withdrawalMethod = 'bank') => {
    try {
      setLoading(true);
      setError(null);
      
      if (amount > balance) {
        setError('Insufficient balance');
        return { success: false, error: 'Insufficient balance' };
      }
      
  const response = await api.post('/wallet/withdraw-money', {
        amount,
        paymentMethod: withdrawalMethod
      });
      
      if (response.data.success) {
        await fetchWalletData();
        return { success: true, transaction: response.data.data?.transaction };
      }
      
      return { success: false, error: response.data.message };
    } catch (error) {
      console.error('Error withdrawing funds:', error);
      setError('Failed to withdraw funds');
      return { success: false, error: 'Failed to withdraw funds' };
    } finally {
      setLoading(false);
    }
  };

  const transferFunds = async (recipientId, amount, description = '') => {
    try {
      setLoading(true);
      setError(null);
      
      if (amount > balance) {
        setError('Insufficient balance');
        return { success: false, error: 'Insufficient balance' };
      }
      
  const response = await api.post('/wallet/transfer-money', {
        recipientEmail: recipientId,
        amount,
        description
      });
      
      if (response.data.success) {
        await fetchWalletData();
        return { success: true, transaction: response.data.data?.transaction };
      }
      
      return { success: false, error: response.data.message };
    } catch (error) {
      console.error('Error transferring funds:', error);
      setError('Failed to transfer funds');
      return { success: false, error: 'Failed to transfer funds' };
    } finally {
      setLoading(false);
    }
  };

  const payForOrder = async (orderId, amount) => {
    try {
      setLoading(true);
      setError(null);
      
      if (amount > balance) {
        setError('Insufficient balance');
        return { success: false, error: 'Insufficient balance' };
      }
      
  const response = await api.post('/wallet/pay-order', {
        orderId,
        amount
      });
      
      if (response.data.success) {
        await fetchWalletData();
        return { success: true, transaction: response.data.data?.transaction };
      }
      
      return { success: false, error: response.data.message };
    } catch (error) {
      console.error('Error paying for order:', error);
      setError('Failed to process payment');
      return { success: false, error: 'Failed to process payment' };
    } finally {
      setLoading(false);
    }
  };

  const getTransactionHistory = async (limit = 50, offset = 0) => {
    try {
      setLoading(true);
  const response = await api.get(`/wallet/transactions?limit=${limit}&offset=${offset}`);
      return response.data?.data || response.data?.transactions || [];
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      setError('Failed to load transaction history');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const formatBalance = (amount = balance) => {
    return new Intl.NumberFormat('bn-BD', {
      style: 'currency',
      currency: 'BDT'
    }).format(amount);
  };

  const canAfford = (amount) => {
    return balance >= amount;
  };

  const value = {
    balance,
    transactions,
    loading,
    error,
    addFunds,
    withdrawFunds,
    transferFunds,
    payForOrder,
    fetchWalletData,
    getTransactionHistory,
    formatBalance,
    canAfford
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

export default WalletContext;
