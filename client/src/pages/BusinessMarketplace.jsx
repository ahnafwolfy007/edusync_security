import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiSearch, 
  FiFilter, 
  FiMapPin, 
  FiClock, 
  FiStar,
  FiPhone,
  FiExternalLink,
  FiHeart,
  FiShoppingCart,
  FiTruck,
  FiPackage,
  FiTrendingUp,
  FiUsers,
  FiGrid,
  FiList
} from 'react-icons/fi';
import api from '../api';
import { useNotification } from '../context/NotificationContext';

const BusinessMarketplace = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [businesses, setBusinesses] = useState([]);
  const [businessTypes, setBusinessTypes] = useState([]);
  const [trendingBusinesses, setTrendingBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});

  const sortOptions = [
    { id: 'created_at', name: 'Newest First', order: 'DESC' },
    { id: 'business_name', name: 'Name A-Z', order: 'ASC' },
    { id: 'avg_rating', name: 'Highest Rated', order: 'DESC' },
    { id: 'order_count', name: 'Most Popular', order: 'DESC' },
    { id: 'product_count', name: 'Most Products', order: 'DESC' }
  ];

  useEffect(() => {
    fetchBusinesses();
    fetchBusinessTypes();
    fetchTrendingBusinesses();
  }, [selectedType, sortBy, sortOrder, currentPage]);

  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        businessType: selectedType,
        search: searchTerm,
        sortBy,
        sortOrder,
        page: currentPage,
        limit: 12
      });

  const response = await api.get(`/business-marketplace/shops?${params}`);
      const payload = response.data?.data || response.data;
      setBusinesses(payload.businesses || []);
      setPagination(payload.pagination || {});
    } catch (error) {
      console.error('Error fetching businesses:', error);
      showNotification('Error loading businesses', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchBusinessTypes = async () => {
    try {
  const response = await api.get('/business-marketplace/types');
      const payload = response.data?.data || response.data;
      setBusinessTypes(payload.businessTypes || []);
    } catch (error) {
      console.error('Error fetching business types:', error);
    }
  };

  const fetchTrendingBusinesses = async () => {
    try {
  const response = await api.get('/business-marketplace/trending?limit=6');
      const payload = response.data?.data || response.data;
      setTrendingBusinesses(payload.businesses || []);
    } catch (error) {
      console.error('Error fetching trending businesses:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchBusinesses();
  };

  const handleSortChange = (option) => {
    setSortBy(option.id);
    setSortOrder(option.order);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const BusinessCard = ({ business, isCompact = false }) => (
    <div 
      className="card hover:shadow-xl transition-all duration-300 cursor-pointer group bg-white"
      onClick={() => navigate(`/business-marketplace/shops/${business.business_id}`)}
    >
      <div className="relative">
        <img
          src={business.image || '/placeholder/400/200'}
          alt={business.business_name}
          className={`w-full ${isCompact ? 'h-32' : 'h-48'} object-cover`}
        />
        <div className="absolute top-3 right-3 flex space-x-2">
          {business.is_verified && (
            <div className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
              ✓ Verified
            </div>
          )}
        </div>
        {business.product_count > 0 && (
          <div className="absolute bottom-3 left-3 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium">
            {business.product_count} Products
          </div>
        )}
      </div>
      
      <div className={`p-${isCompact ? '3' : '4'}`}>
        <div className="flex justify-between items-start mb-2">
          <h3 className={`font-semibold text-gray-900 group-hover:text-blue-600 transition-colors ${isCompact ? 'text-sm' : 'text-base'}`}>
            {business.business_name}
          </h3>
          <div className="flex items-center space-x-1">
            <FiStar className="w-4 h-4 text-yellow-500 fill-current" />
            <span className="text-sm font-medium">
              {business.avg_rating ? parseFloat(business.avg_rating).toFixed(1) : 'New'}
            </span>
            {business.review_count > 0 && (
              <span className="text-xs text-gray-500">({business.review_count})</span>
            )}
          </div>
        </div>
        
        <p className={`text-gray-600 mb-3 ${isCompact ? 'text-xs' : 'text-sm'}`}>
          {business.description || 'No description available'}
        </p>
        
        <div className="space-y-1 mb-3">
          <div className="flex items-center text-xs text-gray-500">
            <FiPackage className="w-3 h-3 mr-1" />
            {business.business_type}
          </div>
          {business.order_count > 0 && (
            <div className="flex items-center text-xs text-gray-500">
              <FiUsers className="w-3 h-3 mr-1" />
              {business.order_count} orders completed
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <span className="badge badge-primary text-xs">
            {business.business_type}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/business-marketplace/shops/${business.business_id}`);
            }}
            className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center"
          >
            View Shop
            <FiExternalLink className="w-3 h-3 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );

  const BusinessListItem = ({ business }) => (
    <div 
      className="card p-4 hover:shadow-lg transition-all duration-300 cursor-pointer group bg-white"
      onClick={() => navigate(`/business-marketplace/shops/${business.business_id}`)}
    >
      <div className="flex space-x-4">
        <img
          src={business.image || '/placeholder/200/150'}
          alt={business.business_name}
          className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
              {business.business_name}
            </h3>
            <div className="flex items-center space-x-1 ml-2">
              <FiStar className="w-4 h-4 text-yellow-500 fill-current" />
              <span className="text-sm font-medium">
                {business.avg_rating ? parseFloat(business.avg_rating).toFixed(1) : 'New'}
              </span>
            </div>
          </div>
          
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
            {business.description || 'No description available'}
          </p>
          
          <div className="flex items-center space-x-4 text-xs text-gray-500 mb-2">
            <div className="flex items-center">
              <FiPackage className="w-3 h-3 mr-1" />
              {business.business_type}
            </div>
            <div className="flex items-center">
              <FiPackage className="w-3 h-3 mr-1" />
              {business.product_count} products
            </div>
            {business.order_count > 0 && (
              <div className="flex items-center">
                <FiUsers className="w-3 h-3 mr-1" />
                {business.order_count} orders
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              <span className="badge badge-primary text-xs">
                {business.business_type}
              </span>
              {business.is_verified && (
                <span className="badge badge-success text-xs">Verified</span>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/business-marketplace/shops/${business.business_id}`);
              }}
              className="text-blue-600 hover:text-blue-800 font-medium text-sm"
            >
              View Shop →
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
            <h1 className="text-3xl font-bold text-gray-900">Business Marketplace</h1>
            <p className="text-gray-600 mt-1">
              Discover verified businesses, shops, and services - Your campus shopping destination
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Trending Section */}
        {trendingBusinesses.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <FiTrendingUp className="w-5 h-5 text-orange-500 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">Trending Businesses</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trendingBusinesses.slice(0, 6).map((business) => (
                <BusinessCard key={business.business_id} business={business} isCompact={true} />
              ))}
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search businesses, shops, services..."
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
            <div className="mt-6 pt-6 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Business Type</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="form-input w-full"
                >
                  <option value="">All Types</option>
                  {businessTypes.map((type) => (
                    <option key={type.business_type} value={type.business_type}>
                      {type.business_type} ({type.business_count})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Sort By</label>
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const option = sortOptions.find(opt => 
                      `${opt.id}-${opt.order}` === e.target.value
                    );
                    if (option) handleSortChange(option);
                  }}
                  className="form-input w-full"
                >
                  {sortOptions.map((option) => (
                    <option key={`${option.id}-${option.order}`} value={`${option.id}-${option.order}`}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600">
            {pagination.totalBusinesses ? `Found ${pagination.totalBusinesses} businesses` : 'Loading...'}
          </p>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}
            >
              <FiGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}
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
        ) : businesses.length > 0 ? (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {businesses.map((business) => (
                  <BusinessCard key={business.business_id} business={business} />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {businesses.map((business) => (
                  <BusinessListItem key={business.business_id} business={business} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center mt-8">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!pagination.hasPrevPage}
                    className="btn btn-outline disabled:opacity-50"
                  >
                    Previous
                  </button>
                  
                  {[...Array(Math.min(5, pagination.totalPages))].map((_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`btn ${page === currentPage ? 'btn-primary' : 'btn-outline'}`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!pagination.hasNextPage}
                    className="btn btn-outline disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <FiShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No businesses found</h3>
            <p className="text-gray-500">
              Try adjusting your search criteria or browse all business types
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessMarketplace;
