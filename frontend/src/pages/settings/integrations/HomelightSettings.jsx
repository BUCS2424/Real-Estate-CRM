import React, { useState, useEffect } from 'react';
import {
  Link2, Copy, Check, RefreshCw, Eye, EyeOff, Zap,
  AlertCircle, CheckCircle, Loader2, ExternalLink,
  Users, TrendingUp, ShoppingBag, Star, RotateCcw
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { toast } from 'sonner';
import axios from 'axios';

const API = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');
const token = () => localStorage.getItem('token');
const headers = () => ({ Authorization: `Bearer ${token()}` });

export default function HomelightSettings() {
  const [config, setConfig]     = useState(null);
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [testing, setTesting]   = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showSecret, setShowSecret] = useState(false);
  const [showToken, setShowToken]   = useState(false);
  const [copied, setCopied]         = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const [form, setForm] = useState({
    secret:      '',
    token:       '',
    use_staging: false,
    enabled:     true,
  });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [cfgRes, sRes] = await Promise.all([
        axios.get(`${API}/api/homelight/config`, { headers: headers() }),
        axios.get(`${API}/api/homelight/stats`,  { headers: headers() }),
      ]);
      setConfig(cfgRes.data);
      setStats(sRes.data);
      setForm(f => ({
        ...f,
        secret:      cfgRes.data.secret || '',
        token:       cfgRes.data.token  || '',
        use_staging: cfgRes.data.use_staging || false,
        enabled:     cfgRes.data.enabled !== false,
      }));
    } catch { toast.error('Failed to load HomeLight config'); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/api/homelight/config`, form, { headers: headers() });
      toast.success('HomeLight settings saved');
      loadAll();
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await axios.post(`${API}/api/homelight/test`, {}, { headers: headers() });
      setTestResult(res.data);
    } catch (e) {
      setTestResult({ success: false, message: e.response?.data?.detail || 'Test failed' });
    } finally { setTesting(false); }
  };

  const handleRegenerate = async () => {
    if (!window.confirm('Regenerate webhook key? You will need to update the URL in HomeLight.')) return;
    setRegenerating(true);
    try {
      const res = await axios.post(`${API}/api/homelight/config/regenerate-key`, {}, { headers: headers() });
      toast.success('Webhook key regenerated — update HomeLight with the new URL');
      loadAll();
    } catch { toast.error('Regeneration failed'); }
    finally { setRegenerating(false); }
  };

  const copyWebhook = () => {
    if (!config?.webhook_url) return;
    navigator.clipboard.writeText(config.webhook_url);
    setCopied(true);
    toast.success('Webhook URL copied to clipboard!');
    setTimeout(() => setCopied(false), 3000);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
    </div>
  );

  const isConfigured = config?.configured;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#e8f4fd] to-[#c7e3f8] flex items-center justify-center border border-[#b3d9f5]">
          <img src="https://www.homelight.com/favicon.ico" alt="HomeLight" className="w-7 h-7"
               onError={e=>{ e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}/>
          <Link2 className="w-6 h-6 text-[#1a7fbe] hidden" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">HomeLight Integration</h2>
          <p className="text-sm text-muted-foreground">Receive leads from HomeLight directly into your pipeline</p>
        </div>
        {isConfigured ? (
          <Badge className="ml-auto bg-green-100 text-green-700 border-green-300">Connected</Badge>
        ) : (
          <Badge variant="secondary" className="ml-auto">Not Configured</Badge>
        )}
      </div>

      {/* ══ WEBHOOK URL — most important, shown first ══ */}
      <Card className="border-2 border-amber-400/40 bg-amber-50/30 dark:bg-amber-900/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="w-4 h-4 text-amber-600" />
            Your Webhook URL
            <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-xs ml-1">Copy this to HomeLight</Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Give this URL to your HomeLight partnership contact or add it in your HomeLight agent portal.
            HomeLight will POST new leads to this address automatically.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-background border border-border rounded-lg px-3 py-2.5 font-mono text-xs text-foreground break-all select-all">
              {config?.webhook_url || 'Save settings to generate webhook URL'}
            </div>
            <Button
              onClick={copyWebhook}
              disabled={!config?.webhook_url}
              className={`h-10 px-4 shrink-0 ${copied ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-amber-500 hover:bg-amber-600 text-black'}`}
              data-testid="copy-webhook-url"
            >
              {copied ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>The security key in this URL authenticates HomeLight's requests.</span>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium"
            >
              {regenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
              Regenerate key
            </button>
          </div>
          <div className="bg-background border border-border rounded-lg p-3 text-xs space-y-1.5">
            <p className="font-semibold text-foreground">How to set it up in HomeLight:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Contact your HomeLight partnership point of contact</li>
              <li>Or email <a href="mailto:support@homelight.com" className="text-amber-600 hover:underline">support@homelight.com</a> with your webhook URL above</li>
              <li>They will configure HomeLight to POST new leads to this URL</li>
              <li>Leads will then appear automatically in your <strong>Leads pipeline</strong></li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Stats (if any leads received) */}
      {stats && stats.total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Leads',  value: stats.total,       icon: Users,       color: 'text-blue-600'   },
            { label: 'Buyers',       value: stats.buyers,      icon: ShoppingBag, color: 'text-green-600'  },
            { label: 'Sellers',      value: stats.sellers,     icon: TrendingUp,  color: 'text-amber-600'  },
            { label: 'New / Unread', value: stats.new_unread,  icon: Star,        color: 'text-red-500'    },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <s.icon className={`w-6 h-6 ${s.color}`} />
                <div>
                  <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-muted-foreground text-xs">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* API Credentials */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">API Credentials</CardTitle>
          <p className="text-xs text-muted-foreground">
            Required to push leads TO HomeLight and verify your partnership.
            Contact <a href="mailto:support@homelight.com" className="text-amber-600 hover:underline">support@homelight.com</a> or
            your HomeLight partnership contact to request API access.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              API Secret
            </label>
            <div className="relative">
              <Input
                type={showSecret ? 'text' : 'password'}
                value={form.secret}
                onChange={e => setForm(f => ({ ...f, secret: e.target.value }))}
                placeholder="Paste your HomeLight secret key..."
                className="pr-10"
              />
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowSecret(s => !s)}
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              API Token
            </label>
            <div className="relative">
              <Input
                type={showToken ? 'text' : 'password'}
                value={form.token}
                onChange={e => setForm(f => ({ ...f, token: e.target.value }))}
                placeholder="Paste your HomeLight token..."
                className="pr-10"
              />
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowToken(s => !s)}
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Options */}
          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.use_staging}
                onChange={e => setForm(f => ({ ...f, use_staging: e.target.checked }))}
                className="rounded accent-amber-500"
              />
              <span className="text-sm text-muted-foreground">Use staging environment</span>
              <Badge variant="secondary" className="text-xs">Testing only</Badge>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer ml-auto">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))}
                className="rounded accent-amber-500"
              />
              <span className="text-sm text-muted-foreground">Integration enabled</span>
            </label>
          </div>

          {/* Test result */}
          {testResult && (
            <div className={`flex items-center gap-2.5 p-3 rounded-lg text-sm border ${
              testResult.success
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              {testResult.success
                ? <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                : <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
              {testResult.message}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-1">
            <Button onClick={handleSave} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Credentials
            </Button>
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={testing || !form.secret || !form.token}
            >
              {testing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
              Test Connection
            </Button>
            <a
              href="https://www.homelight.com/api_docs/partners"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground ml-auto"
            >
              <ExternalLink className="w-3.5 h-3.5" /> API Docs
            </a>
          </div>
        </CardContent>
      </Card>

      {/* How it works */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">How HomeLight leads flow into your pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 text-sm text-muted-foreground">
            {[
              { step: '1', text: 'Client inquires on HomeLight.com' },
              { step: '2', text: 'HomeLight POSTs lead to your webhook URL' },
              { step: '3', text: 'Lead appears instantly in Leads pipeline' },
              { step: '4', text: 'Tagged "HomeLight" — buyer or seller' },
            ].map((s, i) => (
              <React.Fragment key={s.step}>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold shrink-0">{s.step}</span>
                  <span>{s.text}</span>
                </div>
                {i < 3 && <span className="hidden sm:block text-muted-foreground/40 text-lg shrink-0">→</span>}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
