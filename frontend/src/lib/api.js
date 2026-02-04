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
  // Import/Export
  importFile: (formData, category) => api.post(`/contacts/import${category ? `?category=${category}` : ''}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  exportCSV: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.category) params.append('category', filters.category);
    if (filters.status) params.append('status', filters.status);
    if (filters.tags) params.append('tags', filters.tags);
    return api.get(`/contacts/export/csv?${params.toString()}`, { responseType: 'blob' });
  },
  exportVCard: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.category) params.append('category', filters.category);
    if (filters.status) params.append('status', filters.status);
    if (filters.tags) params.append('tags', filters.tags);
    return api.get(`/contacts/export/vcard?${params.toString()}`, { responseType: 'blob' });
  },
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
  get: (id) => api.get(`/tasks/${id}`),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  updateStatus: (id, status) => api.patch(`/tasks/${id}/status`, { status }),
  delete: (id) => api.delete(`/tasks/${id}`),
  getDueToday: () => api.get('/tasks/due/today'),
  getUpcoming: (days = 7) => api.get(`/tasks/due/upcoming?days=${days}`),
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
  generateData: (id) => api.post(`/property-leads/listings/${id}/generate-data`),
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

// Newsletter System
export const newsletterAPI = {
  list: (status) => api.get(`/newsletters${status ? `?status=${status}` : ''}`),
  get: (id) => api.get(`/newsletters/${id}`),
  create: (data) => api.post('/newsletters', data),
  update: (id, data) => api.put(`/newsletters/${id}`, data),
  send: (id) => api.post(`/newsletters/${id}/send`),
  delete: (id) => api.delete(`/newsletters/${id}`),
  getArchive: () => axios.get(`${API_URL}/newsletters/archive`),
};

export const templateAPI = {
  list: () => api.get('/newsletter-templates'),
  get: (id) => api.get(`/newsletter-templates/${id}`),
  create: (data) => api.post('/newsletter-templates', data),
  delete: (id) => api.delete(`/newsletter-templates/${id}`),
};

export const triggerAPI = {
  list: () => api.get('/newsletter-triggers'),
  create: (data) => api.post('/newsletter-triggers', data),
  update: (id, data) => api.patch(`/newsletter-triggers/${id}`, data),
  delete: (id) => api.delete(`/newsletter-triggers/${id}`),
};

// Storage Providers
export const storageAPI = {
  getProviders: () => api.get('/storage/providers'),
  getProvider: (id) => api.get(`/storage/providers/${id}`),
  updateProvider: (id, data) => api.put(`/storage/providers/${id}`, data),
  testProvider: (id) => api.post(`/storage/providers/${id}/test`),
  setDefault: (id) => api.post(`/storage/providers/${id}/set-default`),
  getDefault: () => api.get('/storage/default'),
};

// Mailing Lists
export const mailingListAPI = {
  getLists: () => api.get('/mailing-lists'),
  getList: (id) => api.get(`/mailing-lists/${id}`),
  createList: (data) => api.post('/mailing-lists', data),
  updateList: (id, data) => api.put(`/mailing-lists/${id}`, data),
  deleteList: (id) => api.delete(`/mailing-lists/${id}`),
  addSubscriber: (listId, data) => api.post(`/mailing-lists/${listId}/subscribers`, data),
  removeSubscriber: (listId, subscriberId) => api.delete(`/mailing-lists/${listId}/subscribers/${subscriberId}`),
  updateSubscriber: (listId, subscriberId, data) => api.patch(`/mailing-lists/${listId}/subscribers/${subscriberId}`, data),
  importCSV: (listId, formData) => api.post(`/mailing-lists/${listId}/import`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  exportCSV: (listId) => api.get(`/mailing-lists/${listId}/export`, { responseType: 'blob' }),
  importFromContacts: (listId, category) => api.post(`/mailing-lists/${listId}/import-from-contacts${category ? `?category=${category}` : ''}`),
  importFromLeads: (listId, leadType) => api.post(`/mailing-lists/${listId}/import-from-leads${leadType ? `?lead_type=${leadType}` : ''}`),
  clearSubscribers: (listId) => api.delete(`/mailing-lists/${listId}/subscribers`),
};

// Landing Pages
export const landingPagesAPI = {
  getAll: () => api.get('/landing-pages'),
  get: (id) => api.get(`/landing-pages/${id}`),
  create: (data) => api.post('/landing-pages', data),
  update: (id, data) => api.put(`/landing-pages/${id}`, data),
  delete: (id) => api.delete(`/landing-pages/${id}`),
  publish: (id) => api.post(`/landing-pages/${id}/publish`),
  unpublish: (id) => api.post(`/landing-pages/${id}/unpublish`),
  uploadVideo: (id, formData) => api.post(`/landing-pages/${id}/upload-video`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadImage: (id, formData) => api.post(`/landing-pages/${id}/upload-image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getAvailableListings: () => api.get('/landing-pages/available-listings'),
  getPublicPage: (slug) => api.get(`/landing-pages/public/${slug}`),
  submitContactForm: (slug, data) => api.post(`/landing-pages/public/${slug}/contact`, data),
};

