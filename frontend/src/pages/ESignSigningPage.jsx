import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import {
  ChevronLeft, ChevronRight, Check, X, PenLine, Type,
  Loader2, AlertCircle, ZoomIn, ZoomOut, Send, Home
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';
import './ESignFormFiller.css';

const API = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

/* ── Font styles for typed signatures ─────────────────────────────────────── */
const SIG_FONTS = [
  { label: 'Script',  style: { fontFamily: "'Dancing Script', cursive",    fontSize: 22, color: '#1a3a6b' } },
  { label: 'Classic', style: { fontFamily: "'Great Vibes', cursive",        fontSize: 22, color: '#1a3a6b' } },
  { label: 'Modern',  style: { fontFamily: "'Pacifico', cursive",           fontSize: 18, color: '#1a3a6b' } },
];

/* ── Signature Modal ────────────────────────────────────────────────────────  */
const SignaturePad = ({ field, signerName, onApply, onClose }) => {
  const [mode, setMode] = useState('draw');
  const [typed, setTyped] = useState(signerName || '');
  const [font, setFont] = useState(0);
  const canvasRef = useRef(null);

  const apply = () => {
    if (mode === 'draw') {
      if (!canvasRef.current || canvasRef.current.isEmpty()) {
        toast.error('Please draw your signature first');
        return;
      }
      onApply({ mode: 'draw', dataUrl: canvasRef.current.toDataURL('image/png'), typed: null, fontStyle: null });
    } else {
      if (!typed.trim()) { toast.error('Please type your name'); return; }
      onApply({ mode: 'type', dataUrl: null, typed: typed.trim(), fontStyle: SIG_FONTS[font] });
    }
  };

  return (
    <div className="esf-modal-overlay" onClick={onClose}>
      <div className="esf-sig-modal" onClick={e => e.stopPropagation()}>
        <div className="esf-sig-modal-header">
          <div>
            <h3>{field.label || (field.type === 'initials' ? 'Your Initials' : 'Your Signature')}</h3>
            <p>{field.type === 'initials' ? 'Sign your initials' : 'Sign exactly as your name appears'}</p>
          </div>
          <button onClick={onClose} className="esf-close-btn"><X size={18}/></button>
        </div>

        {/* Mode Toggle */}
        <div className="esf-mode-toggle">
          <button className={`esf-mode-btn ${mode==='draw' ? 'active':''}`} onClick={()=>setMode('draw')}>
            <PenLine size={14}/> Draw
          </button>
          <button className={`esf-mode-btn ${mode==='type' ? 'active':''}`} onClick={()=>setMode('type')}>
            <Type size={14}/> Type
          </button>
        </div>

        {mode === 'draw' ? (
          <div className="esf-sig-draw-area">
            <div className="esf-sig-canvas-wrap">
              <SignatureCanvas
                ref={canvasRef}
                penColor="#1a3a6b"
                canvasProps={{ width: 440, height: 130, className: 'esf-sig-canvas' }}
                backgroundColor="white"
              />
              <div className="esf-sig-guideline">Sign above this line</div>
            </div>
            <button className="esf-clear-link" onClick={() => canvasRef.current?.clear()}>Clear</button>
          </div>
        ) : (
          <div className="esf-sig-type-area">
            <input
              className="esf-sig-type-input"
              value={typed}
              onChange={e => setTyped(e.target.value)}
              placeholder="Type your full name..."
              autoFocus
            />
            <div className="esf-font-options">
              {SIG_FONTS.map((f, idx) => (
                <button
                  key={idx}
                  className={`esf-font-opt ${font===idx?'selected':''}`}
                  style={f.style}
                  onClick={() => setFont(idx)}
                >
                  {typed || 'Your Signature'}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="esf-sig-actions">
          <button className="esf-apply-btn" onClick={apply}>
            <Check size={16}/> Apply {field.type === 'initials' ? 'Initials' : 'Signature'}
          </button>
          <button className="esf-cancel-btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN FORM FILLER PAGE
══════════════════════════════════════════════════════════════════════════════ */
export const ESignSigningPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages]              = useState(10);
  const [scale, setScale]         = useState(1.0);
  const [fieldValues, setFieldValues] = useState({});
  const [sigData, setSigData]     = useState(null);   // base64 draw sig
  const [typedSig, setTypedSig]   = useState('');
  const [sigFontStyle, setSigFontStyle] = useState(SIG_FONTS[0].style);
  const [activeSignField, setActiveSignField] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [pageImgCache, setPageImgCache] = useState({});
  const [pageLoading, setPageLoading] = useState(false);

  // Load Google Fonts for typed sigs
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&family=Great+Vibes&family=Pacifico&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  // Fetch signing data
  useEffect(() => {
    axios.get(`${API}/api/esign/sign/${token}`)
      .then(res => {
        if (!['active','consented'].includes(res.data.status)) {
          navigate(`/sign/${token}`, { replace: true });
          return;
        }
        setData(res.data);
        // Pre-fill known fields
        const pre = {};
        (res.data.fields || []).forEach(f => {
          if (f.prefill_from === 'signer_name')  pre[f.id] = res.data.signer_name || '';
          if (f.prefill_from === 'signer_email') pre[f.id] = res.data.signer_email || '';
          if (f.prefill_from === 'today') pre[f.id] = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
        });
        setFieldValues(pre);
        if (res.data.signer_name) setTypedSig(res.data.signer_name);
      })
      .catch(() => setError('Could not load document. Please check your link.'))
      .finally(() => setLoading(false));
  }, [token, navigate]);

  // Preload adjacent pages
  useEffect(() => {
    if (!data?.template_id) return;
    [currentPage - 1, currentPage, currentPage + 1].forEach(pg => {
      if (pg < 1 || pg > totalPages || pageImgCache[pg]) return;
      const url = `${API}/api/esign/templates/${data.template_id}/page/${pg}/image?scale=2&v=${Date.now()}`;
      const img = new window.Image();
      img.onload = () => setPageImgCache(c => ({ ...c, [pg]: url }));
      img.src = url;
    });
  }, [currentPage, data, totalPages, pageImgCache]);

  const currentPageImg = pageImgCache[currentPage];
  const fieldsOnPage   = (data?.fields || []).filter(f => f.page === currentPage);
  const allFields      = data?.fields || [];
  const signerName     = data?.signer_name || '';

  // ── Field value helpers ───────────────────────────────────────────────────
  const setValue = (id, val) => setFieldValues(p => ({ ...p, [id]: val }));
  const hasValue = (f) => {
    if (f.type === 'signature' || f.type === 'initials') return !!(sigData || typedSig.trim());
    if (f.type === 'checkbox') return !!fieldValues[f.id];
    return !!(fieldValues[f.id]?.toString().trim());
  };

  const requiredComplete = allFields.filter(f => f.required).every(hasValue);

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const missing = allFields.filter(f => f.required && !hasValue(f));
    if (missing.length > 0) {
      toast.error(`Please fill in: ${missing[0].label || missing[0].type} (Page ${missing[0].page})`);
      setCurrentPage(missing[0].page);
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/api/esign/sign/${token}/submit`, {
        field_values: fieldValues,
        signature_data: sigData,
        typed_signature: typedSig || null,
      });
      navigate(`/sign/${token}/complete`);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Submission failed. Please try again.');
    } finally { setSubmitting(false); }
  };

  // ── Render a single field overlay on the page ────────────────────────────
  const renderField = (field) => {
    const { id, type, x, y, width, height, label, required, prefill_from } = field;
    const val = fieldValues[id] || '';
    const filled = hasValue(field);
    const isAutoFilled = prefill_from && val;

    const style = {
      position:  'absolute',
      left:      `${x}%`,
      top:       `${y}%`,
      width:     `${width}%`,
      height:    `${height}%`,
      zIndex:    5,
    };

    if (type === 'checkbox') {
      return (
        <div key={id} style={style} className="esf-checkbox-wrap">
          <div
            className={`esf-checkbox ${val ? 'checked' : ''} ${required ? 'required' : ''}`}
            onClick={() => setValue(id, !val)}
            title={label}
          >
            {val && <Check size={10} strokeWidth={3}/>}
          </div>
        </div>
      );
    }

    if (type === 'signature' || type === 'initials') {
      const hasSig = sigData || typedSig.trim();
      return (
        <div
          key={id}
          style={style}
          className={`esf-sig-field ${hasSig ? 'signed' : 'empty'} ${required ? 'required' : ''}`}
          onClick={() => setActiveSignField(field)}
          title={`Click to ${hasSig ? 'change' : 'add'} ${type}`}
        >
          {hasSig ? (
            sigData ? (
              <img src={sigData} alt="signature" className="esf-sig-img"/>
            ) : (
              <span className="esf-typed-sig" style={sigFontStyle}>{typedSig}</span>
            )
          ) : (
            <span className="esf-sig-placeholder">
              <PenLine size={12}/> {type === 'initials' ? 'Initials' : 'Sign here'}
            </span>
          )}
        </div>
      );
    }

    // Text / date / fullname / email
    const inputType = type === 'date' ? 'text'
                    : type === 'email' ? 'email'
                    : 'text';

    return (
      <div key={id} style={style} className={`esf-text-field-wrap ${required && !filled ? 'required' : ''}`}>
        <input
          type={inputType}
          value={val}
          onChange={e => setValue(id, e.target.value)}
          placeholder={label || ''}
          className={`esf-text-input ${isAutoFilled ? 'autofilled' : ''} ${filled ? 'filled' : ''}`}
          title={label}
        />
      </div>
    );
  };

  // ── Loading / Error states ───────────────────────────────────────────────
  if (loading) return (
    <div className="esf-loading-screen">
      <Loader2 className="esf-spinner" /> Loading document…
    </div>
  );
  if (error) return (
    <div className="esf-error-screen">
      <AlertCircle size={36} color="#ef4444"/>
      <p>{error}</p>
    </div>
  );

  // ── Page thumbnails ──────────────────────────────────────────────────────
  const completedPages = Array.from({ length: totalPages }, (_, i) => i + 1).map(pg => {
    const pgFields = allFields.filter(f => f.page === pg);
    const done = pgFields.filter(f => f.required).every(hasValue);
    return { pg, done, count: pgFields.length };
  });

  return (
    <div className="esf-root">
      {/* ── Top Bar ─────────────────────────────────────────────────────── */}
      <header className="esf-header">
        <div className="esf-header-left">
          <img src="/images/hidden-haven-logo-full.png" alt="HHR" className="esf-logo"
               onError={e=>e.target.style.display='none'}/>
          <div className="esf-doc-title">
            <span className="esf-doc-name">{data?.template_name || 'Listing Agreement'}</span>
            <span className="esf-doc-signer">For {data?.signer_name || 'New Client'}</span>
          </div>
        </div>
        <div className="esf-header-center">
          <button onClick={()=>setScale(s=>Math.max(0.5,s-0.1))} className="esf-zoom-btn" title="Zoom out">
            <ZoomOut size={15}/>
          </button>
          <span className="esf-zoom-label">{Math.round(scale*100)}%</span>
          <button onClick={()=>setScale(s=>Math.min(2,s+0.1))} className="esf-zoom-btn" title="Zoom in">
            <ZoomIn size={15}/>
          </button>
        </div>
        <div className="esf-header-right">
          <span className={`esf-progress-badge ${requiredComplete?'complete':''}`}>
            {allFields.filter(f=>f.required&&hasValue(f)).length} / {allFields.filter(f=>f.required).length} required
          </span>
          <button
            className={`esf-submit-btn ${requiredComplete?'ready':''}`}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? <Loader2 size={15} className="esf-spinner"/> : <Send size={15}/>}
            Sign & Submit
          </button>
        </div>
      </header>

      <div className="esf-body">
        {/* ── Page Sidebar ──────────────────────────────────────────────── */}
        <aside className="esf-sidebar">
          <div className="esf-sidebar-label">Pages</div>
          <div className="esf-page-thumbnails">
            {completedPages.map(({ pg, done, count }) => (
              <button
                key={pg}
                className={`esf-thumb-btn ${pg===currentPage?'active':''} ${done&&count>0?'done':''}`}
                onClick={() => setCurrentPage(pg)}
              >
                <span className="esf-thumb-num">{pg}</span>
                {done && count > 0 && <Check size={10} className="esf-thumb-check"/>}
              </button>
            ))}
          </div>
        </aside>

        {/* ── Document Canvas ───────────────────────────────────────────── */}
        <main className="esf-canvas-area">
          <div className="esf-paper-container" style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
            <div className="esf-paper">
              {/* Page image */}
              {!currentPageImg ? (
                <div className="esf-page-loading">
                  <Loader2 className="esf-spinner" size={28}/> Loading page {currentPage}…
                </div>
              ) : (
                <img
                  src={currentPageImg}
                  alt={`Page ${currentPage}`}
                  className="esf-page-img"
                  draggable={false}
                />
              )}

              {/* Field overlays */}
              {currentPageImg && fieldsOnPage.map(renderField)}
            </div>
          </div>

          {/* Page navigation */}
          <div className="esf-page-nav">
            <button
              className="esf-nav-btn"
              onClick={() => setCurrentPage(p => Math.max(1, p-1))}
              disabled={currentPage <= 1}
            >
              <ChevronLeft size={18}/> Prev
            </button>
            <span className="esf-page-indicator">
              Page <strong>{currentPage}</strong> of {totalPages}
            </span>
            <button
              className="esf-nav-btn"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))}
              disabled={currentPage >= totalPages}
            >
              Next <ChevronRight size={18}/>
            </button>
          </div>
        </main>

        {/* ── Field Checklist Sidebar ───────────────────────────────────── */}
        <aside className="esf-checklist">
          <div className="esf-checklist-label">Required Fields</div>
          <div className="esf-checklist-items">
            {allFields.filter(f=>f.required).map(f => {
              const done = hasValue(f);
              return (
                <button
                  key={f.id}
                  className={`esf-checklist-item ${done?'done':''}`}
                  onClick={() => {
                    setCurrentPage(f.page);
                    if (f.type === 'signature' || f.type === 'initials') setActiveSignField(f);
                  }}
                >
                  <span className={`esf-check-icon ${done?'filled':''}`}>
                    {done ? <Check size={11}/> : null}
                  </span>
                  <span className="esf-check-label">{f.label || f.type}</span>
                  <span className="esf-check-page">p.{f.page}</span>
                </button>
              );
            })}
          </div>
          <div className="esf-checklist-submit">
            <button
              className={`esf-checklist-submit-btn ${requiredComplete?'ready':''}`}
              onClick={handleSubmit}
              disabled={submitting || !requiredComplete}
            >
              {submitting ? <Loader2 size={14} className="esf-spinner"/> : <Check size={14}/>}
              Complete & Sign
            </button>
          </div>
        </aside>
      </div>

      {/* ── Signature Modal ────────────────────────────────────────────────── */}
      {activeSignField && (
        <SignaturePad
          field={activeSignField}
          signerName={signerName}
          onClose={() => setActiveSignField(null)}
          onApply={({ mode, dataUrl, typed, fontStyle }) => {
            if (mode === 'draw') {
              setSigData(dataUrl);
              setTypedSig('');
            } else {
              setTypedSig(typed);
              setSigData(null);
              setSigFontStyle(fontStyle.style);
            }
            // Mark all sig/initials fields as "filled"
            const updates = {};
            allFields.filter(f => f.type === 'signature' || f.type === 'initials')
                     .forEach(f => { updates[f.id] = true; });
            setFieldValues(p => ({ ...p, ...updates }));
            setActiveSignField(null);
            toast.success('Signature applied to all signature fields!');
          }}
        />
      )}
    </div>
  );
};

export default ESignSigningPage;
