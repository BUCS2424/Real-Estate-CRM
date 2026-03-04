import React, { useState, useEffect } from 'react';
import { MessageSquare, Save, Loader2, Phone, Key, TestTube, CheckCircle, XCircle, PhoneCall, ShieldCheck } from 'lucide-react';
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
    messagingProfileId: '',
    voiceConnectionId: '',
    sipUsername: '',
    sipPassword: '',
    outboundCallerId: '',
    verifyProfileId: '',
    billingId: ''
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [verifyPhone, setVerifyPhone] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/telnyx/credentials');
      if (res.data) {
        setSettings({
          apiKey: res.data.api_key || '',
          phoneNumber: res.data.phone_number || '',
          messagingProfileId: res.data.messaging_profile_id || '',
          voiceConnectionId: res.data.voice_connection_id || '',
          sipUsername: res.data.sip_username || '',
          sipPassword: res.data.sip_password || '',
          outboundCallerId: res.data.outbound_caller_id || '',
          verifyProfileId: res.data.verify_profile_id || '',
          billingId: res.data.billing_id || ''
        });
      }
    } catch (error) {
      // ignore if not configured
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/telnyx/credentials', {
        api_key: settings.apiKey,
        phone_number: settings.phoneNumber,
        messaging_profile_id: settings.messagingProfileId,
        voice_connection_id: settings.voiceConnectionId,
        sip_username: settings.sipUsername,
        sip_password: settings.sipPassword,
        outbound_caller_id: settings.outboundCallerId,
        verify_profile_id: settings.verifyProfileId,
        billing_id: settings.billingId
      });
      toast.success('Telnyx settings saved');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!settings.apiKey) {
      toast.error('Please fill in the API Key first');
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.post('/telnyx/test');
      setTestResult({ success: true, message: res.data.message || 'Connection successful!' });
      toast.success('Telnyx connection verified!');
    } catch (error) {
      setTestResult({ success: false, message: error.response?.data?.detail || 'Connection failed' });
      toast.error('Telnyx connection failed');
    } finally {
      setTesting(false);
    }
  };

  const handleSendVerify = async () => {
    if (!verifyPhone) {
      toast.error('Enter a phone number to verify');
      return;
    }
    setSendingCode(true);
    setVerifyResult(null);
    try {
      const res = await api.post('/telnyx/verify/start', { phone_number: verifyPhone });
      setVerifyResult({ success: true, message: res.data.message || 'Code sent' });
      toast.success('Verification code sent');
    } catch (error) {
      setVerifyResult({ success: false, message: error.response?.data?.detail || 'Failed to send code' });
      toast.error('Failed to send code');
    } finally {
      setSendingCode(false);
    }
  };

  const handleCheckVerify = async () => {
    if (!verifyPhone || !verifyCode) {
      toast.error('Enter phone number and code');
      return;
    }
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await api.post('/telnyx/verify/check', {
        phone_number: verifyPhone,
        code: verifyCode
      });
      setVerifyResult({ success: true, message: res.data.message || 'Verified' });
      toast.success('Phone verified');
    } catch (error) {
      setVerifyResult({ success: false, message: error.response?.data?.detail || 'Verification failed' });
      toast.error('Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="telnyx-loading">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  const webhookBase = `${window.location.origin}/api/telnyx/webhooks`;

  return (
    <div className="space-y-6" data-testid="telnyx-settings-page">
      <div>
        <h2 className="text-2xl font-semibold">Telnyx Voice + SMS Settings</h2>
        <p className="text-muted-foreground">Configure Telnyx messaging, calling, and verification</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-green-500" />
            API Configuration
          </CardTitle>
          <CardDescription>
            Enter your Telnyx API credentials to enable SMS, voice, and verification
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2" htmlFor="telnyx-api-key">
              <Key className="w-4 h-4" />
              API Key
            </Label>
            <Input
              id="telnyx-api-key"
              type="password"
              value={settings.apiKey}
              onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
              placeholder="KEY01234567890ABCDEF..."
              data-testid="telnyx-api-key-input"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="telnyx-phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Phone Number (E.164)
              </Label>
              <Input
                id="telnyx-phone"
                value={settings.phoneNumber}
                onChange={(e) => setSettings({ ...settings, phoneNumber: e.target.value })}
                placeholder="+18134540004"
                data-testid="telnyx-phone-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telnyx-outbound">Outbound Caller ID</Label>
              <Input
                id="telnyx-outbound"
                value={settings.outboundCallerId}
                onChange={(e) => setSettings({ ...settings, outboundCallerId: e.target.value })}
                placeholder="+18134540004"
                data-testid="telnyx-outbound-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telnyx-messaging">Messaging Profile ID</Label>
              <Input
                id="telnyx-messaging"
                value={settings.messagingProfileId}
                onChange={(e) => setSettings({ ...settings, messagingProfileId: e.target.value })}
                placeholder="40019cb7-..."
                data-testid="telnyx-messaging-profile-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telnyx-verify">Verify Profile ID</Label>
              <Input
                id="telnyx-verify"
                value={settings.verifyProfileId}
                onChange={(e) => setSettings({ ...settings, verifyProfileId: e.target.value })}
                placeholder="4900019c-..."
                data-testid="telnyx-verify-profile-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telnyx-voice" className="flex items-center gap-2">
                <PhoneCall className="w-4 h-4" />
                Voice Connection ID
              </Label>
              <Input
                id="telnyx-voice"
                value={settings.voiceConnectionId}
                onChange={(e) => setSettings({ ...settings, voiceConnectionId: e.target.value })}
                placeholder="2907967336..."
                data-testid="telnyx-voice-connection-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telnyx-sip-user">SIP Username</Label>
              <Input
                id="telnyx-sip-user"
                value={settings.sipUsername}
                onChange={(e) => setSettings({ ...settings, sipUsername: e.target.value })}
                placeholder="sip-username"
                data-testid="telnyx-sip-username-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telnyx-sip-pass">SIP Password</Label>
              <Input
                id="telnyx-sip-pass"
                type="password"
                value={settings.sipPassword}
                onChange={(e) => setSettings({ ...settings, sipPassword: e.target.value })}
                placeholder="••••••••"
                data-testid="telnyx-sip-password-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telnyx-billing">Billing ID (optional)</Label>
              <Input
                id="telnyx-billing"
                value={settings.billingId}
                onChange={(e) => setSettings({ ...settings, billingId: e.target.value })}
                placeholder="a8fea766-..."
                data-testid="telnyx-billing-id-input"
              />
            </div>
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

          <div className="flex flex-wrap gap-3 pt-4">
            <Button onClick={handleSave} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-black" data-testid="telnyx-save-button">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Settings
            </Button>
            <Button variant="outline" onClick={handleTest} disabled={testing || !settings.apiKey} data-testid="telnyx-test-button">
              {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <TestTube className="w-4 h-4 mr-2" />}
              Test Connection
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Webhook URLs: SMS → {webhookBase}/sms, Voice → {webhookBase}/voice</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-500" />
            Phone Verification
          </CardTitle>
          <CardDescription>Send and verify a Telnyx Verify code</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="verify-phone">Phone Number</Label>
              <Input
                id="verify-phone"
                value={verifyPhone}
                onChange={(e) => setVerifyPhone(e.target.value)}
                placeholder="+18134540004"
                data-testid="telnyx-verify-phone-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="verify-code">Verification Code</Label>
              <Input
                id="verify-code"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
                placeholder="123456"
                data-testid="telnyx-verify-code-input"
              />
            </div>
          </div>

          {verifyResult && (
            <div className={`p-4 rounded-lg flex items-center gap-3 ${verifyResult.success ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
              {verifyResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <span className={verifyResult.success ? 'text-green-600' : 'text-red-600'}>
                {verifyResult.message}
              </span>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleSendVerify} disabled={sendingCode} data-testid="telnyx-verify-send-button">
              {sendingCode ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Phone className="w-4 h-4 mr-2" />}
              Send Code
            </Button>
            <Button variant="outline" onClick={handleCheckVerify} disabled={verifying} data-testid="telnyx-verify-check-button">
              {verifying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Verify Code
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TelnyxSettings;
