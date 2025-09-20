import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  FiHome, 
  FiShoppingBag, 
  FiBookOpen, 
  FiDollarSign,
  FiUser,
  FiBell,
  FiMenu,
  FiX,
  FiLogOut,
  FiSettings,
  FiSearch,
  FiPlus,
  FiMessageSquare
} from 'react-icons/fi';
import { FiChevronDown } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useWallet } from '../../context/WalletContext';
import { useNotification } from '../../context/NotificationContext';
import SessionSwitcher from '../SessionSwitcher';

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { wallet } = useWallet();
  const { notifications, unreadCount } = useNotification();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const userMenuRef = useRef(null);
  const notificationsRef = useRef(null);

  // Base top-level direct links (dropdowns rendered separately)
  const baseNavItems = [
    { path: '/dashboard', name: 'Dashboard', icon: FiHome },
    { path: '/notices', name: 'Notices', icon: FiBookOpen },
    { path: '/chat', name: 'Chat', icon: FiMessageSquare },
  ];

  // Append Admin link dynamically for elevated roles
  const elevated = (user?.role_name || user?.role || '').toLowerCase();
  const showAdmin = elevated === 'admin' || elevated === 'moderator';
  const fullNavItems = showAdmin ? [...baseNavItems, { path: '/admin', name: 'Admin', icon: FiSettings }] : baseNavItems;

  // Dropdown state/refs
  const [showMarketplaceMenu, setShowMarketplaceMenu] = useState(false);
  const [showServicesMenu, setShowServicesMenu] = useState(false);
  const marketplaceRef = useRef(null);
  const servicesRef = useRef(null);

  // Mobile submenu state
  const [mobileMarketOpen, setMobileMarketOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);

  const userMenuItems = [
    { path: '/profile', name: 'Profile', icon: FiUser },
    { path: '/settings', name: 'Settings', icon: FiSettings },
    { path: '/wallet', name: 'Wallet', icon: FiDollarSign }
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (marketplaceRef.current && !marketplaceRef.current.contains(event.target)) {
        setShowMarketplaceMenu(false);
      }
      if (servicesRef.current && !servicesRef.current.contains(event.target)) {
        setShowServicesMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isActivePath = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const isAnyActive = (paths) => paths.some((p) => isActivePath(p));

  if (!user) {
    return null; // Don't show navigation for unauthenticated users
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center" style={{ marginLeft: '-2.5rem' }}>
            <Link to="/dashboard" className="flex items-center space-x-2">
              <img
                src="/edusync%20site%20images/logo%202%20for%20nav.png"
                alt="Edusync"
                className="w-36 h-34 object-contain select-none"
                style={{ imageRendering: 'auto' }}
              />
              {/* Optional brand text if needed later */}
              {/* <span className="font-bold text-xl text-gray-900">Edusync</span> */}
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {/* Direct links: Dashboard, Notices */}
            {fullNavItems
              .filter((i) => i.name === 'Dashboard' || i.name === 'Notices')
              .map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center space-x-1 ${
                    isActivePath(item.path)
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              ))}

            {/* Marketplace dropdown */}
            <div className="relative" ref={marketplaceRef}>
              <button
                onClick={() => setShowMarketplaceMenu((v) => !v)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center space-x-1 ${
                  isAnyActive(['/business-marketplace', '/food-marketplace', '/free-marketplace', '/secondhand-market'])
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <FiShoppingBag className="w-4 h-4" />
                <span>Marketplace</span>
                <FiChevronDown className="w-4 h-4" />
              </button>
              {showMarketplaceMenu && (
                <div className="absolute left-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="py-2">
                    <Link to="/business-marketplace" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setShowMarketplaceMenu(false)}>Businesses</Link>
                    <Link to="/food-marketplace" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setShowMarketplaceMenu(false)}>Food</Link>
                    <Link to="/free-marketplace" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setShowMarketplaceMenu(false)}>Giveaway (FreeMarket)</Link>
                    <Link to="/secondhand-market" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setShowMarketplaceMenu(false)}>Pre-Owned (Secondhand)</Link>
                  </div>
                </div>
              )}
            </div>

            {/* Services dropdown */}
            <div className="relative" ref={servicesRef}>
              <button
                onClick={() => setShowServicesMenu((v) => !v)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center space-x-1 ${
                  isAnyActive(['/accommodation-market', '/rentals', '/tutoring', '/jobs', '/lost-found'])
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <FiBookOpen className="w-4 h-4" />
                <span>Services</span>
                <FiChevronDown className="w-4 h-4" />
              </button>
              {showServicesMenu && (
                <div className="absolute left-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="py-2">
                    <Link to="/accommodation-market" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setShowServicesMenu(false)}>Accommodation</Link>
                    <Link to="/rentals" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setShowServicesMenu(false)}>Rental</Link>
                    <Link to="/tutoring" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setShowServicesMenu(false)}>Tutoring</Link>
                    <Link to="/jobs" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setShowServicesMenu(false)}>Job Board</Link>
                    <Link to="/lost-found" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setShowServicesMenu(false)}>Lost & Found</Link>
                  </div>
                </div>
              )}
            </div>

            {/* Direct link: Chat */}
            {fullNavItems
              .filter((i) => i.name === 'Chat' || i.name === 'Admin')
              .map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center space-x-1 ${
                    isActivePath(item.path)
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              ))}
          </div>

          {/* Search Bar */}
          <div className="hidden lg:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search products, services..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>

          {/* Right side buttons */}
          <div className="flex items-center space-x-2">
            {/* Add Item Button */}
            <button
              onClick={() => navigate('/sell-item')}
              className="hidden sm:flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 text-sm font-medium"
            >
              <FiPlus className="w-4 h-4" />
              <span>Sell</span>
            </button>

            {/* Notifications */}
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-gray-600 hover:text-gray-900 relative"
              >
                <FiBell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.slice(0, 5).map((notification) => (
                        <div key={notification.id} className="p-4 border-b border-gray-100 hover:bg-gray-50">
                          <p className="text-sm text-gray-900">{notification.message}</p>
                          <p className="text-xs text-gray-500 mt-1">{notification.timestamp}</p>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-500">
                        No notifications
                      </div>
                    )}
                  </div>
                  <div className="p-4 border-t border-gray-200">
                    <Link
                      to="/notifications"
                      className="text-sm text-blue-600 hover:text-blue-700"
                      onClick={() => setShowNotifications(false)}
                    >
                      View all notifications
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Session Switcher */}
            <SessionSwitcher />

            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 transition-colors duration-200"
              >
                <img
                  src={user.avatar || '/placeholder/32/32'}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">
                    ৳{wallet?.balance?.toLocaleString() || '0.00'}
                  </p>
                </div>
              </button>

              {/* User Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-4 border-b border-gray-200">
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    <p className="text-sm text-green-600 mt-1">
                      Wallet: ৳{wallet?.balance?.toLocaleString() || '0.00'}
                    </p>
                  </div>
                  <div className="py-2">
                    {userMenuItems.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </Link>
                    ))}
                    {showAdmin && (
                      <Link
                        to="/admin"
                        className="flex items-center space-x-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <FiSettings className="w-4 h-4" />
                        <span>Admin Panel</span>
                      </Link>
                    )}
                  </div>
                  <div className="border-t border-gray-200 py-2">
                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                    >
                      <FiLogOut className="w-4 h-4" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900"
            >
              {showMobileMenu ? <FiX className="w-5 h-5" /> : <FiMenu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {showMobileMenu && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="space-y-1">
              {/* Dashboard */}
              <Link
                to="/dashboard"
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium ${isActivePath('/dashboard') ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
                onClick={() => setShowMobileMenu(false)}
              >
                <FiHome className="w-5 h-5" />
                <span>Dashboard</span>
              </Link>
              {/* Notices */}
              <Link
                to="/notices"
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium ${isActivePath('/notices') ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
                onClick={() => setShowMobileMenu(false)}
              >
                <FiBookOpen className="w-5 h-5" />
                <span>Notices</span>
              </Link>

              {/* Marketplace expandable */}
              <button
                className="w-full flex items-center justify-between px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                onClick={() => setMobileMarketOpen((v) => !v)}
              >
                <span className="flex items-center space-x-2"><FiShoppingBag className="w-5 h-5" /><span>Marketplace</span></span>
                <FiChevronDown className={`w-4 h-4 transform transition-transform ${mobileMarketOpen ? 'rotate-180' : ''}`} />
              </button>
              {mobileMarketOpen && (
                <div className="ml-6 space-y-1">
                  <Link to="/business-marketplace" className="block px-3 py-2 rounded-md text-base text-gray-600 hover:bg-gray-100" onClick={() => setShowMobileMenu(false)}>Businesses</Link>
                  <Link to="/food-marketplace" className="block px-3 py-2 rounded-md text-base text-gray-600 hover:bg-gray-100" onClick={() => setShowMobileMenu(false)}>Food</Link>
                  <Link to="/free-marketplace" className="block px-3 py-2 rounded-md text-base text-gray-600 hover:bg-gray-100" onClick={() => setShowMobileMenu(false)}>Giveaway (FreeMarket)</Link>
                  <Link to="/secondhand-market" className="block px-3 py-2 rounded-md text-base text-gray-600 hover:bg-gray-100" onClick={() => setShowMobileMenu(false)}>Pre-Owned (Secondhand)</Link>
                </div>
              )}

              {/* Services expandable */}
              <button
                className="w-full flex items-center justify-between px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                onClick={() => setMobileServicesOpen((v) => !v)}
              >
                <span className="flex items-center space-x-2"><FiBookOpen className="w-5 h-5" /><span>Services</span></span>
                <FiChevronDown className={`w-4 h-4 transform transition-transform ${mobileServicesOpen ? 'rotate-180' : ''}`} />
              </button>
              {mobileServicesOpen && (
                <div className="ml-6 space-y-1">
                  <Link to="/accommodation-market" className="block px-3 py-2 rounded-md text-base text-gray-600 hover:bg-gray-100" onClick={() => setShowMobileMenu(false)}>Accommodation</Link>
                  <Link to="/rentals" className="block px-3 py-2 rounded-md text-base text-gray-600 hover:bg-gray-100" onClick={() => setShowMobileMenu(false)}>Rental</Link>
                  <Link to="/tutoring" className="block px-3 py-2 rounded-md text-base text-gray-600 hover:bg-gray-100" onClick={() => setShowMobileMenu(false)}>Tutoring</Link>
                  <Link to="/jobs" className="block px-3 py-2 rounded-md text-base text-gray-600 hover:bg-gray-100" onClick={() => setShowMobileMenu(false)}>Job Board</Link>
                  <Link to="/lost-found" className="block px-3 py-2 rounded-md text-base text-gray-600 hover:bg-gray-100" onClick={() => setShowMobileMenu(false)}>Lost & Found</Link>
                </div>
              )}

              {/* Chat */}
              <Link
                to="/chat"
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium ${isActivePath('/chat') ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
                onClick={() => setShowMobileMenu(false)}
              >
                <FiMessageSquare className="w-5 h-5" />
                <span>Chat</span>
              </Link>

              {/* Admin (if applicable) */}
              {showAdmin && (
                <Link
                  to="/admin"
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium ${isActivePath('/admin') ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
                  onClick={() => setShowMobileMenu(false)}
                >
                  <FiSettings className="w-5 h-5" />
                  <span>Admin</span>
                </Link>
              )}
              {/* existing Sell Item button retained below if needed */}
              <button onClick={() => { navigate('/sell-item'); setShowMobileMenu(false); }} className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium text-blue-600 hover:bg-blue-50 w-full text-left">
                <FiPlus className="w-5 h-5" />
                <span>Sell Item</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
