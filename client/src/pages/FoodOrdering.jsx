import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiClock,
  FiMapPin,
  FiStar,
  FiSearch,
  FiFilter,
  FiHeart,
  FiShoppingCart,
  FiTruck,
  FiDollarSign,
  FiPercent,
  FiPhone,
  FiInfo,
  FiAward,
  FiUsers,
  FiTrendingUp
} from 'react-icons/fi';
import { FaUtensils } from 'react-icons/fa';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import { useCart } from '../context/CartContext';

const FoodOrdering = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { addToCart, cartItems } = useCart();
  const [restaurants, setRestaurants] = useState([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [selectedSort, setSelectedSort] = useState('popular');

  const cuisines = [
    { id: 'all', name: 'All Cuisines' },
    { id: 'bengali', name: 'Bengali' },
    { id: 'indian', name: 'Indian' },
    { id: 'chinese', name: 'Chinese' },
    { id: 'thai', name: 'Thai' },
    { id: 'fast_food', name: 'Fast Food' },
    { id: 'pizza', name: 'Pizza' },
    { id: 'burger', name: 'Burger' },
    { id: 'dessert', name: 'Dessert' },
    { id: 'beverages', name: 'Beverages' }
  ];

  const locations = [
    'Dhanmondi', 'Gulshan', 'Banani', 'Uttara', 'Mirpur', 'Wari', 'Old Dhaka', 'Bashundhara'
  ];

  const sortOptions = [
    { id: 'popular', name: 'Most Popular' },
    { id: 'rating', name: 'Highest Rated' },
    { id: 'delivery_time', name: 'Fastest Delivery' },
    { id: 'distance', name: 'Nearest First' },
    { id: 'cost_low', name: 'Cost: Low to High' },
    { id: 'cost_high', name: 'Cost: High to Low' }
  ];

  useEffect(() => {
    fetchRestaurants();
    fetchFavorites();
  }, []);

  useEffect(() => {
    filterRestaurants();
  }, [restaurants, searchTerm, selectedCuisine, selectedLocation, selectedSort]);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
  const response = await api.get('/food-ordering/restaurants');
      setRestaurants(response.data.restaurants || []);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      showNotification('Error loading restaurants', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    try {
  const response = await api.get('/food-ordering/favorites');
      setFavorites(response.data.favorites?.map(f => f.restaurant_id) || []);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const filterRestaurants = () => {
    let filtered = restaurants;

    if (searchTerm) {
      filtered = filtered.filter(restaurant =>
        restaurant.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        restaurant.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        restaurant.cuisine_type?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCuisine !== 'all') {
      filtered = filtered.filter(restaurant => 
        restaurant.cuisine_type?.toLowerCase() === selectedCuisine.toLowerCase()
      );
    }

    if (selectedLocation) {
      filtered = filtered.filter(restaurant => 
        restaurant.location?.toLowerCase().includes(selectedLocation.toLowerCase())
      );
    }

    // Sort restaurants
    filtered.sort((a, b) => {
      switch (selectedSort) {
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'delivery_time':
          return (a.delivery_time || 999) - (b.delivery_time || 999);
        case 'cost_low':
          return (a.average_cost || 0) - (b.average_cost || 0);
        case 'cost_high':
          return (b.average_cost || 0) - (a.average_cost || 0);
        case 'distance':
          return (a.distance || 999) - (b.distance || 999);
        default: // popular
          return (b.order_count || 0) - (a.order_count || 0);
      }
    });

    setFilteredRestaurants(filtered);
  };

  const toggleFavorite = async (restaurantId) => {
    try {
      const isFavorite = favorites.includes(restaurantId);
      if (isFavorite) {
        await api.delete(`/api/food-ordering/favorites/${restaurantId}`);
        setFavorites(favorites.filter(id => id !== restaurantId));
        showNotification('Removed from favorites', 'success');
      } else {
  await api.post('/food-ordering/favorites', { restaurant_id: restaurantId });
        setFavorites([...favorites, restaurantId]);
        showNotification('Added to favorites', 'success');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      showNotification('Error updating favorites', 'error');
    }
  };

  const RestaurantCard = ({ restaurant }) => {
    const isFavorite = favorites.includes(restaurant.id);
    const isOpen = restaurant.is_open && restaurant.operating_hours;
    
    return (
      <div className="card hover:shadow-lg transition-all duration-300 cursor-pointer group">
        <div className="relative">
          <img
            src={restaurant.image || '/placeholder/400/250'}
            alt={restaurant.name}
            className="w-full h-48 object-cover rounded-t-lg"
            onClick={() => navigate(`/food-ordering/${restaurant.id}`)}
          />
          <div className="absolute top-2 right-2 flex space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(restaurant.id);
              }}
              className={`p-2 rounded-full ${
                isFavorite ? 'bg-red-500 text-white' : 'bg-white text-gray-600'
              } hover:scale-110 transition-transform`}
            >
              <FiHeart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
          </div>
          
          {/* Status Badges */}
          <div className="absolute top-2 left-2 flex flex-col space-y-1">
            <span className={`${isOpen ? 'bg-green-500' : 'bg-red-500'} text-white text-xs font-medium px-2 py-1 rounded-full`}>
              {isOpen ? 'OPEN' : 'CLOSED'}
            </span>
            {restaurant.is_featured && (
              <span className="bg-yellow-500 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center">
                <FiAward className="w-3 h-3 mr-1" />
                Featured
              </span>
            )}
          </div>

          {/* Discount Badge */}
          {restaurant.discount_percentage && (
            <div className="absolute bottom-2 left-2">
              <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center">
                <FiPercent className="w-3 h-3 mr-1" />
                {restaurant.discount_percentage}% OFF
              </span>
            </div>
          )}
        </div>
        
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 
              className="font-semibold text-gray-900 text-lg group-hover:text-blue-600 transition-colors line-clamp-1"
              onClick={() => navigate(`/food-ordering/${restaurant.id}`)}
            >
              {restaurant.name}
            </h3>
            <div className="flex items-center">
              <FiStar className="w-4 h-4 text-yellow-500 mr-1" />
              <span className="text-sm font-medium">
                {restaurant.rating ? restaurant.rating.toFixed(1) : 'New'}
              </span>
              {restaurant.review_count && (
                <span className="text-xs text-gray-500 ml-1">
                  ({restaurant.review_count})
                </span>
              )}
            </div>
          </div>
          
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {restaurant.description}
          </p>
          
          <div className="flex items-center text-gray-500 text-sm mb-3">
            <FiMapPin className="w-4 h-4 mr-1" />
            <span className="mr-3">{restaurant.location}</span>
            {restaurant.distance && (
              <>
                <span className="mr-1">•</span>
                <span>{restaurant.distance} km</span>
              </>
            )}
          </div>
          
          {/* Restaurant Info Row */}
          <div className="flex items-center justify-between text-sm mb-4">
            <div className="flex items-center text-gray-600">
              <FiClock className="w-4 h-4 mr-1" />
              <span>{restaurant.delivery_time || '30-45'} min</span>
            </div>
            <div className="flex items-center text-gray-600">
              <FiDollarSign className="w-4 h-4 mr-1" />
              <span>৳{restaurant.average_cost || 200} for two</span>
            </div>
            <div className="flex items-center text-gray-600">
              <FiTruck className="w-4 h-4 mr-1" />
              <span>৳{restaurant.delivery_fee || 0}</span>
            </div>
          </div>
          
          {/* Cuisine Tags */}
          <div className="flex flex-wrap gap-1 mb-4">
            {restaurant.cuisine_type && (
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                {restaurant.cuisine_type.charAt(0).toUpperCase() + restaurant.cuisine_type.slice(1)}
              </span>
            )}
            {restaurant.specialty_items && restaurant.specialty_items.slice(0, 2).map((item, index) => (
              <span key={index} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
                {item}
              </span>
            ))}
          </div>
          
          {/* Popular Items */}
          {restaurant.popular_items && restaurant.popular_items.length > 0 && (
            <div className="mb-4">
              <div className="text-xs text-gray-500 mb-1">Popular:</div>
              <div className="text-sm text-gray-700 line-clamp-1">
                {restaurant.popular_items.slice(0, 3).join(', ')}
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {restaurant.name?.charAt(0)}
              </div>
              <div className="ml-2">
                <div className="text-sm font-medium text-gray-900">
                  {restaurant.owner_name || 'Restaurant Owner'}
                </div>
                <div className="flex items-center text-xs text-gray-600">
                  <FiUsers className="w-3 h-3 mr-1" />
                  <span>{restaurant.order_count || 0} orders</span>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-2">
              {restaurant.phone && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(`tel:${restaurant.phone}`, '_self');
                  }}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                  title="Call Restaurant"
                >
                  <FiPhone className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/food-ordering/${restaurant.id}`);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isOpen 
                    ? 'bg-orange-600 text-white hover:bg-orange-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                disabled={!isOpen}
              >
                {isOpen ? 'Order Now' : 'Closed'}
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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Food Ordering</h1>
                <p className="text-gray-600 mt-1">
                  Delicious food delivered to your doorstep
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/cart')}
                  className="btn btn-outline flex items-center relative"
                >
                  <FiShoppingCart className="w-4 h-4 mr-2" />
                  Cart
                  {cartItems.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => navigate('/orders')}
                  className="btn btn-primary"
                >
                  My Orders
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search restaurants or dishes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input w-full pl-10"
              />
            </div>
            
            <select
              value={selectedCuisine}
              onChange={(e) => setSelectedCuisine(e.target.value)}
              className="form-input w-full"
            >
              {cuisines.map(cuisine => (
                <option key={cuisine.id} value={cuisine.id}>{cuisine.name}</option>
              ))}
            </select>
            
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="form-input w-full"
            >
              <option value="">All Areas</option>
              {locations.map(location => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
            
            <select
              value={selectedSort}
              onChange={(e) => setSelectedSort(e.target.value)}
              className="form-input w-full"
            >
              {sortOptions.map(option => (
                <option key={option.id} value={option.id}>{option.name}</option>
              ))}
            </select>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2">
            <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors">
              Fast Delivery
            </button>
            <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors">
              Free Delivery
            </button>
            <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors">
              Highly Rated
            </button>
            <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors">
              New Restaurants
            </button>
            <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors">
              Offers Available
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-gray-600">
            {loading ? 'Loading...' : `${filteredRestaurants.length} restaurants found`}
          </div>
          <div className="text-sm text-gray-500">
            Delivering to your location
          </div>
        </div>

        {/* Restaurants Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="card animate-pulse">
                <div className="h-48 bg-gray-200 rounded-t-lg"></div>
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredRestaurants.length === 0 ? (
          <div className="text-center py-12">
            <FaUtensils className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No restaurants found</h3>
            <p className="text-gray-600 mb-4">
              Try adjusting your search criteria or browse all restaurants
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCuisine('all');
                setSelectedLocation('');
              }}
              className="btn btn-outline"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRestaurants.map(restaurant => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FoodOrdering;
