import React, { useState, useEffect } from 'react';
import { settingsAPI } from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  Settings, 
  Sun, 
  Moon, 
  Bell, 
  User,
  Shield,
  Palette,
  Save,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { toast } from 'sonner';

export const SettingsPage = () => {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    theme: 'light',
    notifications_enabled: true,
    email_signature: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await settingsAPI.get();
      setSettings(response.data);
      setTheme(response.data.theme);
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await settingsAPI.update(settings);
      setTheme(settings.theme);
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleThemeChange = (newTheme) => {
    setSettings({ ...settings, theme: newTheme });
    setTheme(newTheme);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl" data-testid="settings-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-bold flex items-center gap-3">
          <Settings className="w-8 h-8" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">Manage your account preferences</p>
      </div>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-serif">
            <User className="w-5 h-5" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground text-sm">Name</Label>
              <p className="font-medium">{user?.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Email</Label>
              <p className="font-medium">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-muted-foreground text-sm">Role</Label>
            <Badge variant="secondary" className="capitalize">{user?.role}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-serif">
            <Palette className="w-5 h-5" />
            Appearance
          </CardTitle>
          <CardDescription>Customize your visual experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="mb-4 block">Theme</Label>
            <div className="flex gap-4">
              <Button
                variant={settings.theme === 'light' ? 'default' : 'outline'}
                className="flex-1 h-20 flex-col gap-2"
                onClick={() => handleThemeChange('light')}
                data-testid="theme-light-btn"
              >
                <Sun className="w-6 h-6" />
                <span>Light</span>
              </Button>
              <Button
                variant={settings.theme === 'dark' ? 'default' : 'outline'}
                className="flex-1 h-20 flex-col gap-2"
                onClick={() => handleThemeChange('dark')}
                data-testid="theme-dark-btn"
              >
                <Moon className="w-6 h-6" />
                <span>Dark</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-serif">
            <Bell className="w-5 h-5" />
            Notifications
          </CardTitle>
          <CardDescription>Configure notification preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notifications">Enable Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive alerts for important updates</p>
            </div>
            <Switch
              id="notifications"
              checked={settings.notifications_enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, notifications_enabled: checked })}
              data-testid="notifications-switch"
            />
          </div>
        </CardContent>
      </Card>

      {/* Email Signature */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-serif">
            <Shield className="w-5 h-5" />
            Email Settings
          </CardTitle>
          <CardDescription>Configure your email signature for AI-generated content</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="signature">Email Signature</Label>
            <Textarea
              id="signature"
              value={settings.email_signature || ''}
              onChange={(e) => setSettings({ ...settings, email_signature: e.target.value })}
              placeholder="Best regards,&#10;Your Name&#10;Company Name"
              rows={4}
              className="mt-2"
              data-testid="email-signature-input"
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} data-testid="save-settings-btn">
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
