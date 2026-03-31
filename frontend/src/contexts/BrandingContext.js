import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const defaultBranding = {
  siteName: 'Hidden Haven Realty',
  logoUrl: '/images/hidden-haven-logo-full.png',
  logoLinkUrl: '/',
  dashboardLogoUrl: '',
  dashboardLogoLinkUrl: '/dashboard',
  faviconUrl: '',
  pwaIconUrl: '',
};

const BrandingContext = createContext({
  branding: defaultBranding,
  loading: true,
  refreshBranding: () => {},
});

export const BrandingProvider = ({ children }) => {
  const [branding, setBranding] = useState(defaultBranding);
  const [loading, setLoading] = useState(true);

  const fetchBranding = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/settings/branding`);
      if (response.data) {
        setBranding(prev => ({ ...prev, ...response.data }));
      }
    } catch (error) {
      console.warn('Failed to fetch branding settings, using defaults');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranding();
  }, []);

  // Update favicon when branding changes
  useEffect(() => {
    if (branding.faviconUrl) {
      const existingFavicon = document.querySelector("link[rel*='icon']");
      if (existingFavicon) {
        existingFavicon.href = branding.faviconUrl;
      } else {
        const link = document.createElement('link');
        link.rel = 'icon';
        link.href = branding.faviconUrl;
        document.head.appendChild(link);
      }
    }
  }, [branding.faviconUrl]);

  // Update page title when siteName changes
  useEffect(() => {
    if (branding.siteName) {
      document.title = branding.siteName;
    }
  }, [branding.siteName]);

  return (
    <BrandingContext.Provider value={{ branding, loading, refreshBranding: fetchBranding }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
};

export default BrandingContext;
