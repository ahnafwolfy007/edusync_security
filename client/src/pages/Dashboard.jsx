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
  FiArrowRight,
  FiGift,
  FiMapPin,
  FiMessageSquare,
  FiCreditCard,
  FiSettings,
  FiStar,
  FiPackage,
  FiTruck,
  FiHeart,
  FiUserCheck
} from 'react-icons/fi';
import api from '../api';

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
      // Backend route is /api/admin/dashboard/stats and wraps data under data.stats
      const response = await api.get('/admin/dashboard/stats');
      const apiData = response.data?.data || response.data;
      const newStats = apiData?.stats || apiData || {};
      setStats({
        totalProducts: newStats.total_products || newStats.totalProducts || 0,
        totalBusinesses: newStats.verified_businesses || newStats.totalBusinesses || 0,
        totalTransactions: newStats.monthly_transaction_volume || newStats.totalTransactions || 0,
        recentActivity: apiData?.recent_activities || apiData?.recentActivity || []
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Main marketplace categories (Foodpanda-style layout)
  const mainMarketplaces = [
    {
      id: 'business',
      title: 'Business Marketplace',
      subtitle: 'Foodpanda-style Business Shops',
      description: 'Browse verified businesses, restaurants, and services',
      icon: FiShoppingBag,
      gradient: 'from-blue-500 to-blue-600',
      path: '/business-marketplace',
      count: stats.totalBusinesses,
      features: ['Shop-based browsing', 'Product categories', 'Order tracking']
    },
    {
      id: 'secondhand',
      title: 'Secondhand Market',
      subtitle: 'Bikroy.com style marketplace',
      description: 'Buy and sell used items with ease',
      icon: FiBookOpen,
      gradient: 'from-green-500 to-green-600',
      path: '/secondhand-market',
      count: stats.totalProducts,
      features: ['Used items', 'Negotiable prices', 'Direct contact']
    },
    {
      id: 'accommodation',
      title: 'Accommodation',
      subtitle: 'THE TOLET style housing',
      description: 'Find rooms, apartments, and rental properties',
      icon: FiHome,
      gradient: 'from-purple-500 to-purple-600',
  path: '/accommodation-market',
      count: 0,
      features: ['Property listings', 'Area-based search', 'Direct inquiries']
    },
    {
      id: 'free-marketplace',
      title: 'Free Marketplace',
      subtitle: 'Give away items for free',
      description: 'Share items you no longer need with the community',
      icon: FiGift,
      gradient: 'from-pink-500 to-pink-600',
      path: '/free-marketplace',
      count: 0,
      features: ['Free items', 'Request system', 'Community sharing']
    }
  ];

  // Additional services and features
  const additionalServices = [
    {
      id: 'jobs',
      title: 'Job Board',
      description: 'Find part-time jobs and internships',
      icon: FiBriefcase,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      path: '/jobs',
      count: 0
    },
    {
      id: 'tutoring',
      title: 'Tutoring Services',
      description: 'Find tutors or offer tutoring',
      icon: FiUsers,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      path: '/tutoring',
      count: 0
    },
    {
      id: 'lost-found',
      title: 'Lost & Found',
      description: 'Report lost items or found items',
      icon: FiSearch,
      color: 'text-red-600',
      bg: 'bg-red-50',
      path: '/lost-found',
      count: 0
    },
    {
      id: 'notices',
      title: 'Campus Notices',
      description: 'View campus announcements and updates',
      icon: FiBell,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
      path: '/notices',
      count: 0
    }
  ];

  // Quick action buttons
  const quickActions = [
    {
      title: 'Add Money to Wallet',
      description: 'Top up your digital wallet',
      icon: FiDollarSign,
      action: () => navigate('/wallet'),
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
      title: 'My Orders',
      description: 'Track your orders and purchases',
      icon: FiPackage,
      action: () => navigate('/orders'),
      color: 'text-purple-600',
      bg: 'bg-purple-50'
    },
    {
      title: 'My Business',
      description: 'Manage your business profile',
      icon: FiUserCheck,
      action: () => navigate('/business'),
      color: 'text-indigo-600',
      bg: 'bg-indigo-50'
    }
  ];

  const userMenuItems = [
    { title: 'Profile Settings', icon: FiSettings, path: '/profile' },
    { title: 'Payment Methods', icon: FiCreditCard, path: '/payment' },
    { title: 'Wallet Management', icon: FiDollarSign, path: '/wallet' },
    { title: 'Order History', icon: FiPackage, path: '/orders' }
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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Welcome back, {user?.full_name || user?.email}!
                </h1>
                <p className="text-gray-600 mt-1">
                  Your all-in-one campus marketplace for everything you need
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <FiStar className="w-5 h-5 text-yellow-500" />
                <span className="text-sm text-gray-600">
                  {user?.role || 'Student'} Member
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Wallet Overview */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white bg-opacity-10 rounded-full -translate-y-8 translate-x-8"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white bg-opacity-10 rounded-full translate-y-8 -translate-x-8"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">Digital Wallet Balance</h3>
                <p className="text-4xl font-bold mb-1">
                  ৳{wallet?.balance?.toLocaleString() || '0.00'}
                </p>
                <p className="text-blue-100">
                  {transactions?.length || 0} transactions this month
                </p>
              </div>
              <div className="text-right">
                <FiDollarSign className="w-16 h-16 mb-3 opacity-80" />
                <button
                  onClick={() => navigate('/wallet')}
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center"
                >
                  Manage Wallet <FiArrowRight className="ml-2 w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className="card p-6 hover:shadow-xl transition-all duration-300 text-left group border-2 border-transparent hover:border-blue-200"
              >
                <div className="flex flex-col items-center text-center">
                  <div className={`p-4 rounded-2xl ${action.bg} mb-4 group-hover:scale-110 transition-transform duration-200`}>
                    <action.icon className={`w-8 h-8 ${action.color}`} />
                  </div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 mb-2">
                    {action.title}
                  </h3>
                  <p className="text-sm text-gray-500">{action.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Marketplaces */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Main Marketplaces</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {mainMarketplaces.map((marketplace) => (
              <div
                key={marketplace.id}
                onClick={() => navigate(marketplace.path)}
                className="card hover:shadow-2xl transition-all duration-300 cursor-pointer group overflow-hidden border-2 border-transparent hover:border-blue-200"
              >
                <div className={`h-40 bg-gradient-to-br ${marketplace.gradient} relative`}>
                  <div className="absolute inset-0 bg-black bg-opacity-20 group-hover:bg-opacity-10 transition-all duration-300"></div>
                  <div className="absolute top-4 left-4 text-white">
                    <marketplace.icon className="w-10 h-10 mb-2" />
                    <p className="text-sm font-medium opacity-90">{marketplace.count} items</p>
                  </div>
                  <div className="absolute top-4 right-4">
                    <span className="bg-white bg-opacity-20 px-2 py-1 rounded-full text-white text-xs font-medium">
                      Popular
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="mb-3">
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors mb-1">
                      {marketplace.title}
                    </h3>
                    <p className="text-sm font-medium text-blue-600">{marketplace.subtitle}</p>
                  </div>
                  <p className="text-gray-600 mb-4">{marketplace.description}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {marketplace.features.map((feature, idx) => (
                      <span key={idx} className="badge badge-secondary text-xs">
                        {feature}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Explore now</span>
                    <FiArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-200" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Services */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Additional Services</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {additionalServices.map((service) => (
              <div
                key={service.id}
                onClick={() => navigate(service.path)}
                className="card p-6 hover:shadow-lg transition-all duration-200 cursor-pointer group"
              >
                <div className="flex flex-col items-center text-center">
                  <div className={`p-4 rounded-xl ${service.bg} mb-4 group-hover:scale-105 transition-transform duration-200`}>
                    <service.icon className={`w-6 h-6 ${service.color}`} />
                  </div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 mb-2">
                    {service.title}
                  </h3>
                  <p className="text-sm text-gray-500 mb-3">{service.description}</p>
                  {service.count > 0 && (
                    <span className="text-xs text-blue-600 font-medium">
                      {service.count} available
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="card-header">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                  <FiActivity className="w-6 h-6 mr-3" />
                  Recent Activity
                </h3>
              </div>
              <div className="card-body">
                {stats.recentActivity?.length > 0 ? (
                  <div className="space-y-6">
                    {stats.recentActivity.slice(0, 5).map((activity, index) => (
                      <div key={index} className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <FiClock className="w-5 h-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900 font-medium">{activity.description}</p>
                          <p className="text-sm text-gray-500 mt-1">{activity.timestamp}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FiBell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No recent activity</h4>
                    <p className="text-gray-500">Start exploring the marketplace to see your activity here</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* User Statistics & Quick Menu */}
          <div className="space-y-6">
            {/* Statistics */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <FiTrendingUp className="w-5 h-5 mr-2" />
                  Your Statistics
                </h3>
              </div>
              <div className="card-body">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Spent</span>
                    <span className="font-semibold text-lg">৳{wallet?.totalSpent || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Earned</span>
                    <span className="font-semibold text-lg text-green-600">৳{wallet?.totalEarned || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Items Posted</span>
                    <span className="font-semibold text-lg">{user?.itemsPosted || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Items Purchased</span>
                    <span className="font-semibold text-lg">{user?.itemsPurchased || 0}</span>
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

            {/* Quick Menu */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-semibold text-gray-900">Account Menu</h3>
              </div>
              <div className="card-body p-0">
                <div className="space-y-1">
                  {userMenuItems.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => navigate(item.path)}
                      className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                    >
                      <item.icon className="w-5 h-5 text-gray-600" />
                      <span className="text-gray-900">{item.title}</span>
                      <FiArrowRight className="w-4 h-4 text-gray-400 ml-auto" />
                    </button>
                  ))}
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
