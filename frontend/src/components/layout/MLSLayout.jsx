import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Download,
  CheckCircle,
  ArrowRightCircle,
  Search,
  Settings,
  ChevronLeft,
  ChevronRight,
  Database,
  RefreshCw,
  BarChart3
} from 'lucide-react';
import { cn } from '../../lib/utils';

const mlsMenuItems = [
  { path: '/mls', label: 'Overview', icon: LayoutDashboard, exact: true },
  { path: '/mls/pull', label: 'Pull Listings', icon: Download },
  { path: '/mls/moderate', label: 'Moderate', icon: CheckCircle },
  { path: '/mls/converted', label: 'Converted', icon: ArrowRightCircle },
  { path: '/mls/search', label: 'MLS Search', icon: Search },
  { path: '/mls/sync-history', label: 'Sync History', icon: RefreshCw },
  { path: '/mls/settings', label: 'Settings', icon: Settings },
];

export const MLSLayout = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (item) => {
    if (item.exact) {
      return location.pathname === item.path;
    }
    return location.pathname.startsWith(item.path) && item.path !== '/mls';
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* MLS Sidebar */}
      <aside className={cn(
        "bg-card border-r transition-all duration-300 flex flex-col",
        collapsed ? "w-16" : "w-56"
      )}>
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-amber-500" />
              <h2 className="font-serif font-bold text-lg text-amber-500">MLS Hub</h2>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded hover:bg-muted"
            data-testid="mls-sidebar-toggle"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {mlsMenuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item) || (item.exact && location.pathname === item.path);
            
            return (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`mls-nav-${item.label.toLowerCase().replace(' ', '-')}`}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                  active 
                    ? "bg-amber-500/20 text-amber-500 font-medium" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer - Connection Status */}
        {!collapsed && (
          <div className="p-4 border-t">
            <div className="text-xs text-muted-foreground">
              <p>Connected to</p>
              <p className="font-medium text-amber-500 mt-1">Stellar MLS</p>
              <p className="text-green-500 flex items-center gap-1 mt-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Active
              </p>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 bg-background">
        <Outlet />
      </main>
    </div>
  );
};

export default MLSLayout;
