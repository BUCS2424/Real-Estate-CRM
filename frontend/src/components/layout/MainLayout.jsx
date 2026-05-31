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

  // Auto-collapse sidebar on mobile screens (< 768px)
  const isMobile = () => window.innerWidth < 768;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(isMobile());

  useEffect(() => {
    const handleResize = () => {
      // Auto-collapse on mobile, restore on desktop (unless user manually toggled)
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    // Set initial state
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // MLS pages always collapse sidebar; also auto-collapse on mobile route changes
    if (location.pathname.startsWith('/mls') || isMobile()) {
      setSidebarCollapsed(true);
    } else {
      setSidebarCollapsed(false);
    }
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
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      <Topbar sidebarCollapsed={sidebarCollapsed} />
      <main
        data-testid="main-content"
        className={cn(
          "pt-16 min-h-screen transition-all duration-300",
          sidebarCollapsed ? "pl-16" : "pl-64"
        )}
      >
        <div className="p-6 md:p-8">
          <Outlet />
        </div>
      </main>
      <StaffChatDrawer />
    </div>
  );
};
