import api from '../api';

// Lightweight business service abstraction
export const businessService = {
  async fetchMyBusinesses() {
    const res = await api.get('/business/my-businesses');
    return res.data?.data?.businesses || [];
  },
  async submitApplication(payload) {
    const res = await api.post('/business/apply', payload);
    return res.data?.data?.application;
  },
  async getApplicationStatus() {
    try {
      const res = await api.get('/business/application-status');
      return res.data?.data?.application || null;
    } catch {
      return null;
    }
  },
  async fetchApplicationHistory() {
    try {
      const res = await api.get('/business/applications/history');
      return res.data?.data?.applications || [];
    } catch { return []; }
  },
  async fetchBusinessAnalytics(businessId) {
    const res = await api.get(`/business/${businessId}/analytics`);
    return res.data?.data?.analytics || res.data?.data || {};
  },
  async fetchBusinessOrders(businessId, params = {}) {
    const res = await api.get(`/business/${businessId}/orders`, { params });
    return res.data?.data?.orders || [];
  },
  async addProduct(businessId, payload) {
    const res = await api.post(`/business/${businessId}/products`, payload);
    return res.data?.data?.product;
  }
};

export default businessService;
