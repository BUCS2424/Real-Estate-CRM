import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Plus, Upload, Send, Eye, Trash2, Clock, CheckCircle,
  XCircle, AlertCircle, Copy, ExternalLink, Search, Filter,
  PenLine, Users, Loader2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import axios from 'axios';
import { SendForSignatureModal } from '../components/SendForSignatureModal';

const API = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

const CATEGORY_COLORS = {
  general: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  buyer: 'bg-green-500/20 text-green-300 border-green-500/30',
  seller: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  lease: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  disclosure: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
};

const STATUS_CONFIG = {
  pending:   { icon: Clock,         color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20',  label: 'Pending'   },
  viewed:    { icon: Eye,           color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',     label: 'Viewed'    },
  consented: { icon: CheckCircle,   color: 'text-teal-400',   bg: 'bg-teal-500/10 border-teal-500/20',     label: 'Consented' },
  signed:    { icon: CheckCircle,   color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20',   label: 'Signed'    },
  declined:  { icon: XCircle,       color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20',       label: 'Declined'  },
  cancelled: { icon: XCircle,       color: 'text-gray-400',   bg: 'bg-gray-500/10 border-gray-500/20',     label: 'Cancelled' },
  expired:   { icon: AlertCircle,   color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', label: 'Expired'   },
};

export const DocumentsPage = () => {
  const [tab, setTab] = useState('templates');
  const [templates, setTemplates] = useState([]);
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({ name: '', category: 'general', description: '', file: null });
  const token = localStorage.getItem('token');

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [tRes, rRes, sRes] = await Promise.all([
        axios.get(`${API}/api/esign/templates`, { headers }),
        axios.get(`${API}/api/esign/requests`, { headers }),
        axios.get(`${API}/api/esign/stats`, { headers }),
      ]);
      setTemplates(Array.isArray(tRes.data) ? tRes.data : []);
      setRequests(Array.isArray(rRes.data) ? rRes.data : []);
      setStats(sRes.data);
    } catch (e) {
      toast.error('Failed to load documents');
    } finally { setLoading(false); }
  };

  const handleUpload = async () => {
    if (!uploadForm.file || !uploadForm.name) { toast.error('Please provide a name and select a PDF file'); return; }
    setUploading(true);
    const fd = new FormData();
    fd.append('file', uploadForm.file);
    fd.append('name', uploadForm.name);
    fd.append('category', uploadForm.category);
    fd.append('description', uploadForm.description);
    try {
      await axios.post(`${API}/api/esign/templates/upload`, fd, { headers: { ...headers, 'Content-Type': 'multipart/form-data' } });
      toast.success('Template uploaded! Now place signature fields.');
      setShowUploadModal(false);
      setUploadForm({ name: '', category: 'general', description: '', file: null });
      loadAll();
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this template and all its data?')) return;
    try {
      await axios.delete(`${API}/api/esign/templates/${id}`, { headers });
      toast.success('Template deleted');
      loadAll();
    } catch { toast.error('Delete failed'); }
  };

  const handleCancelRequest = async (id) => {
    try {
      await axios.delete(`${API}/api/esign/requests/${id}`, { headers });
      toast.success('Request cancelled');
      loadAll();
    } catch { toast.error('Failed to cancel'); }
  };

  const copyLink = (url) => {
    navigator.clipboard.writeText(url);
    toast.success('Signing link copied!');
  };

  const filteredTemplates = templates.filter(t =>
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.category?.toLowerCase().includes(search.toLowerCase())
  );
  const filteredRequests = requests.filter(r =>
    r.signer_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.signer_email?.toLowerCase().includes(search.toLowerCase()) ||
    r.template_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-white">eSign Documents</h1>
          <p className="text-white/50 text-sm mt-0.5">Manage templates and track signing requests</p>
        </div>
        <Button onClick={() => setShowUploadModal(true)} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold gap-2">
          <Upload className="w-4 h-4" /> Upload Template
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Templates',  value: stats.total_templates, color: 'text-blue-400',   icon: FileText },
            { label: 'Total Sent', value: stats.total_requests,  color: 'text-white',       icon: Send },
            { label: 'Pending',    value: stats.pending,         color: 'text-yellow-400',  icon: Clock },
            { label: 'Signed',     value: stats.signed,          color: 'text-green-400',   icon: CheckCircle },
            { label: 'Declined',   value: stats.declined,        color: 'text-red-400',     icon: XCircle },
          ].map(s => (
            <Card key={s.label} className="bg-white/5 border-white/10">
              <CardContent className="p-4 flex items-center gap-3">
                <s.icon className={`w-7 h-7 ${s.color}`} />
                <div>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value ?? 0}</p>
                  <p className="text-white/40 text-xs">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tab Bar */}
      <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 w-fit border border-white/10">
        {[['templates', 'Templates', FileText], ['requests', 'Signing Requests', PenLine]].map(([t, label, Icon]) => (
          <button key={t} onClick={() => setTab(t)} className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-amber-500 text-black' : 'text-white/60 hover:text-white'}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="w-8 h-8 animate-spin text-amber-400" /></div>
      ) : tab === 'templates' ? (
        /* ── Templates Tab ── */
        <div>
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-16 bg-white/5 rounded-xl border border-white/10">
              <FileText className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/50 mb-4">No templates yet. Upload your first PDF document.</p>
              <Button onClick={() => setShowUploadModal(true)} className="bg-amber-500 text-black"><Upload className="w-4 h-4 mr-2" /> Upload PDF</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredTemplates.map(t => (
                <Card key={t.id} className="bg-white/5 border-white/10 hover:border-amber-400/30 transition-colors">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0 mr-2">
                        <h3 className="text-white font-semibold text-sm truncate">{t.name}</h3>
                        <p className="text-white/40 text-xs mt-0.5">{t.fields?.length || 0} fields placed</p>
                      </div>
                      <Badge className={`${CATEGORY_COLORS[t.category] || CATEGORY_COLORS.general} border text-[10px] shrink-0 capitalize`}>{t.category}</Badge>
                    </div>
                    {t.description && <p className="text-white/50 text-xs mb-3 line-clamp-2">{t.description}</p>}
                    <p className="text-white/30 text-[10px] mb-4">Uploaded {new Date(t.created_at).toLocaleDateString()}</p>
                    <div className="flex gap-2 flex-wrap">
                      <Link to={`/documents/editor/${t.id}`}>
                        <Button size="sm" variant="outline" className="border-amber-400/40 text-amber-400 hover:bg-amber-400/10 text-xs h-7">
                          <PenLine className="w-3 h-3 mr-1" /> Edit Fields
                        </Button>
                      </Link>
                      <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black text-xs h-7" onClick={() => { setSelectedTemplate(t); setShowSendModal(true); }}>
                        <Send className="w-3 h-3 mr-1" /> Send
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-400/60 hover:text-red-400 hover:bg-red-400/10 text-xs h-7 ml-auto" onClick={() => handleDelete(t.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ── Requests Tab ── */
        <div className="space-y-3">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-16 bg-white/5 rounded-xl border border-white/10">
              <Users className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/50">No signing requests yet. Send a document to get started.</p>
            </div>
          ) : (
            filteredRequests.map(r => {
              const sc = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
              return (
                <div key={r.id} className={`flex items-center gap-4 p-4 rounded-xl border ${sc.bg} transition-colors`}>
                  <sc.icon className={`w-5 h-5 ${sc.color} shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-medium text-sm">{r.signer_name}</p>
                      <span className="text-white/40 text-xs">{r.signer_email}</span>
                    </div>
                    <p className="text-white/50 text-xs mt-0.5">{r.template_name} · Sent {new Date(r.created_at).toLocaleDateString()}</p>
                    {r.signed_at && <p className="text-green-400 text-xs mt-0.5">Signed {new Date(r.signed_at).toLocaleString()}</p>}
                    {r.decline_reason && <p className="text-red-400/80 text-xs mt-0.5">Declined: {r.decline_reason}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={`${sc.bg} ${sc.color} border text-xs`}>{sc.label}</Badge>
                    {r.sign_url && r.status !== 'signed' && r.status !== 'declined' && (
                      <button onClick={() => copyLink(r.sign_url)} className="text-white/40 hover:text-white transition-colors" title="Copy link">
                        <Copy className="w-4 h-4" />
                      </button>
                    )}
                    {r.signed_pdf_url && (
                      <a href={`${API}${r.signed_pdf_url}`} target="_blank" rel="noreferrer" className="text-green-400 hover:text-green-300" title="Download signed PDF">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    {r.status === 'pending' && (
                      <button onClick={() => handleCancelRequest(r.id)} className="text-red-400/50 hover:text-red-400 transition-colors" title="Cancel">
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Upload Modal ── */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d1f3c] border border-amber-400/20 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">Upload PDF Template</h3>
              <button onClick={() => setShowUploadModal(false)}><XCircle className="w-5 h-5 text-white/40" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-white/60 text-xs mb-1 block">Document Name *</label>
                <Input value={uploadForm.name} onChange={e => setUploadForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Buyer Representation Agreement" className="bg-white/10 border-white/20 text-white placeholder:text-white/30" />
              </div>
              <div>
                <label className="text-white/60 text-xs mb-1 block">Category</label>
                <select value={uploadForm.category} onChange={e => setUploadForm(p => ({ ...p, category: e.target.value }))} className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50">
                  {['general','buyer','seller','lease','disclosure'].map(c => <option key={c} value={c} className="bg-[#0d1f3c] capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="text-white/60 text-xs mb-1 block">Description (optional)</label>
                <Input value={uploadForm.description} onChange={e => setUploadForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description..." className="bg-white/10 border-white/20 text-white placeholder:text-white/30" />
              </div>
              <div>
                <label className="text-white/60 text-xs mb-1 block">PDF File *</label>
                <div className="border-2 border-dashed border-white/20 rounded-xl p-4 text-center cursor-pointer hover:border-amber-400/40 transition-colors" onClick={() => document.getElementById('pdf-upload').click()}>
                  {uploadForm.file ? (
                    <p className="text-amber-400 text-sm font-medium">{uploadForm.file.name}</p>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-white/30 mx-auto mb-2" />
                      <p className="text-white/50 text-sm">Click to select PDF</p>
                    </>
                  )}
                  <input id="pdf-upload" type="file" accept=".pdf" className="hidden" onChange={e => setUploadForm(p => ({ ...p, file: e.target.files[0] }))} />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button onClick={handleUpload} disabled={uploading} className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />} Upload
              </Button>
              <Button variant="outline" onClick={() => setShowUploadModal(false)} className="border-white/20 text-white">Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {showSendModal && selectedTemplate && (
        <SendForSignatureModal
          template={selectedTemplate}
          onClose={() => { setShowSendModal(false); setSelectedTemplate(null); }}
          onSent={() => { loadAll(); setShowSendModal(false); setSelectedTemplate(null); }}
        />
      )}
    </div>
  );
};

export default DocumentsPage;
