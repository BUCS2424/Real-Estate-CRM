import React, { useState, useEffect } from 'react';
import { Cog, Save, Globe, Building2, Image, Link, ExternalLink, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Switch } from '../../../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { toast } from 'sonner';
import api from '../../../lib/api';
import { useBranding } from '../../../contexts/BrandingContext';

export const GeneralSettings = () => {
  const { refreshBranding } = useBranding();
  const [settings, setSettings] = useState({
    siteName: 'Hidden Haven Realty',
    siteUrl: 'https://hiddenhavenrealty.com',
    supportEmail: 'info@hiddenhavenrealty.com',
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    currency: 'USD',
    maintenanceMode: false,
    debugMode: false,
    // Logo settings
    logoUrl: '',
    logoLinkUrl: '/',
    dashboardLogoUrl: '',
    dashboardLogoLinkUrl: '/dashboard',
    faviconUrl: '',
    pwaIconUrl: '',
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/settings/general');
        if (res.data) {
          setSettings(prev => ({ ...prev, ...res.data }));
        }
      } catch (error) {
        // Use defaults if no settings exist
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/settings/general', settings);
      toast.success('General settings saved successfully');
      // Refresh branding across the app
      refreshBranding();
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const ImagePreview = ({ url, alt, size = 'md' }) => {
    const sizeClasses = {
      sm: 'w-8 h-8',
      md: 'w-16 h-16',
      lg: 'w-24 h-24',
    };
    
    if (!url) {
      return (
        <div className={`${sizeClasses[size]} bg-muted/30 rounded-lg flex items-center justify-center border border-dashed border-muted-foreground/30`}>
          <Image className="w-6 h-6 text-muted-foreground/50" />
        </div>
      );
    }
    
    return (
      <div className={`${sizeClasses[size]} rounded-lg overflow-hidden border border-border bg-muted/10`}>
        <img 
          src={url} 
          alt={alt} 
          className="w-full h-full object-contain"
          onError={(e) => {
            e.target.style.display = 'none';
            const fallback = document.createElement('div');
            fallback.className = 'w-full h-full flex items-center justify-center text-xs text-destructive';
            fallback.textContent = 'Invalid URL';
            e.target.parentNode.appendChild(fallback);
          }}
        />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="general-settings-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
            <Cog className="w-6 h-6" />
            General Settings
          </h1>
          <p className="text-muted-foreground mt-1">Configure basic application settings and branding</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Changes
        </Button>
      </div>

      {/* Branding - Logo Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            Public Logo
          </CardTitle>
          <CardDescription>Logo displayed on public-facing pages (landing page, login, etc.)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div>
                <Label htmlFor="logoUrl">Logo URL</Label>
                <p className="text-xs text-muted-foreground mb-2">Public logo image URL</p>
                <Input 
                  id="logoUrl"
                  placeholder="https://example.com/logo.png"
                  value={settings.logoUrl}
                  onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="logoLinkUrl">Logo Link URL</Label>
                <p className="text-xs text-muted-foreground mb-2">Where the logo links to when clicked</p>
                <Input 
                  id="logoLinkUrl"
                  placeholder="/"
                  value={settings.logoLinkUrl}
                  onChange={(e) => setSettings({ ...settings, logoLinkUrl: e.target.value })}
                />
              </div>
            </div>
            <div className="flex flex-col items-center justify-center p-4 bg-muted/20 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Logo preview</p>
              <ImagePreview url={settings.logoUrl} alt="Logo preview" size="lg" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Logo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Dashboard Logo
          </CardTitle>
          <CardDescription>Logo displayed in the admin dashboard sidebar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div>
                <Label htmlFor="dashboardLogoUrl">Dashboard Logo URL</Label>
                <p className="text-xs text-muted-foreground mb-2">Logo shown in the dashboard</p>
                <Input 
                  id="dashboardLogoUrl"
                  placeholder="https://example.com/dashboard-logo.png"
                  value={settings.dashboardLogoUrl}
                  onChange={(e) => setSettings({ ...settings, dashboardLogoUrl: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="dashboardLogoLinkUrl">Dashboard Logo Link</Label>
                <p className="text-xs text-muted-foreground mb-2">Where dashboard logo links to</p>
                <Input 
                  id="dashboardLogoLinkUrl"
                  placeholder="/dashboard"
                  value={settings.dashboardLogoLinkUrl}
                  onChange={(e) => setSettings({ ...settings, dashboardLogoLinkUrl: e.target.value })}
                />
              </div>
            </div>
            <div className="flex flex-col items-center justify-center p-4 bg-muted/20 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Dashboard logo preview</p>
              <ImagePreview url={settings.dashboardLogoUrl} alt="Dashboard logo preview" size="lg" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Favicon & PWA Icon */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Browser & App Icons
          </CardTitle>
          <CardDescription>Icons for browser tabs and mobile app installation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Favicon */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="faviconUrl">Favicon URL</Label>
                <p className="text-xs text-muted-foreground mb-2">Browser tab icon (32x32 recommended)</p>
                <Input 
                  id="faviconUrl"
                  placeholder="https://example.com/favicon.ico"
                  value={settings.faviconUrl}
                  onChange={(e) => setSettings({ ...settings, faviconUrl: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-4 p-3 bg-muted/20 rounded-lg">
                <ImagePreview url={settings.faviconUrl} alt="Favicon preview" size="sm" />
                <div>
                  <p className="text-sm font-medium">Favicon preview</p>
                  <p className="text-xs text-muted-foreground">32x32 pixels</p>
                </div>
              </div>
            </div>

            {/* PWA Icon */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="pwaIconUrl">PWA Icon URL</Label>
                <p className="text-xs text-muted-foreground mb-2">App icon for mobile (192x192 recommended)</p>
                <Input 
                  id="pwaIconUrl"
                  placeholder="https://example.com/icon-192.png"
                  value={settings.pwaIconUrl}
                  onChange={(e) => setSettings({ ...settings, pwaIconUrl: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-4 p-3 bg-muted/20 rounded-lg">
                <ImagePreview url={settings.pwaIconUrl} alt="PWA icon preview" size="md" />
                <div>
                  <p className="text-sm font-medium">PWA icon preview</p>
                  <p className="text-xs text-muted-foreground">192x192 pixels</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Site Information */}
      <Card>
        <CardHeader>
          <CardTitle>Site Information</CardTitle>
          <CardDescription>Basic site configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Site Name</Label>
              <Input 
                value={settings.siteName}
                onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
              />
            </div>
            <div>
              <Label>Site URL</Label>
              <Input 
                value={settings.siteUrl}
                onChange={(e) => setSettings({ ...settings, siteUrl: e.target.value })}
              />
            </div>
            <div>
              <Label>Support Email</Label>
              <Input 
                type="email"
                value={settings.supportEmail}
                onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
              />
            </div>
            <div>
              <Label>Timezone</Label>
              <Select value={settings.timezone} onValueChange={(v) => setSettings({ ...settings, timezone: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                  <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                  <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Localization */}
      <Card>
        <CardHeader>
          <CardTitle>Localization</CardTitle>
          <CardDescription>Regional settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Date Format</Label>
              <Select value={settings.dateFormat} onValueChange={(v) => setSettings({ ...settings, dateFormat: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Currency</Label>
              <Select value={settings.currency} onValueChange={(v) => setSettings({ ...settings, currency: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="CAD">CAD ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System */}
      <Card>
        <CardHeader>
          <CardTitle>System</CardTitle>
          <CardDescription>System-level settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Maintenance Mode</Label>
              <p className="text-sm text-muted-foreground">Disable public access during maintenance</p>
            </div>
            <Switch 
              checked={settings.maintenanceMode} 
              onCheckedChange={(v) => setSettings({ ...settings, maintenanceMode: v })} 
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Debug Mode</Label>
              <p className="text-sm text-muted-foreground">Enable detailed error logging</p>
            </div>
            <Switch 
              checked={settings.debugMode} 
              onCheckedChange={(v) => setSettings({ ...settings, debugMode: v })} 
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
