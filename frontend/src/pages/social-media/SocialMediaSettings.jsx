import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Music2,
  Image as ImageIcon,
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
  CheckCircle,
  AlertCircle,
  Settings,
  Clock,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';

const platforms = [
  {
    id: 'facebook',
    name: 'Facebook',
    icon: Facebook,
    color: 'text-blue-600',
    bg: 'bg-blue-500/20',
    description: 'Connect your Facebook Page to share listings and updates',
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    scope: 'pages_manage_posts,pages_read_engagement'
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    color: 'text-pink-600',
    bg: 'bg-pink-500/20',
    description: 'Share photos and reels to Instagram Business',
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    scope: 'instagram_basic,instagram_content_publish'
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: Linkedin,
    color: 'text-blue-700',
    bg: 'bg-blue-700/20',
    description: 'Post professional content to LinkedIn',
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    scope: 'w_member_social'
  },
  {
    id: 'twitter',
    name: 'Twitter / X',
    icon: Twitter,
    color: 'text-sky-500',
    bg: 'bg-sky-500/20',
    description: 'Tweet updates and listings (requires paid API)',
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    scope: 'tweet.read tweet.write users.read',
    note: '$100/month API fee'
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: Music2,
    color: 'text-black dark:text-white',
    bg: 'bg-gray-500/20',
    description: 'Share video content to TikTok',
    authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
    scope: 'user.info.basic,video.publish'
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    icon: ImageIcon,
    color: 'text-red-600',
    bg: 'bg-red-500/20',
    description: 'Pin property photos and inspiration',
    authUrl: 'https://www.pinterest.com/oauth/',
    scope: 'boards:read,pins:write'
  }
];

