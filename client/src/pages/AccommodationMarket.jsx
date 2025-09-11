import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiHome, 
  FiMapPin, 
  FiMaximize,
  FiPhone,
  FiMail,
  FiFilter,
  FiSearch,
  FiHeart,
  FiShare2,
  FiStar,
  FiUser,
  FiCalendar,
  FiDollarSign,
  FiWifi,
  FiMonitor,
  FiShield
} from 'react-icons/fi';
import { FaBed, FaBath } from 'react-icons/fa';
import api from '../api';
import { useNotification } from '../context/NotificationContext';

const AccommodationMarket = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [properties, setProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [selectedLocation, setSelectedLocation] = useState('');
  const [favorites, setFavorites] = useState([]);

  const categories = [
    { id: 'all', name: 'All Types', icon: FiHome },
    { id: 'room', name: 'Rooms', icon: FaBed },
    { id: 'apartment', name: 'Apartments', icon: FiHome },
    { id: 'house', name: 'Houses', icon: FiHome },
    { id: 'hostel', name: 'Hostels', icon: FaBed },
    { id: 'flat', name: 'Flats', icon: FiHome }
  ];

  const locations = [
    'Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi', 'Khulna', 'Barisal', 'Rangpur', 'Mymensingh'
  ];

  useEffect(() => {
    fetchProperties();
    fetchFavorites();
  }, []);

  useEffect(() => {
    filterProperties();
  }, [properties, searchTerm, selectedCategory, priceRange, selectedLocation]);

  const fetchProperties = async () => {
    try {
      setLoading(true);
  const response = await api.get('/accommodation/properties');
      setProperties(response.data.properties || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
      showNotification('Error loading properties', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    try {
  const response = await api.get('/accommodation/favorites');
      setFavorites(response.data.favorites?.map(f => f.property_id) || []);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const filterProperties = () => {
    let filtered = properties;

    if (searchTerm) {
      filtered = filtered.filter(property =>
        property.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.location?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(property => property.property_type === selectedCategory);
    }

    if (selectedLocation) {
      filtered = filtered.filter(property => 
        property.location?.toLowerCase().includes(selectedLocation.toLowerCase())
      );
    }

    if (priceRange.min) {
      filtered = filtered.filter(property => property.monthly_rent >= parseInt(priceRange.min));
    }

    if (priceRange.max) {
      filtered = filtered.filter(property => property.monthly_rent <= parseInt(priceRange.max));
    }

    setFilteredProperties(filtered);
  };

  const toggleFavorite = async (propertyId) => {
    try {
      const isFavorite = favorites.includes(propertyId);
      if (isFavorite) {
        await api.delete(`/api/accommodation/favorites/${propertyId}`);
        setFavorites(favorites.filter(id => id !== propertyId));
        showNotification('Removed from favorites', 'success');
      } else {
  await api.post('/accommodation/favorites', { property_id: propertyId });
        setFavorites([...favorites, propertyId]);
        showNotification('Added to favorites', 'success');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      showNotification('Error updating favorites', 'error');
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('bn-BD', {
      style: 'currency',
      currency: 'BDT'
    }).format(price || 0);
  };

  const PropertyCard = ({ property }) => {
    const isFavorite = favorites.includes(property.id);
    
    return (
      <div className="card hover:shadow-lg transition-all duration-300 cursor-pointer group">
        <div className="relative">
          <img
            src={property.images?.[0] || '/placeholder/400/250'}
            alt={property.title}
            className="w-full h-48 object-cover rounded-t-lg"
            onClick={() => navigate(`/accommodation/${property.id}`)}
          />
          <div className="absolute top-2 right-2 flex space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(property.id);
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
            <span className="bg-green-500 text-white text-xs font-medium px-2 py-1 rounded-full">
              {property.property_type?.toUpperCase() || 'PROPERTY'}
            </span>
          </div>
          {property.is_verified && (
            <div className="absolute bottom-2 left-2">
              <span className="bg-blue-500 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center">
                <FiShield className="w-3 h-3 mr-1" />
                Verified
              </span>
            </div>
          )}
        </div>
        
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 
              className="font-semibold text-gray-900 text-lg group-hover:text-blue-600 transition-colors line-clamp-2"
              onClick={() => navigate(`/accommodation/${property.id}`)}
            >
              {property.title}
            </h3>
            <div className="text-right">
              <div className="text-xl font-bold text-green-600">
                ৳{property.monthly_rent?.toLocaleString()}/mo
              </div>
              {property.security_deposit && (
                <div className="text-xs text-gray-500">
                  +৳{property.security_deposit?.toLocaleString()} deposit
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center text-gray-600 mb-3">
            <FiMapPin className="w-4 h-4 mr-1" />
            <span className="text-sm">{property.location}</span>
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
            {property.bedrooms && (
              <div className="flex items-center">
                <FaBed className="w-4 h-4 mr-1" />
                <span>{property.bedrooms} bed</span>
              </div>
            )}
            {property.bathrooms && (
              <div className="flex items-center">
                <FaBath className="w-4 h-4 mr-1" />
                <span>{property.bathrooms} bath</span>
              </div>
            )}
            {property.area_sqft && (
              <div className="flex items-center">
                <FiMaximize className="w-4 h-4 mr-1" />
                <span>{property.area_sqft} sqft</span>
              </div>
            )}
          </div>
          
          {/* Amenities */}
          {property.amenities && property.amenities.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {property.amenities.slice(0, 3).map((amenity, index) => (
                <span key={index} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
                  {amenity}
                </span>
              ))}
              {property.amenities.length > 3 && (
                <span className="text-xs text-gray-500">
                  +{property.amenities.length - 3} more
                </span>
              )}
            </div>
          )}
          
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {property.owner_name?.charAt(0) || 'O'}
              </div>
              <div className="ml-2">
                <div className="text-sm font-medium text-gray-900">
                  {property.owner_name || 'Property Owner'}
                </div>
                <div className="flex items-center">
                  <FiStar className="w-3 h-3 text-yellow-500 mr-1" />
                  <span className="text-xs text-gray-600">
                    {property.owner_rating ? `${property.owner_rating}/5` : 'No rating'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`tel:${property.contact_phone}`, '_self');
                }}
                className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                title="Call"
              >
                <FiPhone className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`mailto:${property.contact_email}`, '_self');
                }}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                title="Email"
              >
                <FiMail className="w-4 h-4" />
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
                  Accommodation Market
                </h1>
                <p className="text-gray-600 mt-1">
                  Find your perfect home away from home
                </p>
              </div>
              <button
                onClick={() => navigate('/accommodation/post')}
                className="btn btn-primary"
              >
                Post Property
              </button>
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
                placeholder="Search properties..."
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
            
            <input
              type="number"
              placeholder="Min Price"
              value={priceRange.min}
              onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
              className="form-input w-full"
            />
            
            <input
              type="number"
              placeholder="Max Price"
              value={priceRange.max}
              onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
              className="form-input w-full"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white'
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
            {loading ? 'Loading...' : `${filteredProperties.length} properties found`}
          </div>
          <div className="flex items-center space-x-4">
            <select className="form-input text-sm">
              <option>Sort by: Newest</option>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
              <option>Most Popular</option>
            </select>
          </div>
        </div>

        {/* Properties Grid */}
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
        ) : filteredProperties.length === 0 ? (
          <div className="text-center py-12">
            <FiHome className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No properties found</h3>
            <p className="text-gray-600 mb-4">
              Try adjusting your search criteria or browse all properties
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
                setSelectedLocation('');
                setPriceRange({ min: '', max: '' });
              }}
              className="btn btn-outline"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map(property => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AccommodationMarket;
