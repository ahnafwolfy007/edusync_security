import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FiStar, 
  FiMapPin, 
  FiClock, 
  FiPhone, 
  FiMail,
  FiShoppingCart,
  FiPlus,
  FiMinus,
  FiArrowLeft,
  FiHeart,
  FiShare2,
  FiPackage,
  FiUsers,
  FiTruck,
  FiInfo
} from 'react-icons/fi';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

const BusinessShopDetails = () => {
  const { businessId } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { user } = useAuth();
  
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCart, setShowCart] = useState(false);
  const [orderType, setOrderType] = useState('delivery');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash_on_delivery');

  useEffect(() => {
    fetchBusinessDetails();
  }, [businessId]);

  const fetchBusinessDetails = async () => {
    try {
      setLoading(true);
  const response = await api.get(`/business-marketplace/shops/${businessId}`);
      const payload = response.data?.data || response.data;
      setBusiness(payload.business || payload);
    } catch (error) {
      console.error('Error fetching business details:', error);
      showNotification('Error loading business details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.product_id === product.product_id);
    if (existingItem) {
      setCart(cart.map(item => 
        item.product_id === product.product_id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    showNotification(`${product.product_name} added to cart`, 'success');
  };

  const updateCartQuantity = (productId, newQuantity) => {
    if (newQuantity === 0) {
      setCart(cart.filter(item => item.product_id !== productId));
    } else {
      setCart(cart.map(item => 
        item.product_id === productId 
          ? { ...item, quantity: newQuantity }
          : item
      ));
    }
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getCartItemCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  const placeOrder = async () => {
    if (!user) {
      showNotification('Please login to place an order', 'error');
      navigate('/login');
      return;
    }

    if (cart.length === 0) {
      showNotification('Your cart is empty', 'error');
      return;
    }

    if (orderType === 'delivery' && !deliveryAddress) {
      showNotification('Please enter delivery address', 'error');
      return;
    }

    try {
      const orderData = {
        businessId: business.business_id,
        items: cart.map(item => ({
          productId: item.product_id,
          quantity: item.quantity,
          termsAccepted: true
        })),
        deliveryAddress: orderType === 'delivery' ? deliveryAddress : null,
        paymentMethod,
        specialInstructions: ''
      };

  const response = await api.post('/business-marketplace/orders/place', orderData);
      
      if (response.data.success) {
        showNotification('Order placed successfully!', 'success');
        setCart([]);
        setShowCart(false);
        navigate('/business-marketplace/orders');
      }
    } catch (error) {
      console.error('Error placing order:', error);
      showNotification(
        error.response?.data?.message || 'Error placing order', 
        'error'
      );
    }
  };

  const ProductCard = ({ product }) => {
    const cartItem = cart.find(item => item.product_id === product.product_id);
    const quantity = cartItem ? cartItem.quantity : 0;

    return (
      <div className="card p-4 hover:shadow-lg transition-all duration-300">
        <div className="flex space-x-4">
          <img
            src={product.image || '/placeholder/150/150'}
            alt={product.product_name}
            className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 mb-1">
              {product.product_name}
            </h3>
            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
              {product.description || 'No description available'}
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold text-blue-600">
                  ৳{product.price}
                </span>
                {product.sales_count > 0 && (
                  <span className="text-xs text-gray-500">
                    {product.sales_count} sold
                  </span>
                )}
              </div>
              
              {quantity > 0 ? (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => updateCartQuantity(product.product_id, quantity - 1)}
                    className="p-1 bg-gray-200 rounded-full hover:bg-gray-300"
                  >
                    <FiMinus className="w-4 h-4" />
                  </button>
                  <span className="font-medium w-8 text-center">{quantity}</span>
                  <button
                    onClick={() => updateCartQuantity(product.product_id, quantity + 1)}
                    className="p-1 bg-blue-600 text-white rounded-full hover:bg-blue-700"
                  >
                    <FiPlus className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => addToCart(product)}
                  className="btn btn-primary btn-sm"
                >
                  Add to Cart
                </button>
              )}
            </div>
            
            {product.stock_quantity !== null && product.stock_quantity < 10 && (
              <p className="text-xs text-orange-600 mt-1">
                Only {product.stock_quantity} left in stock
              </p>
            )}
          </div>
        </div>
        
        {product.terms_conditions && (
          <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
            <FiInfo className="w-3 h-3 inline mr-1" />
            {product.terms_conditions}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="skeleton h-8 w-64 mb-4"></div>
          <div className="skeleton h-32 w-full mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton h-24 w-full"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Business Not Found</h2>
          <p className="text-gray-600 mb-4">The business you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/business-marketplace')}
            className="btn btn-primary"
          >
            Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  const categories = business.categories || [];
  const filteredProducts = selectedCategory === 'all' 
    ? business.products || []
    : (business.productsByCategory?.[selectedCategory] || []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 flex items-center justify-between">
            <button
              onClick={() => navigate('/business-marketplace')}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <FiArrowLeft className="w-5 h-5 mr-2" />
              Back to Marketplace
            </button>
            
            <div className="flex items-center space-x-2">
              <button className="p-2 text-gray-600 hover:text-red-500">
                <FiHeart className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-600 hover:text-blue-500">
                <FiShare2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Business Info */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-start space-y-4 md:space-y-0 md:space-x-6">
            <img
              src={business.image || '/placeholder/200/200'}
              alt={business.business_name}
              className="w-32 h-32 object-cover rounded-lg mx-auto md:mx-0 flex-shrink-0"
            />
            
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
                <h1 className="text-2xl font-bold text-gray-900 mb-2 md:mb-0">
                  {business.business_name}
                </h1>
                <div className="flex items-center justify-center md:justify-start space-x-1">
                  <FiStar className="w-5 h-5 text-yellow-500 fill-current" />
                  <span className="text-lg font-medium">
                    {business.avg_rating ? parseFloat(business.avg_rating).toFixed(1) : 'New'}
                  </span>
                  {business.review_count > 0 && (
                    <span className="text-gray-500">
                      ({business.review_count} reviews)
                    </span>
                  )}
                </div>
              </div>
              
              <p className="text-gray-600 mb-4">
                {business.description || 'Welcome to our business!'}
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center justify-center md:justify-start">
                  <FiPackage className="w-4 h-4 mr-2 text-blue-600" />
                  <span>{business.business_type}</span>
                </div>
                <div className="flex items-center justify-center md:justify-start">
                  <FiPackage className="w-4 h-4 mr-2 text-green-600" />
                  <span>{business.product_count} Products</span>
                </div>
                <div className="flex items-center justify-center md:justify-start">
                  <FiUsers className="w-4 h-4 mr-2 text-purple-600" />
                  <span>{business.order_count} Orders</span>
                </div>
              </div>
              
              <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-4">
                <span className="badge badge-primary">{business.business_type}</span>
                {business.is_verified && (
                  <span className="badge badge-success">✓ Verified</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <div className="mb-6">
            <div className="flex space-x-2 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                  selectedCategory === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border'
                }`}
              >
                All ({business.products?.length || 0})
              </button>
              {categories.map((category) => (
                <button
                  key={category.category}
                  onClick={() => setSelectedCategory(category.category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                    selectedCategory === category.category
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border'
                  }`}
                >
                  {category.category} ({category.product_count})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Products */}
        <div className="space-y-4 mb-8">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product) => (
              <ProductCard key={product.product_id} product={product} />
            ))
          ) : (
            <div className="text-center py-12">
              <FiPackage className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No products available</h3>
              <p className="text-gray-500">
                This business hasn't added any products yet.
              </p>
            </div>
          )}
        </div>

        {/* Recent Reviews */}
        {business.recentReviews && business.recentReviews.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Reviews</h2>
            <div className="space-y-4">
              {business.recentReviews.slice(0, 3).map((review, index) => (
                <div key={index} className="border-b last:border-b-0 pb-4 last:pb-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">
                        {review.customer_name}
                      </span>
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <FiStar
                            key={i}
                            className={`w-4 h-4 ${
                              i < review.rating
                                ? 'text-yellow-500 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {review.review && (
                    <p className="text-gray-600 text-sm">{review.review}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 right-4">
          <button
            onClick={() => setShowCart(true)}
            className="btn btn-primary rounded-full p-4 shadow-lg relative"
          >
            <FiShoppingCart className="w-6 h-6" />
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
              {getCartItemCount()}
            </span>
          </button>
        </div>
      )}

      {/* Cart Modal */}
      {showCart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-md sm:mx-4 rounded-t-lg sm:rounded-lg max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Your Order</h2>
              <button
                onClick={() => setShowCart(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            
            <div className="p-4 max-h-96 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.product_id} className="flex items-center justify-between py-3 border-b last:border-b-0">
                  <div className="flex-1">
                    <h3 className="font-medium text-sm">{item.product_name}</h3>
                    <p className="text-blue-600 font-medium">৳{item.price}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateCartQuantity(item.product_id, item.quantity - 1)}
                      className="p-1 bg-gray-200 rounded"
                    >
                      <FiMinus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateCartQuantity(item.product_id, item.quantity + 1)}
                      className="p-1 bg-blue-600 text-white rounded"
                    >
                      <FiPlus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-4 border-t">
              <div className="mb-4">
                <label className="form-label">Order Type</label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setOrderType('delivery')}
                    className={`flex-1 p-2 text-sm rounded ${
                      orderType === 'delivery' ? 'bg-blue-600 text-white' : 'bg-gray-200'
                    }`}
                  >
                    Delivery
                  </button>
                  <button
                    onClick={() => setOrderType('pickup')}
                    className={`flex-1 p-2 text-sm rounded ${
                      orderType === 'pickup' ? 'bg-blue-600 text-white' : 'bg-gray-200'
                    }`}
                  >
                    Pickup
                  </button>
                </div>
              </div>
              
              {orderType === 'delivery' && (
                <div className="mb-4">
                  <label className="form-label">Delivery Address</label>
                  <textarea
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Enter your delivery address..."
                    className="form-input w-full"
                    rows={2}
                  />
                </div>
              )}
              
              <div className="mb-4">
                <label className="form-label">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="form-input w-full"
                >
                  <option value="cash_on_delivery">Cash on Delivery</option>
                  <option value="bkash">bKash</option>
                  <option value="nagad">Nagad</option>
                  <option value="rocket">Rocket</option>
                </select>
              </div>
              
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold">Total:</span>
                <span className="font-bold text-lg text-blue-600">৳{getCartTotal()}</span>
              </div>
              
              <button
                onClick={placeOrder}
                className="btn btn-primary w-full"
              >
                Place Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessShopDetails;
