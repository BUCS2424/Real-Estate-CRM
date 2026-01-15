import React, { useState, useEffect } from 'react';
import { storageAPI } from '../../../lib/api';
import { 
  HardDrive, 
  Cloud, 
  Server, 
  Globe, 
  Settings, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Eye,
  EyeOff,
  Save,
  TestTube,
  Star,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Switch } from '../../../components/ui/switch';
import { Badge } from '../../../components/ui/badge';
import { toast } from 'sonner';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../../components/ui/collapsible';

// Provider icons and colors
const PROVIDER_CONFIG = {
  google_drive: {
    icon: '🔷',
    color: 'bg-blue-500',
    name: 'Google Drive',
    description: 'Store files in Google Drive with OAuth authentication',
    credentialFields: [
      { key: 'client_id', label: 'Client ID', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', required: true },
      { key: 'refresh_token', label: 'Refresh Token', type: 'password', required: false },
    ],
    settingsFields: [
      { key: 'folder_id', label: 'Root Folder ID', type: 'text', placeholder: 'Leave empty for root' },
      { key: 'use_service_account', label: 'Use Service Account', type: 'boolean' },
    ]
  },
  idrive: {
    icon: '💾',
    color: 'bg-green-500',
    name: 'iDrive',
    description: 'S3-compatible cloud backup and storage',
    credentialFields: [
      { key: 'access_key', label: 'Access Key ID', type: 'text', required: true },
      { key: 'secret_key', label: 'Secret Access Key', type: 'password', required: true },
    ],
    settingsFields: [
      { key: 'bucket', label: 'Bucket Name', type: 'text', placeholder: 'my-bucket' },
      { key: 'region', label: 'Region', type: 'text', placeholder: 'us-east-1' },
      { key: 'endpoint', label: 'Endpoint URL', type: 'text', placeholder: 'https://...' },
    ]
  },
  cpanel: {
    icon: '🖥️',
    color: 'bg-orange-500',
    name: 'cPanel',
    description: 'FTP/SFTP storage via cPanel hosting',
    credentialFields: [
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
      { key: 'api_token', label: 'API Token (optional)', type: 'password', required: false },
    ],
    settingsFields: [
      { key: 'host', label: 'Host', type: 'text', placeholder: 'ftp.example.com' },
      { key: 'port', label: 'Port', type: 'number', placeholder: '21' },
      { key: 'directory', label: 'Upload Directory', type: 'text', placeholder: '/public_html/uploads' },
      { key: 'use_sftp', label: 'Use SFTP', type: 'boolean' },
    ]
  },
  pcloud: {
    icon: '☁️',
    color: 'bg-cyan-500',
    name: 'pCloud',
    description: 'European cloud storage with encryption',
    credentialFields: [
      { key: 'access_token', label: 'Access Token', type: 'password', required: true },
      { key: 'client_id', label: 'Client ID (optional)', type: 'text', required: false },
    ],
    settingsFields: [
      { key: 'folder_id', label: 'Folder ID', type: 'text', placeholder: '0 for root' },
      { key: 'location', label: 'Data Location', type: 'select', options: ['US', 'EU'] },
    ]
  },
  custom_cdn: {
    icon: '🌐',
    color: 'bg-purple-500',
    name: 'Custom CDN',
    description: 'Custom S3-compatible storage or CDN endpoint',
    credentialFields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
      { key: 'api_secret', label: 'API Secret', type: 'password', required: false },
    ],
    settingsFields: [
      { key: 'endpoint_url', label: 'Endpoint URL', type: 'text', placeholder: 'https://s3.example.com' },
      { key: 'bucket', label: 'Bucket Name', type: 'text', placeholder: 'my-bucket' },
      { key: 'public_url', label: 'Public URL Base', type: 'text', placeholder: 'https://cdn.example.com' },
      { key: 'region', label: 'Region', type: 'text', placeholder: 'auto' },
    ]
  }
};

