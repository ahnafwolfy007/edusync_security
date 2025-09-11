import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiBell,
  FiCheck,
  FiX,
  FiTrash2,
  FiSettings,
  FiFilter,
  FiMail,
  FiShoppingBag,
  FiHeart,
  FiDollarSign,
  FiClock,
  FiEye,
  FiEyeOff,
  FiCheckCircle,
  FiAlertCircle,
  FiInfo,
  FiGift
} from 'react-icons/fi';
import api from '../api';
import { useNotification } from '../context/NotificationContext';

const Notifications = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const filterOptions = [
    { id: 'all', name: 'All Notifications' },
    { id: 'unread', name: 'Unread Only' },
    { id: 'read', name: 'Read Only' }
  ];

  const typeOptions = [
    { id: 'all', name: 'All Types' },
    { id: 'order', name: 'Orders' },
    { id: 'payment', name: 'Payments' },
    { id: 'promotion', name: 'Promotions' },
    { id: 'system', name: 'System' },
    { id: 'social', name: 'Social' }
  ];

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    filterNotifications();
  }, [notifications, selectedFilter, selectedType]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
  const response = await api.get('/notifications');
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      showNotification('Error loading notifications', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filterNotifications = () => {
    let filtered = notifications;

    if (selectedFilter === 'unread') {
      filtered = filtered.filter(notification => !notification.is_read);
    } else if (selectedFilter === 'read') {
      filtered = filtered.filter(notification => notification.is_read);
    }

    if (selectedType !== 'all') {
      filtered = filtered.filter(notification => notification.type === selectedType);
    }

    // Sort by created date (newest first)
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    setFilteredNotifications(filtered);
  };

  const markAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications(notifications.map(notification => 
        notification.id === notificationId 
          ? { ...notification, is_read: true }
          : notification
      ));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      showNotification('Error updating notification', 'error');
    }
  };

  const markAllAsRead = async () => {
    try {
      setMarkingAllRead(true);
  await api.put('/notifications/mark-all-read');
      setNotifications(notifications.map(notification => ({
        ...notification,
        is_read: true
      })));
      showNotification('All notifications marked as read', 'success');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      showNotification('Error updating notifications', 'error');
    } finally {
      setMarkingAllRead(false);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      setNotifications(notifications.filter(notification => notification.id !== notificationId));
      showNotification('Notification deleted', 'success');
    } catch (error) {
      console.error('Error deleting notification:', error);
      showNotification('Error deleting notification', 'error');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'order': return FiShoppingBag;
      case 'payment': return FiDollarSign;
      case 'promotion': return FiGift;
      case 'social': return FiHeart;
      case 'system': return FiInfo;
      default: return FiBell;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'order': return 'blue';
      case 'payment': return 'green';
      case 'promotion': return 'purple';
      case 'social': return 'pink';
      case 'system': return 'yellow';
      default: return 'gray';
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // Navigate based on notification type and data
    if (notification.action_url) {
      navigate(notification.action_url);
    } else if (notification.type === 'order' && notification.data?.order_id) {
      navigate(`/orders/${notification.data.order_id}`);
    } else if (notification.type === 'payment' && notification.data?.payment_id) {
      navigate(`/wallet`);
    }
  };

  const NotificationCard = ({ notification }) => {
    const Icon = getNotificationIcon(notification.type);
    const color = getNotificationColor(notification.type);
    
    return (
      <div 
        className={`card hover:shadow-md transition-all duration-300 cursor-pointer ${
          !notification.is_read ? 'bg-blue-50 border-blue-200' : 'bg-white'
        }`}
        onClick={() => handleNotificationClick(notification)}
      >
        <div className="p-4">
          <div className="flex items-start space-x-3">
            <div className={`w-10 h-10 bg-${color}-100 rounded-full flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-5 h-5 text-${color}-600`} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className={`text-sm font-medium ${
                    !notification.is_read ? 'text-gray-900' : 'text-gray-700'
                  }`}>
                    {notification.title}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {notification.message}
                  </p>
                  
                  <div className="flex items-center mt-2 space-x-4">
                    <div className="flex items-center text-xs text-gray-500">
                      <FiClock className="w-3 h-3 mr-1" />
                      {new Date(notification.created_at).toLocaleString()}
                    </div>
                    
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-${color}-100 text-${color}-800`}>
                      {notification.type?.toUpperCase()}
                    </span>
                    
                    {!notification.is_read && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        NEW
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  {!notification.is_read && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notification.id);
                      }}
                      className="p-1 text-blue-600 hover:bg-blue-100 rounded-full transition-colors"
                      title="Mark as read"
                    >
                      <FiCheck className="w-4 h-4" />
                    </button>
                  )}
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                    className="p-1 text-red-600 hover:bg-red-100 rounded-full transition-colors"
                    title="Delete notification"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <FiBell className="w-8 h-8 mr-3" />
                  Notifications
                  {unreadCount > 0 && (
                    <span className="ml-3 bg-red-500 text-white text-sm font-medium px-2 py-1 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </h1>
                <p className="text-gray-600 mt-1">
                  Stay updated with your latest activities
                </p>
              </div>
              <button
                onClick={() => navigate('/notifications/settings')}
                className="btn btn-outline flex items-center"
              >
                <FiSettings className="w-4 h-4 mr-2" />
                Settings
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters and Actions */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="form-input"
              >
                {filterOptions.map(option => (
                  <option key={option.id} value={option.id}>{option.name}</option>
                ))}
              </select>
              
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="form-input"
              >
                {typeOptions.map(option => (
                  <option key={option.id} value={option.id}>{option.name}</option>
                ))}
              </select>
            </div>
            
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                disabled={markingAllRead}
                className="btn btn-primary flex items-center"
              >
                <FiCheckCircle className="w-4 h-4 mr-2" />
                {markingAllRead ? 'Marking...' : 'Mark All Read'}
              </button>
            )}
          </div>
        </div>

        {/* Notification Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FiBell className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-semibold text-gray-900">{notifications.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <FiEye className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Unread</p>
                <p className="text-2xl font-semibold text-gray-900">{unreadCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <FiEyeOff className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Read</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {notifications.length - unreadCount}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-gray-600">
            {loading ? 'Loading...' : `${filteredNotifications.length} notifications`}
          </div>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="card animate-pulse">
                <div className="p-4 flex items-start space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <FiBell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {selectedFilter === 'unread' ? 'No unread notifications' : 
               selectedFilter === 'read' ? 'No read notifications' :
               'No notifications found'}
            </h3>
            <p className="text-gray-600 mb-4">
              {selectedFilter !== 'all' || selectedType !== 'all'
                ? 'Try adjusting your filters to see more notifications.'
                : "You're all caught up! New notifications will appear here."}
            </p>
            {(selectedFilter !== 'all' || selectedType !== 'all') && (
              <button
                onClick={() => {
                  setSelectedFilter('all');
                  setSelectedType('all');
                }}
                className="btn btn-outline"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNotifications.map(notification => (
              <NotificationCard key={notification.id} notification={notification} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
