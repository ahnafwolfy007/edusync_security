import React, { useEffect, useMemo, useState } from 'react';
import { 
  FiSearch,
  FiFilter,
  FiMapPin,
  FiClock,
  FiHeart,
  FiGrid,
  FiList,
  FiShoppingBag,
  FiEye,
  FiMessageCircle,
  FiPlus,
} from 'react-icons/fi';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import ChatButton from '../components/chat/ChatButton';

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

const Rental = () => {
  const { user } = useAuth?.() || { user: null };
  const { showNotification } = useNotification();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCondition, setSelectedCondition] = useState('all');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [favorites, setFavorites] = useState(() => new Set());
  const [requested, setRequested] = useState(() => new Set());
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const storageKey = useMemo(() => {
    const id = user?.id || user?._id || user?.userId || 'guest';
    return `rentalRequests:${id}`;
  }, [user]);

  const dummyItems = useMemo(() => ([
    {
      id: 801,
      title: 'DSLR Camera (Canon 80D) - Daily Rental',
      category: 'electronics',
      price: 800,
      condition: 'good',
      quantity: 1,
      location: 'Dorm A',
      description: 'Great for events and shoots. Comes with 18-55mm lens and battery.',
      images: ['/placeholder/400/300'],
      seller: { id: 'u1', name: 'Ayan', avatar: '/placeholder/32/32', isVerified: true },
      created_at: Date.now() - 1000 * 60 * 90,
      views: 23,
      inquiries: 4,
    },
    {
      id: 802,
      title: 'Study Table - Weekly Rental',
      category: 'furniture',
      price: 300,
      condition: 'excellent',
      quantity: 0, // unavailable
      location: 'Hall B',
      description: 'Sturdy table ideal for study. Delivery within campus.',
      images: ['/placeholder/400/300'],
      seller: { id: 'u2', name: 'Meera', avatar: '/placeholder/32/32' },
      created_at: Date.now() - 1000 * 60 * 30,
      views: 10,
      inquiries: 2,
    },
    {
      id: 803,
      title: 'Road Bike - Per Day',
      category: 'bikes',
      price: 200,
      condition: 'good',
      quantity: 3,
      location: 'North Gate',
      description: 'Lightweight road bike. Helmet included.',
      images: ['/placeholder/400/300'],
      seller: { id: 'u3', name: 'Tanvir', avatar: '/placeholder/32/32' },
      created_at: Date.now() - 1000 * 60 * 10,
      views: 15,
      inquiries: 3,
    },
  ]), []);

  const getConditionBadge = (condition) => {
    const badgeClasses = {
      excellent: 'badge-success',
      good: 'badge-primary',
      fair: 'badge-warning',
      poor: 'badge-danger',
    };
    return badgeClasses[condition] || 'badge-secondary';
  };

  const isUnavailable = (item) => {
    if (item.available === false) return true;
    if (typeof item.quantity === 'number') return item.quantity <= 0;
    if ((item.status || '').toLowerCase() === 'unavailable') return true;
    if ((item.status || '').toLowerCase() === 'rented') return true;
    return false;
  };

  // Load items and requested state
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          category: selectedCategory !== 'all' ? selectedCategory : '',
          condition: selectedCondition !== 'all' ? selectedCondition : '',
          sort: sortBy,
          search: searchTerm,
          ...(priceRange.min && { minPrice: priceRange.min }),
          ...(priceRange.max && { maxPrice: priceRange.max }),
        });
        const res = await api.get(`/rentals?${params}`);
        const list = res?.data?.data || res?.data?.items || res?.data || [];
        if (Array.isArray(list) && list.length) {
          setItems(list);
        } else {
          setItems(dummyItems);
          showNotification('Showing sample rentals (no backend data)', 'info');
        }
      } catch (e) {
        console.warn('Failed to load rentals, using dummy:', e);
        setItems(dummyItems);
        showNotification('Showing sample rentals (backend unavailable)', 'info');
      } finally {
        setLoading(false);
      }
    };

    // Load requested set
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setRequested(new Set(JSON.parse(raw)));
    } catch {}

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, selectedCondition, sortBy]);

  // Persist requested changes
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(requested)));
    } catch {}
  }, [requested, storageKey]);

  const handleSearch = (e) => {
    e.preventDefault();
    // trigger reload with current filters
    (async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          category: selectedCategory !== 'all' ? selectedCategory : '',
          condition: selectedCondition !== 'all' ? selectedCondition : '',
          sort: sortBy,
          search: searchTerm,
          ...(priceRange.min && { minPrice: priceRange.min }),
          ...(priceRange.max && { maxPrice: priceRange.max }),
        });
        const res = await api.get(`/rentals?${params}`);
        const list = res?.data?.data || res?.data?.items || res?.data || [];
        setItems(Array.isArray(list) && list.length ? list : dummyItems);
      } catch (e) {
        setItems(dummyItems);
      } finally {
        setLoading(false);
      }
    })();
  };

  const toggleFavorite = (id) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const openDetails = (item) => {
    setSelected(item);
    setIsModalOpen(true);
  };
  const closeDetails = () => {
    setIsModalOpen(false);
    setSelected(null);
  };

  const requestItem = async (item) => {
    if (!item) return;
    if (requested.has(item.id)) {
      showNotification('You have already requested this item', 'info');
      return;
    }
    if (isUnavailable(item)) {
      showNotification('This item is currently unavailable', 'error');
      return;
    }

    try {
      await api.post('/rentals/request', { item_id: item.id });
      setRequested((prev) => new Set(prev).add(item.id));
      // Optional: decrement quantity locally if present
      if (typeof item.quantity === 'number') {
        setItems((prev) => prev.map((it) => it.id === item.id ? { ...it, quantity: Math.max(0, (it.quantity || 0) - 1) } : it));
      }
      showNotification('Request submitted', 'success');
    } catch (e) {
      console.warn('Request failed, using local fallback', e);
      setRequested((prev) => new Set(prev).add(item.id));
      if (typeof item.quantity === 'number') {
        setItems((prev) => prev.map((it) => it.id === item.id ? { ...it, quantity: Math.max(0, (it.quantity || 0) - 1) } : it));
      }
      showNotification('Backend unavailable. Marked as requested locally.', 'info');
    }
  };

  const ItemCard = ({ item }) => (
    <div className="card hover:shadow-xl transition-all duration-300 cursor-pointer group" onClick={() => openDetails(item)}>
      <div className="relative">
        <img src={item.images?.[0] || '/placeholder/400/300'} alt={item.title} className="w-full h-48 object-cover rounded-t-lg" />
        <div className="absolute top-3 right-3 flex space-x-2">
          <button
            onClick={(e) => { e.stopPropagation(); toggleFavorite(item.id); }}
            className={`p-2 rounded-full transition-colors ${favorites.has(item.id) ? 'bg-red-500 text-white' : 'bg-white text-gray-600 hover:text-red-500'}`}
            title={favorites.has(item.id) ? 'Remove favorite' : 'Add favorite'}
          >
            <FiHeart className="w-4 h-4" fill={favorites.has(item.id) ? 'currentColor' : 'none'} />
          </button>
        </div>
        <div className="absolute bottom-3 left-3">
          <span className={`badge ${getConditionBadge(item.condition)}`}>{item.condition || 'N/A'}</span>
        </div>
        {isUnavailable(item) && (
          <div className="absolute top-3 left-3">
            <span className="badge badge-danger">Unavailable</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">{item.title}</h3>
          <span className="text-lg font-bold text-blue-600">৳{item.price?.toLocaleString()}</span>
        </div>
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-xs text-gray-500">
            <FiMapPin className="w-3 h-3 mr-1" />
            {item.location || 'Location not specified'}
          </div>
          <div className="flex items-center text-xs text-gray-500">
            <FiClock className="w-3 h-3 mr-1" />
            {item.timeAgo || 'Recently posted'}
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center"><FiEye className="w-3 h-3 mr-1" />{item.views || 0} views</span>
            <span className="flex items-center"><FiMessageCircle className="w-3 h-3 mr-1" />{item.inquiries || 0} inquiries</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img src={item.seller?.avatar || '/placeholder/32/32'} alt={item.seller?.name} className="w-6 h-6 rounded-full" />
            <span className="text-sm text-gray-600">{item.seller?.name || 'Seller'}</span>
            {item.seller?.isVerified && <span className="badge badge-success text-xs">Verified</span>}
          </div>
          <ChatButton
            sellerId={item.seller?.id || item.seller_id || 'rental-seller'}
            sellerName={item.seller?.name || 'Rental Owner'}
            sellerType="rental"
            itemId={item.id}
            itemName={item.title}
            size="sm"
            variant="outline"
          />
        </div>
      </div>
    </div>
  );

  const ItemListRow = ({ item }) => (
    <div className="card hover:shadow-lg transition-all duration-300 cursor-pointer" onClick={() => openDetails(item)}>
      <div className="p-4 flex space-x-4">
        <img src={item.images?.[0] || '/placeholder/150/150'} alt={item.title} className="w-24 h-24 object-cover rounded-lg" />
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-1">{item.title}</h3>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold text-blue-600">৳{item.price?.toLocaleString()}</span>
              <button
                onClick={(e) => { e.stopPropagation(); toggleFavorite(item.id); }}
                className={`p-1 rounded-full transition-colors ${favorites.has(item.id) ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
              >
                <FiHeart className="w-4 h-4" fill={favorites.has(item.id) ? 'currentColor' : 'none'} />
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.description}</p>
          <div className="flex items-center space-x-4 text-xs text-gray-500 mb-2">
            <span className="flex items-center"><FiMapPin className="w-3 h-3 mr-1" />{item.location}</span>
            <span className="flex items-center"><FiClock className="w-3 h-3 mr-1" />{item.timeAgo || 'Recently posted'}</span>
            <span className={`badge ${getConditionBadge(item.condition)}`}>{item.condition}</span>
            {isUnavailable(item) && <span className="badge badge-danger">Unavailable</span>}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <img src={item.seller?.avatar || '/placeholder/24/24'} alt={item.seller?.name} className="w-5 h-5 rounded-full" />
              <span className="text-sm text-gray-600">{item.seller?.name}</span>
            </div>
            <ChatButton
              sellerId={item.seller?.id || item.seller_id || 'rental-seller'}
              sellerName={item.seller?.name || 'Rental Owner'}
              sellerType="rental"
              itemId={item.id}
              itemName={item.title}
              size="sm"
              variant="outline"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const DetailsModal = ({ open, onClose, item }) => {
    if (!open || !item) return null;
    const already = requested.has(item.id);
    const unavailable = isUnavailable(item);

    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black bg-opacity-40" onClick={onClose} />
        <div className="relative bg-white w-full sm:max-w-3xl sm:rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
          <div className="p-4 sm:p-6 border-b flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">{item.title}</h2>
              <div className="flex items-center text-gray-600 mt-1">
                <FiMapPin className="w-4 h-4 mr-1" />
                <span className="text-sm">{item.location || 'Location not specified'}</span>
              </div>
            </div>
            <button className="text-gray-500 hover:text-gray-700" onClick={onClose} aria-label="Close">✕</button>
          </div>
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <img src={item.images?.[0] || '/placeholder/400/300'} alt={item.title} className="w-full h-56 object-cover rounded" />
              <div className="space-y-3">
                <div>
                  <div className="text-xl font-bold text-blue-600">৳{item.price?.toLocaleString()}</div>
                  {typeof item.quantity === 'number' && (
                    <div className="text-sm text-gray-500">Quantity available: {item.quantity}</div>
                  )}
                  {isUnavailable(item) && (
                    <div className="text-sm text-red-600 font-medium mt-1">Currently unavailable</div>
                  )}
                </div>
                {item.condition && (
                  <div>
                    <div className="text-sm font-medium text-gray-900 mb-1">Condition</div>
                    <span className={`badge ${getConditionBadge(item.condition)}`}>{item.condition}</span>
                  </div>
                )}
                {item.description && (
                  <div>
                    <div className="text-sm font-medium text-gray-900 mb-1">Description</div>
                    <p className="text-gray-700 text-sm leading-relaxed">{item.description}</p>
                  </div>
                )}
                <div>
                  <div className="text-sm font-medium text-gray-900 mb-1">Owner</div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <img src={item.seller?.avatar || '/placeholder/24/24'} alt={item.seller?.name} className="w-5 h-5 rounded-full" />
                    <span>{item.seller?.name || 'Owner'}</span>
                    {item.seller?.isVerified && <span className="badge badge-success text-xs">Verified</span>}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
              <div className="text-sm text-gray-700">One request per user. We’ll notify the owner.</div>
              <button
                onClick={() => requestItem(item)}
                disabled={already || unavailable}
                className={`btn ${already || unavailable ? 'btn-disabled' : 'btn-primary'}`}
                title={already ? 'Already requested' : (unavailable ? 'Unavailable' : 'Request')}
              >
                {already ? 'Requested' : 'Request'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const CreateRentalModal = ({ open, onClose, onSubmit }) => {
    const [form, setForm] = useState({
      title: '',
      category: 'electronics',
      condition: 'good',
      price: '',
      quantity: 1,
      location: '',
      imageUrls: '',
      description: '',
    });

    if (!open) return null;

    const handleChange = (e) => {
      const { name, value } = e.target;
      setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      if (!form.title.trim()) return;
      const payload = {
        title: form.title.trim(),
        category: form.category,
        condition: form.condition,
        price: Number(form.price) || 0,
        quantity: form.quantity === '' ? undefined : Math.max(0, Number(form.quantity)),
        location: form.location.trim(),
        description: form.description.trim(),
        images: form.imageUrls
          ? form.imageUrls.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
      };
      onSubmit?.(payload);
    };

    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black bg-opacity-40" onClick={onClose} />
        <div className="relative bg-white w-full sm:max-w-2xl sm:rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
          <div className="p-4 sm:p-6 border-b flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Post Rental</h2>
            <button className="text-gray-500 hover:text-gray-700" onClick={onClose} aria-label="Close">✕</button>
          </div>
          <form className="p-4 sm:p-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="form-label">Title</label>
              <input name="title" value={form.title} onChange={handleChange} className="form-input w-full" placeholder="e.g., DSLR Camera (Canon 80D)" required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Category</label>
                <select name="category" value={form.category} onChange={handleChange} className="form-input w-full">
                  {categories.filter(c => c.id !== 'all').map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Condition</label>
                <select name="condition" value={form.condition} onChange={handleChange} className="form-input w-full">
                  {conditions.filter(c => c.id !== 'all').map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Price (৳)</label>
                <input type="number" name="price" value={form.price} onChange={handleChange} className="form-input w-full" placeholder="0" min="0" required />
              </div>
              <div>
                <label className="form-label">Quantity</label>
                <input type="number" name="quantity" value={form.quantity} onChange={handleChange} className="form-input w-full" placeholder="1" min="0" />
              </div>
            </div>
            <div>
              <label className="form-label">Location</label>
              <input name="location" value={form.location} onChange={handleChange} className="form-input w-full" placeholder="e.g., Dorm A" />
            </div>
            <div>
              <label className="form-label">Image URLs</label>
              <input name="imageUrls" value={form.imageUrls} onChange={handleChange} className="form-input w-full" placeholder="Comma-separated URLs (optional)" />
            </div>
            <div>
              <label className="form-label">Description</label>
              <textarea name="description" value={form.description} onChange={handleChange} className="form-input w-full min-h-[100px]" placeholder="Describe your rental item..." />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary">Post</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const handleCreateSubmit = async (payload) => {
    try {
      const res = await api.post('/rentals', payload);
      const created = res?.data?.data || res?.data?.item || null;
      const normalize = (it) => ({
        id: it?.id || it?.rental_id || Date.now(),
        title: it?.title || payload.title,
        category: (it?.category || payload.category || '').toLowerCase(),
        condition: (it?.condition || payload.condition || '').toLowerCase(),
        price: Number(it?.price ?? payload.price) || 0,
        quantity: typeof (it?.quantity ?? payload.quantity) === 'number' ? (it?.quantity ?? payload.quantity) : undefined,
        location: it?.location || payload.location,
        description: it?.description || payload.description,
        images: it?.images?.length ? it.images : (payload.images?.length ? payload.images : ['/placeholder/400/300']),
        seller: it?.seller || { id: user?.id || 'me', name: user?.name || user?.fullName || 'You', avatar: '/placeholder/32/32' },
        created_at: it?.created_at || Date.now(),
        views: it?.views || 0,
        inquiries: it?.inquiries || 0,
      });
      const newItem = normalize(created || {});
      setItems((prev) => [newItem, ...prev]);
      showNotification('Rental posted successfully', 'success');
    } catch (e) {
      console.warn('POST /rentals failed, using local prepend', e);
      const localItem = {
        id: Date.now(),
        title: payload.title,
        category: (payload.category || '').toLowerCase(),
        condition: (payload.condition || '').toLowerCase(),
        price: Number(payload.price) || 0,
        quantity: typeof payload.quantity === 'number' ? payload.quantity : undefined,
        location: payload.location,
        description: payload.description,
        images: payload.images?.length ? payload.images : ['/placeholder/400/300'],
        seller: { id: user?.id || 'me', name: user?.name || user?.fullName || 'You', avatar: '/placeholder/32/32' },
        created_at: Date.now(),
        views: 0,
        inquiries: 0,
      };
      setItems((prev) => [localItem, ...prev]);
      showNotification('Backend unavailable. Posted locally for preview.', 'info');
    } finally {
      setIsCreateOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Rentals</h1>
              <p className="text-gray-600 mt-1">Find items you can rent within the campus community</p>
            </div>
            <button className="btn btn-primary flex items-center" onClick={() => setIsCreateOpen(true)}>
              <FiPlus className="w-4 h-4 mr-2" />
              Post
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
            <button type="submit" className="btn btn-primary px-6">Search</button>
            <button type="button" onClick={() => setShowFilters(!showFilters)} className="btn btn-outline px-6 flex items-center">
              <FiFilter className="w-4 h-4 mr-2" />
              Filters
            </button>
          </form>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="form-label">Condition</label>
                <select value={selectedCondition} onChange={(e) => setSelectedCondition(e.target.value)} className="form-input w-full">
                  {conditions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Min Price (৳)</label>
                <input type="number" placeholder="0" value={priceRange.min} onChange={(e) => setPriceRange((p) => ({ ...p, min: e.target.value }))} className="form-input w-full" />
              </div>
              <div>
                <label className="form-label">Max Price (৳)</label>
                <input type="number" placeholder="No limit" value={priceRange.max} onChange={(e) => setPriceRange((p) => ({ ...p, max: e.target.value }))} className="form-input w-full" />
              </div>
              <div>
                <label className="form-label">Sort By</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="form-input w-full">
                  {sortOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
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
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center ${selectedCategory === category.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border'}`}
              >
                <span className="mr-2">{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* View Mode Toggle and Results Count */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600">{loading ? 'Loading...' : `Found ${items.length} items`}</p>
          <div className="flex items-center space-x-2">
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}>
              <FiGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}>
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
        ) : items.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <ItemListRow key={item.id} item={item} />
              ))}
            </div>
          )
        ) : (
          <div className="text-center py-12">
            <FiShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
            <p className="text-gray-500">Try adjusting your search criteria or browse all categories</p>
          </div>
        )}
      </div>

  {/* Modals */}
  <DetailsModal open={isModalOpen} onClose={closeDetails} item={selected} />
  <CreateRentalModal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} onSubmit={handleCreateSubmit} />
    </div>
  );
};

export default Rental;
