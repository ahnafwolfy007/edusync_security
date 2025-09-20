import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiHome,
  FiMapPin,
  FiMaximize,
  FiPhone,
  FiMail,
  FiSearch,
  FiHeart,
  FiShare2,
  FiStar,
  FiShield,
  FiGrid,
  FiList,
} from 'react-icons/fi';
import { FaBed, FaBath } from 'react-icons/fa';
import api from '../api';
import { useNotification } from '../context/NotificationContext';

const types = [
  { id: 'all', name: 'All', icon: FiHome },
  { id: 'seat', name: 'Seat', icon: FaBed },
  { id: 'room', name: 'Room', icon: FaBed },
  { id: 'flat', name: 'Flat', icon: FiHome },
];

const locations = ['Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi', 'Khulna', 'Barisal', 'Rangpur', 'Mymensingh'];

const AccommodationMarket = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [selectedLocation, setSelectedLocation] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [view, setView] = useState('grid');
  const [sortBy, setSortBy] = useState('newest');
  const [selected, setSelected] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const dummyProperties = useMemo(() => [
    {
      id: 101,
      title: 'Cozy Seat in Shared Room near Campus',
      property_type: 'seat',
      monthly_rent: 3500,
      security_deposit: 2000,
      location: 'Dhaka, Mirpur 10',
      bedrooms: 1,
      bathrooms: 1,
      area_sqft: 120,
      amenities: ['WiFi', 'Furnished', 'Water 24/7'],
      images: ['/placeholder/400/250'],
      owner_name: 'Arif Hasan',
      owner_rating: 4.6,
      contact_phone: '+8801700000000',
      contact_email: 'arif@example.com',
      is_verified: true,
      description: 'One seat available in a clean shared room, 5 minutes from campus gate.',
    },
    {
      id: 102,
      title: 'Spacious Room with Balcony',
      property_type: 'room',
      monthly_rent: 8500,
      security_deposit: 5000,
      location: 'Chittagong, Agrabad',
      bedrooms: 1,
      bathrooms: 1,
      area_sqft: 220,
      amenities: ['WiFi', 'Attached Bath', 'Balcony'],
      images: ['/placeholder/400/250'],
      owner_name: 'Sultana Rahman',
      owner_rating: 4.2,
      contact_phone: '+8801800000000',
      contact_email: 'sultana@example.com',
      is_verified: false,
      description: 'Bright room with attached bath and balcony, close to bus stop.',
    },
    {
      id: 103,
      title: '2-Bedroom Family Flat',
      property_type: 'flat',
      monthly_rent: 20000,
      security_deposit: 15000,
      location: 'Sylhet, Zindabazar',
      bedrooms: 2,
      bathrooms: 2,
      area_sqft: 750,
      amenities: ['Generator', 'Parking', 'Lift'],
      images: ['/placeholder/400/250'],
      owner_name: 'Mahfuz Alam',
      owner_rating: 4.8,
      contact_phone: '+8801900000000',
      contact_email: 'mahfuz@example.com',
      is_verified: true,
      description: 'Well-maintained flat ideal for small family or 3-4 students sharing.',
    },
  ], []);

  useEffect(() => {
    fetchProperties();
    fetchFavorites();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const response = await api.get('/accommodation/properties');
      const list = response?.data?.properties || [];
      setProperties(Array.isArray(list) && list.length ? list : dummyProperties);
      if (!Array.isArray(list) || list.length === 0) {
        showNotification('Showing sample accommodation listings', 'info');
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
      setProperties(dummyProperties);
      showNotification('Showing sample accommodation listings', 'info');
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    try {
      const response = await api.get('/accommodation/favorites');
      setFavorites(response.data.favorites?.map((f) => f.property_id) || []);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const filteredProperties = useMemo(() => {
    let filtered = [...properties];
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      filtered = filtered.filter(
        (p) =>
          p.title?.toLowerCase().includes(term) ||
          p.description?.toLowerCase().includes(term) ||
          p.location?.toLowerCase().includes(term)
      );
    }
    if (selectedType !== 'all') {
      filtered = filtered.filter((p) => (p.property_type || '').toLowerCase() === selectedType);
    }
    if (selectedLocation) {
      const loc = selectedLocation.toLowerCase();
      filtered = filtered.filter((p) => p.location?.toLowerCase().includes(loc));
    }
    const min = parseInt(priceRange.min || '');
    const max = parseInt(priceRange.max || '');
    if (!Number.isNaN(min)) filtered = filtered.filter((p) => (p.monthly_rent || 0) >= min);
    if (!Number.isNaN(max)) filtered = filtered.filter((p) => (p.monthly_rent || 0) <= max);
    if (sortBy === 'price-asc') filtered.sort((a, b) => (a.monthly_rent || 0) - (b.monthly_rent || 0));
    else if (sortBy === 'price-desc') filtered.sort((a, b) => (b.monthly_rent || 0) - (a.monthly_rent || 0));
    else if (sortBy === 'newest') filtered.sort((a, b) => (b.created_at || b.id || 0) - (a.created_at || a.id || 0));
    return filtered;
  }, [properties, searchTerm, selectedType, priceRange, selectedLocation, sortBy]);

  const toggleFavorite = async (propertyId) => {
    try {
      const isFav = favorites.includes(propertyId);
      if (isFav) {
        await api.delete(`/accommodation/favorites/${propertyId}`);
        setFavorites((prev) => prev.filter((id) => id !== propertyId));
        showNotification('Removed from favorites', 'success');
      } else {
        await api.post('/accommodation/favorites', { property_id: propertyId });
        setFavorites((prev) => [...prev, propertyId]);
        showNotification('Added to favorites', 'success');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      showNotification('Error updating favorites', 'error');
    }
  };

  const openDetails = (property) => {
    setSelected(property);
    setIsModalOpen(true);
  };
  const closeDetails = () => {
    setIsModalOpen(false);
    setSelected(null);
  };

  const handleCreateSubmit = async (formData) => {
    const nowId = Date.now();
    // Normalize form data into property payload
    const images = (formData.images || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const amenities = (formData.amenities || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      title: formData.title?.trim(),
      property_type: formData.type,
      monthly_rent: Number(formData.monthly_rent) || 0,
      security_deposit: Number(formData.security_deposit) || 0,
      location: formData.location?.trim(),
      bedrooms: formData.bedrooms ? Number(formData.bedrooms) : undefined,
      bathrooms: formData.bathrooms ? Number(formData.bathrooms) : undefined,
      area_sqft: formData.area_sqft ? Number(formData.area_sqft) : undefined,
      amenities,
      images: images.length ? images : ['/placeholder/400/250'],
      owner_name: formData.owner_name?.trim() || 'Property Owner',
      owner_rating: 0,
      contact_phone: formData.contact_phone?.trim() || '',
      contact_email: formData.contact_email?.trim() || '',
      is_verified: !!formData.is_verified,
      description: formData.description?.trim() || '',
      created_at: Date.now(),
    };

    // Basic front-end validation
    if (!payload.title || !payload.property_type || !payload.monthly_rent || !payload.location) {
      showNotification('Please fill Title, Type, Price, and Location', 'error');
      return false;
    }

    try {
      const resp = await api.post('/accommodation/properties', payload);
      const created = resp?.data?.property || { id: nowId, ...payload };
      setProperties((prev) => [created, ...prev]);
      showNotification('Property posted successfully', 'success');
      setIsCreateOpen(false);
      return true;
    } catch (error) {
      console.warn('Create property failed, using local fallback:', error);
      const created = { id: nowId, ...payload };
      setProperties((prev) => [created, ...prev]);
      showNotification('Backend unavailable. Added locally for preview.', 'info');
      setIsCreateOpen(false);
      return true;
    }
  };

  const PropertyCard = ({ property }) => {
    const isFavorite = favorites.includes(property.id);
    return (
      <div className="card hover:shadow-lg transition-all duration-300 cursor-pointer group" onClick={() => openDetails(property)}>
        <div className="relative">
          <img src={property.images?.[0] || '/placeholder/400/250'} alt={property.title} className="w-full h-48 object-cover rounded-t-lg" />
          <div className="absolute top-2 right-2 flex space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(property.id);
              }}
              className={`p-2 rounded-full ${isFavorite ? 'bg-red-500 text-white' : 'bg-white text-gray-600'} hover:scale-110 transition-transform`}
              title={isFavorite ? 'Remove Favorite' : 'Add Favorite'}
            >
              <FiHeart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
            <button className="p-2 bg-white text-gray-600 rounded-full hover:scale-110 transition-transform" onClick={(e) => e.stopPropagation()} title="Share">
              <FiShare2 className="w-4 h-4" />
            </button>
          </div>
          <div className="absolute top-2 left-2">
            <span className="bg-green-500 text-white text-xs font-medium px-2 py-1 rounded-full">{(property.property_type || 'Property').toUpperCase()}</span>
          </div>
          {property.is_verified && (
            <div className="absolute bottom-2 left-2">
              <span className="bg-blue-500 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center">
                <FiShield className="w-3 h-3 mr-1" /> Verified
              </span>
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-gray-900 text-lg group-hover:text-blue-600 transition-colors line-clamp-2">{property.title}</h3>
            <div className="text-right">
              <div className="text-xl font-bold text-green-600">৳{property.monthly_rent?.toLocaleString()}/mo</div>
              {property.security_deposit && <div className="text-xs text-gray-500">+৳{property.security_deposit?.toLocaleString()} deposit</div>}
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
          {property.amenities?.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {property.amenities.slice(0, 3).map((amenity, i) => (
                <span key={i} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
                  {amenity}
                </span>
              ))}
              {property.amenities.length > 3 && (
                <span className="text-xs text-gray-500">+{property.amenities.length - 3} more</span>
              )}
            </div>
          )}
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {property.owner_name?.charAt(0) || 'O'}
              </div>
              <div className="ml-2">
                <div className="text-sm font-medium text-gray-900">{property.owner_name || 'Property Owner'}</div>
                <div className="flex items-center">
                  <FiStar className="w-3 h-3 text-yellow-500 mr-1" />
                  <span className="text-xs text-gray-600">{property.owner_rating ? `${property.owner_rating}/5` : 'No rating'}</span>
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <button onClick={(e) => { e.stopPropagation(); window.open(`tel:${property.contact_phone}`, '_self'); }} className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors" title="Call">
                <FiPhone className="w-4 h-4" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); window.open(`mailto:${property.contact_email}`, '_self'); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="Email">
                <FiMail className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const PropertyListItem = ({ property }) => {
    const isFavorite = favorites.includes(property.id);
    return (
      <div className="card p-4 flex items-start gap-4 hover:shadow-lg transition cursor-pointer" onClick={() => openDetails(property)}>
        <img src={property.images?.[0] || '/placeholder/400/250'} alt={property.title} className="w-40 h-28 object-cover rounded" />
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-green-500 text-white text-xs font-medium px-2 py-1 rounded-full">{(property.property_type || 'Property').toUpperCase()}</span>
                {property.is_verified && (
                  <span className="bg-blue-500 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center">
                    <FiShield className="w-3 h-3 mr-1" /> Verified
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-gray-900 text-lg">{property.title}</h3>
              <div className="flex items-center text-gray-600 mt-1">
                <FiMapPin className="w-4 h-4 mr-1" />
                <span className="text-sm">{property.location}</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                {property.bedrooms && <span className="flex items-center"><FaBed className="w-4 h-4 mr-1" />{property.bedrooms} bed</span>}
                {property.bathrooms && <span className="flex items-center"><FaBath className="w-4 h-4 mr-1" />{property.bathrooms} bath</span>}
                {property.area_sqft && <span className="flex items-center"><FiMaximize className="w-4 h-4 mr-1" />{property.area_sqft} sqft</span>}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-green-600">৳{property.monthly_rent?.toLocaleString()}/mo</div>
              {property.security_deposit && <div className="text-xs text-gray-500">+৳{property.security_deposit?.toLocaleString()} deposit</div>}
              <div className="flex items-center justify-end gap-2 mt-3">
                <button onClick={(e) => { e.stopPropagation(); toggleFavorite(property.id); }} className={`p-2 rounded-full ${isFavorite ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-700'} hover:scale-110 transition-transform`} title={isFavorite ? 'Remove Favorite' : 'Add Favorite'}>
                  <FiHeart className="w-4 h-4" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); }} className="p-2 bg-gray-100 text-gray-700 rounded-full hover:scale-110 transition-transform" title="Share">
                  <FiShare2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const DetailsModal = ({ open, onClose, property }) => {
    if (!open || !property) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black bg-opacity-40" onClick={onClose} />
        <div className="relative bg-white w-full sm:max-w-3xl sm:rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
          <div className="p-4 sm:p-6 border-b flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-green-500 text-white text-xs font-medium px-2 py-1 rounded-full">{(property.property_type || 'Property').toUpperCase()}</span>
                {property.is_verified && (
                  <span className="bg-blue-500 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center">
                    <FiShield className="w-3 h-3 mr-1" /> Verified
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-semibold text-gray-900">{property.title}</h2>
              <div className="flex items-center text-gray-600 mt-1">
                <FiMapPin className="w-4 h-4 mr-1" />
                <span className="text-sm">{property.location}</span>
              </div>
            </div>
            <button className="text-gray-500 hover:text-gray-700" onClick={onClose} aria-label="Close">✕</button>
          </div>
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <img src={property.images?.[0] || '/placeholder/400/250'} alt={property.title} className="w-full h-56 object-cover rounded" />
              <div className="space-y-3">
                <div>
                  <div className="text-xl font-bold text-green-600">৳{property.monthly_rent?.toLocaleString()}/mo</div>
                  {property.security_deposit && <div className="text-sm text-gray-500">Security Deposit: ৳{property.security_deposit?.toLocaleString()}</div>}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-700">
                  {property.bedrooms && <span className="flex items-center"><FaBed className="w-4 h-4 mr-1" />{property.bedrooms} bed</span>}
                  {property.bathrooms && <span className="flex items-center"><FaBath className="w-4 h-4 mr-1" />{property.bathrooms} bath</span>}
                  {property.area_sqft && <span className="flex items-center"><FiMaximize className="w-4 h-4 mr-1" />{property.area_sqft} sqft</span>}
                </div>
                {property.amenities?.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-gray-900 mb-1">Amenities</div>
                    <div className="flex flex-wrap gap-2">
                      {property.amenities.map((a, idx) => (
                        <span key={idx} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">{a}</span>
                      ))}
                    </div>
                  </div>
                )}
                {property.description && (
                  <div>
                    <div className="text-sm font-medium text-gray-900 mb-1">Description</div>
                    <p className="text-gray-700 text-sm leading-relaxed">{property.description}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {property.owner_name?.charAt(0) || 'O'}
                  </div>
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">{property.owner_name || 'Property Owner'}</div>
                    <div className="flex items-center">
                      <FiStar className="w-3 h-3 text-yellow-500 mr-1" />
                      <span className="text-xs text-gray-600">{property.owner_rating ? `${property.owner_rating}/5` : 'No rating'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => window.open(`tel:${property.contact_phone}`, '_self')} className="btn btn-outline text-green-600 border-green-600">Call</button>
                  <button onClick={() => window.open(`mailto:${property.contact_email}`, '_self')} className="btn btn-primary">Email</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const CreatePropertyModal = ({ open, onClose, onSubmit }) => {
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
      title: '',
      type: 'seat',
      monthly_rent: '',
      security_deposit: '',
      location: '',
      bedrooms: '',
      bathrooms: '',
      area_sqft: '',
      amenities: '',
      images: '',
      owner_name: '',
      contact_phone: '',
      contact_email: '',
      is_verified: false,
      description: '',
    });

    useEffect(() => {
      if (open) {
        setForm((prev) => ({ ...prev }));
      }
    }, [open]);

    if (!open) return null;

    const update = (e) => {
      const { name, value, type, checked } = e.target;
      setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
    };

    const submit = async (e) => {
      e.preventDefault();
      if (submitting) return;
      setSubmitting(true);
      const ok = await onSubmit?.(form);
      setSubmitting(false);
      if (ok) {
        // reset form (optional)
        setForm({
          title: '', type: 'seat', monthly_rent: '', security_deposit: '', location: '',
          bedrooms: '', bathrooms: '', area_sqft: '', amenities: '', images: '', owner_name: '',
          contact_phone: '', contact_email: '', is_verified: false, description: '',
        });
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black bg-opacity-40" onClick={onClose} />
        <div className="relative bg-white w-full sm:max-w-3xl sm:rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
          <div className="p-4 sm:p-6 border-b flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Post Accommodation</h2>
            <button className="text-gray-500 hover:text-gray-700" onClick={onClose} aria-label="Close">✕</button>
          </div>
          <form onSubmit={submit} className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input name="title" value={form.title} onChange={update} className="form-input w-full" placeholder="Sunny room near campus" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select name="type" value={form.type} onChange={update} className="form-input w-full">
                  <option value="seat">Seat</option>
                  <option value="room">Room</option>
                  <option value="flat">Flat</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Rent (৳)</label>
                <input type="number" name="monthly_rent" value={form.monthly_rent} onChange={update} className="form-input w-full" placeholder="8000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Security Deposit (৳)</label>
                <input type="number" name="security_deposit" value={form.security_deposit} onChange={update} className="form-input w-full" placeholder="5000" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input name="location" value={form.location} onChange={update} className="form-input w-full" placeholder="Dhaka, Mirpur 10" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
                <input type="number" name="bedrooms" value={form.bedrooms} onChange={update} className="form-input w-full" placeholder="1" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
                <input type="number" name="bathrooms" value={form.bathrooms} onChange={update} className="form-input w-full" placeholder="1" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Area (sqft)</label>
                <input type="number" name="area_sqft" value={form.area_sqft} onChange={update} className="form-input w-full" placeholder="200" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Amenities (comma-separated)</label>
                <input name="amenities" value={form.amenities} onChange={update} className="form-input w-full" placeholder="WiFi, Balcony, Parking" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URLs (comma-separated)</label>
                <input name="images" value={form.images} onChange={update} className="form-input w-full" placeholder="https://.../img1.jpg, https://.../img2.jpg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Owner Name</label>
                <input name="owner_name" value={form.owner_name} onChange={update} className="form-input w-full" placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input name="contact_phone" value={form.contact_phone} onChange={update} className="form-input w-full" placeholder="+8801XXXXXXXXX" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" name="contact_email" value={form.contact_email} onChange={update} className="form-input w-full" placeholder="owner@example.com" />
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <input id="verified" type="checkbox" name="is_verified" checked={form.is_verified} onChange={update} className="form-checkbox" />
                <label htmlFor="verified" className="text-sm text-gray-700">Verified</label>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea name="description" value={form.description} onChange={update} className="form-input w-full" rows={4} placeholder="Describe the property..." />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button type="button" onClick={onClose} className="btn btn-outline">Cancel</button>
              <button type="submit" disabled={submitting} className="btn btn-primary">
                {submitting ? 'Posting...' : 'Create'}
              </button>
            </div>
          </form>
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
                <h1 className="text-3xl font-bold text-gray-900">Accommodation Market</h1>
                <p className="text-gray-600 mt-1">Find your perfect home away from home</p>
              </div>
              <button onClick={() => setIsCreateOpen(true)} className="btn btn-primary">Post</button>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input type="text" placeholder="Search properties..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="form-input w-full pl-10" />
            </div>
            <select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)} className="form-input w-full">
              <option value="">All Locations</option>
              {locations.map((location) => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
            <input type="number" placeholder="Min Price" value={priceRange.min} onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })} className="form-input w-full" />
            <input type="number" placeholder="Max Price" value={priceRange.max} onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })} className="form-input w-full" />
          </div>
          <div className="flex flex-wrap gap-2">
            {types.map((t) => (
              <button key={t.id} onClick={() => setSelectedType(t.id)} className={`flex items-center px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedType === t.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                <t.icon className="w-4 h-4 mr-2" />
                {t.name}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between mb-6">
          <div className="text-gray-600">{loading ? 'Loading...' : `${filteredProperties.length} properties found`}</div>
          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center rounded overflow-hidden border">
              <button className={`px-3 py-2 text-sm ${view === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-600'}`} onClick={() => setView('grid')} title="Grid view"><FiGrid className="w-4 h-4" /></button>
              <button className={`px-3 py-2 text-sm ${view === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-600'}`} onClick={() => setView('list')} title="List view"><FiList className="w-4 h-4" /></button>
            </div>
            <select className="form-input text-sm" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="newest">Sort by: Newest</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>
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
        ) : filteredProperties.length === 0 ? (
          <div className="text-center py-12">
            <FiHome className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No properties found</h3>
            <p className="text-gray-600 mb-4">Try adjusting your search criteria or browse all properties</p>
            <button onClick={() => { setSearchTerm(''); setSelectedType('all'); setSelectedLocation(''); setPriceRange({ min: '', max: '' }); }} className="btn btn-outline">Clear Filters</button>
          </div>
        ) : (
          <div className={view === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {filteredProperties.map((property) => (
              view === 'grid' ? <PropertyCard key={property.id} property={property} /> : <PropertyListItem key={property.id} property={property} />
            ))}
          </div>
        )}
      </div>
      <DetailsModal open={isModalOpen} onClose={closeDetails} property={selected} />
      <CreatePropertyModal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} onSubmit={handleCreateSubmit} />
    </div>
  );
};

export default AccommodationMarket;
