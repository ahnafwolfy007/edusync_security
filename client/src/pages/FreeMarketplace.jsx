import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiPlus,
  FiSearch,
  FiFilter,
  FiGrid,
  FiList,
  FiHeart,
  FiShare2,
  FiMapPin,
  FiCalendar,
  FiUser,
  FiTag,
  FiTrendingUp,
  FiStar,
  FiEye,
  FiMessageCircle,
  FiGift
} from 'react-icons/fi';
import api from '../api';
import { useNotification } from '../context/NotificationContext';

const FreeMarketplace = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [favorites, setFavorites] = useState([]);

  const categories = [
    { id: 'all', name: 'All Categories', icon: FiGrid },
    { id: 'books', name: 'Books & Study Materials', icon: FiGift },
    { id: 'electronics', name: 'Electronics', icon: FiGift },
    { id: 'clothing', name: 'Clothing & Accessories', icon: FiGift },
    { id: 'furniture', name: 'Furniture', icon: FiGift },
    { id: 'sports', name: 'Sports & Fitness', icon: FiGift },
    { id: 'food', name: 'Food & Beverages', icon: FiGift },
    { id: 'services', name: 'Services', icon: FiGift },
    { id: 'other', name: 'Other', icon: FiGift }
  ];

  const locations = [
    'Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi', 'Khulna', 'Barisal', 'Rangpur', 'Mymensingh'
  ];

  useEffect(() => {
    fetchItems();
    fetchFavorites();
  }, []);

  useEffect(() => {
    filterItems();
  }, [items, searchTerm, selectedCategory, selectedLocation]);

  const fetchItems = async () => {
    try {
      setLoading(true);
  const response = await api.get('/free-marketplace/items');
      const payload = response.data?.data || response.data;
      // Map backend fields (item_id, item_name, pickup_location) to frontend expected fields
      const mapped = (Array.isArray(payload) ? payload : payload.items || payload).map(r => ({
        id: r.item_id,
        title: r.item_name || r.title,
        description: r.description,
        location: r.pickup_location || r.location,
        created_at: r.posted_at || r.created_at,
        category: r.category_name || r.category,
        giver_name: r.giver_name,
        giver_rating: r.giver_rating,
        images: r.images || [],
        tags: r.tags || [],
        is_trending: r.is_trending || false,
        view_count: r.view_count,
        message_count: r.message_count
      }));
      setItems(mapped);
    } catch (error) {
      console.error('Error fetching items:', error);
      showNotification('Error loading items', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    try {
  const response = await api.get('/free-marketplace/favorites');
      const payload = response.data?.data || response.data;
      setFavorites(payload.favorites?.map(f => f.item_id) || []);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const filterItems = () => {
    let filtered = items;

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.location?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    if (selectedLocation) {
      filtered = filtered.filter(item => 
        item.location?.toLowerCase().includes(selectedLocation.toLowerCase())
      );
    }

    setFilteredItems(filtered);
  };

  const toggleFavorite = async (itemId) => {
    try {
      const isFavorite = favorites.includes(itemId);
      if (isFavorite) {
  await api.delete(`/free-marketplace/favorites/${itemId}`);
        setFavorites(favorites.filter(id => id !== itemId));
        showNotification('Removed from favorites', 'success');
      } else {
  await api.post('/free-marketplace/favorites', { item_id: itemId });
        setFavorites([...favorites, itemId]);
        showNotification('Added to favorites', 'success');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      showNotification('Error updating favorites', 'error');
    }
  };

  const ItemCard = ({ item }) => {
    const isFavorite = favorites.includes(item.id);
    
    return (
      <div className="card hover:shadow-lg transition-all duration-300 cursor-pointer group">
        <div className="relative">
          <img
            src={item.images?.[0] || '/placeholder/400/250'}
            alt={item.title}
            className="w-full h-48 object-cover rounded-t-lg"
            onClick={() => navigate(`/free-marketplace/${item.id}`)}
          />
          <div className="absolute top-2 right-2 flex space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(item.id);
              }}
              className={`p-2 rounded-full ${
                isFavorite ? 'bg-red-500 text-white' : 'bg-white text-gray-600'
              } hover:scale-110 transition-transform`}
            >
              <FiHeart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
            <button className="p-2 bg-white text-gray-600 rounded-full hover:scale-110 transition-transform">
              <FiShare2 className="w-4 h-4" />
            </button>
          </div>
          <div className="absolute top-2 left-2">
            <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
              FREE
            </span>
          </div>
          {item.is_trending && (
            <div className="absolute bottom-2 left-2">
              <span className="bg-orange-500 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center">
                <FiTrendingUp className="w-3 h-3 mr-1" />
                Trending
              </span>
            </div>
          )}
        </div>
        
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 
              className="font-semibold text-gray-900 text-lg group-hover:text-blue-600 transition-colors line-clamp-2"
              onClick={() => navigate(`/free-marketplace/${item.id}`)}
            >
              {item.title}
            </h3>
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
              {item.category?.replace('_', ' ').toUpperCase() || 'OTHER'}
            </span>
          </div>
          
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {item.description}
          </p>
          
          <div className="flex items-center text-gray-500 text-sm mb-3">
            <FiMapPin className="w-4 h-4 mr-1" />
            <span>{item.location}</span>
            <FiCalendar className="w-4 h-4 ml-3 mr-1" />
            <span>{new Date(item.created_at).toLocaleDateString()}</span>
          </div>
          
          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {item.tags.slice(0, 3).map((tag, index) => (
                <span key={index} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
                  #{tag}
                </span>
              ))}
              {item.tags.length > 3 && (
                <span className="text-xs text-gray-500">
                  +{item.tags.length - 3} more
                </span>
              )}
            </div>
          )}
          
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {item.giver_name?.charAt(0) || 'G'}
              </div>
              <div className="ml-2">
                <div className="text-sm font-medium text-gray-900">
                  {item.giver_name || 'Anonymous Giver'}
                </div>
                <div className="flex items-center">
                  <FiStar className="w-3 h-3 text-yellow-500 mr-1" />
                  <span className="text-xs text-gray-600">
                    {item.giver_rating ? `${item.giver_rating}/5` : 'No rating'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 text-gray-500 text-xs">
              <div className="flex items-center">
                <FiEye className="w-4 h-4 mr-1" />
                <span>{item.view_count || 0}</span>
              </div>
              <div className="flex items-center">
                <FiMessageCircle className="w-4 h-4 mr-1" />
                <span>{item.message_count || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ItemListCard = ({ item }) => {
    const isFavorite = favorites.includes(item.id);
    
    return (
      <div className="card p-4 flex items-center space-x-4 hover:shadow-md transition-all cursor-pointer">
        <img
          src={item.images?.[0] || '/placeholder/150/100'}
          alt={item.title}
          className="w-24 h-16 object-cover rounded-lg"
          onClick={() => navigate(`/free-marketplace/${item.id}`)}
        />
        
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h4 
                className="font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                onClick={() => navigate(`/free-marketplace/${item.id}`)}
              >
                {item.title}
              </h4>
              <p className="text-gray-600 text-sm line-clamp-1 mt-1">
                {item.description}
              </p>
              <div className="flex items-center text-gray-500 text-xs mt-2">
                <FiMapPin className="w-3 h-3 mr-1" />
                <span>{item.location}</span>
                <span className="mx-2">•</span>
                <FiCalendar className="w-3 h-3 mr-1" />
                <span>{new Date(item.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                FREE
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(item.id);
                }}
                className={`p-2 rounded-full ${
                  isFavorite ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'
                } hover:scale-110 transition-transform`}
              >
                <FiHeart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
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
                <h1 className="text-3xl font-bold text-gray-900">
                  Free Marketplace
                </h1>
                <p className="text-gray-600 mt-1">
                  Share and discover free items in your community
                </p>
              </div>
              <button
                onClick={() => navigate('/free-marketplace/post')}
                className="btn btn-primary flex items-center"
              >
                <FiPlus className="w-4 h-4 mr-2" />
                Give Away Item
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search free items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input w-full pl-10"
              />
            </div>
            
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="form-input w-full"
            >
              <option value="">All Locations</option>
              {locations.map(location => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
              >
                <FiGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
              >
                <FiList className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <category.icon className="w-4 h-4 mr-2" />
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-gray-600">
            {loading ? 'Loading...' : `${filteredItems.length} free items available`}
          </div>
          <div className="flex items-center space-x-4">
            <select className="form-input text-sm">
              <option>Sort by: Newest</option>
              <option>Most Popular</option>
              <option>Most Viewed</option>
              <option>Trending</option>
            </select>
          </div>
        </div>

        {/* Items Grid/List */}
        {loading ? (
          <div className={viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            : "space-y-4"
          }>
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
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <FiGift className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No free items found</h3>
            <p className="text-gray-600 mb-4">
              Try adjusting your search criteria or be the first to share something!
            </p>
            <div className="flex space-x-4 justify-center">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                  setSelectedLocation('');
                }}
                className="btn btn-outline"
              >
                Clear Filters
              </button>
              <button
                onClick={() => navigate('/free-marketplace/post')}
                className="btn btn-primary"
              >
                Give Away Item
              </button>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map(item => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map(item => (
              <ItemListCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FreeMarketplace;