// Media Library
export const mediaAPI = {
  getFolders: () => api.get('/media/folders'),
  getFolderContents: (propertyId, subfolder) => 
    api.get(`/media/folders/${propertyId}${subfolder ? `?subfolder=${subfolder}` : ''}`),
  uploadFile: (propertyId, formData) => api.post(`/media/upload/${propertyId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteFile: (filePath) => api.delete(`/media/file?file_path=${encodeURIComponent(filePath)}`),
  renameFile: (filePath, newName) => api.put(`/media/file/rename?file_path=${encodeURIComponent(filePath)}&new_name=${encodeURIComponent(newName)}`),
  createFolder: (propertyId, folderName, parentSubfolder) => 
    api.post(`/media/folder/create?property_id=${propertyId}&folder_name=${folderName}${parentSubfolder ? `&parent_subfolder=${parentSubfolder}` : ''}`),
  deleteFolder: (folderPath) => api.delete(`/media/folder?folder_path=${encodeURIComponent(folderPath)}`),
  initializePropertyFolders: (propertyId) => api.post(`/media/initialize/${propertyId}`),
  
  // Site Images (logos, branding, etc.)
  getSiteImages: () => api.get('/site-images'),
  uploadSiteImage: (formData) => api.post('/site-images/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteSiteImage: (filename) => api.delete(`/site-images/${filename}`),
};

// Property Lookup API (County Records + MLS)
export const propertyLookupAPI = {
  // County tax records
  searchCounty: (address, county = null) => 
    api.post('/property-lookup/county/search', { address, county }),
  getCountyDetails: (county, parcelId) => 
    api.get(`/property-lookup/county/details/${county}/${parcelId}`),
  getSupportedCounties: () => api.get('/property-lookup/county/supported'),
  
  // MLS
  getMlsConfig: () => api.get('/property-lookup/mls/config'),
  saveMlsConfig: (config) => api.post('/property-lookup/mls/config', config),
  testMls: () => api.post('/property-lookup/mls/test'),
  searchMls: (filters) => api.post('/property-lookup/mls/search', filters),
  getMlsListing: (listingId) => api.get(`/property-lookup/mls/listing/${listingId}`),
  
  // Combined search
  unifiedSearch: (address, includeCounty = true, includeMls = true, county = null) =>
    api.post(`/property-lookup/search?address=${encodeURIComponent(address)}&include_county=${includeCounty}&include_mls=${includeMls}${county ? `&county=${county}` : ''}`),
  
  // History & Recent
  getHistory: (limit = 50) => api.get(`/property-lookup/history?limit=${limit}`),
  getRecentSearches: (limit = 10) => api.get(`/property-lookup/recent-searches?limit=${limit}`),
  
  // Property Assignment
  assignToProperty: (propertyId, countyData) => 
    api.post('/property-lookup/assign-to-property', { property_id: propertyId, county_data: countyData }),
  getSavedLookups: () => api.get('/property-lookup/saved-lookups'),
};

// Reviews/Testimonials API
export const reviewsAPI = {
  getAll: (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.source) queryParams.append('source', params.source);
    if (params.featured_only) queryParams.append('featured_only', 'true');
    if (params.homepage_only) queryParams.append('homepage_only', 'true');
    if (params.show_fake === false) queryParams.append('show_fake', 'false');
    return api.get(`/reviews?${queryParams.toString()}`);
  },
  getPublic: (homepageOnly = true, limit = 100) => api.get(`/reviews/public?homepage_only=${homepageOnly}&limit=${limit}`),
  getOne: (id) => api.get(`/reviews/${id}`),
  create: (data) => api.post('/reviews', data),
  update: (id, data) => api.put(`/reviews/${id}`, data),
  delete: (id) => api.delete(`/reviews/${id}`),
  deleteAllFake: () => api.delete('/reviews/fake/all'),
  syncRateMyAgent: () => api.post('/reviews/sync-ratemyagent'),
  getSources: () => api.get('/reviews/sources/list'),
};

// Property Leads API
export const propertyLeadsAPI = {
  getAll: (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.priority) queryParams.append('priority', params.priority);
    if (params.city) queryParams.append('city', params.city);
    if (params.skip) queryParams.append('skip', params.skip);
    if (params.limit) queryParams.append('limit', params.limit);
    return api.get(`/property-leads?${queryParams.toString()}`);
  },
  getStats: () => api.get('/property-leads/stats'),
  getOne: (id) => api.get(`/property-leads/${id}`),
  create: (data) => api.post('/property-leads', data),
  update: (id, data) => api.put(`/property-leads/${id}`, data),
  delete: (id) => api.delete(`/property-leads/${id}`),
  addNote: (id, note) => api.post(`/property-leads/${id}/notes`, note),
  deleteNote: (id, noteId) => api.delete(`/property-leads/${id}/notes/${noteId}`),
  pullOwnerInfo: (id) => api.post(`/property-leads/${id}/pull-owner-info`),
  importCSV: (formData) => api.post('/property-leads/import-csv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  exportCSV: (status) => api.get(`/property-leads/export/csv${status ? `?status=${status}` : ''}`),
  
  // Marketing features
  getScore: (id) => api.get(`/property-leads/${id}/score`),
  generateBrochure: (id, template = 'flyer', includeQr = true) => 
    api.post(`/property-leads/${id}/brochure/generate`, { template, include_qr: includeQr }, { responseType: 'blob' }),
  previewBrochure: (id, template = 'flyer', includeQr = true) => 
    api.post(`/property-leads/${id}/brochure/preview`, { template, include_qr: includeQr }, { responseType: 'blob' }),
  emailBrochure: (id, data) => api.post(`/property-leads/${id}/brochure/email`, data),
  createListing: (id, data) => api.post(`/property-leads/${id}/create-listing`, data),
  publishLandingPage: (id) => api.post(`/property-leads/${id}/publish-landing-page`),
  uploadVideo: (id, videoUrl, videoTitle) => 
    api.post(`/property-leads/${id}/upload-video?video_url=${encodeURIComponent(videoUrl)}&video_title=${encodeURIComponent(videoTitle || '')}`),
  runMarketingWorkflow: (id, template = 'flyer') => 
    api.post(`/property-leads/${id}/marketing-workflow?template=${template}`),
  
  // Property data scraping
  generateData: (id) => api.post(`/property-leads/${id}/generate-data`),
  convertToShowcase: (id) => api.post(`/property-leads/${id}/convert-to-showcase`),
};

// Seed data
export const seedAPI = {
  seed: () => api.post('/seed'),
};

export default api;
