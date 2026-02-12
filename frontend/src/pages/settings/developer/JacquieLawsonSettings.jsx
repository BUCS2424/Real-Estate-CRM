import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Badge } from '../../../components/ui/badge';
import { Switch } from '../../../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { 
  Heart, 
  Loader2, 
  Save, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  EyeOff,
  ExternalLink,
  RefreshCw,
  Calendar,
  Gift,
  Home,
  Cake,
  Mail,
  Clock,
  Send
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../../lib/api';

export const JacquieLawsonSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [config, setConfig] = useState({
    email: '',
    password: '',
    enabled: false,
    auto_send_birthday: true,
    auto_send_anniversary: true,
    auto_send_home_anniversary: true,
    days_before_send: 0, // 0 = on the day, 1 = day before, etc.
    default_birthday_card: '',
    default_anniversary_card: '',
    default_home_anniversary_card: '',
    sender_name: ''
  });
  const [status, setStatus] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchConfig();
    fetchStats();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await api.get('/jacquie-lawson/config');
      if (res.data) {
        setConfig(prev => ({ ...prev, ...res.data }));
        setStatus(res.data.configured ? 'configured' : 'not_configured');
      }
    } catch (error) {
      console.log('JL config not found, using defaults');
      setStatus('not_configured');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/jacquie-lawson/stats');
      setStats(res.data);
    } catch (error) {
      console.error('Failed to fetch JL stats');
    }
  };

  const handleSave = async () => {
    if (!config.email || !config.password) {
      toast.error('Email and password are required');
      return;
    }
    
    setSaving(true);
    try {
      await api.post('/jacquie-lawson/config', config);
      toast.success('Jacquie Lawson settings saved');
      setStatus('configured');
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!config.email || !config.password) {
      toast.error('Please enter credentials first');
      return;
    }
    
    setTesting(true);
    try {
      const res = await api.post('/jacquie-lawson/test', {
        email: config.email,
        password: config.password
      });
      if (res.data.success) {
        toast.success('Login successful! Your credentials are valid.');
        setStatus('configured');
      } else {
        toast.error(res.data.error || 'Login failed');
        setStatus('error');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Connection test failed');
      setStatus('error');
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
    <div className="space-y-6" data-testid="jacquie-lawson-settings">
      <div>
        <h1 className="text-3xl font-serif font-bold flex items-center gap-3">
          <Heart className="w-8 h-8 text-pink-500" />
          Jacquie Lawson Cards
        </h1>
        <p className="text-muted-foreground mt-1">
          Send beautiful animated ecards to your clients for birthdays, anniversaries & more
        </p>
      </div>

      {/* Status Card */}
      <Card className={status === 'configured' ? 'border-green-500/50' : 'border-orange-500/50'}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              Account Status
              {status === 'configured' ? (
                <Badge className="bg-green-500/20 text-green-600">Connected</Badge>
              ) : status === 'error' ? (
                <Badge className="bg-red-500/20 text-red-600">Error</Badge>
              ) : (
                <Badge className="bg-orange-500/20 text-orange-600">Not Configured</Badge>
              )}
            </span>
            <Button variant="outline" size="sm" onClick={fetchStats}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Cards Sent</p>
              <p className="font-medium text-2xl">{stats?.total_sent || 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">This Month</p>
              <p className="font-medium text-2xl">{stats?.sent_this_month || 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Scheduled</p>
              <p className="font-medium text-2xl text-amber-600">{stats?.scheduled || 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Upcoming (7 days)</p>
              <p className="font-medium text-2xl text-blue-600">{stats?.upcoming_7_days || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="credentials">
        <TabsList>
          <TabsTrigger value="credentials">Account Credentials</TabsTrigger>
          <TabsTrigger value="automation">Automation Settings</TabsTrigger>
          <TabsTrigger value="cards">Default Cards</TabsTrigger>
        </TabsList>

        <TabsContent value="credentials" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Jacquie Lawson Login</CardTitle>
              <CardDescription>
                Enter your Jacquie Lawson subscription credentials
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    value={config.email}
                    onChange={(e) => setConfig({ ...config, email: e.target.value })}
                    placeholder="your@email.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Password</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={config.password}
                      onChange={(e) => setConfig({ ...config, password: e.target.value })}
                      placeholder="Your Jacquie Lawson password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Your Name (for card signatures)</Label>
                  <Input
                    value={config.sender_name}
                    onChange={(e) => setConfig({ ...config, sender_name: e.target.value })}
                    placeholder="e.g., Mel from Hidden Haven Realty"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label>Enable Card Sending</Label>
                  <p className="text-xs text-muted-foreground">Turn on to allow sending cards from this system</p>
                </div>
                <Switch
                  checked={config.enabled}
                  onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
                />
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button onClick={handleSave} disabled={saving} className="bg-pink-500 hover:bg-pink-600 text-white">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Credentials
                </Button>
                <Button variant="outline" onClick={handleTest} disabled={testing || !config.email || !config.password}>
                  {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  Test Login
                </Button>
              </div>

              <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                <p className="text-sm flex items-start gap-2">
                  <ExternalLink className="w-4 h-4 mt-0.5 text-blue-500" />
                  <span>
                    Don't have a subscription?{' '}
                    <a 
                      href="https://www.jacquielawson.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Sign up at jacquielawson.com
                    </a>
                    {' '}for beautiful animated ecards.
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Automatic Card Sending</CardTitle>
              <CardDescription>
                Configure which occasions to automatically send cards
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
                      <Cake className="w-5 h-5 text-pink-500" />
                    </div>
                    <div>
                      <Label>Birthday Cards</Label>
                      <p className="text-xs text-muted-foreground">Automatically send cards on contact birthdays</p>
                    </div>
                  </div>
                  <Switch
                    checked={config.auto_send_birthday}
                    onCheckedChange={(checked) => setConfig({ ...config, auto_send_birthday: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                      <Heart className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <Label>Anniversary Cards</Label>
                      <p className="text-xs text-muted-foreground">Send cards on wedding/relationship anniversaries</p>
                    </div>
                  </div>
                  <Switch
                    checked={config.auto_send_anniversary}
                    onCheckedChange={(checked) => setConfig({ ...config, auto_send_anniversary: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <Home className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <Label>Home Purchase Anniversary</Label>
                      <p className="text-xs text-muted-foreground">Celebrate the anniversary of their home purchase</p>
                    </div>
                  </div>
                  <Switch
                    checked={config.auto_send_home_anniversary}
                    onCheckedChange={(checked) => setConfig({ ...config, auto_send_home_anniversary: checked })}
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <Label>Send Cards</Label>
                <div className="flex items-center gap-4 mt-2">
                  <select
                    value={config.days_before_send}
                    onChange={(e) => setConfig({ ...config, days_before_send: parseInt(e.target.value) })}
                    className="px-3 py-2 border rounded-lg bg-background"
                  >
                    <option value="0">On the day</option>
                    <option value="1">1 day before</option>
                    <option value="2">2 days before</option>
                    <option value="3">3 days before</option>
                    <option value="7">1 week before</option>
                  </select>
                  <span className="text-sm text-muted-foreground">of the occasion</span>
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving} className="bg-pink-500 hover:bg-pink-600 text-white">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Automation Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cards" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Default Card Selections</CardTitle>
              <CardDescription>
                Choose default cards for each occasion (you can override when sending)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/30 mb-4">
                <p className="text-sm">
                  <strong>Tip:</strong> Browse cards at{' '}
                  <a href="https://www.jacquielawson.com/cards" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">
                    jacquielawson.com/cards
                  </a>
                  {' '}and copy the card URL to use as defaults here.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Cake className="w-4 h-4 text-pink-500" />
                    Default Birthday Card URL
                  </Label>
                  <Input
                    value={config.default_birthday_card}
                    onChange={(e) => setConfig({ ...config, default_birthday_card: e.target.value })}
                    placeholder="https://www.jacquielawson.com/card/..."
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-500" />
                    Default Anniversary Card URL
                  </Label>
                  <Input
                    value={config.default_anniversary_card}
                    onChange={(e) => setConfig({ ...config, default_anniversary_card: e.target.value })}
                    placeholder="https://www.jacquielawson.com/card/..."
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-amber-500" />
                    Default Home Anniversary Card URL
                  </Label>
                  <Input
                    value={config.default_home_anniversary_card}
                    onChange={(e) => setConfig({ ...config, default_home_anniversary_card: e.target.value })}
                    placeholder="https://www.jacquielawson.com/card/..."
                  />
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving} className="bg-pink-500 hover:bg-pink-600 text-white">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Default Cards
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default JacquieLawsonSettings;
