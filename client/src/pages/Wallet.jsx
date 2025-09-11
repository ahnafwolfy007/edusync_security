import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiDollarSign, 
  FiPlus, 
  FiMinus, 
  FiSend, 
  FiDownload,
  FiCreditCard,
  FiSmartphone,
  FiRefreshCw,
  FiTrendingUp,
  FiTrendingDown,
  FiClock,
  FiCheck,
  FiX,
  FiEye,
  FiEyeOff
} from 'react-icons/fi';
import { useWallet } from '../context/WalletContext';
import { useNotification } from '../context/NotificationContext';
import api from '../api';

const Wallet = () => {
  const navigate = useNavigate();
  const { wallet, transactions, refreshWallet } = useWallet();
  const { showNotification } = useNotification();
  const [showBalance, setShowBalance] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [showSendMoney, setShowSendMoney] = useState(false);
  const [addMoneyForm, setAddMoneyForm] = useState({
    amount: '',
    method: 'bkash'
  });
  const [sendMoneyForm, setSendMoneyForm] = useState({
    recipient: '',
    amount: '',
    note: ''
  });
  const [loading, setLoading] = useState(false);

  const paymentMethods = [
    { id: 'bkash', name: 'bKash', icon: '📱', color: 'bg-pink-500' },
    { id: 'nagad', name: 'Nagad', icon: '📱', color: 'bg-orange-500' },
    { id: 'rocket', name: 'Rocket', icon: '🚀', color: 'bg-purple-500' },
    { id: 'bank', name: 'Bank Transfer', icon: '🏦', color: 'bg-blue-500' },
    { id: 'card', name: 'Credit/Debit Card', icon: '💳', color: 'bg-green-500' }
  ];

  const handleAddMoney = async (e) => {
    e.preventDefault();
    if (!addMoneyForm.amount || parseFloat(addMoneyForm.amount) <= 0) {
      showNotification('Please enter a valid amount', 'error');
      return;
    }

    setLoading(true);
    try {
  const response = await api.post('/wallet/add-money', {
        amount: parseFloat(addMoneyForm.amount),
        method: addMoneyForm.method
      });

      if (response.data.success) {
        showNotification('Money added successfully!', 'success');
        setShowAddMoney(false);
        setAddMoneyForm({ amount: '', method: 'bkash' });
        refreshWallet();
      } else {
        showNotification(response.data.message || 'Failed to add money', 'error');
      }
    } catch (error) {
      console.error('Error adding money:', error);
      showNotification('Error adding money. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMoney = async (e) => {
    e.preventDefault();
    if (!sendMoneyForm.recipient || !sendMoneyForm.amount) {
      showNotification('Please fill all required fields', 'error');
      return;
    }

    if (parseFloat(sendMoneyForm.amount) > wallet.balance) {
      showNotification('Insufficient balance', 'error');
      return;
    }

    setLoading(true);
    try {
  const response = await api.post('/wallet/send-money', {
        recipient: sendMoneyForm.recipient,
        amount: parseFloat(sendMoneyForm.amount),
        note: sendMoneyForm.note
      });

      if (response.data.success) {
        showNotification('Money sent successfully!', 'success');
        setShowSendMoney(false);
        setSendMoneyForm({ recipient: '', amount: '', note: '' });
        refreshWallet();
      } else {
        showNotification(response.data.message || 'Failed to send money', 'error');
      }
    } catch (error) {
      console.error('Error sending money:', error);
      showNotification('Error sending money. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'add_money':
        return <FiPlus className="w-4 h-4 text-green-600" />;
      case 'send_money':
        return <FiSend className="w-4 h-4 text-red-600" />;
      case 'receive_money':
        return <FiDownload className="w-4 h-4 text-green-600" />;
      case 'payment':
        return <FiCreditCard className="w-4 h-4 text-blue-600" />;
      case 'refund':
        return <FiRefreshCw className="w-4 h-4 text-green-600" />;
      default:
        return <FiDollarSign className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTransactionStatus = (status) => {
    switch (status) {
      case 'completed':
        return <span className="badge badge-success flex items-center"><FiCheck className="w-3 h-3 mr-1" />Completed</span>;
      case 'pending':
        return <span className="badge badge-warning flex items-center"><FiClock className="w-3 h-3 mr-1" />Pending</span>;
      case 'failed':
        return <span className="badge badge-error flex items-center"><FiX className="w-3 h-3 mr-1" />Failed</span>;
      default:
        return <span className="badge badge-secondary">{status}</span>;
    }
  };

  const AddMoneyModal = () => (
    <div className="modal-overlay" onClick={() => setShowAddMoney(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Add Money to Wallet</h3>
          <form onSubmit={handleAddMoney}>
            <div className="form-group">
              <label className="form-label">Amount (৳)</label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={addMoneyForm.amount}
                onChange={(e) => setAddMoneyForm(prev => ({ ...prev, amount: e.target.value }))}
                className="form-input"
                placeholder="Enter amount"
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <div className="grid grid-cols-2 gap-3">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setAddMoneyForm(prev => ({ ...prev, method: method.id }))}
                    className={`p-3 rounded-lg border-2 transition-colors flex items-center space-x-2 ${
                      addMoneyForm.method === method.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-lg">{method.icon}</span>
                    <span className="text-sm font-medium">{method.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setShowAddMoney(false)}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary flex-1"
              >
                {loading ? 'Processing...' : 'Add Money'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  const SendMoneyModal = () => (
    <div className="modal-overlay" onClick={() => setShowSendMoney(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Send Money</h3>
          <form onSubmit={handleSendMoney}>
            <div className="form-group">
              <label className="form-label">Recipient (Email or Phone)</label>
              <input
                type="text"
                value={sendMoneyForm.recipient}
                onChange={(e) => setSendMoneyForm(prev => ({ ...prev, recipient: e.target.value }))}
                className="form-input"
                placeholder="Enter email or phone number"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Amount (৳)</label>
              <input
                type="number"
                min="1"
                step="0.01"
                max={wallet.balance}
                value={sendMoneyForm.amount}
                onChange={(e) => setSendMoneyForm(prev => ({ ...prev, amount: e.target.value }))}
                className="form-input"
                placeholder="Enter amount"
                required
              />
              <p className="form-help">Available balance: ৳{wallet.balance?.toLocaleString()}</p>
            </div>

            <div className="form-group">
              <label className="form-label">Note (Optional)</label>
              <textarea
                value={sendMoneyForm.note}
                onChange={(e) => setSendMoneyForm(prev => ({ ...prev, note: e.target.value }))}
                className="form-input"
                placeholder="Add a note..."
                rows="3"
              />
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setShowSendMoney(false)}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary flex-1"
              >
                {loading ? 'Sending...' : 'Send Money'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-2xl font-bold text-gray-900">Digital Wallet</h1>
            <p className="text-gray-600 mt-1">
              Manage your digital money and transactions
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Wallet Balance Card */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white mb-8">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <h3 className="text-lg font-semibold">Current Balance</h3>
                <button
                  onClick={() => setShowBalance(!showBalance)}
                  className="text-blue-100 hover:text-white"
                >
                  {showBalance ? <FiEye className="w-4 h-4" /> : <FiEyeOff className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-3xl font-bold">
                {showBalance ? `৳${wallet?.balance?.toLocaleString() || '0.00'}` : '৳****'}
              </p>
              <p className="text-blue-100 mt-1">
                {transactions?.filter(t => t.status === 'completed').length || 0} completed transactions
              </p>
            </div>
            <div className="text-right">
              <FiDollarSign className="w-12 h-12 mb-2 opacity-80" />
              <button
                onClick={refreshWallet}
                className="text-blue-100 hover:text-white flex items-center text-sm"
              >
                <FiRefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => setShowAddMoney(true)}
            className="card p-6 hover:shadow-lg transition-all duration-200 text-center group"
          >
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-green-200 transition-colors">
              <FiPlus className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-medium text-gray-900">Add Money</h3>
            <p className="text-sm text-gray-500 mt-1">Top up your wallet</p>
          </button>

          <button
            onClick={() => setShowSendMoney(true)}
            className="card p-6 hover:shadow-lg transition-all duration-200 text-center group"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-200 transition-colors">
              <FiSend className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-medium text-gray-900">Send Money</h3>
            <p className="text-sm text-gray-500 mt-1">Transfer to others</p>
          </button>

          <button
            onClick={() => navigate('/wallet/transactions')}
            className="card p-6 hover:shadow-lg transition-all duration-200 text-center group"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-purple-200 transition-colors">
              <FiClock className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-medium text-gray-900">Transaction History</h3>
            <p className="text-sm text-gray-500 mt-1">View all transactions</p>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Overview' },
              { id: 'transactions', name: 'Recent Transactions' },
              { id: 'statistics', name: 'Statistics' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card">
              <div className="card-header">
                <h3 className="font-semibold">Spending This Month</h3>
              </div>
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-red-600">৳{wallet?.monthlySpent || 0}</p>
                    <p className="text-sm text-gray-500">Total spent</p>
                  </div>
                  <FiTrendingDown className="w-8 h-8 text-red-600" />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="font-semibold">Earnings This Month</h3>
              </div>
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-green-600">৳{wallet?.monthlyEarned || 0}</p>
                    <p className="text-sm text-gray-500">Total earned</p>
                  </div>
                  <FiTrendingUp className="w-8 h-8 text-green-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold">Recent Transactions</h3>
            </div>
            <div className="card-body">
              {transactions?.length > 0 ? (
                <div className="space-y-4">
                  {transactions.slice(0, 10).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-white rounded-full">
                          {getTransactionIcon(transaction.type)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{transaction.description}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(transaction.createdAt).toLocaleDateString()} at{' '}
                            {new Date(transaction.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${
                          transaction.type === 'send_money' || transaction.type === 'payment'
                            ? 'text-red-600' 
                            : 'text-green-600'
                        }`}>
                          {transaction.type === 'send_money' || transaction.type === 'payment' ? '-' : '+'}
                          ৳{transaction.amount.toLocaleString()}
                        </p>
                        {getTransactionStatus(transaction.status)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FiClock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No transactions yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'statistics' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card">
              <div className="card-header">
                <h3 className="font-semibold">Transaction Summary</h3>
              </div>
              <div className="card-body space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Transactions</span>
                  <span className="font-semibold">{transactions?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Completed</span>
                  <span className="font-semibold text-green-600">
                    {transactions?.filter(t => t.status === 'completed').length || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pending</span>
                  <span className="font-semibold text-yellow-600">
                    {transactions?.filter(t => t.status === 'pending').length || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Failed</span>
                  <span className="font-semibold text-red-600">
                    {transactions?.filter(t => t.status === 'failed').length || 0}
                  </span>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="font-semibold">Payment Methods Used</h3>
              </div>
              <div className="card-body">
                <div className="space-y-3">
                  {paymentMethods.slice(0, 3).map((method) => (
                    <div key={method.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{method.icon}</span>
                        <span className="text-sm">{method.name}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {transactions?.filter(t => t.method === method.id).length || 0} times
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddMoney && <AddMoneyModal />}
      {showSendMoney && <SendMoneyModal />}
    </div>
  );
};

export default Wallet;
