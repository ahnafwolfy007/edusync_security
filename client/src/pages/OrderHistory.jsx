import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiShoppingBag,
  FiClock,
  FiMapPin,
  FiPhone,
  FiStar,
  FiCheck,
  FiX,
  FiAlertCircle,
  FiTruck,
  FiCalendar,
  FiDollarSign,
  FiMessageCircle,
  FiRefreshCw,
  FiDownload
} from 'react-icons/fi';
import api from '../api';
import { useNotification } from '../context/NotificationContext';

const OrderHistory = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  const statusOptions = [
    { id: 'all', name: 'All Orders', color: 'gray' },
    { id: 'pending', name: 'Pending', color: 'yellow' },
    { id: 'confirmed', name: 'Confirmed', color: 'blue' },
    { id: 'preparing', name: 'Preparing', color: 'orange' },
    { id: 'out_for_delivery', name: 'Out for Delivery', color: 'purple' },
    { id: 'delivered', name: 'Delivered', color: 'green' },
    { id: 'cancelled', name: 'Cancelled', color: 'red' }
  ];

  const typeOptions = [
    { id: 'all', name: 'All Types' },
    { id: 'food', name: 'Food Orders' },
    { id: 'business', name: 'Business Items' },
    { id: 'accommodation', name: 'Accommodation' },
    { id: 'secondhand', name: 'Secondhand Items' }
  ];

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, selectedStatus, selectedType]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/user/orders');
      const data = response?.data?.data?.orders || response?.data?.orders || {};

      const flat = [];

      // Business orders
      (data.business || []).forEach((o) => {
        const items = (o.items || []).map(it => ({
          name: it.product_name || it.item_name,
          quantity: it.quantity || 1,
          price: it.price || 0
        }));
        const total = items.reduce((sum, it) => sum + (it.price * it.quantity), 0);
        flat.push({
          id: o.order_id || o.id,
          order_type: 'business',
          status: o.status,
          created_at: o.created_at || o.order_date,
          total_amount: o.total_amount || total,
          items,
          vendor_name: o.business_name,
          vendor_id: o.business_id
        });
      });

      // Secondhand orders
      (data.secondhand || []).forEach((o) => {
        const price = o.price || 0;
        const items = [{ name: o.item_name, quantity: 1, price }];
        flat.push({
          id: o.order_id || o.id,
          order_type: 'secondhand',
          status: o.status,
          created_at: o.order_date || o.created_at,
          total_amount: price,
          items,
          vendor_name: o.seller_name
        });
      });

      // Rental orders
      (data.rentals || []).forEach((o) => {
        const items = [{ name: o.product_name, quantity: 1, price: o.rent_per_day || 0 }];
        flat.push({
          id: o.rental_order_id || o.order_id || o.id,
          order_type: 'rentals',
          status: o.status,
          created_at: o.created_at,
          total_amount: (o.total_amount) || items[0].price,
          items,
          vendor_name: o.owner_name
        });
      });

      // Food orders
      (data.food || []).forEach((o) => {
        const items = (o.items || []).map(it => ({
          name: it.item_name || it.product_name,
          quantity: it.quantity || 1,
          price: it.price || 0
        }));
        const total = items.reduce((sum, it) => sum + (it.price * it.quantity), 0);
        flat.push({
          id: o.order_id || o.id,
          order_type: 'food',
          status: o.status,
          created_at: o.order_placed_at || o.created_at,
          total_amount: o.total_amount || total,
          items,
          vendor_name: o.shop_name || o.restaurant_name,
          vendor_id: o.vendor_id
        });
      });

      setOrders(flat);
    } catch (error) {
      console.error('Error fetching orders:', error);
      showNotification('Error loading order history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = orders;

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(order => order.status === selectedStatus);
    }

    if (selectedType !== 'all') {
      filtered = filtered.filter(order => order.order_type === selectedType);
    }

    // Sort by created date (newest first)
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    setFilteredOrders(filtered);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return FiClock;
      case 'confirmed': return FiCheck;
      case 'preparing': return FiRefreshCw;
      case 'out_for_delivery': return FiTruck;
      case 'delivered': return FiCheck;
      case 'cancelled': return FiX;
      default: return FiAlertCircle;
    }
  };

  const getStatusColor = (status) => {
    const statusOption = statusOptions.find(opt => opt.id === status);
    return statusOption ? statusOption.color : 'gray';
  };

  const handleCancelOrder = async (orderId) => {
    showNotification('Order cancellation is not available yet', 'warning');
  };

  const handleReorder = async (order) => {
    try {
      // Implement reorder logic based on order type
      if (order.order_type === 'food') {
        navigate(`/food-ordering/${order.vendor_id}`, { 
          state: { reorderItems: order.items } 
        });
      } else if (order.order_type === 'business') {
        navigate(`/business-marketplace/${order.shop_id}`, { 
          state: { reorderItems: order.items } 
        });
      }
    } catch (error) {
      console.error('Error reordering:', error);
      showNotification('Error processing reorder', 'error');
    }
  };

  const handleDownloadInvoice = async (orderId) => {
    showNotification('Invoice download is not available yet', 'warning');
  };

  const OrderCard = ({ order }) => {
    const StatusIcon = getStatusIcon(order.status);
    const statusColor = getStatusColor(order.status);
    
    return (
      <div className="card hover:shadow-md transition-all duration-300">
        <div className="p-6">
          {/* Order Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <FiShoppingBag className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  Order #{order.id?.toString().padStart(6, '0')}
                </h3>
                <p className="text-sm text-gray-600">
                  {order.vendor_name || order.shop_name || order.business_name}
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-lg font-bold text-gray-900">
                ৳{order.total_amount?.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">
                {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Status and Type */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-${statusColor}-100 text-${statusColor}-800`}>
                <StatusIcon className="w-4 h-4 mr-1" />
                {order.status?.replace('_', ' ').toUpperCase()}
              </span>
              <span className="bg-gray-100 text-gray-700 text-xs font-medium px-2 py-1 rounded-full">
                {order.order_type?.toUpperCase()}
              </span>
            </div>
            
            <div className="flex items-center text-gray-500 text-sm">
              <FiCalendar className="w-4 h-4 mr-1" />
              {new Date(order.created_at).toLocaleDateString()}
            </div>
          </div>

          {/* Order Items Preview */}
          {order.items && order.items.length > 0 && (
            <div className="mb-4">
              <div className="border rounded-lg p-3 bg-gray-50">
                {order.items.slice(0, 2).map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{item.quantity}x</span>
                      <span className="text-sm text-gray-700">{item.name}</span>
                    </div>
                    <span className="text-sm text-gray-600">
                      ৳{(item.price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                ))}
                {order.items.length > 2 && (
                  <div className="text-xs text-gray-500 pt-1 border-t">
                    +{order.items.length - 2} more items
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Delivery Info */}
          {order.delivery_address && (
            <div className="flex items-center text-gray-600 text-sm mb-4">
              <FiMapPin className="w-4 h-4 mr-2" />
              <span className="line-clamp-1">{order.delivery_address}</span>
            </div>
          )}

          {/* Delivery Time */}
          {order.estimated_delivery && (
            <div className="flex items-center text-gray-600 text-sm mb-4">
              <FiClock className="w-4 h-4 mr-2" />
              <span>
                Estimated delivery: {new Date(order.estimated_delivery).toLocaleString()}
              </span>
            </div>
          )}

          {/* Rating */}
          {order.status === 'delivered' && order.rating && (
            <div className="flex items-center mb-4">
              <span className="text-sm text-gray-600 mr-2">Your rating:</span>
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <FiStar
                    key={i}
                    className={`w-4 h-4 ${
                      i < order.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'
                    }`}
                  />
                ))}
                <span className="text-sm text-gray-600 ml-1">({order.rating}/5)</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex space-x-2">
              <button
                onClick={() => navigate(`/orders/${order.id}`)}
                className="btn btn-outline btn-sm"
              >
                View Details
              </button>
              
              {order.status === 'delivered' && (
                <button
                  onClick={() => handleDownloadInvoice(order.id)}
                  className="btn btn-outline btn-sm flex items-center"
                >
                  <FiDownload className="w-4 h-4 mr-1" />
                  Invoice
                </button>
              )}
              
              {(order.status === 'delivered' || order.status === 'cancelled') && (
                <button
                  onClick={() => handleReorder(order)}
                  className="btn btn-primary btn-sm"
                >
                  Reorder
                </button>
              )}
            </div>

            <div className="flex space-x-2">
              {order.status === 'pending' && (
                <button
                  onClick={() => handleCancelOrder(order.id)}
                  className="btn btn-error btn-sm"
                >
                  Cancel
                </button>
              )}
              
              {order.vendor_phone && (
                <button
                  onClick={() => window.open(`tel:${order.vendor_phone}`, '_self')}
                  className="btn btn-outline btn-sm flex items-center"
                >
                  <FiPhone className="w-4 h-4 mr-1" />
                  Call
                </button>
              )}
              
              <button
                onClick={() => navigate(`/chat/${order.vendor_id || order.shop_id}`)}
                className="btn btn-outline btn-sm flex items-center"
              >
                <FiMessageCircle className="w-4 h-4 mr-1" />
                Chat
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-gray-900">Order History</h1>
            <p className="text-gray-600 mt-1">
              Track your orders and manage your purchase history
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="form-input w-full"
              >
                {statusOptions.map(option => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="form-input w-full"
              >
                {typeOptions.map(option => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Order Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {statusOptions.slice(1).map(status => {
            const count = orders.filter(order => order.status === status.id).length;
            return (
              <div key={status.id} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className={`w-12 h-12 bg-${status.color}-100 rounded-lg flex items-center justify-center`}>
                    <span className={`text-${status.color}-600 font-bold text-lg`}>
                      {count}
                    </span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{status.name}</p>
                    <p className="text-xs text-gray-500">Orders</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Results */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-gray-600">
            {loading ? 'Loading...' : `${filteredOrders.length} orders found`}
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="card animate-pulse">
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                        <div className="h-3 bg-gray-200 rounded w-24"></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                      <div className="h-3 bg-gray-200 rounded w-16"></div>
                    </div>
                  </div>
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <FiShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-600 mb-4">
              {selectedStatus !== 'all' || selectedType !== 'all'
                ? 'Try adjusting your filters or'
                : "You haven't placed any orders yet."
              }
            </p>
            <div className="flex space-x-4 justify-center">
              {(selectedStatus !== 'all' || selectedType !== 'all') && (
                <button
                  onClick={() => {
                    setSelectedStatus('all');
                    setSelectedType('all');
                  }}
                  className="btn btn-outline"
                >
                  Clear Filters
                </button>
              )}
              <button
                onClick={() => navigate('/dashboard')}
                className="btn btn-primary"
              >
                Start Shopping
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map(order => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderHistory;
