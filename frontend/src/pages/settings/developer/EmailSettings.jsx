import React, { useState } from 'react';
import { Mail, Save, Send, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Switch } from '../../../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Badge } from '../../../components/ui/badge';
import { toast } from 'sonner';

export const EmailSettings = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [settings, setSettings] = useState({
    provider: 'smtp',
    host: 'smtp.example.com',
    port: '587',
    username: 'noreply@fusionbuilder.com',
    password: '••••••••',
    encryption: 'tls',
    fromName: 'Fusion Builder CRM',
    fromEmail: 'noreply@fusionbuilder.com',
    replyTo: 'support@fusionbuilder.com',
  });

  const [testEmail, setTestEmail] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  const handleSave = () => {
    toast.success('Email settings saved');
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      toast.error('Please enter a test email address');
      return;
    }
    setIsTesting(true);
    setTimeout(() => {
      setIsTesting(false);
      toast.success('Test email sent successfully');
    }, 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="email-settings-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
            <Mail className="w-6 h-6" />
            Email / SMTP Settings
          </h1>
          <p className="text-muted-foreground mt-1">Configure email delivery settings</p>
        </div>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      {/* Connection Status */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg dark:bg-green-900">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium">SMTP Connection Active</p>
                <p className="text-xs text-muted-foreground">Last verified: 5 minutes ago</p>
              </div>
            </div>
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Connected</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Provider Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Email Provider</CardTitle>
          <CardDescription>Choose your email service provider</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={settings.provider} onValueChange={(v) => setSettings({ ...settings, provider: v })}>
            <SelectTrigger className="w-full md:w-[300px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="smtp">Custom SMTP</SelectItem>
              <SelectItem value="sendgrid">SendGrid</SelectItem>
              <SelectItem value="mailgun">Mailgun</SelectItem>
              <SelectItem value="ses">Amazon SES</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* SMTP Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>SMTP Configuration</CardTitle>
          <CardDescription>Server connection settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>SMTP Host</Label>
              <Input 
                value={settings.host}
                onChange={(e) => setSettings({ ...settings, host: e.target.value })}
                placeholder="smtp.example.com"
              />
            </div>
            <div>
              <Label>SMTP Port</Label>
              <Input 
                value={settings.port}
                onChange={(e) => setSettings({ ...settings, port: e.target.value })}
                placeholder="587"
              />
            </div>
            <div>
              <Label>Username</Label>
              <Input 
                value={settings.username}
                onChange={(e) => setSettings({ ...settings, username: e.target.value })}
              />
            </div>
            <div>
              <Label>Password</Label>
              <div className="relative">
                <Input 
                  type={showPassword ? 'text' : 'password'}
                  value={settings.password}
                  onChange={(e) => setSettings({ ...settings, password: e.target.value })}
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
                  <SelectItem value="tls">TLS</SelectItem>
                  <SelectItem value="ssl">SSL</SelectItem>
                  <SelectItem value="none">None</SelectItem>
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
          <CardDescription>Default sender details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>From Name</Label>
              <Input 
                value={settings.fromName}
                onChange={(e) => setSettings({ ...settings, fromName: e.target.value })}
              />
            </div>
            <div>
              <Label>From Email</Label>
              <Input 
                type="email"
                value={settings.fromEmail}
                onChange={(e) => setSettings({ ...settings, fromEmail: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Reply-To Email</Label>
              <Input 
                type="email"
                value={settings.replyTo}
                onChange={(e) => setSettings({ ...settings, replyTo: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Email */}
      <Card>
        <CardHeader>
          <CardTitle>Test Configuration</CardTitle>
          <CardDescription>Send a test email to verify settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input 
              type="email"
              placeholder="Enter email address"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleTestEmail} disabled={isTesting}>
              <Send className="w-4 h-4 mr-2" />
              {isTesting ? 'Sending...' : 'Send Test'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
