import React from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  CheckSquare, 
  FileText, 
  ChevronLeft,
  ChevronRight,
  Building2,
  CalendarCheck,
  Home,
  UserPlus,
  FileInput,
  Mail,
  ListPlus,
  Layout,
  FolderOpen
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { useBranding } from '../../contexts/BrandingContext';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/contacts', icon: Users, label: 'Contacts' },
  { path: '/leads', icon: UserPlus, label: 'Leads' },
  { path: '/property-submissions', icon: FileInput, label: 'Submissions' },
  { path: '/deals', icon: Briefcase, label: 'Deals Pipeline' },
  { path: '/listings', icon: Home, label: 'Listings' },
  { path: '/landing-pages', icon: Layout, label: 'Landing Pages' },
  { path: '/media', icon: FolderOpen, label: 'Media Library' },
  { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { path: '/bookings', icon: CalendarCheck, label: 'Bookings' },
  { path: '/newsletter', icon: Mail, label: 'Newsletter' },
  { path: '/mailing-lists', icon: ListPlus, label: 'Mailing Lists' },
  { path: '/writer', icon: FileText, label: 'AI Writer' },
];

export const Sidebar = ({ collapsed, onToggle }) => {
  const location = useLocation();
  const { branding } = useBranding();

  return (
    <aside
      data-testid="sidebar"
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
        <Link to={branding.dashboardLogoLinkUrl || '/dashboard'} className="flex items-center gap-3">
          {branding.dashboardLogoUrl ? (
            <img 
              src={branding.dashboardLogoUrl} 
              alt={branding.siteName || 'Logo'} 
              className="w-9 h-9 object-contain rounded-lg"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div 
            className={cn(
              "w-9 h-9 bg-primary rounded-lg items-center justify-center",
              branding.dashboardLogoUrl ? "hidden" : "flex"
            )}
          >
            <Building2 className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-serif font-semibold text-sidebar-foreground">Fusion</span>
              <span className="text-xs text-muted-foreground -mt-1">Builder CRM</span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                "hover:bg-sidebar-accent",
                isActive 
                  ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                  : "text-sidebar-foreground"
              )}
            >
              <item.icon className={cn("w-5 h-5 flex-shrink-0", collapsed && "mx-auto")} />
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        data-testid="sidebar-toggle"
        className="absolute bottom-4 right-3 w-8 h-8"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </Button>
    </aside>
  );
};
