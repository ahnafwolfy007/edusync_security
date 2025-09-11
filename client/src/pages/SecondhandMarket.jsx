import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiSearch, 
  FiFilter, 
  FiMapPin, 
  FiClock, 
  FiHeart,
  FiMessageCircle,
  FiEye,
  FiPlus,
  FiGrid,
  FiList,
  FiTrendingUp,
  FiShoppingBag
} from 'react-icons/fi';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

const SecondhandMarket = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCondition, setSelectedCondition] = useState('all');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [showFilters, setShowFilters] = useState(false);

  const categories = [
    { id: 'all', name: 'All Categories', icon: '🛍️' },
    { id: 'electronics', name: 'Electronics', icon: '📱' },
    { id: 'books', name: 'Books & Study Materials', icon: '📚' },
    { id: 'clothing', name: 'Clothing & Fashion', icon: '👕' },
    { id: 'furniture', name: 'Furniture', icon: '🪑' },
    { id: 'sports', name: 'Sports & Fitness', icon: '⚽' },
    { id: 'bikes', name: 'Bikes & Vehicles', icon: '🚲' },
    { id: 'appliances', name: 'Home Appliances', icon: '🏠' },
    { id: 'musical', name: 'Musical Instruments', icon: '🎸' },
    { id: 'others', name: 'Others', icon: '📦' }
  ];

  const conditions = [
    { id: 'all', name: 'All Conditions' },
    { id: 'excellent', name: 'Excellent' },
    { id: 'good', name: 'Good' },
    { id: 'fair', name: 'Fair' },
    { id: 'poor', name: 'Poor' }
  ];

  const sortOptions = [
    { id: 'newest', name: 'Newest First' },
    { id: 'oldest', name: 'Oldest First' },
    { id: 'price_low', name: 'Price: Low to High' },
    { id: 'price_high', name: 'Price: High to Low' },
    { id: 'popular', name: 'Most Popular' }
  ];

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, selectedCondition, sortBy]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        category: selectedCategory !== 'all' ? selectedCategory : '',
        condition: selectedCondition !== 'all' ? selectedCondition : '',
        sort: sortBy,
        search: searchTerm,
        ...(priceRange.min && { minPrice: priceRange.min }),
        ...(priceRange.max && { maxPrice: priceRange.max })
      });

  const response = await api.get(`/secondhand?${params}`);
  // Backend typically responds with { success, data: [...] }
  const items = response?.data?.data ?? response?.data?.products ?? [];
  setProducts(items);
    } catch (error) {
      console.error('Error fetching products:', error);
      showNotification('Error loading products', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchProducts();
  };

  const toggleFavorite = async (productId) => {
    // No backend endpoint yet; optimistically toggle locally
    try {
      setProducts(products.map(product =>
        product.id === productId
          ? { ...product, isFavorite: !product.isFavorite }
          : product
      ));
      showNotification('Favorites updated', 'success');
    } catch (error) {
      console.error('Error toggling favorite:', error);
      showNotification('Error updating favorites', 'error');
    }
  };

  const getConditionBadge = (condition) => {
    const badgeClasses = {
      excellent: 'badge-success',
      good: 'badge-primary',
      fair: 'badge-warning',
      poor: 'badge-danger'
    };
    return badgeClasses[condition] || 'badge-secondary';
  };

  const ProductCard = ({ product }) => (
    <div className="card hover:shadow-xl transition-all duration-300 cursor-pointer group">
      <div className="relative">
        <img
          src={product.images?.[0] || '/placeholder/400/300'}
          alt={product.title}
          className="w-full h-48 object-cover"
          onClick={() => navigate(`/product/${product.id}`)}
        />
        <div className="absolute top-3 right-3 flex space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(product.id);
            }}
            className={`p-2 rounded-full transition-colors ${
              product.isFavorite 
                ? 'bg-red-500 text-white' 
                : 'bg-white text-gray-600 hover:text-red-500'
            }`}
          >
            <FiHeart className="w-4 h-4" fill={product.isFavorite ? 'currentColor' : 'none'} />
          </button>
        </div>
        <div className="absolute bottom-3 left-3">
          <span className={`badge ${getConditionBadge(product.condition)}`}>
            {product.condition}
          </span>
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 
            className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors cursor-pointer"
            onClick={() => navigate(`/product/${product.id}`)}
          >
            {product.title}
          </h3>
          <span className="text-lg font-bold text-blue-600">
            ৳{product.price?.toLocaleString()}
          </span>
        </div>
        
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.description}</p>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-xs text-gray-500">
            <FiMapPin className="w-3 h-3 mr-1" />
            {product.location || 'Location not specified'}
          </div>
          <div className="flex items-center text-xs text-gray-500">
            <FiClock className="w-3 h-3 mr-1" />
            Posted {product.timeAgo || '2 hours ago'}
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center">
              <FiEye className="w-3 h-3 mr-1" />
              {product.views || 0} views
            </span>
            <span className="flex items-center">
              <FiMessageCircle className="w-3 h-3 mr-1" />
              {product.inquiries || 0} inquiries
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img
              src={product.seller?.avatar || '/placeholder/32/32'}
              alt={product.seller?.name}
              className="w-6 h-6 rounded-full"
            />
            <span className="text-sm text-gray-600">{product.seller?.name}</span>
            {product.seller?.isVerified && (
              <span className="badge badge-success text-xs">Verified</span>
            )}
          </div>
          <button
            onClick={() => navigate(`/chat/${product.seller?.id}`)}
            className="btn btn-sm btn-outline"
          >
            <FiMessageCircle className="w-4 h-4 mr-1" />
            Chat
          </button>
        </div>
      </div>
    </div>
  );

  const ProductListItem = ({ product }) => (
    <div className="card hover:shadow-lg transition-all duration-300 cursor-pointer">
      <div className="p-4 flex space-x-4">
        <img
          src={product.images?.[0] || '/placeholder/150/150'}
          alt={product.title}
          className="w-24 h-24 object-cover rounded-lg"
          onClick={() => navigate(`/product/${product.id}`)}
        />
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-2">
            <h3 
              className="font-semibold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer"
              onClick={() => navigate(`/product/${product.id}`)}
            >
              {product.title}
            </h3>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold text-blue-600">
                ৳{product.price?.toLocaleString()}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(product.id);
                }}
                className={`p-1 rounded-full transition-colors ${
                  product.isFavorite 
                    ? 'text-red-500' 
                    : 'text-gray-400 hover:text-red-500'
                }`}
              >
                <FiHeart className="w-4 h-4" fill={product.isFavorite ? 'currentColor' : 'none'} />
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{product.description}</p>
          <div className="flex items-center space-x-4 text-xs text-gray-500 mb-2">
            <span className="flex items-center">
              <FiMapPin className="w-3 h-3 mr-1" />
              {product.location}
            </span>
            <span className="flex items-center">
              <FiClock className="w-3 h-3 mr-1" />
              {product.timeAgo}
            </span>
            <span className={`badge ${getConditionBadge(product.condition)}`}>
              {product.condition}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <img
                src={product.seller?.avatar || '/placeholder/24/24'}
                alt={product.seller?.name}
                className="w-5 h-5 rounded-full"
              />
              <span className="text-sm text-gray-600">{product.seller?.name}</span>
            </div>
            <button
              onClick={() => navigate(`/chat/${product.seller?.id}`)}
              className="btn btn-sm btn-outline"
            >
              <FiMessageCircle className="w-4 h-4 mr-1" />
              Chat
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Secondhand Market</h1>
              <p className="text-gray-600 mt-1">
                Buy and sell used items within the campus community
              </p>
            </div>
            <button
              onClick={() => navigate('/sell-item')}
              className="btn btn-primary flex items-center"
            >
              <FiPlus className="w-4 h-4 mr-2" />
              Sell Item
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search items, brands, keywords..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input pl-10 w-full"
                />
              </div>
            </div>
            <button
              type="submit"
              className="btn btn-primary px-6"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="btn btn-outline px-6 flex items-center"
            >
              <FiFilter className="w-4 h-4 mr-2" />
              Filters
            </button>
          </form>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="form-label">Condition</label>
                <select
                  value={selectedCondition}
                  onChange={(e) => setSelectedCondition(e.target.value)}
                  className="form-input w-full"
                >
                  {conditions.map((condition) => (
                    <option key={condition.id} value={condition.id}>
                      {condition.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Min Price (৳)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={priceRange.min}
                  onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                  className="form-input w-full"
                />
              </div>
              <div>
                <label className="form-label">Max Price (৳)</label>
                <input
                  type="number"
                  placeholder="No limit"
                  value={priceRange.max}
                  onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                  className="form-input w-full"
                />
              </div>
              <div>
                <label className="form-label">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="form-input w-full"
                >
                  {sortOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Category Tabs */}
        <div className="mb-8">
          <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border'
                }`}
              >
                <span className="mr-2">{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* View Mode Toggle and Results Count */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600">
            {loading ? 'Loading...' : `Found ${products.length} items`}
          </p>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
            >
              <FiGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
            >
              <FiList className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {[...Array(9)].map((_, i) => (
              <div key={i} className="card">
                <div className="skeleton h-48 w-full"></div>
                <div className="p-4 space-y-3">
                  <div className="skeleton h-4 w-3/4"></div>
                  <div className="skeleton h-3 w-full"></div>
                  <div className="skeleton h-3 w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {products.map((product) => (
                <ProductListItem key={product.id} product={product} />
              ))}
            </div>
          )
        ) : (
          <div className="text-center py-12">
            <FiShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
            <p className="text-gray-500">
              Try adjusting your search criteria or browse all categories
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecondhandMarket;
