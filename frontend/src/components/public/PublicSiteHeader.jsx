import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Home, ChevronDown } from 'lucide-react';
import { Button } from '../ui/button';
import { useBranding } from '../../contexts/BrandingContext';
import axios from 'axios';

const API_URL = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

export const PublicSiteHeader = ({ activePage = '', contactHref = '/#contact', variant = 'fixed' }) => {
  const { branding } = useBranding();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [neighborhoodsOpen, setNeighborhoodsOpen] = useState(false);
  const [mobileNeighborhoodsOpen, setMobileNeighborhoodsOpen] = useState(false);
  const [neighborhoods, setNeighborhoods] = useState([]);
  const publicLogoSrc = branding.logoUrl || '/images/hidden-haven-logo-full.png';
  const closeTimer = useRef(null);

  const openNeighborhoods = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setNeighborhoodsOpen(true);
  };

  const delayCloseNeighborhoods = () => {
    closeTimer.current = setTimeout(() => setNeighborhoodsOpen(false), 200);
  };

  useEffect(() => {
    axios.get(`${API_URL}/api/neighborhoods/public/list`)
      .then(res => setNeighborhoods(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
  }, []);

  const isOverlay = variant === 'overlay';
  const shellClass = isOverlay
    ? 'absolute top-0 left-0 right-0 z-50'
    : 'relative z-50 bg-transparent border-none';

  const navLinkClass = (isActive) =>
    `text-sm tracking-wide transition-colors ${isActive ? 'text-amber-400 border-b border-amber-400' : 'text-white/70 hover:text-amber-400'}`;

  const closeMobileMenu = () => setMobileOpen(false);

  return (
    <header className={shellClass} data-testid="public-site-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex items-center justify-between gap-4">
          <Link
            to={branding.logoLinkUrl || '/'}
            className="flex items-center gap-3 shrink-0 min-w-fit"
            data-testid="public-header-logo-link"
            onClick={closeMobileMenu}
          >
            {publicLogoSrc ? (
              <img
                src={publicLogoSrc}
                alt={branding.siteName || 'Hidden Haven Realty'}
                className="h-20 w-auto object-contain shrink-0"
                data-testid="public-header-logo-image"
                onError={(e) => {
                  if (e.currentTarget.src.endsWith('/images/hidden-haven-logo-full.png')) {
                    return;
                  }
                  e.currentTarget.src = '/images/hidden-haven-logo-full.png';
                }}
              />
            ) : (
              <>
                <Home className="w-6 h-6 text-amber-400" />
                <span className="font-serif text-xl text-white">{branding.siteName || 'Hidden Haven Realty'}</span>
              </>
            )}
          </Link>

          <nav className="hidden md:flex items-center gap-8 ml-auto" data-testid="public-header-desktop-menu">
            <Link to="/showcase" className={navLinkClass(activePage === 'showcase')} data-testid="public-menu-showcase-link">
              LISTING SHOWCASE
            </Link>
            <div className="relative" onMouseEnter={openNeighborhoods} onMouseLeave={delayCloseNeighborhoods}>
              <Link to="/neighborhoods" className={`${navLinkClass(activePage === 'neighborhoods')} flex items-center gap-1`} data-testid="public-menu-neighborhoods-link">
                NEIGHBORHOODS <ChevronDown className="w-3 h-3" />
              </Link>
              {neighborhoodsOpen && neighborhoods.length > 0 && (
                <div
                  className="absolute top-full left-0 mt-1 w-64 bg-[#0a1628] border border-amber-400/20 rounded-lg shadow-2xl py-2 z-50"
                  data-testid="neighborhoods-dropdown"
                  onMouseEnter={openNeighborhoods}
                  onMouseLeave={delayCloseNeighborhoods}
                >
                  {neighborhoods.map(n => (
                    <Link
                      key={n.id}
                      to={`/neighborhoods/${n.slug}`}
                      className="block px-4 py-2 text-sm text-white/70 hover:text-amber-400 hover:bg-white/5 transition-colors"
                      onClick={() => setNeighborhoodsOpen(false)}
                    >
                      {n.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <Link to="/about" className={navLinkClass(activePage === 'about')} data-testid="public-menu-about-link">
              ABOUT
            </Link>
            <a href={contactHref} className={navLinkClass(false)} data-testid="public-menu-contact-link">
              CONTACT
            </a>
            <Link to="/login" data-testid="public-menu-login-link">
              <Button variant="outline" className="border-amber-400/50 text-amber-400 hover:bg-amber-400 hover:text-black">
                AGENT LOGIN
              </Button>
            </Link>
          </nav>

          <button
            className="md:hidden text-white"
            onClick={() => setMobileOpen(true)}
            data-testid="public-menu-mobile-open-button"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <>
          <button
            className="fixed inset-0 bg-black/60 z-[60]"
            onClick={closeMobileMenu}
            data-testid="public-menu-mobile-overlay"
            aria-label="Close mobile menu"
          />
          <aside
            className="fixed top-0 right-0 h-full w-[82vw] max-w-sm bg-[#0a1628] border-l border-amber-400/20 z-[70] p-6"
            data-testid="public-menu-mobile-drawer"
          >
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-center gap-3" data-testid="public-mobile-menu-logo-placeholder">
                {publicLogoSrc ? (
                  <img
                    src={publicLogoSrc}
                    alt={branding.siteName || 'Hidden Haven Realty'}
                    className="h-12 object-contain"
                    onError={(e) => {
                      if (e.currentTarget.src.endsWith('/images/hidden-haven-logo-full.png')) {
                        return;
                      }
                      e.currentTarget.src = '/images/hidden-haven-logo-full.png';
                    }}
                  />
                ) : (
                  <>
                    <Home className="w-5 h-5 text-amber-400" />
                    <span className="text-sm text-white">{branding.siteName || 'Hidden Haven Realty'}</span>
                  </>
                )}
              </div>
              <button
                onClick={closeMobileMenu}
                className="text-white hover:text-amber-400"
                data-testid="public-menu-mobile-close-button"
                aria-label="Close menu"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-5" data-testid="public-header-mobile-menu">
              <Link to="/showcase" className="block text-white/90 hover:text-amber-400" onClick={closeMobileMenu} data-testid="public-mobile-showcase-link">
                LISTING SHOWCASE
              </Link>
              <div>
                <button
                  className="flex items-center gap-2 text-white/90 hover:text-amber-400 w-full text-left"
                  onClick={() => setMobileNeighborhoodsOpen(!mobileNeighborhoodsOpen)}
                  data-testid="public-mobile-neighborhoods-toggle"
                >
                  NEIGHBORHOODS <ChevronDown className={`w-4 h-4 transition-transform ${mobileNeighborhoodsOpen ? 'rotate-180' : ''}`} />
                </button>
                {mobileNeighborhoodsOpen && (
                  <div className="ml-4 mt-2 space-y-3">
                    {neighborhoods.map(n => (
                      <Link
                        key={n.id}
                        to={`/neighborhoods/${n.slug}`}
                        className="block text-white/60 hover:text-amber-400 text-sm"
                        onClick={closeMobileMenu}
                      >
                        {n.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              <Link to="/about" className="block text-white/90 hover:text-amber-400" onClick={closeMobileMenu} data-testid="public-mobile-about-link">
                ABOUT
              </Link>
              <a href={contactHref} className="block text-white/90 hover:text-amber-400" onClick={closeMobileMenu} data-testid="public-mobile-contact-link">
                CONTACT
              </a>
              <Link to="/login" className="block pt-2" onClick={closeMobileMenu} data-testid="public-mobile-login-link">
                <Button variant="outline" className="w-full border-amber-400/50 text-amber-400 hover:bg-amber-400 hover:text-black">
                  AGENT LOGIN
                </Button>
              </Link>
            </div>
          </aside>
        </>
      )}
    </header>
  );
};

export default PublicSiteHeader;