import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { StaffChatDrawer } from '../StaffChatDrawer';
import { cn } from '../../lib/utils';
import { UserCheck, LogOut } from 'lucide-react';
import { Button } from '../ui/button';

export const MainLayout = () => {
  const { user, loading, exitImpersonation } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

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

  const handleExitImpersonation = () => {
    exitImpersonation();
    navigate('/admin/users');
  };

  return (
    <div className="min-h-screen bg-background">

      {/* Impersonation banner — always visible while viewing as another user */}
      {user._impersonating && (
        <div
          data-testid="impersonation-banner"
          className="fixed top-0 left-0 right-0 z-50 h-10 bg-amber-500 text-black flex items-center justify-center gap-3 text-sm font-medium px-4"
        >
          <UserCheck className="w-4 h-4" />
          <span>Viewing as <strong>{user.name}</strong> (impersonated by {user._impersonator_name})</span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 gap-1 text-black hover:bg-black/10 hover:text-black"
            onClick={handleExitImpersonation}
            data-testid="exit-impersonation-btn"
          >
            <LogOut className="w-3.5 h-3.5" /> Exit
          </Button>
        </div>
      )}

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
          "min-h-screen transition-all duration-300",
          user._impersonating ? "pt-[104px]" : "pt-16",
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
