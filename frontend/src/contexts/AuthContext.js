import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API = `${(process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '')}/api`;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const response = await axios.get(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUser(response.data);
        } catch (error) {
          console.error('Auth error:', error);
          logout();
        }
      }
      setLoading(false);
    };
    fetchUser();
  }, [token, logout]);

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password });
    const { access_token, user: userData } = response.data;
    localStorage.setItem('token', access_token);
    setToken(access_token);
    setUser(userData);
    return userData;
  };

  const register = async (email, password, name, role = 'client') => {
    const response = await axios.post(`${API}/auth/register`, { email, password, name, role });
    const { access_token, user: userData } = response.data;
    localStorage.setItem('token', access_token);
    setToken(access_token);
    setUser(userData);
    return userData;
  };

  const hasRole = (roles) => {
    if (!user) return false;
    if (typeof roles === 'string') return user.role === roles;
    return roles.includes(user.role);
  };

  const isSuperUser = () => user?.role === 'superuser';
  const isAdmin = () => hasRole(['superuser', 'admin']);

  const impersonate = async (userId) => {
    const response = await axios.post(`${API}/users/${userId}/impersonate`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const { access_token } = response.data;
    if (!localStorage.getItem('impersonator_token')) {
      localStorage.setItem('impersonator_token', token);
    }
    localStorage.setItem('token', access_token);
    setToken(access_token);
    return response.data.user;
  };

  const exitImpersonation = () => {
    const original = localStorage.getItem('impersonator_token');
    if (!original) return;
    localStorage.setItem('token', original);
    localStorage.removeItem('impersonator_token');
    setToken(original);
  };

  const isImpersonating = () => !!localStorage.getItem('impersonator_token');

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      loading, 
      login, 
      register, 
      logout, 
      hasRole,
      isSuperUser,
      isAdmin,
      impersonate,
      exitImpersonation,
      isImpersonating
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
