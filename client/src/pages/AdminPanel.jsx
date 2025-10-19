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
  FiDollarSign,
  FiRefreshCcw,
  FiMapPin,
  FiBook,
  FiLogIn,
  FiUserCheck,
  FiBriefcase,
  FiTrendingDown,
  FiCalendar,
  FiActivity,
  FiStar
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
  const [userLoading, setUserLoading] = useState(false);
  const [userPage, setUserPage] = useState(1);
  const [userPerPage, setUserPerPage] = useState(10);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [userTotalCount, setUserTotalCount] = useState(0);
  const [reports, setReports] = useState([]);
  
  // Enhanced user management states
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userAnalytics, setUserAnalytics] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

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
        // Users fetched via fetchUsersData with pagination
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

      // Users will be loaded separately below
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

  // Fetch users with pagination and filters
  const fetchUsersData = async (page = 1) => {
    try {
      setUserLoading(true);
      const params = {
        page,
        limit: userPerPage,
        ...(roleFilter && roleFilter !== 'all' ? { role: roleFilter } : {}),
        ...(searchTerm ? { search: searchTerm } : {})
      };
      const { data } = await api.get('/admin/users', { params });
      if (data?.success) {
        const rawUsers = data.data?.users || [];
        const processed = rawUsers.map(u => ({
          id: u.user_id,
          full_name: u.full_name,
          email: u.email,
          phone: u.phone,
          institution: u.institution,
          location: u.location,
          role: u.role_name,
          is_active: typeof u.is_active === 'boolean' ? u.is_active : true,
          is_blocked: typeof u.is_blocked === 'boolean' ? u.is_blocked : false,
          created_at: u.created_at,
          login_count: u.login_count || 0,
          last_login: u.last_login,
          total_purchases: u.total_purchases || 0,
          total_sales: u.total_sales || 0
        }));
        setUsers(processed);
        calculateUserAnalytics(processed);
        const p = data.data?.pagination || {};
        setUserPage(p.current_page || page);
        setUserPerPage(p.per_page || userPerPage);
        setUserTotalPages(p.total_pages || 1);
        setUserTotalCount(p.total_users || processed.length);
      }
    } catch (e) {
      console.error('Fetch users failed', e);
    } finally {
      setUserLoading(false);
    }
  };

  // Initial load users after dashboard basics
  useEffect(() => {
    if (user && (normalizedRole === 'admin' || normalizedRole === 'moderator')) {
      fetchUsersData(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Refetch on filter changes with small debounce
  useEffect(() => {
    const t = setTimeout(() => fetchUsersData(1), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, roleFilter, userPerPage]);

  const calculateUserAnalytics = (usersData) => {
    const analytics = {
      totalUsers: usersData.length,
      activeUsers: usersData.filter(u => u.is_active).length,
      inactiveUsers: usersData.filter(u => !u.is_active).length,
      roleDistribution: {},
      recentSignups: usersData.filter(u => {
        const signupDate = new Date(u.created_at);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return signupDate > thirtyDaysAgo;
      }).length,
      institutionDistribution: {},
      totalLogins: usersData.reduce((sum, u) => sum + (u.login_count || 0), 0),
      totalPurchases: usersData.reduce((sum, u) => sum + (u.total_purchases || 0), 0),
      totalSales: usersData.reduce((sum, u) => sum + (u.total_sales || 0), 0)
    };

    // Calculate role distribution
    usersData.forEach(user => {
      const role = user.role || 'user';
      analytics.roleDistribution[role] = (analytics.roleDistribution[role] || 0) + 1;
    });

    // Calculate institution distribution
    usersData.forEach(user => {
      if (user.institution) {
        analytics.institutionDistribution[user.institution] = 
          (analytics.institutionDistribution[user.institution] || 0) + 1;
      }
    });

    setUserAnalytics(analytics);
  };

  const handleViewUser = async (userId) => {
    try {
      const response = await api.get(`/admin/users/${userId}`);
      if (response.data.success) {
        setSelectedUser(response.data.data);
        setUserModalOpen(true);
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
      showNotification('Failed to load user details', 'error');
    }
  };

  const handleUserAction = async (userId, action) => {
    try {
      let payload = {};
      if (action === 'activate' || action === 'suspend') {
        payload.is_active = action === 'activate';
      }
      if (action === 'block' || action === 'unblock') {
        payload.is_blocked = action === 'block';
      }
      const response = await api.put(`/admin/users/${userId}`, payload);
      if (response.data.success) {
        showNotification(`User ${action}d successfully`, 'success');
        await fetchUsersData(userPage); // Refresh current users page
      }
    } catch (error) {
      console.error(`Error ${action}ing user:`, error);
      showNotification(`Failed to ${action} user`, 'error');
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

  // User Details Modal Component
  const UserModal = ({ user, isOpen, onClose }) => {
    if (!isOpen || !user) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">User Details</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h4>
                
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-xl">
                    {user.full_name?.charAt(0) || user.email?.charAt(0)}
                  </div>
                  <div>
                    <h5 className="text-xl font-semibold text-gray-900">{user.full_name || 'No Name'}</h5>
                    <p className="text-gray-600">{user.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <div className="flex items-center mt-1">
                      <FiPhone className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{user.phone || 'Not provided'}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Role</label>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                      {user.role_name || user.role || 'User'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Institution</label>
                    <div className="flex items-center mt-1">
                      <FiBook className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{user.institution || 'Not provided'}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Location</label>
                    <div className="flex items-center mt-1">
                      <FiMapPin className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{user.location || 'Not provided'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Member Since</label>
                  <div className="flex items-center mt-1">
                    <FiCalendar className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900">
                      {new Date(user.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Activity & Statistics */}
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Activity & Statistics</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <FiLogIn className="w-8 h-8 text-blue-600 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Logins</p>
                        <p className="text-2xl font-bold text-blue-600">{user.login_count || 0}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <FiTrendingUp className="w-8 h-8 text-green-600 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Purchases</p>
                        <p className="text-2xl font-bold text-green-600">{user.total_purchases || 0}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <FiDollarSign className="w-8 h-8 text-purple-600 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Sales</p>
                        <p className="text-2xl font-bold text-purple-600">{user.total_sales || 0}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <FiActivity className="w-8 h-8 text-orange-600 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">Last Login</p>
                        <p className="text-sm font-bold text-orange-600">
                          {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h5 className="font-medium text-gray-900 mb-2">Account Status</h5>
                  <div className="flex items-center space-x-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {user.email_verified && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <FiUserCheck className="w-3 h-3 mr-1" />
                        Email Verified
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const UsersTab = () => {
    return (
      <div className="space-y-6">
        {/* User Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FiUsers className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{userAnalytics.totalUsers || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FiUserCheck className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-gray-900">{userAnalytics.activeUsers || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FiCalendar className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">New This Month</p>
                <p className="text-2xl font-bold text-gray-900">{userAnalytics.recentSignups || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FiActivity className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Logins</p>
                <p className="text-2xl font-bold text-gray-900">{userAnalytics.totalLogins || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Role Distribution Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Role Distribution</h3>
            <div className="space-y-3">
              {Object.entries(userAnalytics.roleDistribution || {}).map(([role, count]) => (
                <div key={role} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 capitalize">
                    {role.replace('_', ' ')}
                  </span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(count / userAnalytics.totalUsers) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Top Institutions</h3>
            <div className="space-y-3">
              {Object.entries(userAnalytics.institutionDistribution || {})
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .map(([institution, count]) => (
                <div key={institution} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 truncate">
                    {institution}
                  </span>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${(count / userAnalytics.totalUsers) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

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
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="form-input"
              >
                <option value="all">All Roles</option>
                <option value="user">User</option>
                <option value="business_owner">Business Owner</option>
                <option value="food_vendor">Food Vendor</option>
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
              </select>
              <select
                value={userPerPage}
                onChange={(e) => { const v = parseInt(e.target.value, 10) || 10; setUserPerPage(v); setUserPage(1); }}
                className="form-input"
                title="Rows per page"
              >
                {[10,20,50].map(n => <option key={n} value={n}>{n}/page</option>)}
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
                      Blocked
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
                  {(userLoading ? [] : users).map((user) => (
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.is_blocked 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.is_blocked ? 'Blocked' : '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewUser(user.id)}
                            className="text-blue-600 hover:text-blue-900"
                            title="View Details"
                          >
                            <FiEye className="w-4 h-4" />
                          </button>
                          {normalizedRole === 'admin' && (
                            <>
                              <button
                                onClick={() => navigate(`/admin/users/${user.id}/edit`)}
                                className="text-yellow-600 hover:text-yellow-900"
                                title="Edit User"
                              >
                                <FiEdit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleUserAction(user.id, user.is_active ? 'suspend' : 'activate')}
                                className={user.is_active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}
                                title={user.is_active ? 'Suspend User' : 'Activate User'}
                              >
                                {user.is_active ? <FiX className="w-4 h-4" /> : <FiCheck className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => handleUserAction(user.id, user.is_blocked ? 'unblock' : 'block')}
                                className={user.is_blocked ? 'text-green-600 hover:text-green-900' : 'text-red-600 hover:text-red-900'}
                                title={user.is_blocked ? 'Unblock User' : 'Block User'}
                              >
                                {user.is_blocked ? <FiCheck className="w-4 h-4" /> : <FiTrash2 className="w-4 h-4" />}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-3 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Page <strong>{userPage}</strong> of <strong>{userTotalPages}</strong> • Total users: <strong>{userTotalCount}</strong>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => userPage > 1 && fetchUsersData(userPage - 1)}
                    disabled={userPage <= 1 || userLoading}
                    className={`px-3 py-1 text-sm rounded ${userPage <= 1 || userLoading ? 'bg-gray-100 text-gray-400' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => userPage < userTotalPages && fetchUsersData(userPage + 1)}
                    disabled={userPage >= userTotalPages || userLoading}
                    className={`px-3 py-1 text-sm rounded ${userPage >= userTotalPages || userLoading ? 'bg-gray-100 text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* User Details Modal */}
        <UserModal 
          user={selectedUser} 
          isOpen={userModalOpen} 
          onClose={() => {
            setUserModalOpen(false);
            setSelectedUser(null);
          }} 
        />
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
            {/* Notices scraper control */}
            <div className="border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-1">Notices Scraper</h4>
                  <p className="text-sm text-gray-600">Fetch latest notices from the configured source and store them in the database.</p>
                  <p className="text-xs text-gray-500 mt-1">Source URL: {import.meta.env.VITE_NOTICES_SOURCE_URL || 'backend .env NOTICES_SOURCE_URL'}</p>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={async () => {
                    try {
                      const { data } = await api.post('/notices/scrape');
                      if (data?.success) {
                        showNotification(`Synced ${data.count || 0} notices`, 'success');
                      } else {
                        showNotification(data?.message || 'Scrape failed', 'error');
                      }
                    } catch (e) {
                      const msg = e?.response?.data?.message || e.message || 'Failed to trigger scraper';
                      showNotification(msg, 'error');
                    }
                  }}
                  title="Trigger an on-demand sync"
                >
                  <FiRefreshCcw className="w-4 h-4 mr-2" /> Sync Notices Now
                </button>
              </div>
            </div>

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
            {activeTab === 'users' && (normalizedRole === 'admin' || normalizedRole === 'moderator') && <UsersTab />}
            {activeTab === 'reports' && normalizedRole === 'admin' && <ReportsTab />}
            {activeTab === 'settings' && normalizedRole === 'admin' && <SettingsTab />}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
