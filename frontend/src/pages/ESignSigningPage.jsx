import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import SignatureCanvas from 'react-signature-canvas';
import {
  Loader2, ChevronLeft, ChevronRight, PenLine, Type, X, Check,
  Download, ZoomIn, ZoomOut, AlertCircle
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import axios from 'axios';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const API = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

const FONT_STYLES = [
  { name: 'Signature', class: 'font-["Dancing_Script"]', style: { fontFamily: "'Dancing Script', cursive", fontSize: 28, color: '#1a3a6b' } },
  { name: 'Classic', class: '', style: { fontFamily: "'Great Vibes', cursive", fontSize: 28, color: '#1a3a6b' } },
  { name: 'Modern', class: '', style: { fontFamily: "'Pacifico', cursive", fontSize: 22, color: '#1a3a6b' } },
];

export const ESignSigningPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [fieldValues, setFieldValues] = useState({});
  const [sigMode, setSigMode] = useState('draw'); // draw | type
  const [typedSig, setTypedSig] = useState('');
  const [selectedFont, setSelectedFont] = useState(0);
  const [activeField, setActiveField] = useState(null);
  const [showSigPad, setShowSigPad] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const sigCanvasRef = useRef(null);
  const pdfContainerRef = useRef(null);

  useEffect(() => {
    // Load Google Fonts for typed signatures
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&family=Great+Vibes&family=Pacifico&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    axios.get(`${API}/api/esign/sign/${token}`)
      .then(res => {
        if (res.data.status !== 'active' && res.data.status !== 'consented') {
          navigate(`/sign/${token}`, { replace: true });
          return;
        }
        setData(res.data);
        // Pre-fill known fields
        const prefilled = {};
        res.data.fields?.forEach(f => {
          if (f.prefill_from === 'signer_name') prefilled[f.id] = res.data.signer_name || '';
          if (f.prefill_from === 'signer_email') prefilled[f.id] = res.data.signer_email || '';
          if (f.prefill_from === 'today') prefilled[f.id] = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        });
        setFieldValues(prefilled);
        if (res.data.signer_name) setTypedSig(res.data.signer_name);
      })
      .catch(() => setError('Unable to load document. Please check your link.'))
      .finally(() => setLoading(false));
  }, [token, navigate]);

  const fieldsOnPage = useCallback((page) =>
    (data?.fields || []).filter(f => f.page === page), [data]);

  const getSignatureData = () => {
    if (sigMode === 'draw') {
      if (sigCanvasRef.current && !sigCanvasRef.current.isEmpty()) {
        return sigCanvasRef.current.toDataURL('image/png');
      }
      return null;
    }
    return null; // typed sig handled separately
  };

  const validateFields = () => {
    const required = (data?.fields || []).filter(f => f.required);
    for (const f of required) {
      if (f.type === 'signature' || f.type === 'initials') {
        const hasDraw = sigMode === 'draw' && sigCanvasRef.current && !sigCanvasRef.current.isEmpty();
        const hasType = sigMode === 'type' && typedSig.trim().length > 0;
        if (!hasDraw && !hasType) return `Please sign the document (field: ${f.label || f.type})`;
      } else if (f.type === 'checkbox') {
        if (!fieldValues[f.id]) return `Please check: ${f.label || 'required checkbox'}`;
      } else {
        if (!fieldValues[f.id]) return `Please fill in: ${f.label || f.type}`;
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    const err = validateFields();
    if (err) { toast.error(err); return; }
    setSubmitting(true);
    try {
      const sig = getSignatureData();
      await axios.post(`${API}/api/esign/sign/${token}/submit`, {
        field_values: fieldValues,
        signature_data: sig,
        typed_signature: sigMode === 'type' ? typedSig : null,
      });
      navigate(`/sign/${token}/complete`);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to submit. Please try again.');
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="min-h-screen bg-[#0a1628] flex items-center justify-center"><Loader2 className="w-10 h-10 text-amber-400 animate-spin" /></div>;
  if (error) return <div className="min-h-screen bg-[#0a1628] flex items-center justify-center text-white text-center p-8"><AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" /><p>{error}</p></div>;

  const pageFields = fieldsOnPage(currentPage);

  return (
    <div className="min-h-screen bg-[#0a1628] flex flex-col">
      {/* Header */}
      <div className="bg-[#0d1f3c] border-b border-amber-400/20 px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-lg">
        <div className="flex items-center gap-3">
          <img src="/images/hidden-haven-logo-full.png" alt="HHR" className="h-9 object-contain" onError={e => e.target.style.display='none'} />
          <div>
            <p className="text-amber-400 font-semibold text-sm leading-none">Signing: {data?.template_name}</p>
            <p className="text-white/40 text-xs mt-0.5">For {data?.signer_name || 'New Client'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setScale(s => Math.max(0.6, s - 0.2))} className="w-8 h-8 rounded bg-white/10 text-white flex items-center justify-center hover:bg-white/20"><ZoomOut className="w-4 h-4" /></button>
          <span className="text-white/60 text-xs w-10 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(2.5, s + 0.2))} className="w-8 h-8 rounded bg-white/10 text-white flex items-center justify-center hover:bg-white/20"><ZoomIn className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: PDF Viewer */}
        <div className="flex-1 overflow-auto bg-[#0a1628] p-4" ref={pdfContainerRef}>
          <Document
            file={data?.pdf_url}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            loading={<div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-amber-400 animate-spin" /></div>}
            error={<div className="text-white/60 text-center py-20"><p>Could not load PDF preview.</p><p className="text-xs mt-2">The document will still be processed correctly when you submit.</p></div>}
          >
            <div className="relative inline-block">
              <Page
                pageNumber={currentPage}
                scale={scale}
                className="shadow-2xl"
                renderTextLayer={true}
                renderAnnotationLayer={false}
              />
              {/* Field overlays */}
              {pageFields.map(field => (
                <FieldOverlay
                  key={field.id}
                  field={field}
                  scale={scale}
                  value={fieldValues[field.id]}
                  sigMode={sigMode}
                  typedSig={typedSig}
                  sigFont={FONT_STYLES[selectedFont]}
                  sigCanvas={sigCanvasRef}
                  onClick={() => {
                    if (field.type === 'signature' || field.type === 'initials') {
                      setActiveField(field);
                      setShowSigPad(true);
                    } else if (field.type === 'checkbox') {
                      setFieldValues(prev => ({ ...prev, [field.id]: !prev[field.id] }));
                    } else {
                      setActiveField(field);
                    }
                  }}
                />
              ))}
            </div>
          </Document>

          {/* Page navigation */}
          {numPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-4">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="border-white/20 text-white bg-white/5 hover:bg-white/10">
                <ChevronLeft className="w-4 h-4" /> Prev
              </Button>
              <span className="text-white/60 text-sm">Page {currentPage} of {numPages}</span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))} disabled={currentPage === numPages} className="border-white/20 text-white bg-white/5 hover:bg-white/10">
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Right Panel: Fields & Signature */}
        <div className="w-72 bg-[#0d1f3c] border-l border-white/10 flex flex-col overflow-y-auto">
          <div className="p-4 border-b border-white/10">
            <h3 className="text-amber-400 font-semibold text-sm mb-3">Your Signature</h3>
            {/* Mode toggle */}
            <div className="flex rounded-lg overflow-hidden border border-white/20 mb-3">
              <button onClick={() => setSigMode('draw')} className={`flex-1 py-2 text-xs flex items-center justify-center gap-1.5 transition-colors ${sigMode === 'draw' ? 'bg-amber-500 text-black font-semibold' : 'bg-white/5 text-white/60 hover:text-white'}`}>
                <PenLine className="w-3.5 h-3.5" /> Draw
              </button>
              <button onClick={() => setSigMode('type')} className={`flex-1 py-2 text-xs flex items-center justify-center gap-1.5 transition-colors ${sigMode === 'type' ? 'bg-amber-500 text-black font-semibold' : 'bg-white/5 text-white/60 hover:text-white'}`}>
                <Type className="w-3.5 h-3.5" /> Type
              </button>
            </div>

            {sigMode === 'draw' && (
              <div>
                <div className="bg-white rounded-lg overflow-hidden border border-white/20">
                  <SignatureCanvas
                    ref={sigCanvasRef}
                    penColor="#1a3a6b"
                    canvasProps={{ width: 240, height: 100, className: 'w-full' }}
                    backgroundColor="white"
                  />
                </div>
                <button onClick={() => sigCanvasRef.current?.clear()} className="text-white/40 text-xs mt-1 hover:text-white/70">Clear</button>
              </div>
            )}

            {sigMode === 'type' && (
              <div>
                <Input
                  value={typedSig}
                  onChange={e => setTypedSig(e.target.value)}
                  placeholder="Type your full name"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/30 mb-2 text-sm"
                />
                <div className="space-y-2">
                  {FONT_STYLES.map((font, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedFont(idx)}
                      className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${selectedFont === idx ? 'border-amber-500 bg-amber-500/10' : 'border-white/10 bg-white/5 hover:border-white/30'}`}
                      style={font.style}
                    >
                      {typedSig || 'Your Signature'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Fields list */}
          <div className="p-4 flex-1">
            <h3 className="text-amber-400 font-semibold text-sm mb-3">Required Fields</h3>
            <div className="space-y-2">
              {(data?.fields || []).map(field => {
                const filled = fieldValues[field.id] || (field.type === 'signature' && (sigCanvasRef.current && !sigCanvasRef.current?.isEmpty())) || (field.type === 'signature' && sigMode === 'type' && typedSig.trim());
                return (
                  <button
                    key={field.id}
                    onClick={() => {
                      setCurrentPage(field.page);
                      if (field.type === 'signature' || field.type === 'initials') { setActiveField(field); setShowSigPad(true); }
                    }}
                    className={`w-full flex items-center gap-2 p-2.5 rounded-lg text-left text-xs transition-colors ${filled ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-white/5 border border-white/10 text-white/70 hover:border-amber-400/40 hover:text-white'}`}
                  >
                    {filled ? <Check className="w-3.5 h-3.5 text-green-400 shrink-0" /> : <div className="w-3.5 h-3.5 rounded border border-current shrink-0" />}
                    <span>{field.label || field.type} <span className="text-white/30">— pg {field.page}</span></span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <div className="p-4 border-t border-white/10">
            <Button onClick={handleSubmit} disabled={submitting} className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold py-3" data-testid="esign-submit-btn">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              Sign & Submit
            </Button>
            <p className="text-white/30 text-[10px] text-center mt-2">By clicking, you are legally signing this document</p>
          </div>
        </div>
      </div>

      {/* Text field input modal */}
      {activeField && !showSigPad && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d1f3c] rounded-xl border border-amber-400/20 p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">{activeField.label || 'Enter Value'}</h3>
              <button onClick={() => setActiveField(null)}><X className="w-5 h-5 text-white/40" /></button>
            </div>
            <Input
              value={fieldValues[activeField.id] || ''}
              onChange={e => setFieldValues(prev => ({ ...prev, [activeField.id]: e.target.value }))}
              placeholder={activeField.placeholder || 'Enter value...'}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/30 mb-4"
              autoFocus
            />
            <Button onClick={() => setActiveField(null)} className="w-full bg-amber-500 text-black">Done</Button>
          </div>
        </div>
      )}

      {/* Signature pad modal (for field-level signing) */}
      {showSigPad && activeField && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[#0a1628] font-bold">{activeField.label || 'Sign Here'}</h3>
              <button onClick={() => setShowSigPad(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            {sigMode === 'draw' ? (
              <div className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-gray-50">
                <SignatureCanvas ref={sigCanvasRef} penColor="#1a3a6b" canvasProps={{ width: 380, height: 150, className: 'w-full' }} backgroundColor="#f9fafb" />
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 bg-gray-50 min-h-[100px] flex items-center justify-center">
                <span style={FONT_STYLES[selectedFont].style}>{typedSig || 'Your Signature'}</span>
              </div>
            )}
            <div className="flex gap-3 mt-4">
              <Button onClick={() => { setShowSigPad(false); setFieldValues(prev => ({ ...prev, [activeField.id]: true })); }} className="flex-1 bg-[#1a3a6b] text-white">Apply Signature</Button>
              <Button variant="outline" onClick={() => sigCanvasRef.current?.clear()} className="border-gray-300">Clear</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const FieldOverlay = ({ field, scale, value, sigMode, typedSig, sigFont, sigCanvas, onClick }) => {
  const style = {
    position: 'absolute',
    left: `${field.x}%`,
    top: `${field.y}%`,
    width: `${field.width}%`,
    height: `${field.height}%`,
    cursor: 'pointer',
    zIndex: 10,
  };

  const isSig = field.type === 'signature' || field.type === 'initials';
  const isFilled = value || (isSig && ((sigCanvas?.current && !sigCanvas.current?.isEmpty()) || (sigMode === 'type' && typedSig?.trim())));

  return (
    <div style={style} onClick={onClick} className="group">
      <div className={`w-full h-full border-2 rounded transition-all ${
        isFilled
          ? 'border-green-400 bg-green-50/30'
          : 'border-amber-400 bg-amber-400/10 hover:bg-amber-400/20'
      } flex items-center justify-center`}>
        {isFilled ? (
          field.type === 'checkbox' ? (
            <Check className="w-4 h-4 text-green-600" style={{ transform: `scale(${scale})` }} />
          ) : isSig && sigMode === 'type' && typedSig ? (
            <span style={{ ...sigFont.style, fontSize: sigFont.style.fontSize * Math.min(scale, 0.7) }}>{typedSig}</span>
          ) : (
            <Check className="w-3 h-3 text-green-500" />
          )
        ) : (
          <span className="text-amber-600 text-[10px] font-semibold opacity-70 select-none truncate px-1">
            {field.type === 'signature' ? '✍ Sign' : field.type === 'initials' ? 'Initials' : field.type === 'checkbox' ? '☐ Check' : field.label || 'Click to fill'}
          </span>
        )}
      </div>
    </div>
  );
};

export default ESignSigningPage;
