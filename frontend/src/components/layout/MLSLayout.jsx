import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Download,
  CheckCircle,
  ArrowRightCircle,
  Search,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Database,
  RefreshCw,
  Clock,
  FileSearch,
  ClipboardCheck,
  UserPlus,
  XCircle,
  Home
} from 'lucide-react';
import { cn } from '../../lib/utils';

// Main MLS menu items
const mlsMenuItems = [
  { path: '/mls', label: 'Overview', icon: LayoutDashboard, exact: true },
  { path: '/mls/search', label: 'MLS Search', icon: Search },
];

// My Listings sub-menu items
const myListingsMenuItems = [
  { path: '/mls/pull', label: 'Pull Listings', icon: Download },
  { path: '/mls/moderate', label: 'Moderate', icon: CheckCircle },
  { path: '/mls/converted', label: 'Converted', icon: ArrowRightCircle },
];

// Expired Listings sub-menu items
const expiredMenuItems = [
  { path: '/mls/expired/search', label: 'Search Expired', icon: FileSearch },
  { path: '/mls/expired/moderate', label: 'Moderate', icon: ClipboardCheck },
  { path: '/mls/expired/converted', label: 'Converted to Leads', icon: UserPlus },
];

// Withdrawn Listings sub-menu items
const withdrawnMenuItems = [
  { path: '/mls/withdrawn/search', label: 'Search Withdrawn', icon: FileSearch },
  { path: '/mls/withdrawn/moderate', label: 'Moderate', icon: ClipboardCheck },
  { path: '/mls/withdrawn/converted', label: 'Converted to Leads', icon: UserPlus },
];

// Bottom menu items
const bottomMenuItems = [
  { path: '/mls/sync-history', label: 'Sync History', icon: RefreshCw },
  { path: '/mls/settings', label: 'Settings', icon: Settings },
];

export const MLSLayout = () => {
  const location = useLocation();
  const { isAdmin } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const canAccessMlsSearch = isAdmin();
  const visibleMlsMenuItems = mlsMenuItems.filter((item) => item.path !== '/mls/search' || canAccessMlsSearch);
  
  // Check if we're in the expired section to auto-expand
  const isExpiredPath = location.pathname.includes('/mls/expired');
  const [expiredOpen, setExpiredOpen] = useState(isExpiredPath);

  // Check if we're in the withdrawn section to auto-expand
  const isWithdrawnPath = location.pathname.includes('/mls/withdrawn');
  const [withdrawnOpen, setWithdrawnOpen] = useState(isWithdrawnPath);

  // Check if we're in the my listings section to auto-expand
  const isMyListingsPath = ['/mls/pull', '/mls/moderate', '/mls/converted'].some((path) => location.pathname.startsWith(path));
  const [myListingsOpen, setMyListingsOpen] = useState(isMyListingsPath);

  const isActive = (item) => {
    if (item.exact) {
      return location.pathname === item.path;
    }
    return location.pathname.startsWith(item.path) && item.path !== '/mls';
  };

  const renderMenuItem = (item) => {
    const Icon = item.icon;
    const active = isActive(item) || (item.exact && location.pathname === item.path);
    
    return (
      <Link
        key={item.path}
        to={item.path}
        data-testid={`mls-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
          active 
            ? "bg-amber-500/20 text-amber-500 font-medium" 
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
        title={collapsed ? item.label : undefined}
      >
        <Icon className="w-5 h-5 shrink-0" />
        {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
      </Link>
    );
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* MLS Sidebar */}
      <aside className={cn(
        "bg-card border-r transition-all duration-300 flex flex-col",
        collapsed ? "w-16" : "w-64"
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
          {/* Main Menu Items */}
          {mlsMenuItems.map(renderMenuItem)}

          {/* My Listings Accordion */}
          <div className="space-y-1">
            <button
              onClick={() => !collapsed && setMyListingsOpen(!myListingsOpen)}
              data-testid="mls-nav-my-listings"
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                isMyListingsPath 
                  ? "bg-amber-500/20 text-amber-500 font-medium" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Home className={cn("w-5 h-5 shrink-0", collapsed && "mx-auto")} />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left whitespace-nowrap">MY Listings</span>
                  <ChevronDown 
                    className={cn(
                      "w-4 h-4 transition-transform",
                      myListingsOpen && "rotate-180"
                    )} 
                  />
                </>
              )}
            </button>

            {/* My Listings Sub-menu */}
            {!collapsed && myListingsOpen && (
              <div className="ml-4 pl-2 border-l border-muted space-y-1">
                {myListingsMenuItems.map((item) => {
                  const Icon = item.icon;
                  const active = location.pathname === item.path;

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      data-testid={`mls-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm",
                        active 
                          ? "bg-amber-500/20 text-amber-500 font-medium" 
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="whitespace-nowrap">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Divider */}
          <div className="border-t my-2" />
          
          {/* Expired Listings Accordion */}
          <div className="space-y-1">
            <button
              onClick={() => !collapsed && setExpiredOpen(!expiredOpen)}
              data-testid="mls-nav-expired-listings"
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                isExpiredPath 
                  ? "bg-orange-500/20 text-orange-500 font-medium" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Clock className={cn("w-5 h-5 shrink-0", collapsed && "mx-auto")} />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left whitespace-nowrap">Expired Listings</span>
                  <ChevronDown 
                    className={cn(
                      "w-4 h-4 transition-transform",
                      expiredOpen && "rotate-180"
                    )} 
                  />
                </>
              )}
            </button>
            
            {/* Expired Sub-menu */}
            {!collapsed && expiredOpen && (
              <div className="ml-4 pl-2 border-l border-muted space-y-1">
                {expiredMenuItems.map((item) => {
                  const Icon = item.icon;
                  const active = location.pathname === item.path;
                  
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      data-testid={`mls-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm",
                        active 
                          ? "bg-orange-500/20 text-orange-500 font-medium" 
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="whitespace-nowrap">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Withdrawn Listings Accordion */}
          <div className="space-y-1">
            <button
              onClick={() => !collapsed && setWithdrawnOpen(!withdrawnOpen)}
              data-testid="mls-nav-withdrawn-listings"
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                isWithdrawnPath 
                  ? "bg-red-500/20 text-red-500 font-medium" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <XCircle className={cn("w-5 h-5 shrink-0", collapsed && "mx-auto")} />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left whitespace-nowrap">Withdrawn Listings</span>
                  <ChevronDown 
                    className={cn(
                      "w-4 h-4 transition-transform",
                      withdrawnOpen && "rotate-180"
                    )} 
                  />
                </>
              )}
            </button>
            
            {/* Withdrawn Sub-menu */}
            {!collapsed && withdrawnOpen && (
              <div className="ml-4 pl-2 border-l border-muted space-y-1">
                {withdrawnMenuItems.map((item) => {
                  const Icon = item.icon;
                  const active = location.pathname === item.path;
                  
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      data-testid={`mls-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm",
                        active 
                          ? "bg-red-500/20 text-red-500 font-medium" 
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="whitespace-nowrap">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Divider */}
          <div className="border-t my-2" />
          
          {/* Bottom Menu Items */}
          {bottomMenuItems.map(renderMenuItem)}
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
