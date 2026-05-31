import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

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

/** Injects all browser/PWA icon references from the branding settings */
function applyBrandingIcons(branding) {
  const faviconUrl  = branding.faviconUrl  || '';
  const pwaIconUrl  = branding.pwaIconUrl  || branding.faviconUrl || '';
  const siteName    = branding.siteName    || 'Hidden Haven Realty';

  if (!faviconUrl && !pwaIconUrl) return;  // nothing configured yet

  // ── 1. Update every existing <link rel="icon"> / apple-touch-icon ──────────
  const iconSelectors = [
    "link[rel='icon']",
    "link[rel='shortcut icon']",
    "link[rel~='icon']",                          // catches rel="icon" and rel="shortcut icon"
    "link[rel='apple-touch-icon']",
    "link[rel='apple-touch-icon-precomposed']",
  ];
  iconSelectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      const isApple = el.rel.includes('apple-touch');
      el.href = isApple
        ? (pwaIconUrl || faviconUrl)
        : (faviconUrl || pwaIconUrl);
    });
  });

  // ── 2. Update msapplication meta tag ───────────────────────────────────────
  const msTile = document.querySelector("meta[name='msapplication-TileImage']");
  if (msTile && pwaIconUrl) msTile.content = pwaIconUrl;

  // ── 3. Update page title ───────────────────────────────────────────────────
  if (siteName) document.title = siteName;

  // ── 4. Swap manifest.json → dynamic backend manifest ──────────────────────
  // Remove old <link rel="manifest"> and point to the backend endpoint that
  // returns a manifest with the correct icons from settings.
  let manifestLink = document.querySelector("link[rel='manifest']");
  const dynamicManifestUrl = `${API_URL}/api/manifest`;
  if (manifestLink) {
    manifestLink.href = dynamicManifestUrl;
  } else {
    manifestLink = document.createElement('link');
    manifestLink.rel  = 'manifest';
    manifestLink.href = dynamicManifestUrl;
    document.head.appendChild(manifestLink);
  }
}

export const BrandingProvider = ({ children }) => {
  const [branding, setBranding] = useState(defaultBranding);
  const [loading, setLoading]   = useState(true);

  const fetchBranding = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/settings/branding`);
      if (response.data) {
        const merged = { ...defaultBranding, ...response.data };
        setBranding(merged);
        applyBrandingIcons(merged);
      }
    } catch {
      // Branding fetch failed — silently keep defaults
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranding();
  }, []);

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
