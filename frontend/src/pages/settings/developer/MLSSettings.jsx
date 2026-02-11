import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription
} from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Badge } from '../../../components/ui/badge';
import { Switch } from '../../../components/ui/switch';
import { 
  Database, 
  Loader2, 
  Save, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  EyeOff,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../../lib/api';

export const MLSSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);
  const [config, setConfig] = useState({
    provider: 'bridge',
    api_key: '',
    api_secret: '',
    server_token: '',
    dataset_id: '',
    mls_name: 'Stellar MLS',
    enabled: false,
    auto_sync: false,
    sync_interval_hours: 24
  });
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetchConfig();
    fetchStatus();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await api.get('/mls/config');
      if (res.data) {
        setConfig(prev => ({ ...prev, ...res.data }));
      }
    } catch (error) {
      // Config not found, use defaults
      console.log('MLS config not found, using defaults');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatus = async () => {
    try {
      const res = await api.get('/mls/status');
      setStatus(res.data);
    } catch (error) {
      console.error('Failed to fetch MLS status');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/mls/config', config);
      toast.success('MLS configuration saved');
      fetchStatus();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await api.post('/mls/test');
      if (res.data.success) {
        toast.success('MLS connection successful!');
      } else {
        toast.error(res.data.error || 'Connection failed');
      }
      fetchStatus();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Connection test failed');
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
    <div className="space-y-6" data-testid="mls-settings-page">
      <div>
        <h1 className="text-3xl font-serif font-bold flex items-center gap-3">
          <Database className="w-8 h-8 text-amber-500" />
          MLS Integration
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure your MLS (Multiple Listing Service) connection
        </p>
      </div>

      {/* Status Card */}
      <Card className={status?.configured ? 'border-green-500/50' : 'border-orange-500/50'}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              Connection Status
              {status?.configured ? (
                <Badge className="bg-green-500/20 text-green-600">Connected</Badge>
              ) : (
                <Badge className="bg-orange-500/20 text-orange-600">Not Configured</Badge>
              )}
            </span>
            <Button variant="outline" size="sm" onClick={fetchStatus}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Provider</p>
              <p className="font-medium">{status?.provider || 'Bridge API'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">MLS</p>
              <p className="font-medium">{config.mls_name || 'Not Set'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Last Sync</p>
              <p className="font-medium">{status?.last_sync ? new Date(status.last_sync).toLocaleString() : 'Never'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <p className="font-medium flex items-center gap-1">
                {status?.configured ? (
                  <><CheckCircle2 className="w-4 h-4 text-green-500" /> Ready</>
                ) : (
                  <><XCircle className="w-4 h-4 text-orange-500" /> Setup Required</>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-500/5 border-blue-500/30">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-600 mb-1">About Bridge API Integration</p>
              <p className="text-muted-foreground">
                This integration connects to Stellar MLS (and other supported MLSs) via Bridge Interactive's API. 
                You'll need to sign up for a Bridge API account and obtain credentials from your MLS provider.
              </p>
              <a 
                href="https://bridgeinteractive.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:underline mt-2"
              >
                Visit Bridge Interactive <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
          <CardDescription>Enter your Bridge API credentials</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* MLS Name */}
            <div className="space-y-2">
              <Label>MLS Name</Label>
              <Input
                value={config.mls_name}
                onChange={(e) => setConfig({ ...config, mls_name: e.target.value })}
                placeholder="Stellar MLS"
              />
              <p className="text-xs text-muted-foreground">The name of your MLS provider</p>
            </div>

            {/* Dataset ID */}
            <div className="space-y-2">
              <Label>Dataset ID</Label>
              <Input
                value={config.dataset_id}
                onChange={(e) => setConfig({ ...config, dataset_id: e.target.value })}
                placeholder="e.g., stellar_mls"
              />
              <p className="text-xs text-muted-foreground">Your MLS dataset identifier</p>
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="relative">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  value={config.api_key}
                  onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
                  placeholder="Enter your Bridge API key"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* API Secret */}
            <div className="space-y-2">
              <Label>API Secret</Label>
              <div className="relative">
                <Input
                  type={showApiSecret ? 'text' : 'password'}
                  value={config.api_secret}
                  onChange={(e) => setConfig({ ...config, api_secret: e.target.value })}
                  placeholder="Enter your Bridge API secret"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiSecret(!showApiSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showApiSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Server Token */}
            <div className="space-y-2 md:col-span-2">
              <Label>Server Token (Optional)</Label>
              <Input
                value={config.server_token}
                onChange={(e) => setConfig({ ...config, server_token: e.target.value })}
                placeholder="Server-side authentication token"
              />
              <p className="text-xs text-muted-foreground">Required for some MLS providers</p>
            </div>
          </div>

          {/* Toggle Options */}
          <div className="border-t pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable MLS Integration</Label>
                <p className="text-xs text-muted-foreground">Turn on to allow MLS searches and imports</p>
              </div>
              <Switch
                checked={config.enabled}
                onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-Sync Listings</Label>
                <p className="text-xs text-muted-foreground">Automatically sync your listings from MLS</p>
              </div>
              <Switch
                checked={config.auto_sync}
                onCheckedChange={(checked) => setConfig({ ...config, auto_sync: checked })}
              />
            </div>

            {config.auto_sync && (
              <div className="ml-4 space-y-2">
                <Label>Sync Interval (hours)</Label>
                <Input
                  type="number"
                  min="1"
                  max="168"
                  value={config.sync_interval_hours}
                  onChange={(e) => setConfig({ ...config, sync_interval_hours: parseInt(e.target.value) || 24 })}
                  className="w-32"
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button onClick={handleSave} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-black">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Configuration
            </Button>
            <Button variant="outline" onClick={handleTest} disabled={testing || !config.api_key}>
              {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Test Connection
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            Setup Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h4 className="font-medium mb-2">1. Get Bridge API Access</h4>
            <p className="text-muted-foreground">
              Contact your MLS (e.g., Stellar MLS) to request Bridge API access. They will provide you with 
              API credentials after approval.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">2. Obtain Credentials</h4>
            <p className="text-muted-foreground">
              Once approved, you'll receive an API Key, API Secret, and your Dataset ID. Enter these in the 
              fields above.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">3. Test Connection</h4>
            <p className="text-muted-foreground">
              After entering your credentials, click "Test Connection" to verify everything is working correctly.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">4. Start Importing</h4>
            <p className="text-muted-foreground">
              Once connected, go to Property Leads and click "Import from MLS" to search and import listings.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MLSSettings;
