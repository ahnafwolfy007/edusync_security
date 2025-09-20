import React, { useEffect, useMemo, useState } from 'react';
import {
  FiSearch,
  FiFilter,
  FiMapPin,
  FiClock,
  FiImage,
  FiPlus,
  FiTag
} from 'react-icons/fi';
import api from '../api';
import { useNotification } from '../context/NotificationContext';

const LostFound = () => {
  const { showNotification } = useNotification();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all'); // all | lost | found
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', description: '', location: '', type: 'lost', image: '' });

  const typeTabs = [
    { id: 'all', name: 'All' },
    { id: 'lost', name: 'Lost' },
    { id: 'found', name: 'Found' },
  ];

  const sortOptions = [
    { id: 'newest', name: 'Newest First' },
    { id: 'oldest', name: 'Oldest First' },
    { id: 'popular', name: 'Most Popular' },
  ];

  const dummyPosts = useMemo(() => ([
    {
      id: 'lf-301',
      title: 'Lost: Black Wallet',
      description: 'Lost a black leather wallet near the cafeteria. Contains ID and cards. Reward offered.',
      location: 'UIU Cafeteria',
      postedAgo: '2 hours ago',
      status: 'lost',
      image: 'https://images.unsplash.com/photo-1517502166878-35c93a0072f2?q=80&w=1200&auto=format&fit=crop',
    },
    {
      id: 'lf-302',
      title: 'Found: Maths Textbook',
      description: 'Found a Calculus textbook in Room 402. Describe the name on it to claim.',
      location: 'Building 4, Room 402',
      postedAgo: '1 day ago',
      status: 'found',
      image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1200&auto=format&fit=crop',
    },
    {
      id: 'lf-303',
      title: 'Lost: Blue Umbrella',
      description: 'Forgot my umbrella in the library reading area. Please inform if found.',
      location: 'Central Library',
      postedAgo: '3 days ago',
      status: 'lost',
      image: 'https://images.unsplash.com/photo-1503437313881-503a91226402?q=80&w=1200&auto=format&fit=crop',
    },
  ]), []);

  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType, selectedLocation, sortBy]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        type: selectedType !== 'all' ? selectedType : '',
        location: selectedLocation !== 'all' ? selectedLocation : '',
        sort: sortBy,
        search: searchTerm,
      });

      const response = await api.get(`/lost-found?${params}`);
      const data = response?.data?.data ?? response?.data?.posts ?? [];
      if (!Array.isArray(data) || data.length === 0) {
        setPosts(dummyPosts);
      } else {
        setPosts(data);
      }
    } catch (error) {
      console.error('Error fetching lost/found posts:', error);
      setPosts(dummyPosts);
      showNotification('Showing sample lost & found posts (backend unavailable)', 'warning');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchPosts();
  };

  const createPost = (e) => {
    e.preventDefault();
    // Frontend-only create to demonstrate flow
    const temp = {
      id: `lf_${Date.now()}`,
      title: `${newPost.type === 'found' ? 'Found' : 'Lost'}: ${newPost.title || 'Untitled'}`,
      description: newPost.description || 'No description provided.',
      location: newPost.location || 'Unknown',
      postedAgo: 'Just now',
      status: newPost.type,
      image: newPost.image || 'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1200&auto=format&fit=crop'
    };
    setPosts((prev) => [temp, ...prev]);
    setShowCreate(false);
    setNewPost({ title: '', description: '', location: '', type: 'lost', image: '' });
    showNotification('Post created (demo)', 'success');
  };

  const StatusBadge = ({ status }) => (
    <span className={`inline-flex items-center text-xs font-semibold px-2 py-1 rounded ${
      status === 'found' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'
    }`}>
      <FiTag className="w-3 h-3 mr-1" />
      {status === 'found' ? 'Found' : 'Lost'}
    </span>
  );

  const ListCard = ({ post }) => (
    <div className="card hover:shadow-lg transition-all duration-300">
      <div className="p-0 flex">
        {/* Left half: details */}
        <div className="w-1/2 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-gray-900 pr-3 line-clamp-1">{post.title}</h3>
              <StatusBadge status={post.status} />
            </div>
            <p className="text-sm text-gray-600 mb-3 line-clamp-3">{post.description}</p>
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <span className="flex items-center"><FiMapPin className="w-3 h-3 mr-1" />{post.location || 'N/A'}</span>
              <span className="flex items-center"><FiClock className="w-3 h-3 mr-1" />{post.postedAgo || 'Recently'}</span>
            </div>
          </div>
        </div>
        {/* Right half: image */}
        <div className="w-1/2 h-44 md:h-52 lg:h-56 relative bg-gray-100">
          {post.image ? (
            <img src={post.image} alt={post.title} className="absolute inset-0 w-full h-full object-cover rounded-r-lg" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              <FiImage className="w-10 h-10" />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const CreateModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
          <div className="p-6 border-b flex items-center justify-between">
            <h3 className="text-lg font-bold">Create Lost/Found Post</h3>
            <button onClick={onClose} className="btn btn-outline">✕</button>
          </div>
          <form onSubmit={createPost} className="p-6 space-y-4">
            <div>
              <label className="form-label">Type</label>
              <select value={newPost.type} onChange={(e) => setNewPost(prev => ({ ...prev, type: e.target.value }))} className="form-input w-full">
                <option value="lost">Lost</option>
                <option value="found">Found</option>
              </select>
            </div>
            <div>
              <label className="form-label">Title</label>
              <input value={newPost.title} onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))} className="form-input w-full" placeholder="e.g., Black Wallet" />
            </div>
            <div>
              <label className="form-label">Description</label>
              <textarea value={newPost.description} onChange={(e) => setNewPost(prev => ({ ...prev, description: e.target.value }))} className="form-input w-full" rows={4} placeholder="Describe the item and where you lost/found it..." />
            </div>
            <div>
              <label className="form-label">Location</label>
              <input value={newPost.location} onChange={(e) => setNewPost(prev => ({ ...prev, location: e.target.value }))} className="form-input w-full" placeholder="e.g., UIU Cafeteria" />
            </div>
            <div>
              <label className="form-label">Image URL (optional)</label>
              <input value={newPost.image} onChange={(e) => setNewPost(prev => ({ ...prev, image: e.target.value }))} className="form-input w-full" placeholder="https://..." />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn btn-outline">Cancel</button>
              <button type="submit" className="btn btn-primary">Create</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Lost &amp; Found</h1>
              <p className="text-gray-600 mt-1">Report lost items or publish found items with image evidence</p>
            </div>
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
                  placeholder="Search titles, locations..."
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
            <button type="button" onClick={() => setShowCreate(true)} className="btn btn-success px-6 flex items-center">
              <FiPlus className="w-4 h-4 mr-2" />
              Create
            </button>
          </form>

          {showFilters && (
            <div className="mt-6 pt-6 border-t grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="form-label">Type</label>
                <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="form-input w-full">
                  {typeTabs.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
                </select>
              </div>
              <div>
                <label className="form-label">Location</label>
                <select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)} className="form-input w-full">
                  <option value="all">All Locations</option>
                  <option value="UIU Cafeteria">UIU Cafeteria</option>
                  <option value="Central Library">Central Library</option>
                  <option value="Building 4">Building 4</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="form-label">Sort By</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="form-input w-full">
                  {sortOptions.map(o => (<option key={o.id} value={o.id}>{o.name}</option>))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex space-x-2 overflow-x-auto scrollbar-hide">
            {typeTabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedType(t.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedType === t.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* Results - List view rectangular split cards */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card">
                <div className="skeleton h-44 w-full"></div>
              </div>
            ))}
          </div>
        ) : posts.length > 0 ? (
          <div className="space-y-4">
            {posts.map((post) => (
              <ListCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FiImage className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No posts found</h3>
            <p className="text-gray-500">Try adjusting your search criteria or create a new post</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <CreateModal isOpen={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
};

export default LostFound;
