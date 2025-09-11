import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { useNotification } from '../context/NotificationContext';
import api from '../api';
import ItemUploadForm from '../components/marketplace/ItemUploadForm';
import SellItemPrompt from '../components/marketplace/SellItemPrompt';
import MarketplaceItemCard from '../components/marketplace/MarketplaceItemCard';

const Marketplace = () => {
  const { user } = useAuth();
  const { wallet, makePayment } = useWallet();
  const { showSuccess, showError } = useNotification();
  
  const [activeTab, setActiveTab] = useState('browse');
  const [items, setItems] = useState([]);
  const [userItems, setUserItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Post item modal state
  const [showPostModal, setShowPostModal] = useState(false);
  
  // Buy item modal state
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const categories = [
    { value: 'all', label: 'All Categories', icon: '🏪' },
    { value: 'books', label: 'Books & Materials', icon: '📚' },
    { value: 'electronics', label: 'Electronics', icon: '💻' },
    { value: 'furniture', label: 'Furniture', icon: '🪑' },
    { value: 'clothes', label: 'Clothing', icon: '👕' },
    { value: 'sports', label: 'Sports & Fitness', icon: '⚽' },
    { value: 'other', label: 'Other', icon: '📦' }
  ];

  useEffect(() => {
    fetchMarketplaceItems();
    if (user) {
      fetchUserItems();
    }
  }, [user]);

  const fetchMarketplaceItems = async () => {
    try {
      setLoading(true);
      const response = await api.get('/marketplace/items');
      if (response.data.success) {
        setItems(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch marketplace items:', error);
      showError('Failed to load marketplace items');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserItems = async () => {
    try {
      const response = await api.get('/marketplace/my-items');
      if (response.data.success) {
        setUserItems(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch user items:', error);
    }
  };

  const handleBuyItem = async () => {
    if (!selectedItem) return;
    
    if (!wallet || wallet.balance < selectedItem.price) {
      showError('Insufficient wallet balance. Please add money to your wallet.');
      return;
    }

    try {
      setLoading(true);
      const result = await makePayment(
        selectedItem.seller_id,
        selectedItem.price,
        selectedItem.id,
        'marketplace'
      );
      
      if (result.success) {
        showSuccess(`Successfully purchased ${selectedItem.title}!`);
        setShowBuyModal(false);
        setSelectedItem(null);
        fetchMarketplaceItems();
      }
    } catch (error) {
      console.error('Purchase failed:', error);
      showError('Purchase failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch && item.status === 'available';
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Marketplace</h1>
              <p className="text-gray-600 mt-2">Buy and sell items with fellow students</p>
            </div>
            {user && (
              <button
                onClick={() => {
                  console.log('Sell item button clicked, user:', user);
                  console.log('Setting showPostModal to true');
                  setShowPostModal(true);
                }}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Sell Item
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('browse')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'browse'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Browse Items
              </button>
              {user && (
                <button
                  onClick={() => setActiveTab('my-items')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'my-items'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  My Items
                </button>
              )}
            </nav>
          </div>
        </div>

        {/* Search and Filters */}
        {activeTab === 'browse' && (
          <div className="mb-8 bg-white rounded-lg shadow-sm border p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search items..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {categories.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.icon} {category.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {activeTab === 'browse' && (
          <div>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-4">Loading items...</p>
              </div>
            ) : filteredItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredItems.map(item => (
                  <MarketplaceItemCard
                    key={item.id}
                    item={item}
                    onBuy={(item) => {
                      setSelectedItem(item);
                      setShowBuyModal(true);
                    }}
                    showBuyButton={user && user.id !== item.seller_id}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No items found</h3>
                <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filters.</p>
              </div>
            )}
          </div>
        )}

        {/* My Items Tab */}
        {activeTab === 'my-items' && user && (
          <div>
            {userItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userItems.map(item => (
                  <MarketplaceItemCard
                    key={item.id}
                    item={item}
                    isOwner={true}
                    showBuyButton={false}
                  />
                ))}
              </div>
            ) : (
              <SellItemPrompt onStartSelling={() => setShowPostModal(true)} />
            )}
          </div>
        )}
      </div>

      {/* Enhanced Item Upload Form */}
      {console.log('Rendering ItemUploadForm with showPostModal:', showPostModal)}
      <ItemUploadForm
        isOpen={showPostModal}
        onClose={() => {
          console.log('Closing modal');
          setShowPostModal(false);
        }}
        onSuccess={() => {
          console.log('Upload success');
          fetchMarketplaceItems();
          fetchUserItems();
        }}
      />

      {/* Buy Item Modal */}
      {showBuyModal && selectedItem && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Confirm Purchase</h3>
                <button
                  onClick={() => setShowBuyModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4">
                <h4 className="font-medium text-gray-900">{selectedItem.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{selectedItem.description}</p>
                <p className="text-lg font-bold text-blue-600 mt-2">৳{selectedItem.price}</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex justify-between text-sm">
                  <span>Your Wallet Balance:</span>
                  <span className="font-medium">৳{wallet?.balance || 0}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span>Item Price:</span>
                  <span className="font-medium">৳{selectedItem.price}</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between text-sm font-medium">
                  <span>Remaining Balance:</span>
                  <span className={wallet?.balance >= selectedItem.price ? 'text-green-600' : 'text-red-600'}>
                    ৳{(wallet?.balance || 0) - selectedItem.price}
                  </span>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowBuyModal(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBuyItem}
                  disabled={loading || !wallet || wallet.balance < selectedItem.price}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Confirm Purchase'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Marketplace;
