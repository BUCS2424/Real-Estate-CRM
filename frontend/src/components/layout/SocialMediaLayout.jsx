import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
  Clock, 
  FileText, 
  BarChart3, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Share2,
  Sparkles,
  Image
} from 'lucide-react';
import { cn } from '../../lib/utils';

const socialMenuItems = [
  { path: '/social-media', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/social-media/compose', label: 'Create Post', icon: Share2 },
  { path: '/social-media/calendar', label: 'Calendar', icon: Calendar },
  { path: '/social-media/queue', label: 'Queue', icon: Clock },
  { path: '/social-media/templates', label: 'Templates', icon: FileText },
  { path: '/social-media/ai-content', label: 'AI Content', icon: Sparkles },
  { path: '/social-media/media', label: 'Media Library', icon: Image },
  { path: '/social-media/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/social-media/settings', label: 'Settings', icon: Settings },
];

export const SocialMediaLayout = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (item) => {
    if (item.exact) {
      return location.pathname === item.path;
    }
    return location.pathname.startsWith(item.path);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <aside className={cn(
        "bg-card border-r transition-all duration-300 flex flex-col",
        collapsed ? "w-16" : "w-56"
      )}>
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          {!collapsed && (
            <h2 className="font-serif font-bold text-lg text-amber-500">Social Media</h2>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded hover:bg-muted"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {socialMenuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            
            return (
              <Link
                key={item.path}
                to={item.path}
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

        {/* Footer */}
        {!collapsed && (
          <div className="p-4 border-t">
            <div className="text-xs text-muted-foreground">
              <p>Connected Accounts</p>
              <p className="font-medium text-foreground mt-1">0 platforms</p>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
};

export default SocialMediaLayout;
