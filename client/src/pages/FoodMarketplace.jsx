import React, { useEffect, useMemo, useState } from 'react';
import {
  FiSearch,
  FiMapPin,
  FiGrid,
  FiList,
  FiClock,
  FiShoppingCart,
} from 'react-icons/fi';
import { FaCoffee, FaBirthdayCake, FaUtensils } from 'react-icons/fa';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

const categories = [
  { id: 'all', name: 'All', icon: FaUtensils },
  { id: 'meal', name: 'Meal', icon: FaUtensils },
  { id: 'drinks', name: 'Drinks', icon: FaCoffee },
  { id: 'cake', name: 'Cake', icon: FaBirthdayCake },
  { id: 'pre-order', name: 'Pre-order', icon: FiClock },
];

const FoodMarketplace = () => {
  const { showNotification } = useNotification();
  const { user } = useAuth?.() || { user: null };

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [view, setView] = useState('grid');
  const [selected, setSelected] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [booked, setBooked] = useState(() => new Set());

  const storageKey = useMemo(() => {
    const id = user?.id || user?._id || user?.userId || 'guest';
    return `foodMarketplaceBooked:${id}`;
  }, [user]);

  // Dummy data fallback
  const dummyItems = useMemo(() => [
    {
      id: 501,
      title: 'Chicken Biryani Meal',
      category: 'meal',
      price: 180,
      quantity: 20,
      location: 'Cafeteria A',
      vendor: 'Campus Kitchen',
      images: ['/placeholder/400/250'],
      description: 'Fragrant basmati rice with tender chicken and spices. Comes with salad.',
      created_at: Date.now() - 1000 * 60 * 60,
    },
    {
      id: 502,
      title: 'Iced Latte',
      category: 'drinks',
      price: 120,
      quantity: 35,
      location: 'Cafe Brew',
      vendor: 'Cafe Brew',
      images: ['/placeholder/400/250'],
      description: 'Chilled espresso with milk and ice. Perfect afternoon pick-me-up.',
      created_at: Date.now() - 1000 * 60 * 30,
    },
    {
      id: 503,
      title: 'Chocolate Fudge Cake Slice',
      category: 'cake',
      price: 150,
      quantity: 12,
      location: 'Sweet Spot',
      vendor: 'Sweet Spot',
      images: ['/placeholder/400/250'],
      description: 'Rich and moist chocolate cake topped with silky fudge frosting.',
      created_at: Date.now() - 1000 * 60 * 10,
    },
    {
      id: 504,
      title: 'Pre-order: Friday Special Lunch Box',
      category: 'pre-order',
      price: 220,
      // no quantity for pre-order category
      location: 'Order Desk',
      vendor: 'Campus Kitchen',
      images: ['/placeholder/400/250'],
      description: 'Reserve your Friday lunch box today. Collection between 12:00-2:00pm.',
      created_at: Date.now() - 1000 * 60 * 5,
    },
  ], []);

  // Load items and booked state
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get('/food/marketplace/items');
        const list = res?.data?.items || [];
        setItems(Array.isArray(list) && list.length ? list : dummyItems);
        if (!Array.isArray(list) || list.length === 0) {
          showNotification('Showing sample food items (no backend data)', 'info');
        }
      } catch (e) {
        console.warn('Food items load failed, using dummy:', e);
        setItems(dummyItems);
        showNotification('Showing sample food items (backend unavailable)', 'info');
      } finally {
        setLoading(false);
      }
    };

    // Load booked from storage
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setBooked(new Set(JSON.parse(raw)));
    } catch {}

    load();
  }, [storageKey, dummyItems, showNotification]);

  // Persist booked changes
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(booked)));
    } catch {}
  }, [booked, storageKey]);

  const filteredItems = useMemo(() => {
    let list = [...items];
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (i) =>
          i.title?.toLowerCase().includes(term) ||
          i.description?.toLowerCase().includes(term) ||
          i.vendor?.toLowerCase().includes(term) ||
          i.location?.toLowerCase().includes(term)
      );
    }
    if (selectedCategory !== 'all') {
      list = list.filter((i) => (i.category || '').toLowerCase() === selectedCategory);
    }
    if (sortBy === 'price-asc') list.sort((a, b) => (a.price || 0) - (b.price || 0));
    else if (sortBy === 'price-desc') list.sort((a, b) => (b.price || 0) - (a.price || 0));
    else if (sortBy === 'newest') list.sort((a, b) => (b.created_at || b.id || 0) - (a.created_at || a.id || 0));
    return list;
  }, [items, searchTerm, selectedCategory, sortBy]);

  const isPreOrderClosed = () => {
    const now = new Date();
    const hour = now.getHours();
    return hour >= 18; // after 6 PM
  };

  const openDetails = (item) => {
    setSelected(item);
    setIsModalOpen(true);
  };
  const closeDetails = () => {
    setIsModalOpen(false);
    setSelected(null);
  };

  const bookItem = async (item) => {
    if (!item) return;
    const already = booked.has(item.id);
    const isPre = (item.category || '').toLowerCase() === 'pre-order';

    if (already) {
      showNotification('You already booked this item', 'info');
      return;
    }
    if (isPre && isPreOrderClosed()) {
      showNotification('Pre-order booking is closed after 6 PM', 'error');
      return;
    }
    if (!isPre && typeof item.quantity === 'number' && item.quantity <= 0) {
      showNotification('This item is sold out', 'error');
      return;
    }

    try {
      await api.post('/food/marketplace/book', { item_id: item.id });
      // optimistic update
      setBooked((prev) => new Set(prev).add(item.id));
      if (!isPre) {
        setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, quantity: (it.quantity ?? 0) - 1 } : it)));
      }
      showNotification('Booked successfully', 'success');
    } catch (e) {
      console.warn('Booking failed, using local fallback:', e);
      setBooked((prev) => new Set(prev).add(item.id));
      if (!isPre) {
        setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, quantity: (it.quantity ?? 0) - 1 } : it)));
      }
      showNotification('Backend unavailable. Booked locally for preview.', 'info');
    }
  };

  const ItemCard = ({ item }) => {
    const isPre = (item.category || '').toLowerCase() === 'pre-order';
    const bookedOnce = booked.has(item.id);
    const closed = isPre && isPreOrderClosed();
    const disabled = bookedOnce || closed || (!isPre && (item.quantity ?? 0) <= 0);

    return (
      <div className="card hover:shadow-lg transition-all duration-300 cursor-pointer group" onClick={() => openDetails(item)}>
        <div className="relative">
          <img src={item.images?.[0] || '/placeholder/400/250'} alt={item.title} className="w-full h-48 object-cover rounded-t-lg" />
          <div className="absolute top-2 left-2">
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${isPre ? 'bg-purple-600 text-white' : 'bg-green-500 text-white'}`}>
              {(item.category || '').toUpperCase()}
            </span>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-gray-900 text-lg group-hover:text-blue-600 transition-colors line-clamp-2">{item.title}</h3>
            <div className="text-right">
              <div className="text-xl font-bold text-green-600">৳{item.price?.toLocaleString()}</div>
              {!isPre && (
                <div className="text-xs text-gray-500">Qty: {item.quantity ?? 0}</div>
              )}
            </div>
          </div>
          <div className="flex items-center text-gray-600 mb-3">
            <FiMapPin className="w-4 h-4 mr-1" />
            <span className="text-sm">{item.vendor}{item.location ? ` • ${item.location}` : ''}</span>
          </div>
          <p className="text-sm text-gray-700 line-clamp-2 mb-3">{item.description}</p>
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="text-xs text-gray-500">{new Date(item.created_at || Date.now()).toLocaleString()}</div>
            <button
              onClick={(e) => { e.stopPropagation(); bookItem(item); }}
              disabled={disabled}
              className={`btn btn-sm ${disabled ? 'btn-disabled' : 'btn-primary'} flex items-center`}
              title={bookedOnce ? 'Already booked' : (closed ? 'Pre-order closed after 6 PM' : 'Book')}
            >
              <FiShoppingCart className="w-4 h-4 mr-1" />
              {bookedOnce ? 'Booked' : 'Book'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ItemListRow = ({ item }) => {
    const isPre = (item.category || '').toLowerCase() === 'pre-order';
    const bookedOnce = booked.has(item.id);
    const closed = isPre && isPreOrderClosed();
    const disabled = bookedOnce || closed || (!isPre && (item.quantity ?? 0) <= 0);

    return (
      <div className="card p-4 flex items-start gap-4 hover:shadow-lg transition cursor-pointer" onClick={() => openDetails(item)}>
        <img src={item.images?.[0] || '/placeholder/400/250'} alt={item.title} className="w-40 h-28 object-cover rounded" />
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${isPre ? 'bg-purple-600 text-white' : 'bg-green-500 text-white'}`}>
                  {(item.category || '').toUpperCase()}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 text-lg">{item.title}</h3>
              <div className="flex items-center text-gray-600 mt-1">
                <FiMapPin className="w-4 h-4 mr-1" />
                <span className="text-sm">{item.vendor}{item.location ? ` • ${item.location}` : ''}</span>
              </div>
              <p className="text-sm text-gray-700 mt-2 line-clamp-2">{item.description}</p>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-green-600">৳{item.price?.toLocaleString()}</div>
              {!isPre && <div className="text-xs text-gray-500">Qty: {item.quantity ?? 0}</div>}
              <div className="flex items-center justify-end gap-2 mt-3">
                <button
                  onClick={(e) => { e.stopPropagation(); bookItem(item); }}
                  disabled={disabled}
                  className={`btn btn-sm ${disabled ? 'btn-disabled' : 'btn-primary'} flex items-center`}
                  title={bookedOnce ? 'Already booked' : (closed ? 'Pre-order closed after 6 PM' : 'Book')}
                >
                  <FiShoppingCart className="w-4 h-4 mr-1" />
                  {bookedOnce ? 'Booked' : 'Book'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const DetailsModal = ({ open, onClose, item }) => {
    if (!open || !item) return null;
    const isPre = (item.category || '').toLowerCase() === 'pre-order';
    const bookedOnce = booked.has(item.id);
    const closed = isPre && isPreOrderClosed();
    const disabled = bookedOnce || closed || (!isPre && (item.quantity ?? 0) <= 0);

    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black bg-opacity-40" onClick={onClose} />
        <div className="relative bg-white w-full sm:max-w-3xl sm:rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
          <div className="p-4 sm:p-6 border-b flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${isPre ? 'bg-purple-600 text-white' : 'bg-green-500 text-white'}`}>
                  {(item.category || '').toUpperCase()}
                </span>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900">{item.title}</h2>
              <div className="flex items-center text-gray-600 mt-1">
                <FiMapPin className="w-4 h-4 mr-1" />
                <span className="text-sm">{item.vendor}{item.location ? ` • ${item.location}` : ''}</span>
              </div>
            </div>
            <button className="text-gray-500 hover:text-gray-700" onClick={onClose} aria-label="Close">✕</button>
          </div>
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <img src={item.images?.[0] || '/placeholder/400/250'} alt={item.title} className="w-full h-56 object-cover rounded" />
              <div className="space-y-3">
                <div>
                  <div className="text-xl font-bold text-green-600">৳{item.price?.toLocaleString()}</div>
                  {!isPre && (
                    <div className="text-sm text-gray-500">Quantity available: {item.quantity ?? 0}</div>
                  )}
                </div>
                {item.description && (
                  <div>
                    <div className="text-sm font-medium text-gray-900 mb-1">Description</div>
                    <p className="text-gray-700 text-sm leading-relaxed">{item.description}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
              <div className="text-sm text-gray-700">
                {isPre ? (
                  <>
                    Pre-order window closes at 6:00 PM daily.
                    {closed && <span className="ml-1 text-red-600">Closed for today.</span>}
                  </>
                ) : (
                  <>One booking per user. Book before it runs out.</>
                )}
              </div>
              <button
                onClick={() => bookItem(item)}
                disabled={disabled}
                className={`btn ${disabled ? 'btn-disabled' : 'btn-primary'} flex items-center`}
                title={bookedOnce ? 'Already booked' : (closed ? 'Pre-order closed after 6 PM' : 'Book')}
              >
                <FiShoppingCart className="w-4 h-4 mr-2" />
                {bookedOnce ? 'Booked' : 'Book'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Food Marketplace</h1>
                <p className="text-gray-600 mt-1">Find meals, drinks, cakes, and pre-orders around campus</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Category Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search food items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input w-full pl-10"
              />
            </div>
            <div className="lg:col-span-2">
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategory(c.id)}
                    className={`flex items-center px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      selectedCategory === c.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <c.icon className="w-4 h-4 mr-2" />
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="hidden sm:flex items-center rounded overflow-hidden border">
              <button
                className={`px-3 py-2 text-sm ${view === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-600'}`}
                onClick={() => setView('grid')}
                title="Grid view"
              >
                <FiGrid className="w-4 h-4" />
              </button>
              <button
                className={`px-3 py-2 text-sm ${view === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-600'}`}
                onClick={() => setView('list')}
                title="List view"
              >
                <FiList className="w-4 h-4" />
              </button>
            </div>
            <select className="form-input text-sm" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="newest">Sort by: Newest</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Results */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-gray-600">{loading ? 'Loading...' : `${filteredItems.length} items found`}</div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, idx) => (
              <div key={idx} className="card animate-pulse">
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
            <FaUtensils className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
            <p className="text-gray-600 mb-4">Try adjusting your search criteria or browse all categories</p>
            <button
              onClick={() => { setSearchTerm(''); setSelectedCategory('all'); setSortBy('newest'); }}
              className="btn btn-outline"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className={view === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {filteredItems.map((item) => (
              view === 'grid' ? (
                <ItemCard key={item.id} item={item} />
              ) : (
                <ItemListRow key={item.id} item={item} />
              )
            ))}
          </div>
        )}
      </div>

      {/* Details Modal */}
      <DetailsModal open={isModalOpen} onClose={closeDetails} item={selected} />
    </div>
  );
};

export default FoodMarketplace;
