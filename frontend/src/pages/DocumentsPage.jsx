import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Upload, Send, Eye, Trash2, Clock, CheckCircle,
  XCircle, AlertCircle, Copy, ExternalLink, Search,
  PenLine, Users, Loader2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import axios from 'axios';
import { SendForSignatureModal } from '../components/SendForSignatureModal';

const API = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

const CATEGORY_COLORS = {
  general:    'bg-blue-100   text-blue-700   border-blue-300   dark:bg-blue-900/30   dark:text-blue-300   dark:border-blue-700',
  buyer:      'bg-green-100  text-green-700  border-green-300  dark:bg-green-900/30  dark:text-green-300  dark:border-green-700',
  seller:     'bg-amber-100  text-amber-700  border-amber-300  dark:bg-amber-900/30  dark:text-amber-300  dark:border-amber-700',
  lease:      'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700',
  disclosure: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700',
};

const STATUS_CONFIG = {
  pending:   { icon: Clock,       color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800', label: 'Pending'   },
  viewed:    { icon: Eye,         color: 'text-blue-600',   bg: 'bg-blue-50   border-blue-200   dark:bg-blue-900/20   dark:border-blue-800',   label: 'Viewed'    },
  consented: { icon: CheckCircle, color: 'text-teal-600',   bg: 'bg-teal-50   border-teal-200   dark:bg-teal-900/20   dark:border-teal-800',   label: 'Consented' },
  signed:    { icon: CheckCircle, color: 'text-green-600',  bg: 'bg-green-50  border-green-200  dark:bg-green-900/20  dark:border-green-800',  label: 'Signed'    },
  declined:  { icon: XCircle,     color: 'text-red-600',    bg: 'bg-red-50    border-red-200    dark:bg-red-900/20    dark:border-red-800',    label: 'Declined'  },
  cancelled: { icon: XCircle,     color: 'text-gray-500',   bg: 'bg-gray-50   border-gray-200   dark:bg-gray-900/20   dark:border-gray-700',   label: 'Cancelled' },
  expired:   { icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800', label: 'Expired'   },
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
    } catch { toast.error('Failed to load documents'); }
    finally { setLoading(false); }
  };

  const handleUpload = async () => {
    if (!uploadForm.file || !uploadForm.name) { toast.error('Please provide a name and select a PDF'); return; }
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
    if (!confirm('Delete this template?')) return;
    try { await axios.delete(`${API}/api/esign/templates/${id}`, { headers }); toast.success('Deleted'); loadAll(); }
    catch { toast.error('Delete failed'); }
  };

  const handleCancelRequest = async (id) => {
    try { await axios.delete(`${API}/api/esign/requests/${id}`, { headers }); toast.success('Cancelled'); loadAll(); }
    catch { toast.error('Failed to cancel'); }
  };

  const copyLink = (url) => { navigator.clipboard.writeText(url); toast.success('Signing link copied!'); };

  const filteredTemplates = templates.filter(t =>
    t.name?.toLowerCase().includes(search.toLowerCase()) || t.category?.toLowerCase().includes(search.toLowerCase())
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
          <h1 className="text-2xl font-serif text-foreground">eSign Documents</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage templates and track signing requests</p>
        </div>
        <Button onClick={() => setShowUploadModal(true)} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold gap-2">
          <Upload className="w-4 h-4" /> Upload Template
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Templates',  value: stats.total_templates, color: 'text-blue-600',   icon: FileText },
            { label: 'Total Sent', value: stats.total_requests,  color: 'text-foreground',  icon: Send },
            { label: 'Pending',    value: stats.pending,         color: 'text-yellow-600',  icon: Clock },
            { label: 'Signed',     value: stats.signed,          color: 'text-green-600',   icon: CheckCircle },
            { label: 'Declined',   value: stats.declined,        color: 'text-red-600',     icon: XCircle },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <s.icon className={`w-7 h-7 ${s.color}`} />
                <div>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value ?? 0}</p>
                  <p className="text-muted-foreground text-xs">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tab Bar */}
      <div className="flex items-center gap-1 bg-muted rounded-xl p-1 w-fit border border-border">
        {[['templates', 'Templates', FileText], ['requests', 'Signing Requests', PenLine]].map(([t, label, Icon]) => (
          <button
            key={t} onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t ? 'bg-amber-500 text-black shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="pl-9" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>
      ) : tab === 'templates' ? (
        <div>
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-16 bg-muted/30 rounded-xl border border-border">
              <FileText className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">No templates yet. Upload your first PDF document.</p>
              <Button onClick={() => setShowUploadModal(true)} className="bg-amber-500 text-black">
                <Upload className="w-4 h-4 mr-2" /> Upload PDF
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredTemplates.map(t => (
                <Card key={t.id} className="hover:border-amber-500/40 hover:shadow-md transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0 mr-2">
                        <h3 className="text-foreground font-semibold text-sm truncate">{t.name}</h3>
                        <p className="text-muted-foreground text-xs mt-0.5">{t.fields?.length || 0} fields placed</p>
                      </div>
                      <Badge className={`${CATEGORY_COLORS[t.category] || CATEGORY_COLORS.general} border text-[10px] shrink-0 capitalize`}>
                        {t.category}
                      </Badge>
                    </div>
                    {t.description && <p className="text-muted-foreground text-xs mb-3 line-clamp-2">{t.description}</p>}
                    <p className="text-muted-foreground/60 text-[10px] mb-4">Uploaded {new Date(t.created_at).toLocaleDateString()}</p>
                    <div className="flex gap-2 flex-wrap">
                      <Link to={`/documents/editor/${t.id}`}>
                        <Button size="sm" variant="outline" className="text-xs h-7 border-amber-500/50 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20">
                          <PenLine className="w-3 h-3 mr-1" /> Edit Fields
                        </Button>
                      </Link>
                      <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black text-xs h-7"
                        onClick={() => { setSelectedTemplate(t); setShowSendModal(true); }}>
                        <Send className="w-3 h-3 mr-1" /> Send
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-500/60 hover:text-red-600 hover:bg-red-50 text-xs h-7 ml-auto dark:hover:bg-red-900/20"
                        onClick={() => handleDelete(t.id)}>
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
            <div className="text-center py-16 bg-muted/30 rounded-xl border border-border">
              <Users className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">No signing requests yet. Send a document to get started.</p>
            </div>
          ) : (
            filteredRequests.map(r => {
              const sc = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
              return (
                <div key={r.id} className={`flex items-center gap-4 p-4 rounded-xl border ${sc.bg} transition-colors`}>
                  <sc.icon className={`w-5 h-5 ${sc.color} shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-foreground font-medium text-sm">{r.signer_name}</p>
                      <span className="text-muted-foreground text-xs">{r.signer_email}</span>
                    </div>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      {r.template_name} · Sent {new Date(r.created_at).toLocaleDateString()}
                    </p>
                    {r.signed_at && <p className="text-green-600 text-xs mt-0.5">Signed {new Date(r.signed_at).toLocaleString()}</p>}
                    {r.decline_reason && <p className="text-red-600 text-xs mt-0.5">Declined: {r.decline_reason}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={`${sc.bg} ${sc.color} border text-xs font-medium`}>{sc.label}</Badge>
                    {r.sign_url && !['signed','declined'].includes(r.status) && (
                      <button onClick={() => copyLink(r.sign_url)} className="text-muted-foreground hover:text-foreground transition-colors" title="Copy link">
                        <Copy className="w-4 h-4" />
                      </button>
                    )}
                    {r.signed_pdf_url && (
                      <a href={`${API}${r.signed_pdf_url}`} target="_blank" rel="noreferrer" className="text-green-600 hover:text-green-700" title="Download signed PDF">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    {r.status === 'pending' && (
                      <button onClick={() => handleCancelRequest(r.id)} className="text-red-400 hover:text-red-600 transition-colors" title="Cancel">
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-foreground font-bold text-lg">Upload PDF Template</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-muted-foreground hover:text-foreground">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-muted-foreground text-xs mb-1.5 block font-medium">Document Name *</label>
                <Input
                  value={uploadForm.name}
                  onChange={e => setUploadForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Buyer Representation Agreement"
                />
              </div>
              <div>
                <label className="text-muted-foreground text-xs mb-1.5 block font-medium">Category</label>
                <select
                  value={uploadForm.category}
                  onChange={e => setUploadForm(p => ({ ...p, category: e.target.value }))}
                  className="w-full bg-background border border-input rounded-md px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {['general','buyer','seller','lease','disclosure'].map(c => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-muted-foreground text-xs mb-1.5 block font-medium">Description (optional)</label>
                <Input
                  value={uploadForm.description}
                  onChange={e => setUploadForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Brief description..."
                />
              </div>
              <div>
                <label className="text-muted-foreground text-xs mb-1.5 block font-medium">PDF File *</label>
                <div
                  className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-amber-500/50 hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-colors"
                  onClick={() => document.getElementById('pdf-upload').click()}
                >
                  {uploadForm.file ? (
                    <p className="text-amber-600 text-sm font-semibold">{uploadForm.file.name}</p>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-muted-foreground text-sm">Click to select PDF</p>
                    </>
                  )}
                  <input id="pdf-upload" type="file" accept=".pdf" className="hidden"
                    onChange={e => setUploadForm(p => ({ ...p, file: e.target.files[0] }))} />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button onClick={handleUpload} disabled={uploading} className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />} Upload
              </Button>
              <Button variant="outline" onClick={() => setShowUploadModal(false)}>Cancel</Button>
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
