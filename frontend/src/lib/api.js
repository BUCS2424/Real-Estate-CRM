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
