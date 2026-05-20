import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Home, Loader2, User, Mail, Phone, MapPin, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import axios from 'axios';

const API = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

export const ListMyHomeModal = ({
  onClose,
  propertyAddress = '',   // optional pre-fill from page context
  signerName = '',
  signerEmail = '',
  leadId = '',
}) => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name:    signerName  || '',
    email:   signerEmail || '',
    phone:   '',
    address: propertyAddress || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Please enter your name and email to continue');
      return;
    }
    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/api/esign/public/list-my-home`, {
        signer_name:      form.name,
        signer_email:     form.email,
        signer_phone:     form.phone,
        property_address: form.address,
        lead_id:          leadId || undefined,
      });
      toast.success('Your listing agreement is ready. Redirecting...');
      setTimeout(() => navigate(`/sign/${res.data.token}`), 800);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Something went wrong. Please try again.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0a1628] border border-amber-400/30 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-400 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#0a1628]/20 rounded-full flex items-center justify-center">
                <Home className="w-5 h-5 text-[#0a1628]" />
              </div>
              <div>
                <h2 className="text-[#0a1628] font-bold text-xl font-serif">List My Home</h2>
                <p className="text-[#0a1628]/70 text-xs mt-0.5">Exclusive Right of Sale Listing Agreement</p>
              </div>
            </div>
            <button onClick={onClose} className="text-[#0a1628]/60 hover:text-[#0a1628] transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-white/70 text-sm mb-5 leading-relaxed">
            Ready to list your property with <strong className="text-amber-400">Sheila Desautels</strong> at Hidden Haven Realty?
            Enter your details below and we'll send you the listing agreement to review and sign electronically.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-white/50 text-xs mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Full Name *
              </label>
              <Input
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="Your full legal name"
                required
                className="bg-white/10 border-white/20 text-white placeholder:text-white/30 h-11 focus:border-amber-400/50"
              />
            </div>

            <div>
              <label className="text-white/50 text-xs mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> Email Address *
              </label>
              <Input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="you@email.com"
                required
                className="bg-white/10 border-white/20 text-white placeholder:text-white/30 h-11 focus:border-amber-400/50"
              />
            </div>

            <div>
              <label className="text-white/50 text-xs mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> Phone (optional)
              </label>
              <Input
                type="tel"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="(813) 000-0000"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/30 h-11 focus:border-amber-400/50"
              />
            </div>

            <div>
              <label className="text-white/50 text-xs mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Property Address
              </label>
              <Input
                value={form.address}
                onChange={e => set('address', e.target.value)}
                placeholder="123 Main St, Tampa, FL 33602"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/30 h-11 focus:border-amber-400/50"
              />
            </div>

            {/* What happens next */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-2">
              <p className="text-amber-400 text-xs font-semibold uppercase tracking-wider">What happens next</p>
              {[
                'You\'ll be taken directly to the signing ceremony',
                'Review the 10-page Exclusive Right of Sale Agreement',
                'Sign electronically — takes about 5 minutes',
                'Signed copy emailed to you and Sheila automatically',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-2.5 h-2.5 text-amber-400" />
                  </div>
                  <p className="text-white/60 text-xs leading-relaxed">{step}</p>
                </div>
              ))}
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold h-12 text-base rounded-xl shadow-lg shadow-amber-500/30"
              data-testid="list-my-home-submit"
            >
              {submitting
                ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Preparing Agreement...</>
                : <><Home className="w-5 h-5 mr-2" /> Start Listing Process</>
              }
            </Button>
          </form>

          <p className="text-white/30 text-[10px] text-center mt-3">
            By proceeding you acknowledge you are entering a legally binding electronic signature process.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ListMyHomeModal;
