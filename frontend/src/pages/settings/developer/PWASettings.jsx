import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Download, 
  Bell, 
  BellOff, 
  Wifi, 
  WifiOff,
  Check,
  X,
  RefreshCw,
  Trash2,
  HardDrive,
  Shield
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Switch } from '../../../components/ui/switch';
import { Label } from '../../../components/ui/label';
import { Badge } from '../../../components/ui/badge';
import { usePWA, requestNotificationPermission, registerServiceWorker } from '../../../hooks/usePWA';
import { toast } from 'sonner';

export const PWASettings = () => {
  const { canInstall, isInstalled, isOnline, promptInstall } = usePWA();
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [cacheSize, setCacheSize] = useState(null);
  const [swRegistration, setSwRegistration] = useState(null);

  useEffect(() => {
    // Get notification permission status
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    // Get service worker registration
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        setSwRegistration(reg);
      });
    }

    // Estimate cache size
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then(({ usage, quota }) => {
        setCacheSize({
          used: (usage / 1024 / 1024).toFixed(2),
          total: (quota / 1024 / 1024).toFixed(2)
        });
      });
    }
  }, []);

  const handleInstall = async () => {
    const installed = await promptInstall();
    if (installed) {
      toast.success('App installed successfully!');
    }
  };

  const handleEnableNotifications = async () => {
    const permission = await requestNotificationPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
      toast.success('Notifications enabled!');
      // Test notification
      new Notification('Fusion CRM', {
        body: 'Notifications are now enabled!',
        icon: '/icons/icon-192x192.png'
      });
    } else if (permission === 'denied') {
      toast.error('Notifications blocked. Please enable in browser settings.');
    }
  };

  const handleClearCache = async () => {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      toast.success('Cache cleared successfully');
      // Re-estimate cache size
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const { usage, quota } = await navigator.storage.estimate();
        setCacheSize({
          used: (usage / 1024 / 1024).toFixed(2),
          total: (quota / 1024 / 1024).toFixed(2)
        });
      }
    }
  };

  const handleUpdateServiceWorker = async () => {
    if (swRegistration) {
      await swRegistration.update();
      toast.success('Service worker updated');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">PWA Settings</h1>
        <p className="text-muted-foreground">Manage Progressive Web App features and installation</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className={`p-3 rounded-lg ${isOnline ? 'bg-green-100' : 'bg-red-100'}`}>
              {isOnline ? <Wifi className="w-6 h-6 text-green-600" /> : <WifiOff className="w-6 h-6 text-red-600" />}
            </div>
            <div>
              <p className="font-semibold">{isOnline ? 'Online' : 'Offline'}</p>
              <p className="text-sm text-muted-foreground">Connection Status</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className={`p-3 rounded-lg ${isInstalled ? 'bg-green-100' : 'bg-amber-100'}`}>
              <Smartphone className={`w-6 h-6 ${isInstalled ? 'text-green-600' : 'text-amber-600'}`} />
            </div>
            <div>
              <p className="font-semibold">{isInstalled ? 'Installed' : 'Not Installed'}</p>
              <p className="text-sm text-muted-foreground">App Status</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className={`p-3 rounded-lg ${notificationPermission === 'granted' ? 'bg-green-100' : 'bg-gray-100'}`}>
              {notificationPermission === 'granted' ? 
                <Bell className="w-6 h-6 text-green-600" /> : 
                <BellOff className="w-6 h-6 text-gray-600" />
              }
            </div>
            <div>
              <p className="font-semibold capitalize">{notificationPermission}</p>
              <p className="text-sm text-muted-foreground">Notifications</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Install App */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Install Application
          </CardTitle>
          <CardDescription>
            Install Fusion CRM as a standalone app for quick access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isInstalled ? (
            <div className="flex items-center gap-2 text-green-600">
              <Check className="w-5 h-5" />
              <span>App is installed on this device</span>
            </div>
          ) : canInstall ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Installing the app provides faster loading, offline access, and a native app experience.
              </p>
              <Button onClick={handleInstall}>
                <Download className="w-4 h-4 mr-2" />
                Install Now
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Installation is not available. This may be because:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>The app is already installed</li>
                <li>Your browser doesn't support PWA installation</li>
                <li>The site is not being served over HTTPS</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Receive notifications for bookings, leads, and important updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Get notified about new leads, bookings, and tasks
              </p>
            </div>
            {notificationPermission === 'granted' ? (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <Check className="w-3 h-3 mr-1" />
                Enabled
              </Badge>
            ) : notificationPermission === 'denied' ? (
              <Badge variant="outline" className="text-red-600 border-red-600">
                <X className="w-3 h-3 mr-1" />
                Blocked
              </Badge>
            ) : (
              <Button onClick={handleEnableNotifications} variant="outline">
                Enable
              </Button>
            )}
          </div>

          {notificationPermission === 'denied' && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm">
              <p className="text-red-600 dark:text-red-400">
                Notifications are blocked. To enable them:
              </p>
              <ol className="list-decimal list-inside mt-2 text-red-600/80 dark:text-red-400/80 space-y-1">
                <li>Click the lock icon in your browser's address bar</li>
                <li>Find "Notifications" in the permissions</li>
                <li>Change from "Block" to "Allow"</li>
                <li>Refresh the page</li>
              </ol>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Storage & Cache */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            Storage & Cache
          </CardTitle>
          <CardDescription>
            Manage app storage and cached data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {cacheSize && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Storage Used</span>
                <span>{cacheSize.used} MB / {cacheSize.total} MB</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${(parseFloat(cacheSize.used) / parseFloat(cacheSize.total)) * 100}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClearCache}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Cache
            </Button>
            <Button variant="outline" onClick={handleUpdateServiceWorker}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Update App
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Service Worker Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Service Worker
          </CardTitle>
          <CardDescription>
            Background service status for offline functionality
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {swRegistration ? (
              <>
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <Check className="w-3 h-3 mr-1" />
                  Active
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Service worker is running and managing offline content
                </span>
              </>
            ) : (
              <>
                <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                  Inactive
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Service worker is not registered
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
