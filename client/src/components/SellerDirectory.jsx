import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiShoppingBag, 
  FiTruck, 
  FiCoffee, 
  FiMessageSquare,
  FiStar,
  FiMapPin,
  FiClock
} from 'react-icons/fi';

const SellerDirectory = ({ onStartChat }) => {
  const [sellers, setSellers] = useState([]);
  const [selectedType, setSelectedType] = useState('all');
  const [loading, setLoading] = useState(true);

  const sellerTypes = [
    { id: 'all', name: 'All Sellers', icon: FiTruck, color: 'bg-gray-500' },
    { id: 'secondhand', name: 'Secondhand Items', icon: FiShoppingBag, color: 'bg-green-500' },
    { id: 'business', name: 'Business Services', icon: FiTruck, color: 'bg-blue-500' },
    { id: 'food', name: 'Food Vendors', icon: FiCoffee, color: 'bg-orange-500' }
  ];

  // Mock data - In real app, fetch from your backend API
  const mockSellers = [
    {
      id: 'seller_1',
      name: 'Alex Thompson',
      type: 'secondhand',
      rating: 4.8,
      totalSales: 156,
      location: 'Campus Center',
      status: 'online',
      specialties: ['Electronics', 'Books', 'Furniture'],
      lastActive: '2 min ago'
    },
    {
      id: 'seller_2',
      name: 'Sarah\'s Cafe',
      type: 'food',
      rating: 4.9,
      totalSales: 342,
      location: 'Student Plaza',
      status: 'online',
      specialties: ['Coffee', 'Sandwiches', 'Pastries'],
      lastActive: 'Online now'
    },
    {
      id: 'seller_3',
      name: 'QuickPrint Services',
      type: 'business',
      rating: 4.7,
      totalSales: 89,
      location: 'Library Block',
      status: 'away',
      specialties: ['Printing', 'Binding', 'Scanning'],
      lastActive: '15 min ago'
    },
    {
      id: 'seller_4',
      name: 'Maria Rodriguez',
      type: 'secondhand',
      rating: 4.6,
      totalSales: 78,
      location: 'Dorm Area',
      status: 'online',
      specialties: ['Clothing', 'Shoes', 'Accessories'],
      lastActive: '5 min ago'
    },
    {
      id: 'seller_5',
      name: 'Campus Repair Hub',
      type: 'business',
      rating: 4.8,
      totalSales: 234,
      location: 'Main Building',
      status: 'online',
      specialties: ['Phone Repair', 'Laptop Service', 'Tech Support'],
      lastActive: 'Online now'
    },
    {
      id: 'seller_6',
      name: 'Healthy Bites',
      type: 'food',
      rating: 4.5,
      totalSales: 167,
      location: 'Sports Complex',
      status: 'online',
      specialties: ['Salads', 'Smoothies', 'Healthy Snacks'],
      lastActive: '1 min ago'
    }
  ];

  useEffect(() => {
    // Simulate API call
    const fetchSellers = async () => {
      setLoading(true);
      // In real app: const response = await api.get('/sellers');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
      setSellers(mockSellers);
      setLoading(false);
    };

    fetchSellers();
  }, []);

  const filteredSellers = selectedType === 'all' 
    ? sellers 
    : sellers.filter(seller => seller.type === selectedType);

  const getSellerTypeInfo = (type) => {
    return sellerTypes.find(s => s.id === type) || sellerTypes[0];
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Loading sellers...</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-6"
    >
      <h3 className="text-2xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        Find Sellers to Chat With
      </h3>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {sellerTypes.map((type) => {
          const Icon = type.icon;
          return (
            <motion.button
              key={type.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedType(type.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                selectedType === type.id
                  ? `${type.color} text-white shadow-lg`
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Icon size={16} />
              {type.name}
            </motion.button>
          );
        })}
      </div>

      {/* Sellers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSellers.map((seller, index) => {
          const sellerTypeInfo = getSellerTypeInfo(seller.type);
          const TypeIcon = sellerTypeInfo.icon;

          return (
            <motion.div
              key={seller.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              className="bg-white rounded-xl p-4 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${sellerTypeInfo.color}`}>
                    <TypeIcon size={18} className="text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">{seller.name}</h4>
                    <p className="text-sm text-gray-500">{sellerTypeInfo.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(seller.status)}`}></div>
                  <span className="text-xs text-gray-500">{seller.lastActive}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <FiStar className="text-yellow-500" size={14} />
                  <span>{seller.rating}</span>
                </div>
                <div className="flex items-center gap-1">
                  <FiMapPin size={14} />
                  <span>{seller.location}</span>
                </div>
                <div className="text-xs">
                  {seller.totalSales} sales
                </div>
              </div>

              {/* Specialties */}
              <div className="mb-4">
                <div className="flex flex-wrap gap-1">
                  {seller.specialties.slice(0, 3).map((specialty, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>
              </div>

              {/* Chat Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onStartChat(seller.id, seller.type, seller.name)}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-2 px-4 rounded-lg font-medium hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
              >
                <FiMessageSquare size={16} />
                Start Chat
              </motion.button>
            </motion.div>
          );
        })}
      </div>

      {filteredSellers.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <FiUser size={48} className="mx-auto mb-4 opacity-30" />
          <p>No sellers found for this category</p>
          <p className="text-sm">Try selecting a different seller type</p>
        </div>
      )}
    </motion.div>
  );
};

export default SellerDirectory;
