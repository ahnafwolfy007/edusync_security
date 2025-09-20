import React, { useEffect, useMemo, useState } from 'react';
import { 
  FiSearch,
  FiFilter,
  FiMapPin,
  FiClock,
  FiBookOpen,
  FiGrid,
  FiList,
  FiTrendingUp,
  FiUser,
  FiDollarSign
} from 'react-icons/fi';
import api from '../api';
import { useNotification } from '../context/NotificationContext';
import ChatButton from '../components/chat/ChatButton';

const Tutoring = () => {
  const { showNotification } = useNotification();

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all'); // all | academic | skills
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedMode, setSelectedMode] = useState('all'); // online | offline | all
  const [rateRange, setRateRange] = useState({ min: '', max: '' });
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);

  const tutorTypes = [
    { id: 'all', name: 'All', icon: '🎓' },
    { id: 'academic', name: 'Academic', icon: '📘' },
    { id: 'skills', name: 'Skills', icon: '🛠️' },
  ];

  const modes = [
    { id: 'all', name: 'Any Mode' },
    { id: 'online', name: 'Online' },
    { id: 'offline', name: 'Offline' },
  ];

  const sortOptions = [
    { id: 'newest', name: 'Newest First' },
    { id: 'oldest', name: 'Oldest First' },
    { id: 'rate_high', name: 'Rate: High to Low' },
    { id: 'rate_low', name: 'Rate: Low to High' },
    { id: 'popular', name: 'Most Popular' },
  ];

  const dummyListings = useMemo(() => ([
    {
      id: 'tutor-201',
      title: 'Math & Physics Tutoring',
      tutor: { id: 'u-501', name: 'Aziz Rahman', avatar: '/placeholder/32/32', isVerified: true },
      type: 'academic',
      subjects: ['Calculus', 'Physics I', 'Algebra'],
      skills: [],
      location: 'Dhaka',
      mode: 'offline',
      rate: '৳800 / hour',
      postedAgo: '3 hours ago',
      studentsHelped: 12,
      description: 'I help students grasp core concepts with problem solving and exam strategies.'
    },
    {
      id: 'tutor-202',
      title: 'Spoken English & IELTS Prep',
      tutor: { id: 'u-502', name: 'Sharmeen Akter', avatar: '/placeholder/32/32', isVerified: true },
      type: 'skills',
      subjects: [],
      skills: ['Spoken English', 'IELTS'],
      location: 'Remote',
      mode: 'online',
      rate: '৳1,200 / hour',
      postedAgo: '1 day ago',
      studentsHelped: 25,
      description: 'Interactive sessions focusing on speaking fluency and test strategies.'
    },
    {
      id: 'tutor-203',
      title: 'Programming with JavaScript',
      tutor: { id: 'u-503', name: 'Tanvir Ahmed', avatar: '/placeholder/32/32', isVerified: false },
      type: 'skills',
      subjects: [],
      skills: ['JavaScript', 'React'],
      location: 'Chittagong',
      mode: 'offline',
      rate: '৳1,000 / hour',
      postedAgo: '5 days ago',
      studentsHelped: 8,
      description: 'Build projects and learn JS fundamentals including DOM, async, and React.'
    },
  ]), []);

  useEffect(() => {
    fetchListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType, selectedLocation, selectedMode, sortBy]);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        type: selectedType !== 'all' ? selectedType : '',
        location: selectedLocation !== 'all' ? selectedLocation : '',
        mode: selectedMode !== 'all' ? selectedMode : '',
        sort: sortBy,
        search: searchTerm,
        ...(rateRange.min && { minRate: rateRange.min }),
        ...(rateRange.max && { maxRate: rateRange.max })
      });
      const response = await api.get(`/tutoring?${params}`);
      const data = response?.data?.data ?? response?.data?.listings ?? [];
      if (!Array.isArray(data) || data.length === 0) {
        setListings(dummyListings);
      } else {
        setListings(data);
      }
    } catch (error) {
      console.error('Error fetching tutoring listings:', error);
      setListings(dummyListings);
      showNotification('Showing sample tutoring listings (backend unavailable)', 'warning');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchListings();
  };

  const openModal = (listing) => {
    setSelectedListing(listing);
    setShowModal(true);
  };
  const closeModal = () => {
    setShowModal(false);
    setSelectedListing(null);
  };

  const Card = ({ listing }) => (
    <div className="card hover:shadow-xl transition-all duration-300 cursor-pointer" onClick={() => openModal(listing)}>
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">{listing.title}</h3>
            <div className="text-sm text-gray-600 flex items-center gap-2">
              <img src={listing.tutor?.avatar || '/placeholder/24/24'} alt={listing.tutor?.name} className="w-5 h-5 rounded-full" />
              {listing.tutor?.name}
            </div>
          </div>
          <span className="badge badge-primary capitalize">{listing.type}</span>
        </div>
        <p className="text-sm text-gray-600 line-clamp-2">{listing.description}</p>
        <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
          <div className="flex items-center"><FiMapPin className="w-3 h-3 mr-2" /> {listing.location || 'N/A'}</div>
          <div className="flex items-center"><FiClock className="w-3 h-3 mr-2" /> {listing.postedAgo || 'Recently'}</div>
          <div className="flex items-center"><FiUser className="w-3 h-3 mr-2" /> {listing.studentsHelped || 0} students</div>
          <div className="flex items-center"><FiDollarSign className="w-3 h-3 mr-2" /> {listing.rate || 'Negotiable'}</div>
        </div>
        {(listing.subjects?.length > 0 || listing.skills?.length > 0) && (
          <div className="flex flex-wrap gap-2">
            {listing.subjects?.map((s) => (<span key={s} className="badge">{s}</span>))}
            {listing.skills?.map((s) => (<span key={s} className="badge">{s}</span>))}
          </div>
        )}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-2">
            {listing.tutor?.isVerified && <span className="badge badge-success text-xs">Verified</span>}
          </div>
          <ChatButton
            sellerId={listing.tutor?.id || 'tutor-guest'}
            sellerName={listing.tutor?.name || 'Tutor'}
            sellerType="business"
            itemId={listing.id}
            itemName={listing.title}
            size="sm"
            variant="outline"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>
    </div>
  );

  const ListItem = ({ listing }) => (
    <div className="card hover:shadow-lg transition-all duration-300 cursor-pointer" onClick={() => openModal(listing)}>
      <div className="p-4 flex space-x-4">
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-semibold text-gray-900">{listing.title}</h3>
              <div className="text-sm text-gray-600 flex items-center gap-2">
                <img src={listing.tutor?.avatar || '/placeholder/24/24'} alt={listing.tutor?.name} className="w-5 h-5 rounded-full" />
                {listing.tutor?.name}
              </div>
            </div>
            <span className="badge badge-primary capitalize">{listing.type}</span>
          </div>
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{listing.description}</p>
          <div className="flex items-center flex-wrap gap-4 text-xs text-gray-600 mb-2">
            <span className="flex items-center"><FiMapPin className="w-3 h-3 mr-1" />{listing.location}</span>
            <span className="flex items-center"><FiClock className="w-3 h-3 mr-1" />{listing.postedAgo}</span>
            <span className="flex items-center"><FiUser className="w-3 h-3 mr-1" />{listing.studentsHelped} students</span>
            <span className="flex items-center"><FiDollarSign className="w-3 h-3 mr-1" />{listing.rate}</span>
            {(listing.subjects?.length > 0 || listing.skills?.length > 0) && (
              <span className="flex items-center gap-1">
                {listing.subjects?.map((s) => (<span key={s} className="badge">{s}</span>))}
                {listing.skills?.map((s) => (<span key={s} className="badge">{s}</span>))}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {listing.tutor?.isVerified && <span className="badge badge-success text-xs">Verified</span>}
            </div>
            <ChatButton
              sellerId={listing.tutor?.id || 'tutor-guest'}
              sellerName={listing.tutor?.name || 'Tutor'}
              sellerType="business"
              itemId={listing.id}
              itemName={listing.title}
              size="sm"
              variant="outline"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const DetailsModal = ({ listing, isOpen, onClose }) => {
    if (!isOpen || !listing) return null;
    const subjects = listing.subjects?.length ? listing.subjects : ['General Tutoring'];
    const skills = listing.skills?.length ? listing.skills : ['Study Strategies'];
    const schedule = listing.schedule || ['Flexible schedule', 'Evenings or weekends available'];
    const highlights = listing.highlights || ['Personalized lesson plans', 'Homework help', 'Exam preparation'];
    const howToStart = listing.howToStart || 'Click Chat to contact the tutor and discuss your needs and schedule.';

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="p-6 border-b flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">{listing.title}</h3>
              <div className="text-sm text-gray-600 flex items-center gap-2">
                <img src={listing.tutor?.avatar || '/placeholder/24/24'} alt={listing.tutor?.name} className="w-5 h-5 rounded-full" />
                {listing.tutor?.name}
              </div>
            </div>
            <button onClick={onClose} className="btn btn-outline">✕</button>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex flex-wrap gap-3">
              <span className="badge badge-primary capitalize flex items-center"><FiBookOpen className="w-3 h-3 mr-1" /> {listing.type || 'Tutoring'}</span>
              <span className="badge flex items-center"><FiMapPin className="w-3 h-3 mr-1" /> {listing.location || 'N/A'}</span>
              <span className="badge flex items-center"><FiClock className="w-3 h-3 mr-1" /> {listing.postedAgo || 'Recently'}</span>
              <span className="badge flex items-center"><FiDollarSign className="w-3 h-3 mr-1" /> {listing.rate || 'Negotiable'}</span>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Overview</h4>
              <p className="text-gray-700 text-sm leading-6">{listing.description || 'No description provided.'}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Subjects</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                  {subjects.map((s, i) => (<li key={i}>{s}</li>))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Skills</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                  {skills.map((s, i) => (<li key={i}>{s}</li>))}
                </ul>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Schedule</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                  {schedule.map((s, i) => (<li key={i}>{s}</li>))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Highlights</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                  {highlights.map((s, i) => (<li key={i}>{s}</li>))}
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-between bg-gray-50 border rounded-lg p-4">
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">How to Start</h4>
                <p className="text-sm text-gray-700">{howToStart}</p>
              </div>
              <ChatButton
                sellerId={listing.tutor?.id || 'tutor-guest'}
                sellerName={listing.tutor?.name || 'Tutor'}
                sellerType="business"
                itemId={listing.id}
                itemName={listing.title}
                size="md"
                variant="filled"
              />
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
          <div className="py-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tutoring</h1>
              <p className="text-gray-600 mt-1">Find academic support or learn new skills</p>
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
                  placeholder="Search subjects, skills, keywords..."
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

          {showFilters && (
            <div className="mt-6 pt-6 border-t grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="form-label">Location</label>
                <select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)} className="form-input w-full">
                  <option value="all">All Locations</option>
                  <option value="Dhaka">Dhaka</option>
                  <option value="Chittagong">Chittagong</option>
                  <option value="Sylhet">Sylhet</option>
                  <option value="Remote">Remote</option>
                </select>
              </div>
              <div>
                <label className="form-label">Mode</label>
                <select value={selectedMode} onChange={(e) => setSelectedMode(e.target.value)} className="form-input w-full">
                  {modes.map(l => (<option key={l.id} value={l.id}>{l.name}</option>))}
                </select>
              </div>
              <div>
                <label className="form-label">Min Rate (৳/hour)</label>
                <input type="number" placeholder="0" value={rateRange.min} onChange={(e) => setRateRange(prev => ({ ...prev, min: e.target.value }))} className="form-input w-full" />
              </div>
              <div>
                <label className="form-label">Max Rate (৳/hour)</label>
                <input type="number" placeholder="No limit" value={rateRange.max} onChange={(e) => setRateRange(prev => ({ ...prev, max: e.target.value }))} className="form-input w-full" />
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

        {/* Type Tabs */}
        <div className="mb-8">
          <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
            {tutorTypes.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedType(t.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center ${
                  selectedType === t.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border'
                }`}
              >
                <span className="mr-2">{t.icon}</span>
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* View Mode / Count */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600">{loading ? 'Loading...' : `Found ${listings.length} tutors`}</p>
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
                <div className="skeleton h-28 w-full"></div>
                <div className="p-4 space-y-3">
                  <div className="skeleton h-4 w-3/4"></div>
                  <div className="skeleton h-3 w-full"></div>
                  <div className="skeleton h-3 w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : listings.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((listing) => (
                <Card key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {listings.map((listing) => (
                <ListItem key={listing.id} listing={listing} />
              ))}
            </div>
          )
        ) : (
          <div className="text-center py-12">
            <FiTrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tutoring listings found</h3>
            <p className="text-gray-500">Try adjusting your search criteria or browse all types</p>
          </div>
        )}
      </div>

      {/* Details Modal */}
      <DetailsModal listing={selectedListing} isOpen={showModal} onClose={closeModal} />
    </div>
  );
};

export default Tutoring;
