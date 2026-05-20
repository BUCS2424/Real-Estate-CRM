import React, { useState } from 'react';
import { X, Send, Loader2, User, Mail, Phone, MessageSquare } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import axios from 'axios';

const API = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

export const SendForSignatureModal = ({
  template,
  contact = null,   // optional pre-fill from CRM
  lead = null,
  onClose,
  onSent,
}) => {
  const [form, setForm] = useState({
    signer_name:  contact?.name || lead?.owner_name || contact?.first_name ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim() : '',
    signer_email: contact?.email || lead?.owner_email || '',
    signer_phone: contact?.phone || lead?.owner_phone || '',
    message: '',
    expires_in_days: 30,
    contact_id: contact?.id || '',
    lead_id: lead?.id || '',
  });
  const [sending, setSending] = useState(false);
  const token = localStorage.getItem('token');

  const handleSend = async () => {
    if (!form.signer_name || !form.signer_email) {
      toast.error('Signer name and email are required');
      return;
    }
    setSending(true);
    try {
      const res = await axios.post(`${API}/api/esign/requests`, {
        template_id: template.id,
        ...form,
        expires_in_days: Number(form.expires_in_days),
      }, { headers: { Authorization: `Bearer ${token}` } });

      // Copy signing link
      if (res.data.sign_url) {
        navigator.clipboard.writeText(res.data.sign_url).catch(() => {});
      }
      toast.success('Signing request sent! Link copied to clipboard.');
      onSent?.(res.data);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to send signing request');
    } finally { setSending(false); }
  };

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-foreground font-bold text-lg">Send for Signature</h3>
            <p className="text-amber-600 text-xs mt-0.5 font-medium">{template.name}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground hover:text-foreground" /></button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-muted-foreground text-xs mb-1 flex items-center gap-1 font-medium"><User className="w-3 h-3" /> Signer Name *</label>
              <Input value={form.signer_name} onChange={e => set('signer_name', e.target.value)} placeholder="Full name" className="h-10" />
            </div>
            <div>
              <label className="text-muted-foreground text-xs mb-1 flex items-center gap-1 font-medium"><Phone className="w-3 h-3" /> Phone</label>
              <Input value={form.signer_phone} onChange={e => set('signer_phone', e.target.value)} placeholder="(813) 000-0000" className="h-10" />
            </div>
          </div>
          <div>
            <label className="text-muted-foreground text-xs mb-1 flex items-center gap-1 font-medium"><Mail className="w-3 h-3" /> Email Address *</label>
            <Input type="email" value={form.signer_email} onChange={e => set('signer_email', e.target.value)} placeholder="signer@email.com" className="h-10" />
          </div>
          <div>
            <label className="text-muted-foreground text-xs mb-1 flex items-center gap-1 font-medium"><MessageSquare className="w-3 h-3" /> Personal Message (optional)</label>
            <Textarea value={form.message} onChange={e => set('message', e.target.value)} placeholder="Add a note for the signer..." rows={3} className="resize-none" />
          </div>
          <div>
            <label className="text-muted-foreground text-xs mb-1 block font-medium">Link Expires In</label>
            <select value={form.expires_in_days} onChange={e => set('expires_in_days', e.target.value)}
              className="w-full bg-background border border-input rounded-md px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              {[7,14,30,60,90].map(d => <option key={d} value={d}>{d} days</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button onClick={handleSend} disabled={sending} className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-semibold gap-2">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send Request
          </Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
        <p className="text-muted-foreground text-[10px] text-center mt-3">A secure signing link will be emailed and copied to your clipboard.</p>
      </div>
    </div>
  );
};

export default SendForSignatureModal;
