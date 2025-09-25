import React, { useEffect, useMemo, useState } from 'react';
import { FiSearch, FiFilter, FiMapPin, FiClock, FiHeart, FiGrid, FiList, FiShoppingBag, FiEye, FiMessageCircle, FiPlus } from 'react-icons/fi';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

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

const sortOptions = [
  { id: 'newest', name: 'Newest First' },
  { id: 'oldest', name: 'Oldest First' },
  { id: 'popular', name: 'Most Popular' }
];

const Giveaway = () => {
  const { user } = useAuth?.() || { user: null };
  const { showNotification } = useNotification();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);

  const [selected, setSelected] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [favorites, setFavorites] = useState(() => new Set());
  const [requested, setRequested] = useState(() => new Set());

  const storageKey = useMemo(() => {
    const id = user?.id || user?._id || user?.userId || 'guest';
    return `giveawayRequests:${id}`;
  }, [user]);

  const dummyItems = useMemo(() => ([
    {
      id: 7001,
      title: 'Free Study Table - Good Condition',
      category: 'furniture',
      location: 'Dorm A Lobby',
      description: 'Sturdy wooden table. Minor scratches. Pickup only.',
      images: ['/placeholder/400/300'],
      seller: { id: 'g1', name: 'Rafi', avatar: '/placeholder/32/32' },
      timeAgo: 'just now',
      views: 8,
      inquiries: 2,
    },
    {
      id: 7002,
      title: 'Bundle of First-year Books',
      category: 'books',
      location: 'Library Entrance',
      description: 'Complete set. Take all, please pass on when done.',
      images: ['/placeholder/400/300'],
      seller: { id: 'g2', name: 'Nusrat', avatar: '/placeholder/32/32' },
      timeAgo: '1 hour ago',
      views: 15,
      inquiries: 3,
    },
    {
      id: 7003,
      title: 'Old Smartphone (Works)',
      category: 'electronics',
      location: 'Hall C',
      description: 'Battery isn\'t great but functional. Charger included.',
      images: ['/placeholder/400/300'],
      seller: { id: 'g3', name: 'Arif', avatar: '/placeholder/32/32' },
      timeAgo: '2 hours ago',
      views: 22,
      inquiries: 5,
    },
  ]), []);

  // init requested set
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setRequested(new Set(JSON.parse(raw)));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // persist requested
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(Array.from(requested))); } catch {}
  }, [requested, storageKey]);

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, sortBy]);

  const normalizeItems = (list) => list.map((r) => ({
    id: r.id || r.item_id,
    title: r.title || r.item_name,
    description: r.description,
    category: (r.category || r.category_name || '').toLowerCase(),
    location: r.location || r.pickup_location,
    images: r.images || [],
    seller: r.seller || r.giver || { id: r.seller_id || r.giver_id, name: r.seller_name || r.giver_name },
    timeAgo: r.timeAgo || r.posted_ago,
    views: r.views || r.view_count,
    inquiries: r.inquiries || r.message_count,
    available: r.available !== undefined ? r.available : true,
    status: r.status,
    quantity: r.quantity,
  }));

  const fetchItems = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        category: selectedCategory !== 'all' ? selectedCategory : '',
        sort: sortBy,
        search: searchTerm,
      });
      const res = await api.get(`/giveaway?${params}`);
      const data = res?.data?.data ?? res?.data?.items ?? res?.data ?? [];
      if (Array.isArray(data) && data.length) {
        setItems(normalizeItems(data));
      } else {
        setItems(dummyItems);
        showNotification('Showing sample giveaway items (no backend data)', 'info');
      }
    } catch (e) {
      console.warn('Giveaway fetch failed, using dummy', e);
      setItems(dummyItems);
      showNotification('Showing sample giveaway items (backend unavailable)', 'info');
    } finally {
      setLoading(false);
    }
  };

  const isUnavailable = (item) => {
    if (item.available === false) return true;
    const status = (item.status || '').toLowerCase();
    if (status === 'requested' || status === 'unavailable' || status === 'given') return true;
    if (typeof item.quantity === 'number') return item.quantity <= 0;
    return false;
  };

  const toggleFavorite = (id) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openDetails = (it) => { setSelected(it); setIsModalOpen(true); };
  const closeDetails = () => { setIsModalOpen(false); setSelected(null); };

  const requestItem = async (item) => {
    if (!item) return;
    if (requested.has(item.id)) { showNotification('You already requested this', 'info'); return; }
    if (isUnavailable(item)) { showNotification('This item is unavailable', 'error'); return; }
    try {
      await api.post('/giveaway/request', { item_id: item.id });
      setRequested((prev) => new Set(prev).add(item.id));
      setItems((prev) => prev.map((it) => it.id === item.id ? { ...it, available: false, status: 'requested', quantity: 0 } : it));
      showNotification('Request placed. The giver will be notified.', 'success');
    } catch (e) {
      console.warn('Request failed; marking locally', e);
      setRequested((prev) => new Set(prev).add(item.id));
      setItems((prev) => prev.map((it) => it.id === item.id ? { ...it, available: false, status: 'requested', quantity: 0 } : it));
      showNotification('Backend unavailable. Marked as requested locally.', 'info');
    }
  };

  const handleSearch = (e) => { e.preventDefault(); fetchItems(); };

  const ItemCard = ({ item }) => (
    <div className="card hover:shadow-xl transition-all duration-300 cursor-pointer group" onClick={() => openDetails(item)}>
      <div className="relative">
        <img src={item.images?.[0] || '/placeholder/400/300'} alt={item.title} className="w-full h-48 object-cover rounded-t-lg" />
        <div className="absolute top-3 right-3 flex space-x-2">
          <button onClick={(e) => { e.stopPropagation(); toggleFavorite(item.id); }} className={`p-2 rounded-full transition-colors ${favorites.has(item.id) ? 'bg-red-500 text-white' : 'bg-white text-gray-600 hover:text-red-500'}`}
            title={favorites.has(item.id) ? 'Remove favorite' : 'Add favorite'}>
            <FiHeart className="w-4 h-4" fill={favorites.has(item.id) ? 'currentColor' : 'none'} />
          </button>
        </div>
        <div className="absolute top-3 left-3"><span className="badge badge-success">FREE</span></div>
        {isUnavailable(item) && (
          <div className="absolute bottom-3 left-3"><span className="badge badge-danger">Unavailable</span></div>
        )}
      </div>
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">{item.title}</h3>
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-50 text-blue-700">{item.category}</span>
        </div>
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-xs text-gray-500"><FiMapPin className="w-3 h-3 mr-1" />{item.location || 'Location not specified'}</div>
          <div className="flex items-center text-xs text-gray-500"><FiClock className="w-3 h-3 mr-1" />Posted {item.timeAgo || 'recently'}</div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center"><FiEye className="w-3 h-3 mr-1" />{item.views || 0} views</span>
            <span className="flex items-center"><FiMessageCircle className="w-3 h-3 mr-1" />{item.inquiries || 0} inquiries</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <img src={item.seller?.avatar || '/placeholder/24/24'} alt={item.seller?.name} className="w-5 h-5 rounded-full" />
          <span>{item.seller?.name || 'Giver'}</span>
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
              <span className="badge badge-success">FREE</span>
              <button onClick={(e) => { e.stopPropagation(); toggleFavorite(item.id); }} className={`p-1 rounded-full transition-colors ${favorites.has(item.id) ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}>
                <FiHeart className="w-4 h-4" fill={favorites.has(item.id) ? 'currentColor' : 'none'} />
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.description}</p>
          <div className="flex items-center space-x-4 text-xs text-gray-500 mb-2">
            <span className="flex items-center"><FiMapPin className="w-3 h-3 mr-1" />{item.location}</span>
            <span className="flex items-center"><FiClock className="w-3 h-3 mr-1" />{item.timeAgo || 'recently'}</span>
            {isUnavailable(item) && <span className="badge badge-danger">Unavailable</span>}
          </div>
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <span className="flex items-center"><FiEye className="w-3 h-3 mr-1" />{item.views || 0}</span>
            <span className="flex items-center"><FiMessageCircle className="w-3 h-3 mr-1" />{item.inquiries || 0}</span>
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
              <div className="flex items-center text-gray-600 mt-1"><FiMapPin className="w-4 h-4 mr-1" /><span className="text-sm">{item.location || 'Location not specified'}</span></div>
            </div>
            <button className="text-gray-500 hover:text-gray-700" onClick={onClose} aria-label="Close">✕</button>
          </div>
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <img src={item.images?.[0] || '/placeholder/400/300'} alt={item.title} className="w-full h-56 object-cover rounded" />
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium text-gray-900 mb-1">Type</div>
                  <span className="badge badge-success">FREE GIVEAWAY</span>
                  {unavailable && <div className="text-sm text-red-600 font-medium mt-2">Already requested/unavailable</div>}
                </div>
                {item.description && (
                  <div>
                    <div className="text-sm font-medium text-gray-900 mb-1">Description</div>
                    <p className="text-gray-700 text-sm leading-relaxed">{item.description}</p>
                  </div>
                )}
                <div>
                  <div className="text-sm font-medium text-gray-900 mb-1">Giver</div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <img src={item.seller?.avatar || '/placeholder/24/24'} alt={item.seller?.name} className="w-5 h-5 rounded-full" />
                    <span>{item.seller?.name || 'Giver'}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
              <div className="text-sm text-gray-700">One request per item. First come, first served.</div>
              <button onClick={() => requestItem(item)} disabled={already || unavailable} className={`btn ${already || unavailable ? 'btn-disabled' : 'btn-primary'}`} title={already ? 'Already requested' : (unavailable ? 'Unavailable' : 'Request')}>
                {already ? 'Requested' : 'Request'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const CreateGiveawayModal = ({ open, onClose, onSubmit }) => {
    const [form, setForm] = useState({
      title: '',
      category: 'electronics',
      location: '',
      imageUrls: '',
      description: '',
    });
    if (!open) return null;
    const handleChange = (e) => {
      const { name, value } = e.target; setForm((p) => ({ ...p, [name]: value }));
    };
    const handleSubmit = (e) => {
      e.preventDefault();
      if (!form.title.trim()) return;
      const payload = {
        title: form.title.trim(),
        category: form.category,
        location: form.location.trim(),
        images: form.imageUrls ? form.imageUrls.split(',').map((s) => s.trim()).filter(Boolean) : [],
        description: form.description.trim(),
      };
      onSubmit?.(payload);
    };
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black bg-opacity-40" onClick={onClose} />
        <div className="relative bg-white w-full sm:max-w-2xl sm:rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
          <div className="p-4 sm:p-6 border-b flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Create Giveaway</h2>
            <button className="text-gray-500 hover:text-gray-700" onClick={onClose} aria-label="Close">✕</button>
          </div>
          <form className="p-4 sm:p-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="form-label">Title</label>
              <input name="title" value={form.title} onChange={handleChange} className="form-input w-full" placeholder="e.g., Study Table (Free)" required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Category</label>
                <select name="category" value={form.category} onChange={handleChange} className="form-input w-full">
                  {categories.filter((c) => c.id !== 'all').map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Location</label>
                <input name="location" value={form.location} onChange={handleChange} className="form-input w-full" placeholder="e.g., Dorm A Lobby" />
              </div>
            </div>
            <div>
              <label className="form-label">Image URLs</label>
              <input name="imageUrls" value={form.imageUrls} onChange={handleChange} className="form-input w-full" placeholder="Comma-separated URLs (optional)" />
            </div>
            <div>
              <label className="form-label">Description</label>
              <textarea name="description" value={form.description} onChange={handleChange} className="form-input w-full min-h-[100px]" placeholder="Describe the item and pickup details..." />
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
      const res = await api.post('/giveaway', payload);
      const created = res?.data?.data || res?.data?.item || null;
      const normalize = (it) => ({
        id: it?.id || it?.item_id || Date.now(),
        title: it?.title || payload.title,
        category: (it?.category || payload.category || '').toLowerCase(),
        location: it?.location || payload.location,
        description: it?.description || payload.description,
        images: it?.images?.length ? it.images : (payload.images?.length ? payload.images : ['/placeholder/400/300']),
        seller: it?.seller || { id: user?.id || 'me', name: user?.name || user?.fullName || 'You', avatar: '/placeholder/32/32' },
        timeAgo: 'just now',
        views: 0,
        inquiries: 0,
      });
      const newItem = normalize(created || {});
      setItems((prev) => [newItem, ...prev]);
      showNotification('Giveaway posted successfully', 'success');
    } catch (e) {
      console.warn('POST /giveaway failed, using local prepend', e);
      const localItem = {
        id: Date.now(),
        title: payload.title,
        category: (payload.category || '').toLowerCase(),
        location: payload.location,
        description: payload.description,
        images: payload.images?.length ? payload.images : ['/placeholder/400/300'],
        seller: { id: user?.id || 'me', name: user?.name || user?.fullName || 'You', avatar: '/placeholder/32/32' },
        timeAgo: 'just now',
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
              <h1 className="text-2xl font-bold text-gray-900">Giveaway</h1>
              <p className="text-gray-600 mt-1">Claim free items from the community</p>
            </div>
            <button className="btn btn-primary flex items-center" onClick={() => setIsCreateOpen(true)}>
              <FiPlus className="w-4 h-4 mr-2" />
              Create
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
                <input type="text" placeholder="Search items, keywords..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="form-input pl-10 w-full" />
              </div>
            </div>
            <button type="submit" className="btn btn-primary px-6">Search</button>
            <button type="button" onClick={() => setShowFilters(!showFilters)} className="btn btn-outline px-6 flex items-center">
              <FiFilter className="w-4 h-4 mr-2" />
              Filters
            </button>
          </form>

          {showFilters && (
            <div className="mt-6 pt-6 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="form-label">Category</label>
                <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="form-input w-full">
                  {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </div>
              <div>
                <label className="form-label">Sort By</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="form-input w-full">
                  {sortOptions.map((o) => (<option key={o.id} value={o.id}>{o.name}</option>))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Category Tabs */}
        <div className="mb-8">
          <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
            {categories.map((category) => (
              <button key={category.id} onClick={() => setSelectedCategory(category.id)} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center ${selectedCategory === category.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border'}`}>
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
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}><FiGrid className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}><FiList className="w-4 h-4" /></button>
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
              {items.map((item) => (<ItemCard key={item.id} item={item} />))}
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (<ItemListRow key={item.id} item={item} />))}
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
      <CreateGiveawayModal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} onSubmit={handleCreateSubmit} />
    </div>
  );
};

export default Giveaway;
