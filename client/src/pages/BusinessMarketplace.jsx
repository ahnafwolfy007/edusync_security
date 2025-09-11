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
import MarketplaceDebugger from '../components/MarketplaceDebugger';
import ChatButton from '../components/chat/ChatButton';

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
  const [verifiedOnly, setVerifiedOnly] = useState(false);

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
  }, [selectedType, sortBy, sortOrder, currentPage, verifiedOnly]);

  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        businessType: selectedType,
        search: searchTerm,
        sortBy,
        sortOrder,
        page: currentPage,
        limit: 12,
        isVerified: verifiedOnly ? 'true' : 'all'
      });

      console.log('Fetching businesses with params:', params.toString());
      const response = await api.get(`/business-marketplace/shops?${params}`);
      console.log('Business response:', response.data);
      
      const payload = response.data?.data || response.data;
      setBusinesses(payload.businesses || []);
      setPagination(payload.pagination || {});
    } catch (error) {
      console.error('Error fetching businesses:', error);
      console.error('Error details:', error.response?.data || error.message);
      showNotification('Error loading businesses', 'error');
      // Set empty state so UI doesn't break
      setBusinesses([]);
      setPagination({});
    } finally {
      setLoading(false);
    }
  };

  const fetchBusinessTypes = async () => {
    try {
      console.log('Fetching business types...');
      const response = await api.get('/business-marketplace/types');
      console.log('Business types response:', response.data);
      
      const payload = response.data?.data || response.data;
      setBusinessTypes(payload.businessTypes || []);
    } catch (error) {
      console.error('Error fetching business types:', error);
      console.error('Error details:', error.response?.data || error.message);
      // Set empty state so UI doesn't break
      setBusinessTypes([]);
    }
  };

  const fetchTrendingBusinesses = async () => {
    try {
      console.log('Fetching trending businesses...');
      const response = await api.get('/business-marketplace/trending?limit=6');
      console.log('Trending businesses response:', response.data);
      
      const payload = response.data?.data || response.data;
      setTrendingBusinesses(payload.businesses || []);
    } catch (error) {
      console.error('Error fetching trending businesses:', error);
      console.error('Error details:', error.response?.data || error.message);
      // Set empty state so UI doesn't break
      setTrendingBusinesses([]);
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

  const BusinessCard = ({ business, isCompact = false }) => {
    const rating = business.avg_rating ? parseFloat(business.avg_rating).toFixed(1) : null;
    const createdAt = business.created_at ? new Date(business.created_at).toLocaleDateString() : null;
    const recentOrders = business.recent_orders ?? business.recentOrders; // trending endpoint field
    return (
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
              <div className="bg-green-500/90 backdrop-blur text-white px-2 py-1 rounded-full text-[10px] font-semibold tracking-wide shadow">
                VERIFIED
              </div>
            )}
          </div>
          {business.product_count > 0 && (
            <div className="absolute bottom-3 left-3 bg-blue-600/90 backdrop-blur text-white px-2 py-1 rounded-full text-[10px] font-medium shadow">
              {business.product_count} Products
            </div>
          )}
          {recentOrders > 0 && (
            <div className="absolute bottom-3 right-3 bg-orange-500/90 text-white px-2 py-1 rounded-full text-[10px] font-medium shadow">
              {recentOrders} recent orders
            </div>
          )}
        </div>
        
        <div className={`p-${isCompact ? '3' : '4'} space-y-2`}>
          <div className="flex justify-between items-start gap-2">
            <h3 className={`font-semibold leading-snug text-gray-900 group-hover:text-blue-600 transition-colors ${isCompact ? 'text-sm' : 'text-base'}`}>{business.business_name}</h3>
            <div className="flex items-center space-x-1 flex-shrink-0">
              <FiStar className="w-4 h-4 text-yellow-500 fill-current" />
              <span className="text-xs font-semibold">{rating || 'NEW'}</span>
              {business.review_count > 0 && (
                <span className="text-[10px] text-gray-500">({business.review_count})</span>
              )}
            </div>
          </div>
          <p className={`text-gray-600 ${isCompact ? 'text-xs line-clamp-2' : 'text-sm line-clamp-3'}`}>
            {business.description || 'No description provided.'}
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-gray-600">
            <div className="flex items-center"><FiPackage className="w-3 h-3 mr-1 text-gray-400" />{business.business_type}</div>
            <div className="flex items-center"><FiUsers className="w-3 h-3 mr-1 text-gray-400" />{business.order_count || 0} orders</div>
            <div className="flex items-center"><FiPackage className="w-3 h-3 mr-1 text-gray-400" />{business.product_count || 0} products</div>
            {createdAt && <div className="flex items-center"><FiClock className="w-3 h-3 mr-1 text-gray-400" />Since {createdAt}</div>}
            {business.owner_name && <div className="col-span-2 text-[10px] text-gray-500">Owner: {business.owner_name}</div>}
          </div>
          <div className="flex items-center justify-between pt-1">
            <div className="flex gap-1 flex-wrap">
              <span className="badge badge-primary text-[10px]">{business.business_type}</span>
              {business.is_verified && <span className="badge badge-success text-[10px]">Verified</span>}
              {business.order_count > 50 && <span className="badge badge-warning text-[10px]">Popular</span>}
              {business.avg_rating >= 4.5 && business.review_count >= 5 && <span className="badge badge-info text-[10px]">Top Rated</span>}
            </div>
            <div className="flex items-center space-x-2">
              <ChatButton
                sellerId={business.owner_id}
                sellerName={business.owner_name || business.business_name}
                sellerType="business"
                itemId={business.business_id}
                itemName={business.business_name}
                size="xs"
                variant="minimal"
                className="text-xs"
              />
              <button
                onClick={(e) => { e.stopPropagation(); navigate(`/business-marketplace/shops/${business.business_id}`); }}
                className="text-blue-600 hover:text-blue-800 font-medium text-[11px] flex items-center"
              >
                View <FiExternalLink className="w-3 h-3 ml-1" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

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
            <div className="flex items-center space-x-2">
              <ChatButton
                sellerId={business.owner_id}
                sellerName={business.owner_name || business.business_name}
                sellerType="business"
                itemId={business.business_id}
                itemName={business.business_name}
                size="sm"
                variant="outline"
              />
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
              <div className="flex items-center space-x-2 md:col-span-2">
                <input
                  id="verifiedOnlyToggle"
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={() => { setVerifiedOnly(v => !v); setCurrentPage(1); }}
                  className="toggle toggle-sm"
                />
                <label htmlFor="verifiedOnlyToggle" className="text-sm text-gray-700">
                  Show only verified businesses
                </label>
              </div>
            </div>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600">
            {pagination.totalBusinesses !== undefined ? `Found ${pagination.totalBusinesses} businesses` : 'Loading...'}
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
      
      {/* Debug Component - only in development */}
      {process.env.NODE_ENV === 'development' && <MarketplaceDebugger />}
    </div>
  );
};

export default BusinessMarketplace;
