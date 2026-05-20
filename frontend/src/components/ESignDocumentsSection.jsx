/**
 * ESignDocumentsSection
 * Reusable component that shows all eSign requests linked to a contact or lead,
 * with View, Print, and Send for Signature actions.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, ExternalLink, Printer, Send, Clock, CheckCircle,
  XCircle, Eye, Loader2, PenLine, AlertCircle, Copy
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import axios from 'axios';
import { SendForSignatureModal } from './SendForSignatureModal';

const API = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

const STATUS = {
  pending:   { icon: Clock,         color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200',  label: 'Awaiting' },
  viewed:    { icon: Eye,           color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200',      label: 'Viewed'   },
  consented: { icon: PenLine,       color: 'text-teal-600',   bg: 'bg-teal-50 border-teal-200',      label: 'Signing'  },
  signed:    { icon: CheckCircle,   color: 'text-green-600',  bg: 'bg-green-50 border-green-200',    label: 'Signed'   },
  declined:  { icon: XCircle,       color: 'text-red-600',    bg: 'bg-red-50 border-red-200',        label: 'Declined' },
  cancelled: { icon: XCircle,       color: 'text-gray-500',   bg: 'bg-gray-50 border-gray-200',      label: 'Cancelled'},
};

export const ESignDocumentsSection = ({
  contactId,   // pass one of these
  leadId,
  contact,     // for pre-filling the send modal
  lead,
}) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSendModal, setShowSendModal] = useState(false);
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = contactId ? `contact_id=${contactId}` : `lead_id=${leadId}`;
      const res = await axios.get(`${API}/api/esign/requests?${params}`, { headers });
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch {
      // silently fail — section just shows empty
    } finally { setLoading(false); }
  }, [contactId, leadId]);

  useEffect(() => { load(); }, [load]);

  const copyLink = (url) => { navigator.clipboard.writeText(url); toast.success('Signing link copied!'); };

  const openPdf = (path) => window.open(`${API}${path}`, '_blank', 'noopener,noreferrer');
  const printPdf = (path) => {
    const url = `${API}${path}`;
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (win) win.addEventListener('load', () => { try { win.print(); } catch {} });
  };

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PenLine className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-semibold text-foreground">Documents</span>
          {requests.length > 0 && (
            <Badge variant="secondary" className="text-xs">{requests.length}</Badge>
          )}
        </div>
        <Button
          size="sm"
          onClick={() => setShowSendModal(true)}
          className="h-7 text-xs bg-amber-500 hover:bg-amber-600 text-black gap-1.5"
          data-testid="esign-send-btn"
        >
          <Send className="w-3 h-3" /> Send for Signature
        </Button>
      </div>

      {/* Document list */}
      {loading ? (
        <div className="flex items-center gap-2 py-2 text-muted-foreground text-sm">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading documents…
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-5 bg-muted/30 rounded-xl border border-dashed border-border">
          <FileText className="w-7 h-7 text-muted-foreground/40 mx-auto mb-1.5" />
          <p className="text-muted-foreground text-xs">No documents sent yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map(r => {
            const sc = STATUS[r.status] || STATUS.pending;
            const isSigned = r.status === 'signed';
            return (
              <div key={r.id} className={`p-3 rounded-xl border text-sm ${sc.bg} flex items-start gap-3`}>
                <sc.icon className={`w-4 h-4 mt-0.5 shrink-0 ${sc.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-foreground text-xs truncate">{r.template_name}</p>
                    <Badge className={`${sc.bg} ${sc.color} border text-[10px] py-0`}>{sc.label}</Badge>
                  </div>
                  <p className="text-muted-foreground text-[10px] mt-0.5">
                    Sent {new Date(r.created_at).toLocaleDateString()}
                    {r.signed_at && ` · Signed ${new Date(r.signed_at).toLocaleDateString()}`}
                  </p>
                  {r.decline_reason && (
                    <p className="text-red-600 text-[10px] mt-0.5">Reason: {r.decline_reason}</p>
                  )}
                </div>
                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {isSigned && r.signed_pdf_url && (
                    <>
                      <button
                        onClick={() => openPdf(r.signed_pdf_url)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 text-[11px] font-semibold transition-colors"
                        title="View signed document"
                      >
                        <ExternalLink className="w-3 h-3" /> View
                      </button>
                      <button
                        onClick={() => printPdf(r.signed_pdf_url)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 text-[11px] font-semibold transition-colors"
                        title="Print signed document"
                      >
                        <Printer className="w-3 h-3" /> Print
                      </button>
                    </>
                  )}
                  {!isSigned && r.sign_url && r.status !== 'declined' && r.status !== 'cancelled' && (
                    <button
                      onClick={() => copyLink(r.sign_url)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/80 hover:bg-white border border-gray-200 text-gray-600 text-[11px] font-semibold transition-colors"
                      title="Copy signing link"
                    >
                      <Copy className="w-3 h-3" /> Copy Link
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showSendModal && (
        <SendForSignatureModal
          template={null}
          contact={contact}
          lead={lead}
          noTemplate
          onClose={() => setShowSendModal(false)}
          onSent={() => { load(); setShowSendModal(false); }}
        />
      )}
    </div>
  );
};

export default ESignDocumentsSection;
