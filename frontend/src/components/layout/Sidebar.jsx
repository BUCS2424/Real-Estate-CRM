import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
  UserPlus
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/contacts', icon: Users, label: 'Contacts' },
  { path: '/leads', icon: UserPlus, label: 'Leads' },
  { path: '/deals', icon: Briefcase, label: 'Deals Pipeline' },
  { path: '/listings', icon: Home, label: 'Listings' },
  { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { path: '/bookings', icon: CalendarCheck, label: 'Bookings' },
  { path: '/writer', icon: FileText, label: 'AI Writer' },
];

export const Sidebar = ({ collapsed, onToggle }) => {
  const location = useLocation();

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
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-serif font-semibold text-sidebar-foreground">Fusion</span>
              <span className="text-xs text-muted-foreground -mt-1">Builder CRM</span>
            </div>
          )}
        </div>
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
