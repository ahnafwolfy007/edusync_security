import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiShield,
  FiSettings,
  FiUsers,
  FiBarChart,
  FiFileText,
  FiAlertTriangle,
  FiCheck,
  FiX,
  FiEye,
  FiEdit,
  FiTrash2,
  FiPlus,
  FiSearch,
  FiFilter,
  FiDownload,
  FiUpload,
  FiMail,
  FiPhone,
  FiBell,
  FiClock,
  FiTrendingUp,
  FiDollarSign
} from 'react-icons/fi';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import AnalyticsOverview from '../components/admin/AnalyticsOverview';

const AdminPanel = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({});
  const [live, setLive] = useState(true); // enable SSE by default
  const [lastUpdate, setLastUpdate] = useState(null);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);

  // Allow admin or moderator (moderator has limited powers)
  useEffect(() => {
    const normalizedRole = (user?.role_name || user?.role || '').toLowerCase();
    if (user && normalizedRole !== 'admin' && normalizedRole !== 'moderator') {
      navigate('/dashboard');
      showNotification('Access denied. Elevated privileges required.', 'error');
      return;
    }
    if (user && (normalizedRole === 'admin' || normalizedRole === 'moderator')) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const requests = [
        { key: 'stats', fn: () => api.get('/admin/dashboard/stats') },
        { key: 'businessApps', fn: () => api.get('/admin/business-applications/pending') },
        { key: 'foodVendors', fn: () => api.get('/admin/food-vendors/pending') },
        { key: 'users', fn: () => api.get('/admin/users') }
      ];

      const settled = await Promise.allSettled(requests.map(r => r.fn()));
      const responseMap = {};
      settled.forEach((res, idx) => {
        const key = requests[idx].key;
        if (res.status === 'fulfilled') {
          responseMap[key] = res.value;
        } else {
          console.warn(`AdminPanel: ${key} load failed`, res.reason?.response?.status, res.reason?.message);
        }
      });

      // Stats
      if (responseMap.stats?.data?.success) {
        const rawStats = responseMap.stats.data.data?.stats || {};
        const activities = responseMap.stats.data.data?.recentActivities || responseMap.stats.data.data?.recent_activities || [];
        setStats(s => ({ ...rawStats, recentActivity: activities }));
      }

      // Approvals
      const businessApprovals = (responseMap.businessApps?.data?.data || []).map(a => ({
        type: 'business',
        id: a.application_id,
        title: a.business_name,
        user_name: a.full_name,
        created_at: a.applied_at,
        status: a.status
      }));
      const vendorApprovals = (responseMap.foodVendors?.data?.data || []).map(v => ({
        type: 'food_vendor',
        id: v.vendor_id,
        title: v.shop_name,
        user_name: v.full_name,
        created_at: v.applied_at,
        status: v.is_verified ? 'verified' : 'pending'
      }));
      setPendingApprovals([...businessApprovals, ...vendorApprovals]);

      // Users
      if (responseMap.users?.data?.success) {
        const rawUsers = responseMap.users.data.data?.users || [];
        setUsers(rawUsers.map(u => ({
          id: u.user_id,
          full_name: u.full_name,
          email: u.email,
          role: u.role_name,
          is_active: true,
          created_at: u.created_at
        })));
      }
      setReports([]);

      // If every request failed, throw to show notification
      if (Object.keys(responseMap).length === 0) {
        throw new Error('All admin data requests failed');
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
      showNotification(error?.message || 'Error loading admin data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Live stats via SSE (fallback to polling if disabled)
  useEffect(() => {
    if (activeTab !== 'dashboard') return; // only when on dashboard tab
    let es; let poll;
    const token = localStorage.getItem('accessToken');
    const base = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
    if (live && token) {
      try {
        es = new EventSource(`${base}/admin/dashboard/stats/stream?token=${token}`);
        es.addEventListener('stats', (e) => {
          try {
            const payload = JSON.parse(e.data);
            setStats((prev) => ({ ...prev, live: payload.stats }));
            setLastUpdate(new Date());
          } catch {/* ignore */}
        });
        es.onerror = () => {
          es.close();
        };
      } catch {/* ignore */}
    } else if (!live) {
      // Polling every 15s
      poll = setInterval(() => { fetchDashboardData(); setLastUpdate(new Date()); }, 15000);
    }
    return () => { es && es.close(); poll && clearInterval(poll); };
  }, [live, activeTab]);

  const handleApproval = async (id, type, action) => {
    try {
      if (type === 'business') {
        await api.put(`/admin/business-applications/${id}/verify`, {
          status: action === 'approve' ? 'approved' : 'rejected'
        });
      } else if (type === 'food_vendor') {
        await api.put(`/admin/food-vendors/${id}/verify`, {
          approved: action === 'approve'
        });
      } else {
        showNotification('Unknown approval type', 'warning');
        return;
      }
      await fetchDashboardData();
      showNotification(`${type.replace('_',' ')} ${action}d successfully`, 'success');
    } catch (error) {
      console.error('Error handling approval:', error);
      showNotification(`Error ${action}ing ${type.replace('_',' ')}`, 'error');
    }
  };

  const handleUserAction = async (userId, action, data = {}) => {
    // Not implemented on backend yet
    showNotification('User management actions are not implemented yet', 'warning');
  };

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: FiBarChart },
    { id: 'approvals', name: 'Pending Approvals', icon: FiClock },
    { id: 'users', name: 'User Management', icon: FiUsers },
    { id: 'reports', name: 'Reports & Analytics', icon: FiFileText },
    { id: 'settings', name: 'System Settings', icon: FiSettings }
  ];

  const DashboardTab = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FiUsers className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-semibold text-gray-900">
                {(stats.live?.total_users || stats.totalUsers || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <FiDollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-semibold text-gray-900">
                ৳{(stats.live?.monthly_transaction_volume || stats.totalRevenue || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <FiShield className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
              <p className="text-2xl font-semibold text-gray-900">
                {(stats.live?.pending_business_applications || pendingApprovals.length || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <FiAlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Reports</p>
              <p className="text-2xl font-semibold text-gray-900">
                {reports.filter(r => r.status === 'open').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
          <div className="flex items-center space-x-3 text-xs">
            <span className="text-gray-500">Live:</span>
            <button type="button" onClick={() => setLive(l => !l)} className={`px-2 py-1 rounded border ${live ? 'bg-green-100 border-green-400 text-green-700' : 'bg-gray-100 border-gray-300 text-gray-600'}`}>{live ? 'ON' : 'OFF'}</button>
            {lastUpdate && <span className="text-gray-400">{`Updated ${lastUpdate.toLocaleTimeString()}`}</span>}
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {stats.recentActivity?.slice(0, 5).map((activity, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <FiClock className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{activity.description}</p>
                  <p className="text-xs text-gray-500">{activity.timestamp}</p>
                </div>
              </div>
            )) || (
              <p className="text-gray-500 text-center">No recent activity</p>
            )}
          </div>
        </div>
      </div>

  {/* Analytics Charts */}
  <AnalyticsOverview days={14} />
    </div>
  );

  const ApprovalsTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Pending Approvals</h3>
        </div>
        <div className="p-6">
          {pendingApprovals.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No pending approvals</p>
          ) : (
            <div className="space-y-4">
              {pendingApprovals.map((approval) => (
                <div key={`${approval.type}-${approval.id}`} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {approval.type === 'business' ? 'Business Registration' : 
                         approval.type === 'vendor' ? 'Food Vendor Application' :
                         approval.type === 'accommodation' ? 'Property Listing' :
                         'Item Approval'}
                      </h4>
                      <p className="text-sm text-gray-600">{approval.title || approval.name}</p>
                      <p className="text-xs text-gray-500">
                        Submitted by: {approval.user_name} • {new Date(approval.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => navigate(`/admin/review/${approval.type}/${approval.id}`)}
                        className="btn btn-outline btn-sm"
                      >
                        <FiEye className="w-4 h-4 mr-1" />
                        Review
                      </button>
                      <button
                        onClick={() => handleApproval(approval.id, approval.type, 'approve')}
                        className="btn btn-success btn-sm"
                      >
                        <FiCheck className="w-4 h-4 mr-1" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleApproval(approval.id, approval.type, 'reject')}
                        className="btn btn-error btn-sm"
                      >
                        <FiX className="w-4 h-4 mr-1" />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const UsersTab = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRole, setSelectedRole] = useState('all');
    
    const filteredUsers = users.filter(user => {
      const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = selectedRole === 'all' || user.role === selectedRole;
      return matchesSearch && matchesRole;
    });

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">User Management</h3>
              <button className="btn btn-primary btn-sm">
                <FiPlus className="w-4 h-4 mr-1" />
                Add User
              </button>
            </div>
          </div>
          
          <div className="p-6">
            {/* Search and Filter */}
            <div className="flex space-x-4 mb-6">
              <div className="flex-1 relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input w-full pl-10"
                />
              </div>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="form-input"
              >
                <option value="all">All Roles</option>
                <option value="user">User</option>
                <option value="business_owner">Business Owner</option>
                <option value="food_vendor">Food Vendor</option>
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.slice(0, 10).map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                            {user.full_name?.charAt(0) || user.email?.charAt(0)}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.full_name || 'No Name'}
                            </div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {user.role?.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => navigate(`/admin/users/${user.id}`)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <FiEye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/admin/users/${user.id}/edit`)}
                            className="text-yellow-600 hover:text-yellow-900"
                          >
                            <FiEdit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleUserAction(user.id, user.is_active ? 'suspend' : 'activate')}
                            className={user.is_active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}
                          >
                            {user.is_active ? <FiX className="w-4 h-4" /> : <FiCheck className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ReportsTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Reports & Analytics</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <button className="p-4 border rounded-lg hover:bg-gray-50 text-left">
              <div className="flex items-center">
                <FiDownload className="w-6 h-6 text-blue-600 mr-3" />
                <div>
                  <h4 className="font-medium text-gray-900">User Report</h4>
                  <p className="text-sm text-gray-600">Export user data and statistics</p>
                </div>
              </div>
            </button>
            
            <button className="p-4 border rounded-lg hover:bg-gray-50 text-left">
              <div className="flex items-center">
                <FiDownload className="w-6 h-6 text-green-600 mr-3" />
                <div>
                  <h4 className="font-medium text-gray-900">Revenue Report</h4>
                  <p className="text-sm text-gray-600">Download financial reports</p>
                </div>
              </div>
            </button>
            
            <button className="p-4 border rounded-lg hover:bg-gray-50 text-left">
              <div className="flex items-center">
                <FiDownload className="w-6 h-6 text-purple-600 mr-3" />
                <div>
                  <h4 className="font-medium text-gray-900">Activity Report</h4>
                  <p className="text-sm text-gray-600">System activity logs</p>
                </div>
              </div>
            </button>
            
            <button className="p-4 border rounded-lg hover:bg-gray-50 text-left">
              <div className="flex items-center">
                <FiDownload className="w-6 h-6 text-orange-600 mr-3" />
                <div>
                  <h4 className="font-medium text-gray-900">Performance Report</h4>
                  <p className="text-sm text-gray-600">System performance metrics</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const SettingsTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">System Settings</h3>
        </div>
        <div className="p-6">
          <div className="space-y-6">
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">General Settings</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Platform Name</label>
                  <input type="text" defaultValue="EduSync" className="form-input w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Contact Email</label>
                  <input type="email" defaultValue="admin@edusync.com" className="form-input w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Support Phone</label>
                  <input type="tel" defaultValue="+880 1234 567890" className="form-input w-full" />
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Platform Settings</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">User Registration</label>
                    <p className="text-xs text-gray-500">Allow new users to register</p>
                  </div>
                  <input type="checkbox" defaultChecked className="toggle toggle-primary" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email Verification</label>
                    <p className="text-xs text-gray-500">Require email verification for new accounts</p>
                  </div>
                  <input type="checkbox" defaultChecked className="toggle toggle-primary" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Auto-approve Listings</label>
                    <p className="text-xs text-gray-500">Automatically approve new listings</p>
                  </div>
                  <input type="checkbox" className="toggle toggle-primary" />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button className="btn btn-primary">Save Settings</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const normalizedRole = (user?.role_name || user?.role || '').toLowerCase();
  if (!user || (normalizedRole !== 'admin' && normalizedRole !== 'moderator')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FiShield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600">You need moderator or admin privileges to access this page.</p>
        </div>
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
                <h1 className="text-3xl font-bold text-gray-900">{normalizedRole === 'moderator' ? 'Moderator Console' : 'Admin Panel'}</h1>
                <p className="text-gray-600 mt-1">Manage your EduSync platform</p>
              </div>
              <div className="flex items-center space-x-4">
                <FiShield className="w-6 h-6 text-blue-600" />
                <span className="text-sm font-medium text-blue-600">{normalizedRole === 'moderator' ? 'Moderator Access' : 'Admin Access'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4 mr-2" />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && <DashboardTab />}
            {activeTab === 'approvals' && <ApprovalsTab />}
            {activeTab === 'users' && normalizedRole === 'admin' && <UsersTab />}
            {activeTab === 'reports' && normalizedRole === 'admin' && <ReportsTab />}
            {activeTab === 'settings' && normalizedRole === 'admin' && <SettingsTab />}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
