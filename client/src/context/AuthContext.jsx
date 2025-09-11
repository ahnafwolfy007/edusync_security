import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

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

  // Check if user is authenticated on app load
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setIsAuthenticated(true);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } catch (error) {
        console.error('Error parsing user data:', error);
        logout();
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (!response?.data?.success) {
      const msg = response?.data?.message || 'Login failed';
      return { success: false, message: msg };
    }

    const { user: userData, accessToken, refreshToken } = response.data.data;

    // Store tokens and user data
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('userData', JSON.stringify(userData));
    localStorage.setItem('userRole', userData.role_name || userData.role);

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

      console.log('Sending registration data:', mappedUserData);
      
      const response = await api.post('/auth/register', mappedUserData);
      
      if (response.data.success) {
        const { user: newUser, accessToken, refreshToken } = response.data.data;
        
        // Store tokens and user data
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('userData', JSON.stringify(newUser));
        localStorage.setItem('userRole', newUser.role_name || newUser.role);
        
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
      throw error; // Throw the error so the component can handle it
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear all stored data
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userData');
      localStorage.removeItem('userRole');
      
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
    localStorage.setItem('userData', JSON.stringify(normalized));
  };

  const refreshToken = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        logout();
        return false;
      }

      const response = await api.post('/auth/refresh-token', { refreshToken });
      
      if (response.data.success) {
        const { accessToken } = response.data.data;
        localStorage.setItem('accessToken', accessToken);
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

  const checkRole = (requiredRole) => {
    if (!user) return false;
    
    const roleHierarchy = {
      'student': 1,
      'business_owner': 2,
      'food_vendor': 2,
      'moderator': 3,
      'admin': 4
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
    checkRole,
    isAdmin,
    isModerator,
    isBusinessOwner
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
