import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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
  FiTrendingUp,
  FiActivity,
  FiClock,
  FiBell,
  FiArrowRight,
  FiGift,
  FiCreditCard,
  FiSettings,
  FiStar,
  FiPackage,
  FiTruck
} from 'react-icons/fi';
import api from '../api';
import { businessService } from '../services/businessService';
import { foodVendorService } from '../services/foodVendorService';

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
  const [bizAnalytics, setBizAnalytics] = useState(null);
  const [vendorAnalytics, setVendorAnalytics] = useState(null);
  const [primaryBusiness, setPrimaryBusiness] = useState(null);
  const [vendorProfile, setVendorProfile] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    // load role specific lightweight analytics
    const roleLower = (user?.role_name || user?.role || '').toLowerCase();
    (async () => {
      try {
        if(roleLower==='business_owner'){
          const list = await businessService.fetchMyBusinesses();
          if(list?.length){
            setPrimaryBusiness(list[0]);
            const a = await businessService.fetchBusinessAnalytics(list[0].business_id || list[0].id);
            setBizAnalytics(a?.analytics || a);
          }
        } else if(roleLower==='food_vendor'){
          const v = await foodVendorService.fetchMyVendor();
          if(v){
            setVendorProfile(v);
            const a = await foodVendorService.fetchVendorAnalytics(v.vendor_id || v.id);
            setVendorAnalytics(a?.analytics || a);
          }
        }
      } catch(err){ console.warn('Role analytics load skipped:', err.message); }
    })();
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

  // Main marketplace categories
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

  // Additional services
  const additionalServices = [
    { id: 'jobs', title: 'Job Board', description: 'Find part-time jobs and internships', icon: FiBriefcase, color: 'text-orange-600', bg: 'bg-orange-50', path: '/jobs', count: 0 },
    { id: 'tutoring', title: 'Tutoring Services', description: 'Find tutors or offer tutoring', icon: FiUsers, color: 'text-indigo-600', bg: 'bg-indigo-50', path: '/tutoring', count: 0 },
    { id: 'lost-found', title: 'Lost & Found', description: 'Report lost items or found items', icon: FiSearch, color: 'text-red-600', bg: 'bg-red-50', path: '/lost-found', count: 0 },
    { id: 'notices', title: 'Campus Notices', description: 'Announcements and updates', icon: FiBell, color: 'text-yellow-600', bg: 'bg-yellow-50', path: '/notices', count: 0 }
  ];

  const role = (user?.role_name || user?.role || '').toLowerCase();
  const quickActionsBase = [
    { title: 'Add Money to Wallet', description: 'Top up your digital wallet', icon: FiDollarSign, action: () => navigate('/wallet') },
    { title: 'My Orders', description: 'Track your orders and purchases', icon: FiPackage, action: () => navigate('/orders') }
  ];
  const roleExtras = [];
  if (role === 'business_owner') {
    roleExtras.push({ title: 'Manage Products', description: 'Add or edit products', icon: FiShoppingBag, action: () => navigate('/business-marketplace') });
    roleExtras.push({ title: 'Business Orders', description: 'View customer orders', icon: FiTruck, action: () => navigate('/business/1/orders') });
  }
  if (role === 'food_vendor') {
    roleExtras.push({ title: 'Vendor Menu', description: 'Update menu items', icon: FiBookOpen, action: () => navigate('/food-vendor/1/menu') });
    roleExtras.push({ title: 'Food Orders', description: 'Active meal orders', icon: FiTruck, action: () => navigate('/food-vendor/1/orders') });
  }
  if (role === 'admin' || role === 'moderator') {
    roleExtras.push({ title: 'Admin Panel', description: 'Moderate and review', icon: FiSettings, action: () => navigate('/admin') });
    roleExtras.push({ title: 'User Management', description: 'Review users & roles', icon: FiUsers, action: () => navigate('/admin?tab=users') });
  }
  const quickActions = [...quickActionsBase, ...roleExtras];

  const userMenuItems = [
    { title: 'Profile Settings', icon: FiSettings, path: '/profile' },
    { title: 'Payment Methods', icon: FiCreditCard, path: '/payment' },
    { title: 'Wallet Management', icon: FiDollarSign, path: '/wallet' },
    { title: 'Order History', icon: FiPackage, path: '/orders' }
  ];

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center"><div className="spinner w-8 h-8" /></div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Hero card */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="enhanced-card overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 sm:p-8 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Welcome back, {user?.full_name || user?.email}!</h1>
              <p className="text-indigo-100 mt-1">Your all-in-one campus marketplace ✨</p>
            </div>
            <div className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-2 border border-white/20">
              <FiStar className="w-5 h-5 text-yellow-300" />
              <span className="text-sm">
                {(() => {
                  switch (role) {
                    case 'admin': return 'Admin Member';
                    case 'moderator': return 'Moderator Member';
                    case 'business_owner': return 'Business Owner';
                    case 'food_vendor': return 'Food Vendor';
                    default: return 'Student Member';
                  }
                })()}
              </span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 sm:p-6 bg-white">
          <div className="p-4 rounded-lg border border-gray-100">
            <p className="text-sm text-gray-500">Verified Businesses</p>
            <p className="text-2xl font-semibold text-gray-900">{stats.totalBusinesses}</p>
          </div>
          <div className="p-4 rounded-lg border border-gray-100">
            <p className="text-sm text-gray-500">Marketplace Products</p>
            <p className="text-2xl font-semibold text-gray-900">{stats.totalProducts}</p>
          </div>
          <div className="p-4 rounded-lg border border-gray-100">
            <p className="text-sm text-gray-500">Monthly Volume</p>
            <p className="text-2xl font-semibold text-gray-900">৳{(stats.totalTransactions || 0).toLocaleString()}</p>
          </div>
        </div>
      </motion.div>

      {/* Wallet Overview */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="enhanced-card">
        <div className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Digital Wallet Balance</h3>
            <p className="text-4xl font-bold mt-1">৳{wallet?.balance?.toLocaleString() || '0.00'}</p>
            <p className="text-sm text-gray-500 mt-1">{transactions?.length || 0} transactions this month</p>
          </div>
          <button onClick={() => navigate('/wallet')} className="btn btn-primary btn-lg flex items-center">
            <FiDollarSign className="mr-2" /> Manage Wallet
          </button>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <motion.button key={index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 * index }} onClick={action.action} className="enhanced-card p-5 text-left hover-lift">
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-xl bg-indigo-50"><action.icon className="w-6 h-6 text-indigo-600" /></div>
                <div>
                  <h3 className="font-semibold text-gray-900">{action.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{action.description}</p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </section>

      {/* Main Marketplaces */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Main Marketplaces</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {mainMarketplaces.map((m) => (
            <div key={m.id} onClick={() => navigate(m.path)} className="enhanced-card cursor-pointer overflow-hidden hover-lift">
              <div className={`h-36 bg-gradient-to-br ${m.gradient} relative`}>
                <div className="absolute top-4 left-4 text-white">
                  <m.icon className="w-8 h-8 mb-2" />
                  <p className="text-sm opacity-90">{m.count} items</p>
                </div>
              </div>
              <div className="p-5">
                <div className="mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{m.title}</h3>
                  <p className="text-sm text-indigo-600">{m.subtitle}</p>
                </div>
                <p className="text-gray-600 mb-3">{m.description}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {m.features.map((f, i) => (<span key={i} className="badge badge-secondary text-xs">{f}</span>))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Explore now</span>
                  <FiArrowRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Additional Services */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Additional Services</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {additionalServices.map((s) => (
            <div key={s.id} onClick={() => navigate(s.path)} className="enhanced-card p-5 cursor-pointer hover-lift">
              <div className="flex items-start gap-3">
                <div className={`p-3 rounded-xl ${s.bg}`}><s.icon className={`w-6 h-6 ${s.color}`} /></div>
                <div>
                  <h3 className="font-semibold text-gray-900">{s.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{s.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Activity and side cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="enhanced-card">
            <div className="p-5">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center"><FiActivity className="w-5 h-5 mr-2" /> Recent Activity</h3>
            </div>
            <div className="px-5 pb-5">
              {stats.recentActivity?.length > 0 ? (
                <div className="space-y-5">
                  {stats.recentActivity.slice(0, 5).map((a, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center"><FiClock className="w-5 h-5 text-indigo-600" /></div>
                      <div className="flex-1">
                        <p className="text-gray-900 font-medium">{a.description}</p>
                        <p className="text-sm text-gray-500 mt-1">{a.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <FiBell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h4 className="text-base font-medium text-gray-900 mb-1">No recent activity</h4>
                  <p className="text-gray-500 text-sm">Start exploring the marketplace to see your activity here</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {(role==='business_owner' && bizAnalytics) && (
            <div className="enhanced-card">
              <div className="p-5">
                <h3 className="text-lg font-semibold text-gray-900">Business Snapshot</h3>
                <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                  <div><span className="text-gray-500">Products</span><div className="font-semibold">{bizAnalytics.active_products ?? '—'}</div></div>
                  <div><span className="text-gray-500">Orders</span><div className="font-semibold">{bizAnalytics.total_orders ?? '—'}</div></div>
                  <div><span className="text-gray-500">Completed</span><div className="font-semibold">{bizAnalytics.completed_orders ?? '—'}</div></div>
                  <div><span className="text-gray-500">Revenue</span><div className="font-semibold">{bizAnalytics.total_revenue ?? '—'}</div></div>
                </div>
                <button onClick={()=>navigate(`/business/${primaryBusiness?.business_id || primaryBusiness?.id}/products`)} className="btn btn-secondary btn-sm w-full mt-4">Manage Products</button>
              </div>
            </div>
          )}

          {(role==='food_vendor' && vendorAnalytics) && (
            <div className="enhanced-card">
              <div className="p-5">
                <h3 className="text-lg font-semibold text-gray-900">Food Vendor Snapshot</h3>
                <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                  <div><span className="text-gray-500">Items</span><div className="font-semibold">{vendorAnalytics.available_items ?? '—'}</div></div>
                  <div><span className="text-gray-500">Orders</span><div className="font-semibold">{vendorAnalytics.total_orders ?? '—'}</div></div>
                  <div><span className="text-gray-500">Active</span><div className="font-semibold">{vendorAnalytics.active_orders ?? '—'}</div></div>
                  <div><span className="text-gray-500">Revenue</span><div className="font-semibold">{vendorAnalytics.total_revenue ?? '—'}</div></div>
                </div>
                <button onClick={()=>navigate(`/food-vendor/${vendorProfile?.vendor_id || vendorProfile?.id}/menu`)} className="btn btn-secondary btn-sm w-full mt-4">Manage Menu</button>
              </div>
            </div>
          )}

          <div className="enhanced-card">
            <div className="p-5">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center"><FiTrendingUp className="w-5 h-5 mr-2" /> Your Statistics</h3>
              <div className="space-y-3 mt-3">
                <div className="flex justify-between items-center"><span className="text-gray-600">Total Spent</span><span className="font-semibold">৳{wallet?.totalSpent || 0}</span></div>
                <div className="flex justify-between items-center"><span className="text-gray-600">Total Earned</span><span className="font-semibold text-green-600">৳{wallet?.totalEarned || 0}</span></div>
                <div className="flex justify-between items-center"><span className="text-gray-600">Items Posted</span><span className="font-semibold">{user?.itemsPosted || 0}</span></div>
                <div className="flex justify-between items-center"><span className="text-gray-600">Items Purchased</span><span className="font-semibold">{user?.itemsPurchased || 0}</span></div>
                <hr />
                <div className="flex justify-between items-center"><span className="text-gray-600">Member Since</span><span className="font-semibold">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</span></div>
              </div>
            </div>
          </div>

          <div className="enhanced-card">
            <div className="p-5">
              <h3 className="text-lg font-semibold text-gray-900">Account Menu</h3>
              <div className="mt-2 divide-y">
                {userMenuItems.map((item, index) => (
                  <button key={index} onClick={() => navigate(item.path)} className="w-full flex items-center gap-3 py-3 text-left hover:bg-gray-50 px-1">
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
  );
};

export default Dashboard;