const ProviderCard = ({ provider, onUpdate, onTest, onSetDefault }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [credentials, setCredentials] = useState({});
  const [settings, setSettings] = useState(provider.settings || {});
  const [showSecrets, setShowSecrets] = useState({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const config = PROVIDER_CONFIG[provider.provider_type];
  
  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(provider.id, {
        credentials: Object.keys(credentials).length > 0 ? credentials : undefined,
        settings,
        is_active: provider.is_active
      });
      toast.success(`${config.name} settings saved`);
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const result = await onTest(provider.id);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleToggleActive = async () => {
    try {
      await onUpdate(provider.id, { is_active: !provider.is_active });
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  return (
    <Card className={`transition-all ${provider.is_default ? 'ring-2 ring-primary' : ''}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 ${config.color}/10 rounded-xl flex items-center justify-center text-2xl`}>
                {config.icon}
              </div>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  {config.name}
                  {provider.is_default && (
                    <Badge className="bg-primary/20 text-primary">
                      <Star className="w-3 h-3 mr-1 fill-current" />
                      Default
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>{config.description}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Status indicators */}
              <div className="flex items-center gap-2">
                {provider.credentials_configured ? (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Configured
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Setup Required
                  </Badge>
                )}
              </div>
              
              {/* Active toggle */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Active</span>
                <Switch 
                  checked={provider.is_active} 
                  onCheckedChange={handleToggleActive}
                  disabled={!provider.credentials_configured}
                />
              </div>
              
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon">
                  {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="space-y-6 pt-0">
            {/* Credentials Section */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Credentials
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {config.credentialFields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label htmlFor={`${provider.id}-${field.key}`}>
                      {field.label}
                      {field.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    <div className="relative">
                      <Input
                        id={`${provider.id}-${field.key}`}
                        type={field.type === 'password' && !showSecrets[field.key] ? 'password' : 'text'}
                        placeholder={provider.credentials_configured ? '••••••••' : `Enter ${field.label.toLowerCase()}`}
                        value={credentials[field.key] || ''}
                        onChange={(e) => setCredentials({ ...credentials, [field.key]: e.target.value })}
                        className="pr-10"
                      />
                      {field.type === 'password' && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => setShowSecrets({ ...showSecrets, [field.key]: !showSecrets[field.key] })}
                        >
                          {showSecrets[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Settings Section */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <HardDrive className="w-4 h-4" />
                Provider Settings
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {config.settingsFields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    {field.type === 'boolean' ? (
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`${provider.id}-setting-${field.key}`}>{field.label}</Label>
                        <Switch
                          id={`${provider.id}-setting-${field.key}`}
                          checked={settings[field.key] || false}
                          onCheckedChange={(checked) => setSettings({ ...settings, [field.key]: checked })}
                        />
                      </div>
                    ) : field.type === 'select' ? (
                      <>
                        <Label htmlFor={`${provider.id}-setting-${field.key}`}>{field.label}</Label>
                        <select
                          id={`${provider.id}-setting-${field.key}`}
                          value={settings[field.key] || ''}
                          onChange={(e) => setSettings({ ...settings, [field.key]: e.target.value })}
                          className="w-full h-10 px-3 rounded-md border border-input bg-background"
                        >
                          <option value="">Select...</option>
                          {field.options?.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </>
                    ) : (
                      <>
                        <Label htmlFor={`${provider.id}-setting-${field.key}`}>{field.label}</Label>
                        <Input
                          id={`${provider.id}-setting-${field.key}`}
                          type={field.type}
                          placeholder={field.placeholder}
                          value={settings[field.key] || ''}
                          onChange={(e) => setSettings({ ...settings, [field.key]: e.target.value })}
                        />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Configuration
                </Button>
                <Button variant="outline" onClick={handleTest} disabled={testing || !provider.credentials_configured}>
                  {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <TestTube className="w-4 h-4 mr-2" />}
                  Test Connection
                </Button>
              </div>
              {!provider.is_default && provider.is_active && (
                <Button variant="secondary" onClick={() => onSetDefault(provider.id)}>
                  <Star className="w-4 h-4 mr-2" />
                  Set as Default
                </Button>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export const StorageManagement = () => {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [defaultProvider, setDefaultProvider] = useState(null);

  const fetchProviders = async () => {
    try {
      const [providersRes, defaultRes] = await Promise.all([
        storageAPI.getProviders(),
        storageAPI.getDefault()
      ]);
      setProviders(providersRes.data);
      setDefaultProvider(defaultRes.data?.provider);
    } catch (error) {
      toast.error('Failed to load storage providers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleUpdateProvider = async (id, data) => {
    const res = await storageAPI.updateProvider(id, data);
    setProviders(providers.map(p => p.id === id ? res.data : p));
    return res.data;
  };

  const handleTestProvider = async (id) => {
    const res = await storageAPI.testProvider(id);
    return res.data;
  };

  const handleSetDefault = async (id) => {
    try {
      await storageAPI.setDefault(id);
      await fetchProviders();
      toast.success('Default provider updated');
    } catch (error) {
      toast.error('Failed to set default provider');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeCount = providers.filter(p => p.is_active).length;
  const configuredCount = providers.filter(p => p.credentials_configured).length;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="storage-management-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
            <Cloud className="w-6 h-6" />
            Storage Providers
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure cloud storage providers for media, documents, and backups
          </p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Server className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{providers.length}</p>
                <p className="text-sm text-muted-foreground">Total Providers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{configuredCount}</p>
                <p className="text-sm text-muted-foreground">Configured</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <Globe className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Default Provider Info */}
      {defaultProvider && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5 text-primary fill-primary" />
              <div>
                <p className="font-medium">
                  Default Provider: <span className="text-primary">{PROVIDER_CONFIG[defaultProvider.provider_type]?.name}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  All uploads will use this provider unless specified otherwise
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Provider Cards */}
      <div className="space-y-4">
        {providers.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            onUpdate={handleUpdateProvider}
            onTest={handleTestProvider}
            onSetDefault={handleSetDefault}
          />
        ))}
      </div>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Getting Started</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-4 bg-muted/30 rounded-lg">
              <h4 className="font-medium mb-2">🔷 Google Drive</h4>
              <p className="text-muted-foreground">
                Create OAuth credentials in Google Cloud Console. Enable Drive API and configure OAuth consent screen.
              </p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <h4 className="font-medium mb-2">💾 iDrive</h4>
              <p className="text-muted-foreground">
                Get S3-compatible credentials from your iDrive dashboard under &quot;Object Access Keys&quot;.
              </p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <h4 className="font-medium mb-2">🖥️ cPanel</h4>
              <p className="text-muted-foreground">
                Use your cPanel FTP credentials or generate an API token from cPanel security settings.
              </p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <h4 className="font-medium mb-2">☁️ pCloud</h4>
              <p className="text-muted-foreground">
                Create an app at pCloud developer portal to get OAuth access token.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
