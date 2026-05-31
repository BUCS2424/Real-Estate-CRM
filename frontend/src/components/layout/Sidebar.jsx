import React, { useState } from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  CheckSquare, 
  FileText, 
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Building2,
  CalendarCheck,
  Home,
  UserPlus,
  FileInput,
  Mail,
  ListPlus,
  Layout,
  FolderOpen,
  Search,
  Star,
  MapPinHouse,
  DollarSign,
  Wrench,
  Video,
  Share2,
  Database,
  Phone,
  MessageSquare,
  PhoneCall,
  Mic,
  PenLine
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { useBranding } from '../../contexts/BrandingContext';

// Sales sub-items
const salesItems = [
  { path: '/leads', icon: UserPlus, label: 'Leads' },
  { path: '/property-leads', icon: MapPinHouse, label: 'Property Leads' },
  { path: '/property-submissions', icon: FileInput, label: 'Submissions' },
  { path: '/deals', icon: Briefcase, label: 'Deals Pipeline' },
];

// Tools sub-items
const toolsItems = [
  { path: '/media', icon: FolderOpen, label: 'Media Library' },
  { path: '/video-generator', icon: Video, label: 'Video Generator' },
  { path: '/voice-recorder', icon: Mic, label: 'Voice Recorder' },
  { path: '/documents', icon: PenLine, label: 'eSign Documents' },
  { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { path: '/bookings', icon: CalendarCheck, label: 'Bookings' },
  { path: '/newsletter', icon: Mail, label: 'Newsletter' },
  { path: '/mailing-lists', icon: ListPlus, label: 'Mailing Lists' },
  { path: '/writer', icon: FileText, label: 'AI Writer' },
];

// Main nav items (excluding nested items)
const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/dialer', icon: Phone, label: 'Dialer' },
  { path: '/messages', icon: MessageSquare, label: 'Messages' },
  { path: '/call-history', icon: PhoneCall, label: 'Call History' },
  { path: '/contacts', icon: Users, label: 'Contacts' },
  { type: 'sales', icon: DollarSign, label: 'Sales' },
  { path: '/listings', icon: Home, label: 'Showcase Listings' },
  { path: '/admin/neighborhoods', icon: MapPinHouse, label: 'Neighborhoods' },
  { path: '/mls', icon: Database, label: 'MLS Hub' },
  { path: '/social-media', icon: Share2, label: 'Social Media' },
  { path: '/property-lookup', icon: Search, label: 'Property Lookup' },
  { path: '/reviews', icon: Star, label: 'Reviews' },
  { path: '/landing-pages', icon: Layout, label: 'Landing Pages' },
  { type: 'tools', icon: Wrench, label: 'Tools' },
];

export const Sidebar = ({ collapsed, onToggle, mobileOpen, onMobileClose }) => {
  const location = useLocation();
  const { branding } = useBranding();
  const adminLogoUrl =
    branding.pwaIconUrl ||
    branding.faviconUrl ||
    branding.dashboardLogoUrl ||
    branding.logoUrl;
  
  // Close mobile drawer on route change
  React.useEffect(() => {
    if (onMobileClose) onMobileClose();
  }, [location.pathname]);

  // Check if current path is a sales item to auto-expand
  const isSalesPath = salesItems.some(item => 
    location.pathname === item.path || location.pathname.startsWith(item.path)
  );
  
  // Check if current path is a tools item to auto-expand
  const isToolsPath = toolsItems.some(item => 
    location.pathname === item.path || location.pathname.startsWith(item.path)
  );
  
  const [salesOpen, setSalesOpen] = useState(isSalesPath);
  const [toolsOpen, setToolsOpen] = useState(isToolsPath);

  const renderAccordion = (item, items, isOpen, setOpen, isActivePath) => {
    return (
      <div key={item.type} className="space-y-1">
        <button
          onClick={() => !collapsed && setOpen(!isOpen)}
          data-testid={`nav-${item.label.toLowerCase()}`}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
            "hover:bg-sidebar-accent",
            isActivePath 
              ? "bg-sidebar-primary/50 text-sidebar-primary-foreground" 
              : "text-sidebar-foreground"
          )}
        >
          <item.icon className={cn("w-5 h-5 flex-shrink-0", collapsed && "mx-auto")} />
          {!collapsed && (
            <>
              <span className="font-medium flex-1 text-left">{item.label}</span>
              <ChevronDown 
                className={cn(
                  "w-4 h-4 transition-transform duration-200",
                  isOpen ? "rotate-180" : ""
                )} 
              />
            </>
          )}
        </button>
        
        {/* Sub-items */}
        {!collapsed && isOpen && (
          <div className="ml-4 pl-3 border-l border-sidebar-border space-y-1">
            {items.map((subItem) => {
              const subIsActive = location.pathname === subItem.path || 
                location.pathname.startsWith(subItem.path);
              
              return (
                <NavLink
                  key={subItem.path}
                  to={subItem.path}
                  data-testid={`nav-${subItem.label.toLowerCase().replace(' ', '-')}`}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm",
                    "hover:bg-sidebar-accent",
                    subIsActive 
                      ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                      : "text-sidebar-foreground"
                  )}
                >
                  <subItem.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium">{subItem.label}</span>
                </NavLink>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderNavItem = (item) => {
    // Sales accordion
    if (item.type === 'sales') {
      return renderAccordion(item, salesItems, salesOpen, setSalesOpen, isSalesPath);
    }
    
    // Tools accordion
    if (item.type === 'tools') {
      return renderAccordion(item, toolsItems, toolsOpen, setToolsOpen, isToolsPath);
    }

    // Regular nav item
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
  };

  return (
    <aside
      data-testid="sidebar"
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
        // Desktop: normal collapsed/expanded, always visible
        "md:translate-x-0",
        collapsed ? "md:w-16" : "md:w-64",
        // Mobile: full-width drawer — hidden off-screen, slides in when open
        "w-72",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
        <Link to={branding.dashboardLogoLinkUrl || '/dashboard'} className="flex items-center gap-3">
          {adminLogoUrl ? (
            <img 
              src={adminLogoUrl}
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
              adminLogoUrl ? "hidden" : "flex"
            )}
          >
            <Building2 className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-serif font-semibold text-sidebar-foreground leading-tight">
                {branding.siteName || 'Hidden Haven Realty'}
              </span>
              <span className="text-xs text-muted-foreground -mt-1">CRM</span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-8rem)]">
        {navItems.map(renderNavItem)}
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
