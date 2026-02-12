import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Badge } from '../../../components/ui/badge';
import { Switch } from '../../../components/ui/switch';
import { 
  Mic, 
  Loader2, 
  Save, 
  CheckCircle2, 
  Eye, 
  EyeOff,
  ExternalLink,
  RefreshCw,
  Volume2,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../../lib/api';

export const ElevenLabsSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [config, setConfig] = useState({
    api_key: '',
    enabled: false,
    default_voice_id: '',
    default_model: 'eleven_multilingual_v2',
    use_for_tts: true,
    use_for_social_media: false
  });
  const [status, setStatus] = useState(null);
  const [voices, setVoices] = useState([]);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await api.get('/elevenlabs/config');
      if (res.data) {
        setConfig(prev => ({ ...prev, ...res.data }));
        setStatus(res.data.configured ? 'configured' : 'not_configured');
        if (res.data.voices) {
          setVoices(res.data.voices);
        }
      }
    } catch (error) {
      console.log('ElevenLabs config not found, using defaults');
      setStatus('not_configured');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config.api_key) {
      toast.error('API key is required');
      return;
    }
    
    setSaving(true);
    try {
      await api.post('/elevenlabs/config', config);
      toast.success('ElevenLabs settings saved');
      setStatus('configured');
      // Fetch voices after saving
      fetchVoices();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!config.api_key) {
      toast.error('Please enter an API key first');
      return;
    }
    
    setTesting(true);
    try {
      const res = await api.post('/elevenlabs/test', { api_key: config.api_key });
      if (res.data.success) {
        toast.success('API key is valid!');
        setStatus('configured');
        if (res.data.voices) {
          setVoices(res.data.voices);
        }
      } else {
        toast.error(res.data.error || 'Invalid API key');
        setStatus('error');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Connection test failed');
      setStatus('error');
    } finally {
      setTesting(false);
    }
  };

  const fetchVoices = async () => {
    try {
      const res = await api.get('/elevenlabs/voices');
      if (res.data.voices) {
        setVoices(res.data.voices);
      }
    } catch (error) {
      console.error('Failed to fetch voices');
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
    <div className="space-y-6" data-testid="elevenlabs-settings">
      <div>
        <h1 className="text-3xl font-serif font-bold flex items-center gap-3">
          <Mic className="w-8 h-8 text-purple-500" />
          ElevenLabs AI
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure ElevenLabs for AI-powered text-to-speech, voice generation, and more
        </p>
      </div>

      {/* Status Card */}
      <Card className={status === 'configured' ? 'border-green-500/50' : 'border-orange-500/50'}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              Connection Status
              {status === 'configured' ? (
                <Badge className="bg-green-500/20 text-green-600">Connected</Badge>
              ) : status === 'error' ? (
                <Badge className="bg-red-500/20 text-red-600">Error</Badge>
              ) : (
                <Badge className="bg-orange-500/20 text-orange-600">Not Configured</Badge>
              )}
            </span>
            <Button variant="outline" size="sm" onClick={fetchConfig}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Provider</p>
              <p className="font-medium">ElevenLabs</p>
            </div>
            <div>
              <p className="text-muted-foreground">Model</p>
              <p className="font-medium">{config.default_model || 'Not set'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Available Voices</p>
              <p className="font-medium">{voices.length || 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <p className="font-medium flex items-center gap-1">
                {status === 'configured' ? (
                  <><CheckCircle2 className="w-4 h-4 text-green-500" /> Ready</>
                ) : (
                  <><AlertCircle className="w-4 h-4 text-orange-500" /> Setup Required</>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-purple-500/5 border-purple-500/30">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Sparkles className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-purple-600 mb-1">About ElevenLabs</p>
              <p className="text-muted-foreground">
                ElevenLabs provides state-of-the-art AI voice technology including text-to-speech, 
                voice cloning, and audio generation. Use it for video narration, social media content, 
                and automated voice messages.
              </p>
              <a 
                href="https://elevenlabs.io" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-purple-600 hover:underline mt-2"
              >
                Visit ElevenLabs <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
          <CardDescription>Enter your ElevenLabs API credentials</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* API Key */}
            <div className="space-y-2 md:col-span-2">
              <Label>API Key *</Label>
              <div className="relative">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  value={config.api_key}
                  onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
                  placeholder="Enter your ElevenLabs API key"
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
              <p className="text-xs text-muted-foreground">
                Get your API key from{' '}
                <a href="https://elevenlabs.io/app/settings/api-keys" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">
                  ElevenLabs Dashboard → Profile → API Keys
                </a>
              </p>
            </div>

            {/* Default Model */}
            <div className="space-y-2">
              <Label>Default Model</Label>
              <select
                value={config.default_model}
                onChange={(e) => setConfig({ ...config, default_model: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg bg-background"
              >
                <option value="eleven_multilingual_v2">Multilingual v2 (Recommended)</option>
                <option value="eleven_turbo_v2_5">Turbo v2.5 (Faster)</option>
                <option value="eleven_turbo_v2">Turbo v2</option>
                <option value="eleven_monolingual_v1">Monolingual v1</option>
              </select>
            </div>

            {/* Default Voice */}
            <div className="space-y-2">
              <Label>Default Voice</Label>
              <select
                value={config.default_voice_id}
                onChange={(e) => setConfig({ ...config, default_voice_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg bg-background"
                disabled={voices.length === 0}
              >
                <option value="">Select a voice...</option>
                {voices.map((voice) => (
                  <option key={voice.voice_id} value={voice.voice_id}>
                    {voice.name} {voice.category && `(${voice.category})`}
                  </option>
                ))}
              </select>
              {voices.length === 0 && (
                <p className="text-xs text-muted-foreground">Save and test your API key to load available voices</p>
              )}
            </div>
          </div>

          {/* Toggle Options */}
          <div className="border-t pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable ElevenLabs Integration</Label>
                <p className="text-xs text-muted-foreground">Turn on to use ElevenLabs across the platform</p>
              </div>
              <Switch
                checked={config.enabled}
                onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Use for Text-to-Speech</Label>
                <p className="text-xs text-muted-foreground">Generate voice narrations for videos and content</p>
              </div>
              <Switch
                checked={config.use_for_tts}
                onCheckedChange={(checked) => setConfig({ ...config, use_for_tts: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Use for Social Media Content</Label>
                <p className="text-xs text-muted-foreground">Generate AI voiceovers for social media posts</p>
              </div>
              <Switch
                checked={config.use_for_social_media}
                onCheckedChange={(checked) => setConfig({ ...config, use_for_social_media: checked })}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button onClick={handleSave} disabled={saving} className="bg-purple-500 hover:bg-purple-600 text-white">
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

      {/* Available Voices */}
      {voices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-purple-500" />
              Available Voices ({voices.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto">
              {voices.map((voice) => (
                <div 
                  key={voice.voice_id} 
                  className={`p-3 rounded-lg border ${config.default_voice_id === voice.voice_id ? 'border-purple-500 bg-purple-500/10' : 'bg-muted/30'}`}
                >
                  <p className="font-medium">{voice.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{voice.category || 'Custom'}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-purple-500" />
            Setup Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h4 className="font-medium mb-2">1. Create an ElevenLabs Account</h4>
            <p className="text-muted-foreground">
              Sign up at{' '}
              <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">
                elevenlabs.io
              </a>
              . They offer a free tier with limited characters per month.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">2. Get Your API Key</h4>
            <p className="text-muted-foreground">
              Go to Profile → API Keys in your ElevenLabs dashboard and create a new API key.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">3. Choose Your Voices</h4>
            <p className="text-muted-foreground">
              ElevenLabs provides pre-made voices and allows you to clone your own voice for a more personal touch.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">4. Start Creating</h4>
            <p className="text-muted-foreground">
              Once configured, use ElevenLabs for video narration, social media voiceovers, and automated messages.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ElevenLabsSettings;
