import React, { useState, useEffect } from 'react';
import { Download, X, Wifi, WifiOff, Bell, BellOff, Check, Smartphone } from 'lucide-react';
import { Button } from './ui/button';
import { usePWA, requestNotificationPermission, registerServiceWorker } from '../hooks/usePWA';
import { toast } from 'sonner';

export const PWAInstallBanner = () => {
  const { canInstall, promptInstall } = usePWA();
  const [dismissed, setDismissed] = useState(false);

  if (!canInstall || dismissed) return null;

  const handleInstall = async () => {
    const installed = await promptInstall();
    if (installed) {
      toast.success('App installed successfully!');
    }
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-gradient-to-r from-[#0a1628] to-[#152238] border border-amber-400/30 rounded-xl p-4 shadow-2xl z-50 animate-fade-in">
      <button 
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 text-white/50 hover:text-white"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className="p-2 bg-amber-400/20 rounded-lg">
          <Smartphone className="w-6 h-6 text-amber-400" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-white">Install Fusion CRM</h4>
          <p className="text-sm text-white/70 mt-1">
            Install our app for quick access and offline support
          </p>
          <Button 
            onClick={handleInstall}
            className="mt-3 bg-amber-400 text-black hover:bg-amber-300"
            size="sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Install App
          </Button>
        </div>
      </div>
    </div>
  );
};

export const PWAStatus = ({ className = '' }) => {
  const { isOnline, isInstalled } = usePWA();
  const [notificationPermission, setNotificationPermission] = useState(Notification?.permission || 'default');

  useEffect(() => {
    // Register service worker on mount
    registerServiceWorker();
  }, []);

  const handleEnableNotifications = async () => {
    const permission = await requestNotificationPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
      toast.success('Notifications enabled!');
    } else if (permission === 'denied') {
      toast.error('Notifications blocked. Please enable in browser settings.');
    }
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Online Status */}
      <div className={`flex items-center gap-1 text-xs ${isOnline ? 'text-green-500' : 'text-red-500'}`}>
        {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
        {isOnline ? 'Online' : 'Offline'}
      </div>

      {/* Notification Status */}
      {notificationPermission !== 'granted' ? (
        <button 
          onClick={handleEnableNotifications}
          className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300"
        >
          <BellOff className="w-3 h-3" />
          Enable Alerts
        </button>
      ) : (
        <div className="flex items-center gap-1 text-xs text-green-500">
          <Bell className="w-3 h-3" />
          Alerts On
        </div>
      )}

      {/* Installed Status */}
      {isInstalled && (
        <div className="flex items-center gap-1 text-xs text-green-500">
          <Check className="w-3 h-3" />
          Installed
        </div>
      )}
    </div>
  );
};
