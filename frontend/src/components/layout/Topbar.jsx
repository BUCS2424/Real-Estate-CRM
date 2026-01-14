import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  Sun, 
  Moon, 
  Settings, 
  LogOut, 
  User,
  Shield,
  UserCog
} from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Badge } from '../ui/badge';

const roleColors = {
  superuser: 'bg-amber-500 text-white',
  admin: 'bg-blue-500 text-white',
  client: 'bg-gray-500 text-white'
};

const roleLabels = {
  superuser: 'Super Admin',
  admin: 'Admin',
  client: 'Client'
};

export const Topbar = ({ sidebarCollapsed }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header
      data-testid="topbar"
      className={`fixed top-0 right-0 z-30 h-16 bg-background/80 backdrop-blur-md border-b border-border transition-all duration-300 ${
        sidebarCollapsed ? 'left-16' : 'left-64'
      }`}
    >
      <div className="flex items-center justify-between h-full px-6">
        {/* Page title area - can be used for breadcrumbs later */}
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-serif font-semibold text-foreground">
            Welcome back, {user?.name?.split(' ')[0]}
          </h1>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            data-testid="theme-toggle"
            className="w-9 h-9"
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5" />
            ) : (
              <Sun className="w-5 h-5" />
            )}
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="flex items-center gap-3 h-10 px-2 hover:bg-muted"
                data-testid="user-menu-trigger"
              >
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">{user?.name}</span>
                  <Badge className={`text-[10px] px-1.5 py-0 h-4 ${roleColors[user?.role]}`}>
                    {roleLabels[user?.role]}
                  </Badge>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56" data-testid="user-menu-dropdown">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/profile')} data-testid="menu-profile">
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')} data-testid="menu-settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              {user?.role === 'superuser' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/admin/users')} data-testid="menu-admin-users">
                    <UserCog className="mr-2 h-4 w-4" />
                    Manage Users
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/admin')} data-testid="menu-admin">
                    <Shield className="mr-2 h-4 w-4" />
                    Admin Panel
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} data-testid="menu-logout" className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
