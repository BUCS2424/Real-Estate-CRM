import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Home } from 'lucide-react';
import { Button } from '../ui/button';
import { useBranding } from '../../contexts/BrandingContext';

export const PublicSiteHeader = ({ activePage = '', contactHref = '/#contact', variant = 'fixed' }) => {
  const { branding } = useBranding();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isOverlay = variant === 'overlay';
  const shellClass = isOverlay
    ? 'absolute top-0 left-0 right-0 z-50'
    : 'fixed top-0 left-0 right-0 z-50 bg-transparent border-none';

  const navLinkClass = (isActive) =>
    `text-sm tracking-wide transition-colors ${isActive ? 'text-amber-400 border-b border-amber-400' : 'text-white/70 hover:text-amber-400'}`;

  const closeMobileMenu = () => setMobileOpen(false);

  return (
    <header className={shellClass} data-testid="public-site-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex items-center justify-between gap-4">
          <Link
            to={branding.logoLinkUrl || '/'}
            className="flex items-center gap-3"
            data-testid="public-header-logo-link"
            onClick={closeMobileMenu}
          >
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt={branding.siteName || 'Hidden Haven Realty'} className="h-20 object-contain" data-testid="public-header-logo-image" />
            ) : (
              <>
                <Home className="w-6 h-6 text-amber-400" />
                <span className="font-serif text-xl text-white">{branding.siteName || 'Hidden Haven Realty'}</span>
              </>
            )}
          </Link>

          <nav className="hidden md:flex items-center gap-8" data-testid="public-header-desktop-menu">
            <Link to="/showcase" className={navLinkClass(activePage === 'showcase')} data-testid="public-menu-showcase-link">
              LISTING SHOWCASE
            </Link>
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
                {branding.logoUrl ? (
                  <img src={branding.logoUrl} alt={branding.siteName || 'Hidden Haven Realty'} className="h-12 object-contain" />
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