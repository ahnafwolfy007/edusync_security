import api from '../api';

export const foodVendorService = {
  async submitApplication(payload) {
    const res = await api.post('/food-vendor/apply', payload);
    return res.data?.data?.application;
  },
  async getApplicationStatus() {
    try {
      const res = await api.get('/food-vendor/application/status');
      return res.data?.data?.application || null;
    } catch {
      return null;
    }
  },
  async fetchApplicationHistory() {
    try {
      const res = await api.get('/food-vendor/applications/history');
      return res.data?.data?.applications || [];
    } catch { return []; }
  },
  async fetchMyVendor() {
    const res = await api.get('/food-vendor/my-vendor');
    return res.data?.data?.vendor || null;
  },
  async fetchVendorAnalytics(vendorId) {
    const res = await api.get(`/food-vendor/${vendorId}/analytics`);
    return res.data?.data?.analytics || res.data?.data || {};
  },
  async fetchVendorOrders(vendorId, params = {}) {
    const res = await api.get(`/food-vendor/${vendorId}/orders`, { params });
    return res.data?.data?.orders || [];
  },
  async addMenuItem(vendorId, payload) {
    const res = await api.post(`/food-vendor/${vendorId}/items`, payload);
    return res.data?.data?.item;
  }
};

export default foodVendorService;
