import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiSearch, 
  FiFilter, 
  FiMapPin, 
  FiClock, 
  FiStar,
  FiPhone,
  FiMail,
  FiExternalLink,
  FiHeart,
  FiShoppingCart,
  FiTruck
} from 'react-icons/fi';
import { api } from '../utils/api';
import { useNotification } from '../context/NotificationContext';

const BusinessMarketplace = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [sortBy, setSortBy] = useState('rating');
  const [showFilters, setShowFilters] = useState(false);

  const categories = [
    { id: 'all', name: 'All Categories', count: 0 },
    { id: 'food', name: 'Food & Restaurants', count: 0 },
    { id: 'grocery', name: 'Grocery & Essentials', count: 0 },
    { id: 'pharmacy', name: 'Pharmacy & Health', count: 0 },
    { id: 'electronics', name: 'Electronics & Gadgets', count: 0 },
    { id: 'clothing', name: 'Clothing & Fashion', count: 0 },
    { id: 'books', name: 'Books & Stationery', count: 0 },
    { id: 'services', name: 'Services', count: 0 },
    { id: 'others', name: 'Others', count: 0 }
  ];

  const locations = [
    { id: 'all', name: 'All Locations' },
    { id: 'campus', name: 'On Campus' },
    { id: 'nearby', name: 'Near Campus' },
    { id: 'dhaka', name: 'Dhaka City' }
  ];

  const sortOptions = [
    { id: 'rating', name: 'Highest Rated' },
    { id: 'delivery_time', name: 'Fastest Delivery' },
    { id: 'popularity', name: 'Most Popular' },
    { id: 'newest', name: 'Newest First' }
  ];

  useEffect(() => {
    fetchBusinesses();
  }, [selectedCategory, selectedLocation, sortBy]);

  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        category: selectedCategory !== 'all' ? selectedCategory : '',
        location: selectedLocation !== 'all' ? selectedLocation : '',
        sort: sortBy,
        search: searchTerm
      });

      const response = await api.get(`/api/businesses?${params}`);
      setBusinesses(response.data.businesses || []);
    } catch (error) {
      console.error('Error fetching businesses:', error);
      showNotification('Error loading businesses', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchBusinesses();
  };

  const toggleFavorite = async (businessId) => {
    try {
      await api.post(`/api/businesses/${businessId}/favorite`);
      showNotification('Added to favorites', 'success');
      // Update local state
      setBusinesses(businesses.map(business => 
        business.id === businessId 
          ? { ...business, isFavorite: !business.isFavorite }
          : business
      ));
    } catch (error) {
      console.error('Error toggling favorite:', error);
      showNotification('Error updating favorites', 'error');
    }
  };

  const BusinessCard = ({ business }) => (
    <div className="card hover:shadow-xl transition-all duration-300 cursor-pointer group">
      <div className="relative">
        <img
          src={business.image || '/api/placeholder/400/200'}
          alt={business.name}
          className="w-full h-48 object-cover"
        />
        <div className="absolute top-3 right-3 flex space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(business.id);
            }}
            className={`p-2 rounded-full transition-colors ${
              business.isFavorite 
                ? 'bg-red-500 text-white' 
                : 'bg-white text-gray-600 hover:text-red-500'
            }`}
          >
            <FiHeart className="w-4 h-4" fill={business.isFavorite ? 'currentColor' : 'none'} />
          </button>
        </div>
        {business.isOpen ? (
          <div className="absolute bottom-3 left-3 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
            Open Now
          </div>
        ) : (
          <div className="absolute bottom-3 left-3 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">
            Closed
          </div>
        )}
      </div>
      
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
            {business.name}
          </h3>
          <div className="flex items-center space-x-1">
            <FiStar className="w-4 h-4 text-yellow-500 fill-current" />
            <span className="text-sm font-medium">{business.rating || '4.5'}</span>
            <span className="text-xs text-gray-500">({business.reviewCount || '50+'})</span>
          </div>
        </div>
        
        <p className="text-sm text-gray-600 mb-3">{business.description}</p>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-xs text-gray-500">
            <FiMapPin className="w-3 h-3 mr-1" />
            {business.location || 'Location not specified'}
          </div>
          <div className="flex items-center text-xs text-gray-500">
            <FiClock className="w-3 h-3 mr-1" />
            {business.deliveryTime || '30-45'} mins delivery
          </div>
          <div className="flex items-center text-xs text-gray-500">
            <FiTruck className="w-3 h-3 mr-1" />
            Free delivery on orders above ৳{business.minOrderForFreeDelivery || '200'}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            <span className="badge badge-primary">{business.category}</span>
            {business.isVerified && (
              <span className="badge badge-success">Verified</span>
            )}
          </div>
          <div className="flex space-x-2">
            {business.phone && (
              <button className="p-1 text-gray-400 hover:text-blue-600">
                <FiPhone className="w-4 h-4" />
              </button>
            )}
            {business.email && (
              <button className="p-1 text-gray-400 hover:text-blue-600">
                <FiMail className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => navigate(`/business/${business.id}`)}
              className="p-1 text-gray-400 hover:text-blue-600"
            >
              <FiExternalLink className="w-4 h-4" />
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
          <div className="py-6">
            <h1 className="text-2xl font-bold text-gray-900">Business Marketplace</h1>
            <p className="text-gray-600 mt-1">
              Discover local businesses, restaurants, and services around campus
            </p>
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
                  placeholder="Search businesses, restaurants, services..."
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
            <div className="mt-6 pt-6 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="form-label">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="form-input w-full"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Location</label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="form-input w-full"
                >
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
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
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        ) : businesses.length > 0 ? (
          <>
            <div className="flex justify-between items-center mb-6">
              <p className="text-gray-600">
                Found {businesses.length} businesses
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {businesses.map((business) => (
                <BusinessCard key={business.id} business={business} />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <FiShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No businesses found</h3>
            <p className="text-gray-500">
              Try adjusting your search criteria or browse all categories
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessMarketplace;
