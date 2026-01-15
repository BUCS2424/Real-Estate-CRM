import axios from 'axios';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

// Contacts
export const contactsAPI = {
  list: () => api.get('/contacts'),
  get: (id) => api.get(`/contacts/${id}`),
  create: (data) => api.post('/contacts', data),
  update: (id, data) => api.put(`/contacts/${id}`, data),
  updateScore: (id, score) => api.patch(`/contacts/${id}/score`, { lead_score: score }),
  delete: (id) => api.delete(`/contacts/${id}`),
};

// Deals
export const dealsAPI = {
  list: () => api.get('/deals'),
  get: (id) => api.get(`/deals/${id}`),
  create: (data) => api.post('/deals', data),
  updateStage: (id, stage) => api.patch(`/deals/${id}/stage`, { stage }),
  delete: (id) => api.delete(`/deals/${id}`),
};

// Tasks
export const tasksAPI = {
  list: () => api.get('/tasks'),
  create: (data) => api.post('/tasks', data),
  updateStatus: (id, status) => api.patch(`/tasks/${id}/status`, { status }),
  delete: (id) => api.delete(`/tasks/${id}`),
};

// Articles
export const articlesAPI = {
  list: () => api.get('/articles'),
  create: (data) => api.post('/articles', data),
  update: (id, data) => api.put(`/articles/${id}`, data),
  delete: (id) => api.delete(`/articles/${id}`),
};

// AI
export const aiAPI = {
  generate: (data) => api.post('/ai/generate', data),
};

// Settings
export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
};

// Booking
export const bookingAPI = {
  getSettings: () => api.get('/booking/settings'),
  updateSettings: (data) => api.put('/booking/settings', data),
  getBookings: () => api.get('/booking/list'),
  createBooking: (data) => api.post('/booking/create', data),
  updateBookingStatus: (id, status) => api.patch(`/booking/${id}/status`, { status }),
  deleteBooking: (id) => api.delete(`/booking/${id}`),
  getBlockedDates: () => api.get('/booking/blocked-dates'),
  addBlockedDate: (data) => api.post('/booking/blocked-dates', data),
  removeBlockedDate: (date) => api.delete(`/booking/blocked-dates/${date}`),
};

// Public Booking (no auth required)
export const publicBookingAPI = {
  getAgentInfo: (code) => axios.get(`${API_URL}/public/booking/${code}`),
  getAvailableSlots: (code, date) => axios.get(`${API_URL}/public/booking/${code}/available-slots?date=${date}`),
  createBooking: (code, data) => axios.post(`${API_URL}/public/booking/${code}`, data),
};

// Notifications
export const notificationsAPI = {
  list: () => api.get('/notifications'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
};

// Phone Verification
export const phoneAPI = {
  sendCode: (phone_number) => api.post('/phone/send-code', { phone_number }),
  verifyCode: (phone_number, code) => api.post('/phone/verify-code', { phone_number, code }),
  checkVerified: (phone_number) => api.get(`/phone/check/${encodeURIComponent(phone_number)}`),
};

// Email Verification
export const emailAPI = {
  sendCode: (email) => api.post('/email/send-code', { email }),
  verifyCode: (email, code) => api.post('/email/verify-code', { email, code }),
  checkVerified: (email) => api.get(`/email/check/${encodeURIComponent(email)}`),
};

// Property Listings
export const listingsAPI = {
  list: () => api.get('/listings'),
  get: (id) => api.get(`/listings/${id}`),
  create: (data) => api.post('/listings', data),
  update: (id, data) => api.put(`/listings/${id}`, data),
  delete: (id) => api.delete(`/listings/${id}`),
  generateDescription: (id) => api.post(`/listings/${id}/generate-description`),
  lookupAddress: (address) => api.post('/listings/lookup-address', { address }),
};

// Media & Storage
export const mediaAPI = {
  list: (folder = 'general') => api.get(`/media?folder=${folder}`),
  getFolders: () => api.get('/media/folders'),
  createFolder: (name, parent_id) => api.post(`/media/folders?name=${encodeURIComponent(name)}${parent_id ? `&parent_id=${parent_id}` : ''}`),
  deleteFolder: (id) => api.delete(`/media/folders/${id}`),
  upload: (data) => api.post('/media/upload', data),
  delete: (id) => api.delete(`/media/${id}`),
  getStats: () => api.get('/storage/stats'),
};

// Public APIs (no auth required)
export const publicAPI = {
  getListings: (limit = 12) => api.get(`/public/listings?limit=${limit}`),
  getListing: (id) => api.get(`/public/listings/${id}`),
  submitLead: (data) => api.post('/public/leads', data),
};

// Leads Management
export const leadsAPI = {
  list: (lead_type, status) => api.get(`/leads${lead_type || status ? '?' : ''}${lead_type ? `lead_type=${lead_type}` : ''}${lead_type && status ? '&' : ''}${status ? `status=${status}` : ''}`),
  get: (id) => api.get(`/leads/${id}`),
  update: (id, data) => api.patch(`/leads/${id}`, data),
  delete: (id) => api.delete(`/leads/${id}`),
  convertToContact: (id) => api.post(`/leads/${id}/convert`),
};

// Property Submissions (seller workflow)
export const propertySubmissionsAPI = {
  submit: (data) => axios.post(`${API_URL}/public/property-submissions`, data),
  list: (status) => api.get(`/property-submissions${status ? `?status=${status}` : ''}`),
  get: (id) => api.get(`/property-submissions/${id}`),
  update: (id, data) => api.patch(`/property-submissions/${id}`, data),
  convert: (id) => api.post(`/property-submissions/${id}/convert`),
  delete: (id) => api.delete(`/property-submissions/${id}`),
};

// Dashboard
export const dashboardAPI = {
  stats: () => api.get('/dashboard/stats'),
};

// Users (admin only)
export const usersAPI = {
  list: () => api.get('/users'),
  updateRole: (id, role) => api.patch(`/users/${id}/role?role=${role}`),
};

// Seed data
export const seedAPI = {
  seed: () => api.post('/seed'),
};

export default api;
