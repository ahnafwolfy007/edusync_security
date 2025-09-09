import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWallet } from "../context/WalletContext";
import { 
  FiShoppingBag, 
  FiBookOpen, 
  FiHome, 
  FiBriefcase, 
  FiUsers, 
  FiSearch,
  FiDollarSign,
  FiPlus,
  FiTrendingUp,
  FiActivity,
  FiClock,
  FiBell,
  FiArrowRight
} from 'react-icons/fi';
import { api } from '../utils/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { wallet, transactions } = useWallet();
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalBusinesses: 0,
    totalTransactions: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/api/admin/dashboard-stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const marketplaceCategories = [
    {
      id: 'business',
      title: 'Business Marketplace',
      description: 'Food delivery, services, and local businesses',
      icon: FiShoppingBag,
      gradient: 'from-blue-500 to-blue-600',
      path: '/business-marketplace',
      count: stats.totalBusinesses
    },
    {
      id: 'secondhand',
      title: 'Secondhand Market',
      description: 'Buy and sell used items',
      icon: FiBookOpen,
      gradient: 'from-green-500 to-green-600',
      path: '/secondhand-market',
      count: stats.totalProducts
    },
    {
      id: 'rentals',
      title: 'Rentals & Housing',
      description: 'Find rooms, apartments, and rental items',
      icon: FiHome,
      gradient: 'from-purple-500 to-purple-600',
      path: '/rentals',
      count: 0
    },
    {
      id: 'jobs',
      title: 'Jobs & Internships',
      description: 'Find part-time jobs and internships',
      icon: FiBriefcase,
      gradient: 'from-orange-500 to-orange-600',
      path: '/jobs',
      count: 0
    },
    {
      id: 'tutoring',
      title: 'Tutoring Services',
      description: 'Find tutors or offer tutoring',
      icon: FiUsers,
      gradient: 'from-indigo-500 to-indigo-600',
      path: '/tutoring',
      count: 0
    },
    {
      id: 'lost-found',
      title: 'Lost & Found',
      description: 'Report lost items or found items',
      icon: FiSearch,
      gradient: 'from-red-500 to-red-600',
      path: '/lost-found',
      count: 0
    }
  ];

  const quickActions = [
    {
      title: 'Add Money to Wallet',
      description: 'Top up your digital wallet',
      icon: FiDollarSign,
      action: () => navigate('/wallet/add-money'),
      color: 'text-green-600',
      bg: 'bg-green-50'
    },
    {
      title: 'Post New Item',
      description: 'Sell something in the marketplace',
      icon: FiPlus,
      action: () => navigate('/post-item'),
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    {
      title: 'View Transactions',
      description: 'Check your transaction history',
      icon: FiActivity,
      action: () => navigate('/wallet/transactions'),
      color: 'text-purple-600',
      bg: 'bg-purple-50'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="spinner w-8 h-8"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {user?.full_name || user?.email}!
            </h1>
            <p className="text-gray-600 mt-1">
              Explore the campus marketplace and manage your activities
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Wallet Overview */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">Digital Wallet</h3>
                <p className="text-3xl font-bold">
                  ৳{wallet?.balance?.toLocaleString() || '0.00'}
                </p>
                <p className="text-blue-100 mt-1">
                  {transactions?.length || 0} transactions this month
                </p>
              </div>
              <div className="text-right">
                <FiDollarSign className="w-12 h-12 mb-2 opacity-80" />
                <button
                  onClick={() => navigate('/wallet')}
                  className="text-blue-100 hover:text-white flex items-center text-sm"
                >
                  Manage Wallet <FiArrowRight className="ml-1" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className="card p-4 hover:shadow-lg transition-all duration-200 text-left group"
              >
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${action.bg}`}>
                    <action.icon className={`w-5 h-5 ${action.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 group-hover:text-blue-600">
                      {action.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">{action.description}</p>
                  </div>
                  <FiArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Marketplace Categories */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Marketplace Categories</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {marketplaceCategories.map((category) => (
              <div
                key={category.id}
                onClick={() => navigate(category.path)}
                className="card hover:shadow-xl transition-all duration-300 cursor-pointer group overflow-hidden"
              >
                <div className={`h-32 bg-gradient-to-br ${category.gradient} relative`}>
                  <div className="absolute inset-0 bg-black bg-opacity-10 group-hover:bg-opacity-0 transition-all duration-300"></div>
                  <div className="absolute bottom-4 left-4 text-white">
                    <category.icon className="w-8 h-8 mb-2" />
                    <p className="text-sm font-medium">{category.count} items</p>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                    {category.title}
                  </h3>
                  <p className="text-sm text-gray-600">{category.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Activity Feed */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <FiActivity className="w-5 h-5 mr-2" />
                Recent Activity
              </h3>
            </div>
            <div className="card-body">
              {stats.recentActivity?.length > 0 ? (
                <div className="space-y-4">
                  {stats.recentActivity.slice(0, 5).map((activity, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <FiClock className="w-4 h-4 text-blue-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">{activity.description}</p>
                        <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FiBell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No recent activity</p>
                </div>
              )}
            </div>
          </div>

          {/* Statistics */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <FiTrendingUp className="w-5 h-5 mr-2" />
                Your Statistics
              </h3>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Spent</span>
                  <span className="font-semibold">৳{wallet?.totalSpent || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Earned</span>
                  <span className="font-semibold text-green-600">৳{wallet?.totalEarned || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Items Posted</span>
                  <span className="font-semibold">{user?.itemsPosted || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Items Purchased</span>
                  <span className="font-semibold">{user?.itemsPurchased || 0}</span>
                </div>
                <hr className="my-4" />
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Member Since</span>
                  <span className="font-semibold">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