export const SocialMediaSettings = () => {
  const [accounts, setAccounts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [credentials, setCredentials] = useState({
    account_name: '',
    account_id: '',
    access_token: '',
    page_id: ''
  });

  useEffect(() => {
    fetchData();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    setLoading(true);
    try {
      const [accountsRes, settingsRes] = await Promise.all([
        api.get('/social/accounts'),
        api.get('/social/settings')
      ]);
      setAccounts(accountsRes.data.accounts || []);
      setSettings(settingsRes.data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = (platform) => {
    setSelectedPlatform(platform);
    setCredentials({ account_name: '', account_id: '', access_token: '', page_id: '' });
    setShowConnectModal(true);
  };

  const handleSaveAccount = async () => {
    if (!credentials.account_name || !credentials.access_token) {
      toast.error('Please fill in required fields');
      return;
    }

    setSaving(true);
    try {
      await api.post('/social/accounts', {
        platform: selectedPlatform.id,
        account_name: credentials.account_name,
        account_id: credentials.account_id || credentials.account_name,
        access_token: credentials.access_token,
        page_id: credentials.page_id || null
      });
      toast.success(`${selectedPlatform.name} connected successfully!`);
      setShowConnectModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to connect account');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async (accountId) => {
    if (!confirm('Are you sure you want to disconnect this account?')) return;

    try {
      await api.delete(`/social/accounts/${accountId}`);
      toast.success('Account disconnected');
      fetchData();
    } catch (error) {
      toast.error('Failed to disconnect account');
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await api.post('/social/settings', settings);
      toast.success('Settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const getConnectedAccount = (platformId) => {
    return accounts.find(a => a.platform === platformId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="social-media-settings">
      <div>
        <h1 className="text-3xl font-serif font-bold">Social Media Settings</h1>
        <p className="text-muted-foreground">Connect your social media accounts and configure posting preferences</p>
      </div>

      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts">Connected Accounts</TabsTrigger>
          <TabsTrigger value="autopost">Auto-Post Settings</TabsTrigger>
          <TabsTrigger value="hashtags">Default Hashtags</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {platforms.map((platform) => {
              const Icon = platform.icon;
              const connected = getConnectedAccount(platform.id);

              return (
                <Card key={platform.id} className={connected ? 'border-green-500/50' : ''}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${platform.bg}`}>
                        <Icon className={`w-6 h-6 ${platform.color}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{platform.name}</h3>
                          {platform.note && (
                            <Badge variant="outline" className="text-xs">{platform.note}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">{platform.description}</p>
                        
                        {connected ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span className="text-sm font-medium">{connected.account_name}</span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-red-600 hover:text-red-700"
                              onClick={() => handleDisconnect(connected.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Disconnect
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => handleConnect(platform)}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Connect
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="autopost" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                Automatic Posting
              </CardTitle>
              <CardDescription>
                Configure automatic posting of property listings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <Label>Enable Auto-Posting</Label>
                  <p className="text-xs text-muted-foreground">Automatically post new listings to social media</p>
                </div>
                <Switch
                  checked={settings?.auto_post?.enabled || false}
                  onCheckedChange={(checked) => setSettings({
                    ...settings,
                    auto_post: { ...settings?.auto_post, enabled: checked }
                  })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <select
                    value={settings?.auto_post?.frequency || 'weekly'}
                    onChange={(e) => setSettings({
                      ...settings,
                      auto_post: { ...settings?.auto_post, frequency: e.target.value }
                    })}
                    className="w-full px-3 py-2 border rounded-lg bg-background"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Every 2 Weeks</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Preferred Time</Label>
                  <Input
                    type="time"
                    value={settings?.auto_post?.preferred_time || '11:00'}
                    onChange={(e) => setSettings({
                      ...settings,
                      auto_post: { ...settings?.auto_post, preferred_time: e.target.value }
                    })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Preferred Days</Label>
                <div className="flex flex-wrap gap-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
                    <Button
                      key={day}
                      variant={settings?.auto_post?.preferred_days?.includes(idx) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        const days = settings?.auto_post?.preferred_days || [];
                        const newDays = days.includes(idx)
                          ? days.filter(d => d !== idx)
                          : [...days, idx];
                        setSettings({
                          ...settings,
                          auto_post: { ...settings?.auto_post, preferred_days: newDays }
                        });
                      }}
                      className={settings?.auto_post?.preferred_days?.includes(idx) ? 'bg-amber-500 text-black' : ''}
                    >
                      {day}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <Label>Use AI Captions</Label>
                  <p className="text-xs text-muted-foreground">Generate captions using AI for auto-posts</p>
                </div>
                <Switch
                  checked={settings?.auto_post?.use_ai_captions || false}
                  onCheckedChange={(checked) => setSettings({
                    ...settings,
                    auto_post: { ...settings?.auto_post, use_ai_captions: checked }
                  })}
                />
              </div>

              <Button onClick={handleSaveSettings} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-black">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Settings className="w-4 h-4 mr-2" />}
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hashtags" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Default Hashtags</CardTitle>
              <CardDescription>Set default hashtags for each platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {platforms.map((platform) => {
                const Icon = platform.icon;
                return (
                  <div key={platform.id} className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${platform.color}`} />
                      {platform.name}
                    </Label>
                    <Input
                      value={settings?.default_hashtags?.[platform.id]?.join(' ') || ''}
                      onChange={(e) => setSettings({
                        ...settings,
                        default_hashtags: {
                          ...settings?.default_hashtags,
                          [platform.id]: e.target.value.split(' ').filter(h => h)
                        }
                      })}
                      placeholder="#realestate #homeforsale #realtor"
                    />
                  </div>
                );
              })}

              <Button onClick={handleSaveSettings} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-black">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Settings className="w-4 h-4 mr-2" />}
                Save Hashtags
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Connect Account Modal */}
      <Dialog open={showConnectModal} onOpenChange={setShowConnectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedPlatform && (
                <>
                  <selectedPlatform.icon className={`w-5 h-5 ${selectedPlatform.color}`} />
                  Connect {selectedPlatform.name}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              Enter your API credentials to connect this account
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30 text-sm">
              <p className="font-medium text-blue-600 mb-2">How to get API credentials:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Go to the platform's developer portal</li>
                <li>Create an app and get your API credentials</li>
                <li>Generate an access token with posting permissions</li>
                <li>Paste the credentials below</li>
              </ol>
              {selectedPlatform && (
                <a
                  href={selectedPlatform.id === 'facebook' ? 'https://developers.facebook.com' :
                        selectedPlatform.id === 'instagram' ? 'https://developers.facebook.com' :
                        selectedPlatform.id === 'linkedin' ? 'https://developer.linkedin.com' :
                        selectedPlatform.id === 'twitter' ? 'https://developer.twitter.com' :
                        selectedPlatform.id === 'tiktok' ? 'https://developers.tiktok.com' :
                        'https://developers.pinterest.com'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:underline mt-2"
                >
                  Open Developer Portal <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <div className="space-y-2">
              <Label>Account Name *</Label>
              <Input
                value={credentials.account_name}
                onChange={(e) => setCredentials({ ...credentials, account_name: e.target.value })}
                placeholder="My Business Page"
              />
            </div>

            <div className="space-y-2">
              <Label>Access Token *</Label>
              <Input
                value={credentials.access_token}
                onChange={(e) => setCredentials({ ...credentials, access_token: e.target.value })}
                placeholder="Paste your access token"
              />
            </div>

            {(selectedPlatform?.id === 'facebook' || selectedPlatform?.id === 'instagram') && (
              <div className="space-y-2">
                <Label>Page/Account ID</Label>
                <Input
                  value={credentials.page_id}
                  onChange={(e) => setCredentials({ ...credentials, page_id: e.target.value })}
                  placeholder="Facebook Page ID or Instagram Account ID"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConnectModal(false)}>Cancel</Button>
            <Button onClick={handleSaveAccount} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-black">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Connect Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SocialMediaSettings;
