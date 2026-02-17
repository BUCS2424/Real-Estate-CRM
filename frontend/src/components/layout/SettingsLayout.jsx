import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { 
  Settings,
  ChevronDown,
  Shield,
  FileText,
  Users,
  Database,
  Columns,
  UserCog,
  Activity,
  AlertCircle,
  Bell,
  HardDrive,
  Globe,
  Map,
  FileCode,
  Code,
  Cog,
  Mail,
  MessageSquare,
  BarChart3,
  Smartphone,
  Target,
  Phone,
  Building2,
  Heart,
  Mic,
  Calculator
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { ScrollArea } from '../ui/scroll-area';

const settingsMenu = [
  {
    category: 'Developer Settings',
    icon: Code,
    items: [
      { path: '/settings/developer/general', label: 'General Settings', icon: Cog },
      { path: '/settings/developer/email', label: 'Email / SMTP', icon: Mail },
      { path: '/settings/developer/telnyx', label: 'Telnyx SMS', icon: Phone },
      { path: '/settings/developer/mls', label: 'MLS Integration', icon: Building2 },
      { path: '/settings/developer/lead-scoring', label: 'Lead Scoring', icon: Target },
      { path: '/settings/developer/custom-code', label: 'Custom Code', icon: Code },
      { path: '/settings/developer/system-messages', label: 'System Messages', icon: MessageSquare },
      { path: '/settings/developer/pwa', label: 'PWA Settings', icon: Smartphone },
    ]
  },
  {
    category: 'Profile',
    icon: UserCog,
    items: [
      { path: '/settings/profile/signature', label: 'Email Signature', icon: Mail },
    ]
  },
  {
    category: 'Admin',
    icon: Shield,
    items: [
      { path: '/settings/admin/jacquie-lawson', label: 'Jacquie Lawson Cards', icon: Heart },
      { path: '/settings/admin/elevenlabs', label: 'ElevenLabs AI', icon: Mic },
      { path: '/settings/admin/reports', label: 'Admin Reports', icon: BarChart3 },
      { path: '/settings/admin/audit-log', label: 'Audit Log', icon: Activity },
      { path: '/settings/admin/roles', label: 'Roles & Permissions', icon: Shield },
      { path: '/settings/admin/glossary', label: 'Glossary Manager', icon: FileText },
      { path: '/settings/admin/online-staff', label: 'Online Staff', icon: Users },
      { path: '/settings/admin/backup', label: 'Database Backup', icon: Database },
      { path: '/settings/admin/custom-fields', label: 'Custom Fields', icon: Columns },
      { path: '/settings/admin/staff', label: 'Staff', icon: UserCog },
    ]
  },
  {
    category: 'Support',
    icon: AlertCircle,
    items: [
      { path: '/settings/support/error-reports', label: 'Error Reports', icon: AlertCircle },
      { path: '/settings/support/push-alerts', label: 'Push Alerts', icon: Bell },
      { path: '/settings/support/storage', label: 'Storage', icon: HardDrive },
    ]
  },
  {
    category: 'SEO Dashboard',
    icon: Globe,
    items: [
      { path: '/settings/seo/sitemap', label: 'Sitemap & Submit', icon: Map },
      { path: '/settings/seo/meta', label: 'Meta Information', icon: FileCode },
      { path: '/settings/seo/structured-data', label: 'Structured Data', icon: Code },
    ]
  },
];

const MenuItem = ({ item, isActive }) => (
  <NavLink
    to={item.path}
    data-testid={`settings-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
    className={cn(
      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
      "hover:bg-muted",
      isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
    )}
  >
    <item.icon className="w-4 h-4" />
    {item.label}
  </NavLink>
);

const MenuSection = ({ section }) => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(() => 
    section.items.some(item => location.pathname.startsWith(item.path))
  );
  const SectionIcon = section.icon;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button 
          type="button"
          className="flex items-center justify-between w-full px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted rounded-lg transition-colors"
          data-testid={`settings-accordion-${section.category.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <div className="flex items-center gap-2">
            <SectionIcon className="w-4 h-4" />
            {section.category}
          </div>
          <ChevronDown className={cn(
            "w-4 h-4 transition-transform duration-200",
            isOpen && "rotate-180"
          )} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="ml-2 space-y-1 mt-1">
        {section.items.map((item) => (
          <MenuItem 
            key={item.path} 
            item={item} 
            isActive={location.pathname === item.path}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};

export const SettingsLayout = () => {
  return (
    <div className="flex gap-6 min-h-[calc(100vh-8rem)]" data-testid="settings-layout">
      {/* Settings Sidebar */}
      <aside className="w-64 flex-shrink-0">
        <div className="sticky top-24">
          <div className="flex items-center gap-2 px-3 py-4 border-b border-border mb-4">
            <Settings className="w-5 h-5" />
            <h2 className="font-serif font-semibold text-lg">Settings</h2>
          </div>
          <ScrollArea className="h-[calc(100vh-14rem)]">
            <nav className="space-y-4 pr-4">
              {settingsMenu.map((section) => (
                <MenuSection key={section.category} section={section} />
              ))}
            </nav>
          </ScrollArea>
        </div>
      </aside>

      {/* Settings Content */}
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
};
