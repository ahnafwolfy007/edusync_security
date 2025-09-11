import React, { useState, useRef } from 'react';
import { 
  FiUser, 
  FiMail, 
  FiPhone, 
  FiMapPin, 
  FiCalendar,
  FiCamera,
  FiEdit3,
  FiSave,
  FiX,
  FiShield,
  FiTruck,
  FiBell,
  FiLock,
  FiEye,
  FiHeart,
  FiShoppingBag,
  FiStar
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api, { apiHelpers } from '../api';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const { showNotification } = useNotification();
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('personal');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: user?.full_name || user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    location: user?.location || '',
    avatar: user?.profile_picture || user?.avatar || ''
  });
  const [addressForm, setAddressForm] = useState({
    street: user?.address?.street || '',
    city: user?.address?.city || '',
    state: user?.address?.state || '',
    zipCode: user?.address?.zipCode || '',
    country: user?.address?.country || 'Bangladesh'
  });
  const [preferences, setPreferences] = useState({
    emailNotifications: user?.preferences?.emailNotifications ?? true,
    pushNotifications: user?.preferences?.pushNotifications ?? true,
    marketingEmails: user?.preferences?.marketingEmails ?? false,
    orderUpdates: user?.preferences?.orderUpdates ?? true,
    newListings: user?.preferences?.newListings ?? false,
    priceAlerts: user?.preferences?.priceAlerts ?? false
  });
  const [privacy, setPrivacy] = useState({
    profileVisibility: user?.privacy?.profileVisibility || 'public',
    showEmail: user?.privacy?.showEmail ?? false,
    showPhone: user?.privacy?.showPhone ?? false,
    showLocation: user?.privacy?.showLocation ?? true
  });

  // Build full avatar URL if backend served relative path
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const backendOrigin = apiBase.replace(/\/api\/?$/, '');
  const resolveAvatar = (raw) => {
    if (!raw) return '/placeholder/100/100';
    const p = raw.replace(/\\/g, '/');
    if (p.startsWith('http://') || p.startsWith('https://')) return p;
    if (p.startsWith('/')) return backendOrigin + p; // already rooted
    return `${backendOrigin}/${p}`;
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const payload = {
        fullName: profileForm.fullName,
        phone: profileForm.phone,
        location: profileForm.location
      };
      const response = await apiHelpers.user.updateProfile(payload);
      
      if (response.data.success || response.data?.data?.user) {
        const updated = response.data.data?.user || response.data.user;
        updateUser({ ...updated, full_name: updated.full_name || updated.fullName });
        showNotification('Profile updated successfully', 'success');
        setEditing(false);
      } else {
        showNotification(response.data.message || 'Failed to update profile', 'error');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      showNotification('Error updating profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddressUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
  const response = await api.put('/user/address', addressForm);
      
      if (response.data.success) {
        updateUser(response.data.user);
        showNotification('Address updated successfully', 'success');
      } else {
        showNotification(response.data.message || 'Failed to update address', 'error');
      }
    } catch (error) {
      console.error('Error updating address:', error);
      showNotification('Error updating address', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePreferencesUpdate = async () => {
    setLoading(true);
    
    try {
  const response = await api.put('/user/preferences', preferences);
      
      if (response.data.success) {
        updateUser(response.data.user);
        showNotification('Preferences updated successfully', 'success');
      } else {
        showNotification(response.data.message || 'Failed to update preferences', 'error');
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
      showNotification('Error updating preferences', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrivacyUpdate = async () => {
    setLoading(true);
    
    try {
  const response = await api.put('/user/privacy', privacy);
      
      if (response.data.success) {
        updateUser(response.data.user);
        showNotification('Privacy settings updated successfully', 'success');
      } else {
        showNotification(response.data.message || 'Failed to update privacy settings', 'error');
      }
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      showNotification('Error updating privacy settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showNotification('Please select an image file', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      showNotification('Image size should be less than 5MB', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await apiHelpers.user.updateProfilePicture(file);

      if (response.data.success) {
        const rel = response.data.data?.profilePicture || response.data.data?.avatar;
        const abs = response.data.data?.absoluteProfilePicture;
        const avatarUrl = abs || resolveAvatar(rel);
        setProfileForm(prev => ({ ...prev, avatar: avatarUrl }));
        updateUser({ ...user, profile_picture: rel, avatar: avatarUrl });
        showNotification('Profile picture updated successfully', 'success');
      } else {
        showNotification(response.data.message || 'Failed to update profile picture', 'error');
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      showNotification('Error uploading profile picture', 'error');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'personal', name: 'Personal Info', icon: FiUser },
    { id: 'address', name: 'Address', icon: FiMapPin },
    { id: 'preferences', name: 'Notifications', icon: FiBell },
    { id: 'privacy', name: 'Privacy', icon: FiShield },
    { id: 'activity', name: 'Activity', icon: FiTruck }
  ];

  const PersonalInfoTab = () => (
    <div className="card">
      <div className="card-header flex justify-between items-center">
        <h3 className="font-semibold">Personal Information</h3>
        <button
          onClick={() => setEditing(!editing)}
          className="btn btn-outline btn-sm"
        >
          {editing ? <FiX className="w-4 h-4 mr-1" /> : <FiEdit3 className="w-4 h-4 mr-1" />}
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>
      <div className="card-body">
        {/* Avatar Section */}
        <div className="flex items-center space-x-6 mb-6">
          <div className="relative">
            <img
              src={resolveAvatar(profileForm.avatar)}
              alt="Profile"
              className="w-20 h-20 rounded-full object-cover border border-gray-200"
              onError={(e) => { e.currentTarget.src = '/placeholder/100/100'; }}
            />
            {editing && (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow"
                  aria-label="Change profile picture"
                >
                  <FiCamera className="w-3 h-3" />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarUpload}
                  accept="image/*"
                  className="hidden"
                />
              </>
            )}
          </div>
          <div>
            <h4 className="font-medium text-gray-900">{user?.name}</h4>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <div className="flex items-center mt-1">
              <FiStar className="w-4 h-4 text-yellow-500 mr-1" />
              <span className="text-sm text-gray-600">
                {user?.rating || '5.0'} ({user?.reviewCount || 0} reviews)
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleProfileUpdate}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                value={profileForm.fullName}
                onChange={(e) => setProfileForm(prev => ({ ...prev, fullName: e.target.value }))}
                className="form-input"
                disabled={!editing}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                className="form-input"
                disabled={!editing}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="tel"
                value={profileForm.phone}
                onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                className="form-input"
                disabled={!editing}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <input
                type="date"
                value={profileForm.dateOfBirth}
                onChange={(e) => setProfileForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                className="form-input"
                disabled={!editing}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Location</label>
              <input
                type="text"
                value={profileForm.location}
                onChange={(e) => setProfileForm(prev => ({ ...prev, location: e.target.value }))}
                className="form-input"
                placeholder="City, Country"
                disabled={!editing}
              />
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">Bio</label>
            <textarea
              value={profileForm.bio}
              onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
              className="form-input"
              rows="3"
              placeholder="Tell us about yourself..."
              disabled={!editing}
            />
          </div>

          {editing && (
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
              >
                <FiSave className="w-4 h-4 mr-1" />
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );

  const AddressTab = () => (
    <div className="card">
      <div className="card-header">
        <h3 className="font-semibold">Delivery Address</h3>
      </div>
      <div className="card-body">
        <form onSubmit={handleAddressUpdate}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group md:col-span-2">
              <label className="form-label">Street Address</label>
              <input
                type="text"
                value={addressForm.street}
                onChange={(e) => setAddressForm(prev => ({ ...prev, street: e.target.value }))}
                className="form-input"
                placeholder="House/Building, Street"
              />
            </div>
            <div className="form-group">
              <label className="form-label">City</label>
              <input
                type="text"
                value={addressForm.city}
                onChange={(e) => setAddressForm(prev => ({ ...prev, city: e.target.value }))}
                className="form-input"
                placeholder="City"
              />
            </div>
            <div className="form-group">
              <label className="form-label">State/Division</label>
              <input
                type="text"
                value={addressForm.state}
                onChange={(e) => setAddressForm(prev => ({ ...prev, state: e.target.value }))}
                className="form-input"
                placeholder="State/Division"
              />
            </div>
            <div className="form-group">
              <label className="form-label">ZIP Code</label>
              <input
                type="text"
                value={addressForm.zipCode}
                onChange={(e) => setAddressForm(prev => ({ ...prev, zipCode: e.target.value }))}
                className="form-input"
                placeholder="ZIP Code"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Country</label>
              <select
                value={addressForm.country}
                onChange={(e) => setAddressForm(prev => ({ ...prev, country: e.target.value }))}
                className="form-input"
              >
                <option value="Bangladesh">Bangladesh</option>
                <option value="India">India</option>
                <option value="Pakistan">Pakistan</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          
          <div className="flex justify-end mt-6">
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
            >
              <FiSave className="w-4 h-4 mr-1" />
              {loading ? 'Saving...' : 'Save Address'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const PreferencesTab = () => (
    <div className="card">
      <div className="card-header">
        <h3 className="font-semibold">Notification Preferences</h3>
      </div>
      <div className="card-body">
        <div className="space-y-4">
          {[
            { key: 'emailNotifications', label: 'Email Notifications', description: 'Receive notifications via email' },
            { key: 'pushNotifications', label: 'Push Notifications', description: 'Receive push notifications on your device' },
            { key: 'orderUpdates', label: 'Order Updates', description: 'Get notified about order status changes' },
            { key: 'newListings', label: 'New Listings', description: 'Notify me when new items match my interests' },
            { key: 'priceAlerts', label: 'Price Alerts', description: 'Notify me about price drops on watched items' },
            { key: 'marketingEmails', label: 'Marketing Emails', description: 'Receive promotional offers and updates' }
          ].map((preference) => (
            <div key={preference.key} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{preference.label}</p>
                <p className="text-sm text-gray-500">{preference.description}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences[preference.key]}
                  onChange={(e) => setPreferences(prev => ({ ...prev, [preference.key]: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </div>
        
        <div className="flex justify-end mt-6">
          <button
            onClick={handlePreferencesUpdate}
            disabled={loading}
            className="btn btn-primary"
          >
            <FiSave className="w-4 h-4 mr-1" />
            {loading ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );

  const PrivacyTab = () => (
    <div className="card">
      <div className="card-header">
        <h3 className="font-semibold">Privacy Settings</h3>
      </div>
      <div className="card-body">
        <div className="space-y-6">
          <div>
            <label className="form-label">Profile Visibility</label>
            <select
              value={privacy.profileVisibility}
              onChange={(e) => setPrivacy(prev => ({ ...prev, profileVisibility: e.target.value }))}
              className="form-input"
            >
              <option value="public">Public - Anyone can see your profile</option>
              <option value="students">Students Only - Only students can see your profile</option>
              <option value="private">Private - Only you can see your profile</option>
            </select>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Contact Information Visibility</h4>
            {[
              { key: 'showEmail', label: 'Show Email Address' },
              { key: 'showPhone', label: 'Show Phone Number' },
              { key: 'showLocation', label: 'Show Location' }
            ].map((setting) => (
              <div key={setting.key} className="flex items-center justify-between">
                <p className="text-gray-700">{setting.label}</p>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={privacy[setting.key]}
                    onChange={(e) => setPrivacy(prev => ({ ...prev, [setting.key]: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex justify-end mt-6">
          <button
            onClick={handlePrivacyUpdate}
            disabled={loading}
            className="btn btn-primary"
          >
            <FiSave className="w-4 h-4 mr-1" />
            {loading ? 'Saving...' : 'Save Privacy Settings'}
          </button>
        </div>
      </div>
    </div>
  );

  const ActivityTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card text-center">
          <div className="card-body">
            <FiShoppingBag className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{user?.itemsPurchased || 0}</p>
            <p className="text-sm text-gray-500">Items Purchased</p>
          </div>
        </div>
        
        <div className="card text-center">
          <div className="card-body">
            <FiTruck className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{user?.itemsSold || 0}</p>
            <p className="text-sm text-gray-500">Items Sold</p>
          </div>
        </div>
        
        <div className="card text-center">
          <div className="card-body">
            <FiHeart className="w-8 h-8 text-red-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{user?.favoriteItems || 0}</p>
            <p className="text-sm text-gray-500">Favorite Items</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold">Recent Activity</h3>
        </div>
        <div className="card-body">
          <div className="space-y-4">
            {user?.recentActivity?.length > 0 ? (
              user.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <FiEye className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <FiTruck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
            <p className="text-gray-600 mt-1">
              Manage your personal information and preferences
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'personal' && <PersonalInfoTab />}
        {activeTab === 'address' && <AddressTab />}
        {activeTab === 'preferences' && <PreferencesTab />}
        {activeTab === 'privacy' && <PrivacyTab />}
        {activeTab === 'activity' && <ActivityTab />}
      </div>
    </div>
  );
};

export default Profile;
