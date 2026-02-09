import React, { useState, useEffect } from 'react';
import { Mail, Save, Send, CheckCircle2, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Badge } from '../../../components/ui/badge';
import { toast } from 'sonner';
import { smtpEmailAPI } from '../../../lib/api';

export const EmailSettings = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    host: '',
    port: 587,
    username: '',
    password: '',
    encryption: 'tls',
    from_name: 'Hidden Haven Realty',
    from_email: '',
    reply_to: '',
    configured: false
  });

  const [testEmail, setTestEmail] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await smtpEmailAPI.getSettings();
      setSettings({
        host: res.data.host || '',
        port: res.data.port || 587,
        username: res.data.username || '',
        password: res.data.password || '',
        encryption: res.data.encryption || 'tls',
        from_name: res.data.from_name || 'Hidden Haven Realty',
        from_email: res.data.from_email || '',
        reply_to: res.data.reply_to || '',
        configured: res.data.configured || false
      });
    } catch (error) {
      console.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings.host || !settings.username) {
      toast.error('SMTP host and username are required');
      return;
    }
    
    setSaving(true);
    try {
      await smtpEmailAPI.saveSettings(settings);
      toast.success('Email settings saved');
      fetchSettings(); // Refresh to get configured status
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      toast.error('Please enter a test email address');
      return;
    }
    
    if (!settings.configured && !settings.host) {
      toast.error('Please save SMTP settings first');
      return;
    }
    
    setIsTesting(true);
    try {
      const res = await smtpEmailAPI.testConnection(testEmail);
      toast.success(res.data.message || 'Test email sent!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send test email');
    } finally {
      setIsTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="email-settings-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
            <Mail className="w-6 h-6" />
            Email / SMTP Settings
          </h1>
          <p className="text-muted-foreground mt-1">Configure email delivery for sending emails from the CRM</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-black">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Changes
        </Button>
      </div>

      {/* Connection Status */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${settings.configured ? 'bg-green-100 dark:bg-green-900' : 'bg-yellow-100 dark:bg-yellow-900'}`}>
                {settings.configured ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                )}
              </div>
              <div>
                <p className="font-medium">{settings.configured ? 'SMTP Configured' : 'SMTP Not Configured'}</p>
                <p className="text-xs text-muted-foreground">
                  {settings.configured ? 'Ready to send emails' : 'Enter your SMTP credentials to enable email sending'}
                </p>
              </div>
            </div>
            <Badge className={settings.configured 
              ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
              : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
            }>
              {settings.configured ? 'Ready' : 'Setup Required'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* SMTP Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>SMTP Configuration</CardTitle>
          <CardDescription>Server connection settings - Contact your email provider for these details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>SMTP Host *</Label>
              <Input 
                value={settings.host}
                onChange={(e) => setSettings({ ...settings, host: e.target.value })}
                placeholder="smtp.gmail.com or mail.yourdomain.com"
              />
            </div>
            <div>
              <Label>SMTP Port *</Label>
              <Input 
                type="number"
                value={settings.port}
                onChange={(e) => setSettings({ ...settings, port: parseInt(e.target.value) || 587 })}
                placeholder="587"
              />
            </div>
            <div>
              <Label>Username *</Label>
              <Input 
                value={settings.username}
                onChange={(e) => setSettings({ ...settings, username: e.target.value })}
                placeholder="your-email@domain.com"
              />
            </div>
            <div>
              <Label>Password *</Label>
              <div className="relative">
                <Input 
                  type={showPassword ? 'text' : 'password'}
                  value={settings.password}
                  onChange={(e) => setSettings({ ...settings, password: e.target.value })}
                  placeholder="App password or SMTP password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div>
              <Label>Encryption</Label>
              <Select value={settings.encryption} onValueChange={(v) => setSettings({ ...settings, encryption: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tls">TLS (Recommended - Port 587)</SelectItem>
                  <SelectItem value="ssl">SSL (Port 465)</SelectItem>
                  <SelectItem value="none">None (Not recommended)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sender Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Sender Information</CardTitle>
          <CardDescription>How your emails will appear to recipients</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>From Name</Label>
              <Input 
                value={settings.from_name}
                onChange={(e) => setSettings({ ...settings, from_name: e.target.value })}
                placeholder="Hidden Haven Realty"
              />
            </div>
            <div>
              <Label>From Email</Label>
              <Input 
                type="email"
                value={settings.from_email}
                onChange={(e) => setSettings({ ...settings, from_email: e.target.value })}
                placeholder="noreply@yourdomain.com"
              />
              <p className="text-xs text-muted-foreground mt-1">Leave blank to use username</p>
            </div>
            <div className="md:col-span-2">
              <Label>Reply-To Email (Optional)</Label>
              <Input 
                type="email"
                value={settings.reply_to}
                onChange={(e) => setSettings({ ...settings, reply_to: e.target.value })}
                placeholder="support@yourdomain.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Email */}
      <Card>
        <CardHeader>
          <CardTitle>Test Configuration</CardTitle>
          <CardDescription>Send a test email to verify your settings work correctly</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input 
              type="email"
              placeholder="Enter your email address"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleTestEmail} disabled={isTesting} className="bg-amber-500 hover:bg-amber-600 text-black">
              {isTesting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              {isTesting ? 'Sending...' : 'Send Test'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>Common SMTP Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="font-medium">Gmail</p>
              <p className="text-muted-foreground">Host: smtp.gmail.com</p>
              <p className="text-muted-foreground">Port: 587 (TLS)</p>
              <p className="text-xs text-amber-600 mt-1">Requires App Password</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="font-medium">Outlook/Office 365</p>
              <p className="text-muted-foreground">Host: smtp.office365.com</p>
              <p className="text-muted-foreground">Port: 587 (TLS)</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="font-medium">cPanel/Webmail</p>
              <p className="text-muted-foreground">Host: mail.yourdomain.com</p>
              <p className="text-muted-foreground">Port: 587 (TLS) or 465 (SSL)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailSettings;
