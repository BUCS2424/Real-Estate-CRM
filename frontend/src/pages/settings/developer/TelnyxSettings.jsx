import React, { useState, useEffect } from 'react';
import { MessageSquare, Save, Loader2, Phone, Key, TestTube, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { toast } from 'sonner';
import api from '../../../lib/api';

export const TelnyxSettings = () => {
  const [settings, setSettings] = useState({
    apiKey: '',
    phoneNumber: '',
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings/telnyx');
      if (res.data) {
        setSettings({
          apiKey: res.data.apiKey || '',
          phoneNumber: res.data.phoneNumber || '',
        });
      }
    } catch (error) {
      // Use defaults if no settings exist
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/settings/telnyx', settings);
      toast.success('Telnyx settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!settings.apiKey || !settings.phoneNumber) {
      toast.error('Please fill in API Key and Phone Number first');
      return;
    }
    
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.post('/settings/telnyx/test');
      setTestResult({ success: true, message: res.data.message || 'Connection successful!' });
      toast.success('Telnyx connection verified!');
    } catch (error) {
      setTestResult({ success: false, message: error.response?.data?.detail || 'Connection failed' });
      toast.error('Telnyx connection failed');
    } finally {
      setTesting(false);
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Telnyx SMS Settings</h2>
        <p className="text-muted-foreground">Configure SMS messaging via Telnyx</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-green-500" />
            API Configuration
          </CardTitle>
          <CardDescription>
            Enter your Telnyx API credentials to enable SMS messaging
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              API Key
            </Label>
            <Input
              type="password"
              value={settings.apiKey}
              onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
              placeholder="KEY01234567890ABCDEF..."
            />
            <p className="text-xs text-muted-foreground">
              Get your API key from <a href="https://portal.telnyx.com/#/app/api-keys" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:underline">Telnyx Portal → API Keys</a>
            </p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Phone Number
            </Label>
            <Input
              value={settings.phoneNumber}
              onChange={(e) => setSettings({ ...settings, phoneNumber: e.target.value })}
              placeholder="+18005551234"
            />
            <p className="text-xs text-muted-foreground">
              Your Telnyx phone number in E.164 format (e.g., +18005551234)
            </p>
          </div>

          {testResult && (
            <div className={`p-4 rounded-lg flex items-center gap-3 ${testResult.success ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
              {testResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <span className={testResult.success ? 'text-green-600' : 'text-red-600'}>
                {testResult.message}
              </span>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-black">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Settings
            </Button>
            <Button variant="outline" onClick={handleTest} disabled={testing || !settings.apiKey}>
              {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <TestTube className="w-4 h-4 mr-2" />}
              Test Connection
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How to Get Telnyx Credentials</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Sign up at <a href="https://telnyx.com" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:underline">telnyx.com</a></li>
            <li>Go to the <a href="https://portal.telnyx.com/#/app/api-keys" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:underline">API Keys</a> section in your portal</li>
            <li>Create a new API key and copy it</li>
            <li>Purchase a phone number from Telnyx</li>
            <li>Enable SMS on your phone number</li>
            <li>Enter the credentials above and save</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};

export default TelnyxSettings;
