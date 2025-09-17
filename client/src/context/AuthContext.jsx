// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';
import SessionManager from '../utils/SessionManager';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionManager] = useState(() => new SessionManager());

  // Check if user is authenticated on app load
  useEffect(() => {
    const token = sessionManager.getItem('accessToken');
    const userData = sessionManager.getItem('userData');

    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        const normalized = {
          ...parsedUser,
          role: parsedUser.role || parsedUser.role_name,
          role_name: parsedUser.role_name || parsedUser.role,
          name: parsedUser.full_name || parsedUser.fullName || parsedUser.name,
          avatar: parsedUser.profile_picture || parsedUser.avatar
        };
        setUser(normalized);
        setIsAuthenticated(true);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } catch (error) {
        console.error('Error parsing user data:', error);
        logout();
      }
    }

    // Clean up expired sessions from other ports
    sessionManager.cleanupExpiredSessions();
    setLoading(false);
  }, [sessionManager]);

  // Enhanced login with 429 handling
  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });

      // If API follows { success, message, data }
      if (!response?.data?.success) {
        const msg = response?.data?.message || 'Login failed';
        return { success: false, message: msg };
      }

      const { user: userData, accessToken, refreshToken } = response.data.data;

      // Store tokens and user data with port-specific keys
      sessionManager.setItem('accessToken', accessToken);
      sessionManager.setItem('refreshToken', refreshToken);
      sessionManager.setItem('userData', JSON.stringify(userData));
      sessionManager.setItem('userRole', userData.role_name || userData.role);

      // Set default authorization header
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

      const normalized = {
        ...userData,
        name: userData.full_name || userData.fullName || userData.name,
        avatar: userData.profile_picture || userData.avatar
      };
      setUser(normalized);
      setIsAuthenticated(true);

      return { success: true, user: userData };
    } catch (error) {
      // Optional small enhancement for clearer messaging on bruteForceGuard 429
      const status = error?.response?.status;
      const data = error?.response?.data || {};

      if (status === 429) {
        // Prefer server message; fall back to using retry_after_ms for UX
        const ms = Number.isFinite(data?.retry_after_ms) ? data.retry_after_ms : null;
        const seconds = ms ? Math.ceil(ms / 1000) : null;
        const msg = data?.message
          || (seconds ? `Too many login attempts. Try again in ${seconds}s.` : 'Too many login attempts. Try again later.');
        return { success: false, message: msg };
      }

      // Keep invalid-credential messaging generic (anti-enumeration)
      if (status === 401) {
        return { success: false, message: 'Invalid email or password' };
      }

      // Fallback for other errors
      const fallback = data?.message || 'Login failed. Please try again.';
      return { success: false, message: fallback };
    }
  };

  const register = async (userData) => {
    try {
      // Map frontend field names to backend field names
      const mappedUserData = {
        fullName: userData.name || userData.fullName,
        email: userData.email,
        password: userData.password,
        phone: userData.phone,
        institution: userData.university || userData.institution,
        location: userData.location,
        role: userData.role || 'student',
        // Pass through OTP code (required by backend register endpoint)
        otpCode: userData.otpCode
      };

      const response = await api.post('/auth/register', mappedUserData);
      if (response.data.success) {
        const { user: newUser, accessToken, refreshToken } = response.data.data;

        // Store tokens and user data with port-specific keys
        sessionManager.setItem('accessToken', accessToken);
        sessionManager.setItem('refreshToken', refreshToken);
        sessionManager.setItem('userData', JSON.stringify(newUser));
        sessionManager.setItem('userRole', newUser.role_name || newUser.role);

        // Set default authorization header
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

        const normalizedNew = {
          ...newUser,
          name: newUser.full_name || newUser.fullName || newUser.name,
          avatar: newUser.profile_picture || newUser.avatar
        };
        setUser(normalizedNew);
        setIsAuthenticated(true);

        return { success: true, user: newUser };
      }

      return { success: false, message: response.data.message };
    } catch (error) {
      console.error('Registration error:', error);
      throw error; // Let component show its own user-friendly message
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear all stored data for this port only
      sessionManager.clear();
      // Remove authorization header
      delete api.defaults.headers.common['Authorization'];
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const updateUser = (updatedUserData) => {
    const merged = { ...user, ...updatedUserData };
    const normalized = {
      ...merged,
      name: merged.full_name || merged.fullName || merged.name,
      avatar: merged.profile_picture || merged.avatar
    };
    setUser(normalized);
    sessionManager.setItem('userData', JSON.stringify(normalized));
  };

  const refreshToken = async () => {
    try {
      const refreshToken = sessionManager.getItem('refreshToken');
      if (!refreshToken) {
        logout();
        return false;
      }

      const response = await api.post('/auth/refresh-token', { refreshToken });
      if (response.data.success) {
        const { accessToken } = response.data.data;
        sessionManager.setItem('accessToken', accessToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        return true;
      }

      logout();
      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      logout();
      return false;
    }
  };

  // Sync user profile (fetch latest role after admin approvals)
  const syncProfile = async () => {
    try {
      const res = await api.get('/auth/profile');
      const serverUser = res.data?.data?.user;
      if (serverUser) {
        const normalized = {
          ...user,
          ...serverUser,
          role: serverUser.role_name || serverUser.role || user?.role,
          role_name: serverUser.role_name || serverUser.role || user?.role_name,
          name: serverUser.full_name || serverUser.fullName || user?.name,
        };
        setUser(normalized);
        sessionManager.setItem('userData', JSON.stringify(normalized));
        sessionManager.setItem('userRole', normalized.role_name || normalized.role);
        return normalized;
      }
    } catch (e) {
      console.warn('syncProfile failed', e.message);
    }
    return null;
  };

  const checkRole = (requiredRole) => {
    if (!user) return false;
    const roleHierarchy = {
      student: 1,
      business_owner: 2,
      food_vendor: 2,
      moderator: 3,
      admin: 4
    };
    const userRoleLevel = roleHierarchy[user.role_name] || 0;
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0;
    return userRoleLevel >= requiredRoleLevel;
  };

  const isAdmin = () => checkRole('admin');
  const isModerator = () => checkRole('moderator');
  const isBusinessOwner = () => checkRole('business_owner');

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    updateUser,
    refreshToken,
    syncProfile,
    checkRole,
    isAdmin,
    isModerator,
    isBusinessOwner,
    sessionManager, // Expose session manager for debugging
    getActiveSessions: () => sessionManager.getActiveSessions(),
    switchToSession: (port) => sessionManager.switchToSession(port)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
