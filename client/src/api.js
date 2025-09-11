import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(
            `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/refresh-token`,
            { refreshToken }
          );

          if (response.data.success) {
            const { accessToken } = response.data.data;
            localStorage.setItem('accessToken', accessToken);
            
            // Update the authorization header and retry the original request
            api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
            originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
            
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        
        // Clear tokens and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userData');
        localStorage.removeItem('userRole');
        
  window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// API helper functions
export const apiHelpers = {
  // Generic CRUD operations
  get: (endpoint, params = {}) => api.get(endpoint, { params }),
  post: (endpoint, data = {}) => api.post(endpoint, data),
  put: (endpoint, data = {}) => api.put(endpoint, data),
  delete: (endpoint) => api.delete(endpoint),
  
  // File upload with progress
  uploadFile: (endpoint, formData, onProgress) => {
    return api.post(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(progress);
        }
      },
    });
  },

  // Authentication
  auth: {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (userData) => api.post('/auth/register', userData),
    logout: () => api.post('/auth/logout'),
    refreshToken: (refreshToken) => api.post('/auth/refresh-token', { refreshToken }),
    getProfile: () => api.get('/auth/profile'),
    changePassword: (passwordData) => api.put('/auth/change-password', passwordData),
  },

  // User management
  user: {
    getProfile: () => api.get('/users/profile'),
    updateProfile: (data) => api.put('/users/profile', data),
    updateProfilePicture: (file) => {
      const formData = new FormData();
      formData.append('profilePicture', file);
      return api.put('/users/profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    },
    getListings: (type) => api.get('/users/listings', { params: { type } }),
    getOrders: (type) => api.get('/users/orders', { params: { type } }),
    getStats: () => api.get('/users/stats'),
    deleteAccount: (password) => api.delete('/users/account', { data: { password } }),
  },

  // Business management
  business: {
    apply: (data) => api.post('/business/apply', data),
    getApplicationStatus: () => api.get('/business/application-status'),
    create: (data) => api.post('/business/create', data),
    getMyBusinesses: () => api.get('/business/my-businesses'),
    getDetails: (businessId) => api.get(`/business/${businessId}`),
    update: (businessId, data) => api.put(`/business/${businessId}`, data),
    addProduct: (businessId, data) => api.post(`/business/${businessId}/products`, data),
    updateProduct: (businessId, productId, data) => api.put(`/business/${businessId}/products/${productId}`, data),
    getOrders: (businessId, params) => api.get(`/business/${businessId}/orders`, { params }),
    updateOrderStatus: (businessId, orderId, status) => api.put(`/business/${businessId}/orders/${orderId}/status`, { status }),
    getAnalytics: (businessId) => api.get(`/business/${businessId}/analytics`),
  },

  // Marketplace
  marketplace: {
    getAllBusinesses: (params) => api.get('/products/businesses', { params }),
    getBusinessDetails: (businessId, params) => api.get(`/products/business/${businessId}`, { params }),
    getProductDetails: (productId) => api.get(`/products/product/${productId}`),
    createOrder: (data) => api.post('/products/order', data),
    getBusinessTypes: () => api.get('/products/business-types'),
    searchProducts: (params) => api.get('/products/search', { params }),
  },

  // Wallet management
  wallet: {
    getWallet: () => api.get('/wallet'),
    addMoney: (amount, paymentMethod) => api.post('/wallet/add-money', { amount, paymentMethod }),
    withdrawMoney: (amount, bankAccount, method) => api.post('/wallet/withdraw-money', { amount, bankAccount, withdrawalMethod: method }),
    transferMoney: (recipientEmail, amount, description) => api.post('/wallet/transfer-money', { recipientEmail, amount, description }),
    getTransactions: (params) => api.get('/wallet/transactions', { params }),
    getStats: () => api.get('/wallet/stats'),
    getTransaction: (transactionId) => api.get(`/wallet/transaction/${transactionId}`),
  },

  // File uploads
  upload: {
    single: (file, folder) => {
      const formData = new FormData();
      formData.append('file', file);
      if (folder) formData.append('uploadFolder', folder);
      return api.post('/upload/single', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    },
    multiple: (files, folder) => {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      if (folder) formData.append('uploadFolder', folder);
      return api.post('/upload/multiple', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    },
    profilePicture: (file) => {
      const formData = new FormData();
      formData.append('profilePicture', file);
      return api.post('/upload/profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    },
    productImages: (files) => {
      const formData = new FormData();
      files.forEach(file => formData.append('images', file));
      return api.post('/upload/product-images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    },
    listFiles: (folder, params) => api.get(`/upload/files/${folder}`, { params }),
    deleteFile: (folder, filename) => api.delete(`/upload/files/${folder}/${filename}`),
    getStats: () => api.get('/upload/stats'),
  },

  // Admin functions
  admin: {
    getStats: () => api.get('/admin/stats'),
    getUsers: (params) => api.get('/admin/users', { params }),
    updateUser: (userId, data) => api.put(`/admin/users/${userId}`, data),
    deleteUser: (userId) => api.delete(`/admin/users/${userId}`),
    getBusinessApplications: (params) => api.get('/admin/business-applications', { params }),
    reviewBusinessApplication: (applicationId, data) => api.put(`/admin/business-applications/${applicationId}`, data),
    getSystemSettings: () => api.get('/admin/settings'),
    updateSystemSettings: (data) => api.put('/admin/settings', data),
  },
};

// Error handling helper
export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    return {
      message: error.response.data?.message || 'An error occurred',
      status: error.response.status,
      data: error.response.data
    };
  } else if (error.request) {
    // Request was made but no response received
    return {
      message: 'Network error. Please check your connection.',
      status: 0,
      data: null
    };
  } else {
    // Something else happened
    return {
      message: error.message || 'An unexpected error occurred',
      status: 0,
      data: null
    };
  }
};

// Success response helper
export const handleApiSuccess = (response) => {
  return {
    data: response.data?.data || response.data,
    message: response.data?.message || 'Success',
    success: response.data?.success !== false
  };
};

export default api;
