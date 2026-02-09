import React, { useState, useEffect } from 'react';
import { Mail, Save, Loader2, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { toast } from 'sonner';
import api from '../../../lib/api';

export const SignatureSettings = () => {
  const [signature, setSignature] = useState({
    name: '',
    title: '',
    phone: '',
    email: '',
    company: 'Hidden Haven Realty',
    website: '',
    customHtml: ''
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchSignature();
  }, []);

  const fetchSignature = async () => {
    try {
      const res = await api.get('/users/me/signature');
      if (res.data) {
        setSignature(prev => ({ ...prev, ...res.data }));
      }
    } catch (error) {
      // Use defaults
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/users/me/signature', signature);
      toast.success('Signature saved');
    } catch (error) {
      toast.error('Failed to save signature');
    } finally {
      setSaving(false);
    }
  };

  const generateSignatureHtml = () => {
    if (signature.customHtml) return signature.customHtml;
    
    return `
      <div style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
        <p style="margin: 0; font-weight: bold; color: #b8860b;">${signature.name || 'Your Name'}</p>
        ${signature.title ? `<p style="margin: 0; color: #666;">${signature.title}</p>` : ''}
        <p style="margin: 8px 0 0 0; font-weight: bold;">${signature.company || 'Hidden Haven Realty'}</p>
        ${signature.phone ? `<p style="margin: 4px 0 0 0;">📞 ${signature.phone}</p>` : ''}
        ${signature.email ? `<p style="margin: 4px 0 0 0;">✉️ ${signature.email}</p>` : ''}
        ${signature.website ? `<p style="margin: 4px 0 0 0;">🌐 <a href="${signature.website}" style="color: #b8860b;">${signature.website}</a></p>` : ''}
      </div>
    `.trim();
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
        <h2 className="text-2xl font-semibold">Email Signature</h2>
        <p className="text-muted-foreground">Configure your email signature for outgoing messages</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-amber-500" />
            Signature Details
          </CardTitle>
          <CardDescription>
            This signature will be automatically added to emails sent from the system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={signature.name}
                onChange={(e) => setSignature({ ...signature, name: e.target.value })}
                placeholder="John Smith"
              />
            </div>
            <div className="space-y-2">
              <Label>Title / Position</Label>
              <Input
                value={signature.title}
                onChange={(e) => setSignature({ ...signature, title: e.target.value })}
                placeholder="Senior Real Estate Agent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={signature.phone}
                onChange={(e) => setSignature({ ...signature, phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={signature.email}
                onChange={(e) => setSignature({ ...signature, email: e.target.value })}
                placeholder="john@hiddenhavenrealty.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Company</Label>
              <Input
                value={signature.company}
                onChange={(e) => setSignature({ ...signature, company: e.target.value })}
                placeholder="Hidden Haven Realty"
              />
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input
                value={signature.website}
                onChange={(e) => setSignature({ ...signature, website: e.target.value })}
                placeholder="https://hiddenhavenrealty.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Custom HTML (Optional)</Label>
            <Textarea
              value={signature.customHtml}
              onChange={(e) => setSignature({ ...signature, customHtml: e.target.value })}
              placeholder="Enter custom HTML for your signature..."
              rows={4}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to use the auto-generated signature based on the fields above
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-black">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Signature
            </Button>
            <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
              <Eye className="w-4 h-4 mr-2" />
              {showPreview ? 'Hide' : 'Show'} Preview
            </Button>
          </div>
        </CardContent>
      </Card>

      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle>Signature Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-white rounded border">
              <div dangerouslySetInnerHTML={{ __html: generateSignatureHtml() }} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SignatureSettings;
