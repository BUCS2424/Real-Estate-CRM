import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { StaffChatDrawer } from '../StaffChatDrawer';
import { cn } from '../../lib/utils';

export const MainLayout = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Desktop: collapsed / expanded
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Mobile: drawer open / closed
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Auto-collapse desktop sidebar on MLS pages
  useEffect(() => {
    if (location.pathname.startsWith('/mls')) {
      setSidebarCollapsed(true);
    } else if (window.innerWidth >= 768) {
      setSidebarCollapsed(false);
    }
    // Always close mobile drawer on route change
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background">

      {/* Mobile backdrop — tap to close sidebar */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(c => !c)}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <Topbar
        sidebarCollapsed={sidebarCollapsed}
        onMobileMenuToggle={() => setMobileSidebarOpen(o => !o)}
        mobileSidebarOpen={mobileSidebarOpen}
      />

      <main
        data-testid="main-content"
        className={cn(
          "pt-16 min-h-screen transition-all duration-300",
          // Desktop: offset by sidebar width
          sidebarCollapsed ? "md:pl-16" : "md:pl-64",
          // Mobile: no sidebar offset (sidebar is an overlay)
          "pl-0"
        )}
      >
        <div className="p-4 md:p-8">
          <Outlet />
        </div>
      </main>

      <StaffChatDrawer />
    </div>
  );
};
