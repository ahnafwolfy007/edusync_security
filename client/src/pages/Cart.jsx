import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiShoppingCart,
  FiMinus,
  FiPlus,
  FiTrash2,
  FiShoppingBag,
  FiMapPin,
  FiClock,
  FiTruck,
  FiPercent,
  FiGift,
  FiCreditCard,
  FiCheck,
  FiX,
  FiHeart,
  FiEdit,
  FiArrowRight
} from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../api';

const Cart = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const { 
    cartItems, 
    updateQuantity, 
    removeFromCart, 
    clearCart,
    getCartTotal,
    getCartCount
  } = useCart();
  
  const [loading, setLoading] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [savedAddresses, setSavedAddresses] = useState([]);

  useEffect(() => {
    if (user) {
      fetchSavedAddresses();
      calculateDeliveryFee();
    }
  }, [user]);

  useEffect(() => {
    calculateDeliveryFee();
  }, [cartItems]);

  const fetchSavedAddresses = async () => {
    try {
  const response = await api.get('/users/addresses');
      setSavedAddresses(response.data.addresses || []);
      if (response.data.addresses?.length > 0 && !deliveryAddress) {
        setDeliveryAddress(response.data.addresses[0].address);
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
    }
  };

  const calculateDeliveryFee = () => {
    // Calculate delivery fee based on cart items and vendors
    const vendors = [...new Set(cartItems.map(item => item.vendor_id || item.shop_id))];
    const baseFee = vendors.length * 50; // 50 BDT per vendor
    setDeliveryFee(baseFee);
  };

  const applyPromoCode = async () => {
    if (!promoCode.trim()) return;
    
    try {
  const response = await api.post('/cart/apply-promo', {
        promo_code: promoCode,
        cart_total: getCartTotal()
      });
      
      setPromoDiscount(response.data.discount || 0);
      showNotification('Promo code applied successfully!', 'success');
    } catch (error) {
      console.error('Error applying promo code:', error);
      showNotification('Invalid promo code', 'error');
    }
  };

  const saveAddress = async () => {
    if (!deliveryAddress.trim()) return;
    
    try {
  await api.post('/users/addresses', { address: deliveryAddress });
      await fetchSavedAddresses();
      showNotification('Address saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving address:', error);
      showNotification('Error saving address', 'error');
    }
  };

  const proceedToCheckout = async () => {
    if (!user) {
      navigate('/login', { state: { from: '/cart' } });
      return;
    }

    if (cartItems.length === 0) {
      showNotification('Your cart is empty', 'error');
      return;
    }

    if (!deliveryAddress.trim()) {
      showNotification('Please enter a delivery address', 'error');
      return;
    }

    try {
      setCheckingOut(true);
      
      const orderData = {
        items: cartItems,
        delivery_address: deliveryAddress,
        delivery_instructions: deliveryInstructions,
        payment_method: paymentMethod,
        promo_code: promoCode,
        promo_discount: promoDiscount,
        delivery_fee: deliveryFee,
        total_amount: getCartTotal() + deliveryFee - promoDiscount
      };

  const response = await api.post('/orders/create', orderData);
      
      clearCart();
      showNotification('Order placed successfully!', 'success');
      navigate(`/orders/${response.data.order.id}`);
      
    } catch (error) {
      console.error('Error creating order:', error);
      showNotification('Error placing order', 'error');
    } finally {
      setCheckingOut(false);
    }
  };

  const CartItemCard = ({ item }) => {
    return (
      <div className="card p-4 mb-4">
        <div className="flex items-center space-x-4">
          <img
            src={item.image || '/placeholder/80/80'}
            alt={item.name}
            className="w-20 h-20 object-cover rounded-lg"
          />
          
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900">{item.name}</h4>
            <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
            
            <div className="flex items-center mt-2 space-x-4">
              <span className="text-lg font-bold text-green-600">
                ৳{item.price?.toLocaleString()}
              </span>
              
              {item.original_price && item.original_price > item.price && (
                <span className="text-sm text-gray-500 line-through">
                  ৳{item.original_price?.toLocaleString()}
                </span>
              )}
              
              <span className="text-xs text-gray-500">
                From: {item.vendor_name || item.shop_name}
              </span>
            </div>
          </div>
          
          <div className="flex flex-col items-end space-y-2">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
              >
                <FiMinus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center font-medium">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors"
              >
                <FiPlus className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  // Move to wishlist logic here
                  showNotification('Added to wishlist', 'success');
                }}
                className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                title="Move to wishlist"
              >
                <FiHeart className="w-4 h-4" />
              </button>
              <button
                onClick={() => removeFromCart(item.id)}
                className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                title="Remove from cart"
              >
                <FiTrash2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="text-right">
              <div className="font-bold text-gray-900">
                ৳{(item.price * item.quantity).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const subtotal = getCartTotal();
  const total = subtotal + deliveryFee - promoDiscount;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <FiShoppingCart className="w-8 h-8 mr-3" />
                  Shopping Cart
                  {getCartCount() > 0 && (
                    <span className="ml-3 bg-blue-500 text-white text-sm font-medium px-2 py-1 rounded-full">
                      {getCartCount()} items
                    </span>
                  )}
                </h1>
                <p className="text-gray-600 mt-1">
                  Review your items and proceed to checkout
                </p>
              </div>
              <button
                onClick={() => navigate('/dashboard')}
                className="btn btn-outline"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {cartItems.length === 0 ? (
          <div className="text-center py-12">
            <FiShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
            <p className="text-gray-600 mb-4">
              Add some items to your cart to get started
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn btn-primary"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Cart Items ({getCartCount()})
                  </h2>
                  <button
                    onClick={clearCart}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Clear All
                  </button>
                </div>
                
                <div className="space-y-4">
                  {cartItems.map(item => (
                    <CartItemCard key={item.id} item={item} />
                  ))}
                </div>
              </div>

              {/* Delivery Address */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FiMapPin className="w-5 h-5 mr-2" />
                  Delivery Address
                </h3>
                
                {savedAddresses.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Saved Addresses
                    </label>
                    <div className="space-y-2">
                      {savedAddresses.map((addr, index) => (
                        <button
                          key={index}
                          onClick={() => setDeliveryAddress(addr.address)}
                          className={`w-full p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors ${
                            deliveryAddress === addr.address ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                          }`}
                        >
                          <div className="text-sm font-medium text-gray-900">{addr.label || 'Address'}</div>
                          <div className="text-xs text-gray-600">{addr.address}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Delivery Address *
                    </label>
                    <textarea
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      rows={3}
                      className="form-input w-full"
                      placeholder="Enter your full delivery address..."
                      required
                    />
                    <button
                      onClick={saveAddress}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                    >
                      Save this address
                    </button>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Delivery Instructions (Optional)
                    </label>
                    <input
                      type="text"
                      value={deliveryInstructions}
                      onChange={(e) => setDeliveryInstructions(e.target.value)}
                      className="form-input w-full"
                      placeholder="e.g., Call when you arrive, Leave at door..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">৳{subtotal.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delivery Fee</span>
                    <span className="font-medium">৳{deliveryFee.toLocaleString()}</span>
                  </div>
                  
                  {promoDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Promo Discount</span>
                      <span className="font-medium">-৳{promoDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  
                  <div className="border-t pt-3">
                    <div className="flex justify-between">
                      <span className="text-lg font-semibold text-gray-900">Total</span>
                      <span className="text-lg font-bold text-green-600">
                        ৳{total.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Promo Code */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Promo Code
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      className="form-input flex-1"
                      placeholder="Enter promo code"
                    />
                    <button
                      onClick={applyPromoCode}
                      className="btn btn-outline btn-sm"
                    >
                      Apply
                    </button>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="cash"
                        checked={paymentMethod === 'cash'}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="mr-2"
                      />
                      Cash on Delivery
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="online"
                        checked={paymentMethod === 'online'}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="mr-2"
                      />
                      Online Payment
                    </label>
                  </div>
                </div>

                {/* Estimated Delivery */}
                <div className="mb-6 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center text-sm text-gray-600">
                    <FiClock className="w-4 h-4 mr-2" />
                    Estimated delivery: 30-45 minutes
                  </div>
                </div>

                {/* Checkout Button */}
                <button
                  onClick={proceedToCheckout}
                  disabled={checkingOut || !deliveryAddress.trim()}
                  className="w-full btn btn-primary btn-lg flex items-center justify-center"
                >
                  {checkingOut ? (
                    'Processing...'
                  ) : (
                    <>
                      <FiShoppingBag className="w-5 h-5 mr-2" />
                      Place Order
                      <FiArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </button>

                <p className="text-xs text-gray-500 text-center mt-4">
                  By placing your order, you agree to our Terms of Service and Privacy Policy.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
