import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import { Rnd } from 'react-rnd';
import {
  ArrowLeft, PenLine, Type, Calendar, CheckSquare, User, Mail,
  AlignLeft, Save, Trash2, Loader2, ChevronLeft, ChevronRight,
  ZoomIn, ZoomOut, Plus, Settings2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import axios from 'axios';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { v4 as uuidv4 } from 'uuid';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const API = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

const FIELD_TYPES = [
  { type: 'signature',  icon: PenLine,      label: 'Signature',  color: '#fbbf24', defaultW: 22, defaultH: 5  },
  { type: 'initials',   icon: PenLine,      label: 'Initials',   color: '#f97316', defaultW: 10, defaultH: 5  },
  { type: 'date',       icon: Calendar,     label: 'Date',       color: '#34d399', defaultW: 15, defaultH: 4  },
  { type: 'text',       icon: AlignLeft,    label: 'Text',       color: '#60a5fa', defaultW: 25, defaultH: 4  },
  { type: 'fullname',   icon: User,         label: 'Full Name',  color: '#a78bfa', defaultW: 20, defaultH: 4  },
  { type: 'email',      icon: Mail,         label: 'Email',      color: '#f472b6', defaultW: 22, defaultH: 4  },
  { type: 'checkbox',   icon: CheckSquare,  label: 'Checkbox',   color: '#4ade80', defaultW: 4,  defaultH: 4  },
];

export const DocumentEditorPage = () => {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [fields, setFields] = useState([]);
  const [selectedField, setSelectedField] = useState(null);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const pageRef = useRef(null);
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    axios.get(`${API}/api/esign/templates/${templateId}`, { headers })
      .then(res => {
        setTemplate(res.data);
        setFields(res.data.fields || []);
      })
      .catch(() => toast.error('Failed to load template'))
      .finally(() => setLoading(false));
  }, [templateId]);

  const onPageRender = useCallback(() => {
    if (pageRef.current) {
      const canvas = pageRef.current.querySelector('canvas');
      if (canvas) setPageSize({ width: canvas.offsetWidth, height: canvas.offsetHeight });
    }
  }, []);

  const addField = (type) => {
    const ft = FIELD_TYPES.find(f => f.type === type);
    const newField = {
      id: uuidv4(),
      type,
      page: currentPage,
      x: 20, y: 20,
      width: ft?.defaultW || 20,
      height: ft?.defaultH || 5,
      required: true,
      label: ft?.label || type,
      placeholder: '',
      prefill_from: null,
    };
    setFields(prev => [...prev, newField]);
    setSelectedField(newField.id);
  };

  const updateField = (id, updates) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeField = (id) => {
    setFields(prev => prev.filter(f => f.id !== id));
    if (selectedField === id) setSelectedField(null);
  };

  const saveFields = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/esign/templates/${templateId}`, { fields }, { headers });
      toast.success('Fields saved!');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const pageFields = fields.filter(f => f.page === currentPage);
  const selField = fields.find(f => f.id === selectedField);

  if (loading) return <div className="min-h-screen bg-[#0a1628] flex items-center justify-center"><Loader2 className="w-8 h-8 text-amber-400 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#0a1628] flex flex-col">
      {/* Top Bar */}
      <div className="bg-[#0d1f3c] border-b border-amber-400/20 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link to="/documents" className="text-white/60 hover:text-amber-400 transition-colors"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <h2 className="text-white font-semibold text-sm">{template?.name}</h2>
            <p className="text-white/40 text-xs">Field Placement Editor · {fields.length} fields</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="w-7 h-7 rounded bg-white/10 text-white flex items-center justify-center hover:bg-white/20"><ZoomOut className="w-3.5 h-3.5" /></button>
            <span className="text-white/60 text-xs w-10 text-center">{Math.round(scale*100)}%</span>
            <button onClick={() => setScale(s => Math.min(2.5, s + 0.2))} className="w-7 h-7 rounded bg-white/10 text-white flex items-center justify-center hover:bg-white/20"><ZoomIn className="w-3.5 h-3.5" /></button>
          </div>
          <Button onClick={saveFields} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold text-sm gap-2">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save Fields
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Toolbar: Field Types */}
        <div className="w-48 bg-[#0d1f3c] border-r border-white/10 p-3 space-y-2 overflow-y-auto">
          <p className="text-white/40 text-[10px] uppercase tracking-wider mb-3">Add Field</p>
          {FIELD_TYPES.map(ft => (
            <button
              key={ft.type}
              onClick={() => addField(ft.type)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs transition-colors border border-white/5 hover:border-white/20 group"
            >
              <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: `${ft.color}20` }}>
                <ft.icon className="w-3.5 h-3.5" style={{ color: ft.color }} />
              </div>
              {ft.label}
            </button>
          ))}
          <div className="border-t border-white/10 pt-3 mt-3">
            <p className="text-white/40 text-[10px] uppercase tracking-wider mb-2">Pages</p>
            <div className="flex gap-1 flex-wrap">
              {Array.from({ length: numPages || 1 }, (_, i) => i + 1).map(pg => (
                <button key={pg} onClick={() => setCurrentPage(pg)}
                  className={`w-8 h-8 rounded text-xs font-medium transition-colors ${pg === currentPage ? 'bg-amber-500 text-black' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}>
                  {pg}
                </button>
              ))}
            </div>
          </div>
          {fields.length > 0 && (
            <div className="border-t border-white/10 pt-3">
              <p className="text-white/40 text-[10px] uppercase tracking-wider mb-2">All Fields</p>
              <div className="space-y-1">
                {fields.map(f => {
                  const ft = FIELD_TYPES.find(t => t.type === f.type);
                  return (
                    <button key={f.id} onClick={() => { setCurrentPage(f.page); setSelectedField(f.id); }}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${selectedField === f.id ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300' : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10'}`}>
                      {ft && <ft.icon className="w-3 h-3 shrink-0" style={{ color: ft.color }} />}
                      <span className="truncate">{f.label}</span>
                      <span className="text-white/30 ml-auto shrink-0">p{f.page}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Center: PDF Canvas */}
        <div className="flex-1 overflow-auto bg-[#060f1e] p-6 relative" onClick={() => setSelectedField(null)}>
          <div ref={pageRef} className="inline-block relative">
            <Document
              file={template?.pdf_url}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              loading={<div className="flex items-center justify-center w-[816px] h-[1056px] bg-white/5 rounded"><Loader2 className="w-8 h-8 text-amber-400 animate-spin" /></div>}
            >
              <Page
                pageNumber={currentPage}
                scale={scale}
                className="shadow-2xl"
                onRenderSuccess={onPageRender}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Document>

            {/* Draggable Field Overlays */}
            {pageSize.width > 0 && pageFields.map(field => {
              const ft = FIELD_TYPES.find(t => t.type === field.type);
              const color = ft?.color || '#fbbf24';
              const isSelected = selectedField === field.id;

              return (
                <Rnd
                  key={field.id}
                  position={{ x: (field.x / 100) * pageSize.width, y: (field.y / 100) * pageSize.height }}
                  size={{ width: (field.width / 100) * pageSize.width, height: (field.height / 100) * pageSize.height }}
                  bounds="parent"
                  onDragStop={(e, d) => {
                    e.stopPropagation();
                    updateField(field.id, {
                      x: (d.x / pageSize.width) * 100,
                      y: (d.y / pageSize.height) * 100,
                    });
                  }}
                  onResizeStop={(e, dir, ref, delta, pos) => {
                    updateField(field.id, {
                      x: (pos.x / pageSize.width) * 100,
                      y: (pos.y / pageSize.height) * 100,
                      width: (ref.offsetWidth / pageSize.width) * 100,
                      height: (ref.offsetHeight / pageSize.height) * 100,
                    });
                  }}
                  onClick={e => { e.stopPropagation(); setSelectedField(field.id); }}
                  style={{ zIndex: isSelected ? 20 : 10 }}
                  enableResizing={{ bottomRight: true, right: true, bottom: true }}
                >
                  <div className="w-full h-full border-2 rounded flex items-center justify-center relative select-none" style={{
                    borderColor: color,
                    background: `${color}18`,
                    boxShadow: isSelected ? `0 0 0 2px ${color}60` : 'none',
                  }}>
                    <div className="flex items-center gap-1 px-1 overflow-hidden">
                      {ft && <ft.icon className="w-3 h-3 shrink-0" style={{ color }} />}
                      <span className="text-[10px] font-semibold truncate" style={{ color }}>{field.label}</span>
                    </div>
                    {isSelected && (
                      <button
                        className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 z-30"
                        onClick={e => { e.stopPropagation(); removeField(field.id); }}
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                </Rnd>
              );
            })}
          </div>
        </div>

        {/* Right Panel: Field Properties */}
        <div className="w-56 bg-[#0d1f3c] border-l border-white/10 p-4 overflow-y-auto">
          <div className="flex items-center gap-2 mb-4">
            <Settings2 className="w-4 h-4 text-amber-400" />
            <h3 className="text-white/70 text-sm font-medium">Field Properties</h3>
          </div>
          {selField ? (
            <div className="space-y-3">
              <div>
                <label className="text-white/40 text-[10px] uppercase tracking-wider block mb-1">Label</label>
                <Input value={selField.label} onChange={e => updateField(selField.id, { label: e.target.value })} className="bg-white/10 border-white/20 text-white text-xs h-8" />
              </div>
              <div>
                <label className="text-white/40 text-[10px] uppercase tracking-wider block mb-1">Placeholder</label>
                <Input value={selField.placeholder || ''} onChange={e => updateField(selField.id, { placeholder: e.target.value })} className="bg-white/10 border-white/20 text-white text-xs h-8" placeholder="Optional hint..." />
              </div>
              <div>
                <label className="text-white/40 text-[10px] uppercase tracking-wider block mb-1">Auto-fill From</label>
                <select value={selField.prefill_from || ''} onChange={e => updateField(selField.id, { prefill_from: e.target.value || null })}
                  className="w-full bg-white/10 border border-white/20 rounded px-2 py-1.5 text-white text-xs focus:outline-none">
                  <option value="" className="bg-[#0d1f3c]">None</option>
                  <option value="signer_name" className="bg-[#0d1f3c]">Signer Name</option>
                  <option value="signer_email" className="bg-[#0d1f3c]">Signer Email</option>
                  <option value="today" className="bg-[#0d1f3c]">Today's Date</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-white/40 text-[10px] uppercase tracking-wider">Required</label>
                <button onClick={() => updateField(selField.id, { required: !selField.required })}
                  className={`w-8 h-4 rounded-full transition-colors relative ${selField.required ? 'bg-amber-500' : 'bg-white/20'}`}>
                  <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${selField.required ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>
              <div className="pt-2">
                <p className="text-white/30 text-[10px]">Position: {Math.round(selField.x)}%, {Math.round(selField.y)}%</p>
                <p className="text-white/30 text-[10px]">Size: {Math.round(selField.width)}% × {Math.round(selField.height)}%</p>
              </div>
              <Button onClick={() => removeField(selField.id)} variant="ghost" className="w-full text-red-400/60 hover:text-red-400 hover:bg-red-400/10 text-xs h-7 mt-2">
                <Trash2 className="w-3 h-3 mr-1" /> Remove Field
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <PenLine className="w-8 h-8 text-white/20 mx-auto mb-2" />
              <p className="text-white/30 text-xs">Click a field on the PDF to edit its properties, or use the left panel to add new fields.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentEditorPage;
