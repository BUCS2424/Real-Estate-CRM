import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import {
  User, Home, DollarSign, CheckSquare, ClipboardList, PenLine,
  ChevronRight, ChevronLeft, Check, X, Loader2, AlertCircle, Type
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

const SIG_FONTS = [
  { label: 'Script',  style: { fontFamily: "'Dancing Script', cursive",  fontSize: 28, color: '#0a1628' } },
  { label: 'Classic', style: { fontFamily: "'Great Vibes', cursive",      fontSize: 28, color: '#0a1628' } },
  { label: 'Modern',  style: { fontFamily: "'Pacifico', cursive",         fontSize: 22, color: '#0a1628' } },
];

/**
 * Group template fields (from the Document Editor) into logical form steps.
 * This is the ONLY place grouping logic lives — the editor is the source of truth.
 */
function groupFieldsIntoSteps(fields) {
  // Signature/initials always go to the final "Sign" step
  const SIG_TYPES = new Set(['signature', 'initials']);

  // Auto-categorize based on field type and label keywords
  const steps = [
    {
      id: 'info',      label: 'Your Info',      icon: User,          color: '#3b82f6',
      fields: [],      desc: 'Tell us about yourself as the seller',
    },
    {
      id: 'property',  label: 'Property',        icon: Home,          color: '#8b5cf6',
      fields: [],      desc: 'Details about the property being listed',
    },
    {
      id: 'terms',     label: 'Terms & Options', icon: DollarSign,    color: '#10b981',
      fields: [],      desc: 'Pricing, dates, and financing options',
    },
    {
      id: 'checkboxes',label: 'Preferences',     icon: CheckSquare,   color: '#f59e0b',
      fields: [],      desc: 'Marketing and listing authorizations',
    },
    {
      id: 'disclosure',label: 'Disclosure',      icon: ClipboardList, color: '#ef4444',
      fields: [],      desc: 'Required Florida property disclosure answers',
    },
    {
      id: 'sign',      label: 'Sign & Submit',   icon: PenLine,       color: '#fbbf24',
      fields: [],      desc: 'Review your information and sign the agreement',
    },
  ];

  const infoKeywords    = ['name','email','phone','seller address','seller email','seller phone'];
  const propertyKw      = ['address','street','city','zip','county','legal','property type'];
  const termsKw         = ['price','date','listing price','start','end','listing start','listing end',
                           'cash','conventional','va','fha','occupancy','term','mortgage','rate','fee'];
  const checkboxKw      = ['marketing','mls','lockbox','sign','internet','withhold','display',
                           'authorize','lock box','verbal','comp','compensation','buyer broker'];
  const disclosureKw    = ['q1','q2','q3','q4','q5','q6','q7','q8','q9','q10',
                           'pest','water','roof','sinkhole','hoa','environ','zoning','legal',
                           'plumbing','systems','appliances','flood','septic','well','pool','historic'];

  for (const f of fields) {
    if (SIG_TYPES.has(f.type)) {
      steps[5].fields.push(f);   // Sign step
      continue;
    }

    const lbl = (f.label || '').toLowerCase();
    const fid  = (f.id   || '').toLowerCase();
    const key  = lbl + ' ' + fid;

    if (infoKeywords.some(k => key.includes(k))) {
      steps[0].fields.push(f);
    } else if (propertyKw.some(k => key.includes(k))) {
      steps[1].fields.push(f);
    } else if (f.type === 'checkbox' && checkboxKw.some(k => key.includes(k))) {
      steps[3].fields.push(f);
    } else if (disclosureKw.some(k => key.includes(k))) {
      steps[4].fields.push(f);
    } else if (termsKw.some(k => key.includes(k)) || f.type === 'checkbox') {
      steps[2].fields.push(f);
    } else if (f.type === 'date') {
      // Date fields → terms step
      steps[2].fields.push(f);
    } else {
      // Default: put in property step
      steps[1].fields.push(f);
    }
  }

  // Remove empty steps (except Sign which is always shown)
  return steps.filter((s, i) => i === 5 || s.fields.length > 0);
}

/* ── Yes/No/Don't Know Radio ─────────────────────────────────────────────── */
const YesNoDK = ({ value, onChange, label }) => (
  <div className="yn-row">
    <span className="yn-label">{label}</span>
    <div className="yn-btns">
      {['Yes', 'No', "Don't Know"].map(opt => (
        <button
          key={opt} type="button"
          className={`yn-btn ${value===opt ? 'yn-selected' : ''} ${opt==='Yes'&&value==='Yes'?'yn-yes':''} ${opt==='No'&&value==='No'?'yn-no':''}`}
          onClick={() => onChange(opt)}
        >{opt}</button>
      ))}
    </div>
  </div>
);

/* ── Dynamic Field Renderer ─────────────────────────────────────────────── */
const FieldInput = ({ field, value, onChange }) => {
  const { type, label, required, placeholder, prefill_from } = field;
  const isAutoFilled = prefill_from && value;

  if (type === 'checkbox') {
    return (
      <label className={`wf-check-label ${value ? 'checked' : ''}`}>
        <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} className="wf-check-input"/>
        <span className="wf-check-box">{value && <Check size={11}/>}</span>
        {label}
        {required && <span className="wf-req">*</span>}
      </label>
    );
  }

  // Disclosure yes/no questions
  const lbl = (label || '').toLowerCase();
  const isDisclosure = ['q1','q2','q3','q4','q5','q7','q8','q9','q10'].some(k => (field.id||'').toLowerCase().includes(k) && (field.id||'').toLowerCase().includes('-y'));
  if (isDisclosure) return null; // handled at step level

  const inputType = type === 'date' ? 'text'
                  : type === 'email' ? 'email'
                  : type === 'text' || type === 'fullname' ? 'text'
                  : 'text';

  return (
    <div className="wf-field">
      <label className="wf-label">
        {label || type}
        {required && <span className="wf-req">*</span>}
        {isAutoFilled && <span className="wf-auto-tag">auto</span>}
      </label>
      <input
        type={inputType}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || label || ''}
        className={`wf-input ${isAutoFilled ? 'wf-autofilled' : ''}`}
      />
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════
   MAIN SIGNING WIZARD — driven entirely by template fields from editor
══════════════════════════════════════════════════════════════════════ */
export const ESignSigningPage = () => {
  const { token }  = useParams();
  const navigate   = useNavigate();
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [steps, setSteps]       = useState([]);
  const [step, setStep]         = useState(0);
  const [values, setValues]     = useState({});   // fieldId → value
  const [submitting, setSubmitting] = useState(false);
  const [sigMode, setSigMode]   = useState('draw');
  const [typedSig, setTypedSig] = useState('');
  const [sigFont, setSigFont]   = useState(0);
  const sigRef = useRef(null);

  // Load fonts
  useEffect(() => {
    const l = document.createElement('link');
    l.href = 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&family=Great+Vibes&family=Pacifico&display=swap';
    l.rel  = 'stylesheet';
    document.head.appendChild(l);
  }, []);

  // Fetch signing session + template fields
  useEffect(() => {
    axios.get(`${API}/api/esign/sign/${token}`)
      .then(res => {
        if (!['active','consented'].includes(res.data.status)) {
          navigate(`/sign/${token}`, { replace: true });
          return;
        }
        setSessionData(res.data);

        const allFields = res.data.fields || [];

        // Pre-fill values from session data & prefill_from
        const prevals = {};
        const today = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
        allFields.forEach(f => {
          if (f.prefill_from === 'signer_name')  prevals[f.id] = res.data.signer_name  || '';
          if (f.prefill_from === 'signer_email') prevals[f.id] = res.data.signer_email || '';
          if (f.prefill_from === 'today')        prevals[f.id] = today;
        });
        setValues(prevals);
        setTypedSig(res.data.signer_name || '');

        // Group fields into steps using the same editor field definitions
        const grouped = groupFieldsIntoSteps(allFields);
        setSteps(grouped);
      })
      .catch(() => setError('Invalid or expired signing link.'))
      .finally(() => setLoading(false));
  }, [token, navigate]);

  const setValue = (id, val) => setValues(p => ({ ...p, [id]: val }));
  const currentStep = steps[step];
  const isLastStep  = step === steps.length - 1;

  // Find pairs of Yes/No disclosure fields and group them as questions
  const getDisclosureQuestions = (stepFields) => {
    const seen = new Set();
    const questions = [];
    for (const f of stepFields) {
      const base = (f.id || '').replace(/-y$|-n$|-dk$/, '');
      if (seen.has(base)) continue;
      seen.add(base);
      // Get the label from the -y field
      const yField = stepFields.find(ff => ff.id === `${base}-y`);
      if (yField) {
        questions.push({ base, label: yField.label?.replace(' - Yes','').replace(': Yes','') || yField.label, yId: `${base}-y`, nId: `${base}-n`, dkId: `${base}-dk` });
      }
    }
    return questions;
  };

  // Validate current step
  const validate = () => {
    if (!currentStep) return true;
    const required = currentStep.fields.filter(f => f.required && f.type !== 'signature' && f.type !== 'initials');
    for (const f of required) {
      if (!values[f.id]?.toString().trim()) {
        toast.error(`Please fill in: ${f.label || f.type}`);
        return false;
      }
    }
    if (isLastStep) {
      if (sigMode === 'draw' && (!sigRef.current || sigRef.current.isEmpty())) {
        toast.error('Please draw or type your signature');
        return false;
      }
      if (sigMode === 'type' && !typedSig.trim()) {
        toast.error('Please type your name to sign');
        return false;
      }
    }
    return true;
  };

  const next = () => { if (validate()) setStep(s => Math.min(steps.length - 1, s + 1)); };
  const back = () => setStep(s => Math.max(0, s - 1));

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);

    const sigDataUrl = sigMode === 'draw' && sigRef.current ? sigRef.current.toDataURL('image/png') : null;
    const typedFinal  = sigMode === 'type' ? typedSig.trim() : null;

    try {
      await axios.post(`${API}/api/esign/sign/${token}/submit`, {
        field_values: values,
        signature_data: sigDataUrl,
        typed_signature: typedFinal,
      });
      navigate(`/sign/${token}/complete`);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Submission failed. Please try again.');
    } finally { setSubmitting(false); }
  };

  /* ── Loading / Error ────────────────────────────────────────────────── */
  if (loading) return (
    <div className="wf-fullscreen wf-loading">
      <Loader2 className="wf-spin" size={36}/><p>Loading your signing session…</p>
    </div>
  );
  if (error) return (
    <div className="wf-fullscreen wf-error">
      <AlertCircle size={40}/><p>{error}</p>
    </div>
  );
  if (!steps.length) return (
    <div className="wf-fullscreen wf-error">
      <AlertCircle size={40}/><p>No fields configured for this document. Please contact the agent.</p>
    </div>
  );

  const S = currentStep;
  const disclosureQs = S.id === 'disclosure' ? getDisclosureQuestions(S.fields) : [];

  /* ── Progress calculation ───────────────────────────────────────────── */
  const totalRequired = steps.flatMap(s => s.fields).filter(f => f.required && f.type !== 'signature' && f.type !== 'initials').length;
  const filledRequired = steps.flatMap(s => s.fields).filter(f => f.required && f.type !== 'signature' && f.type !== 'initials' && values[f.id]?.toString().trim()).length;

  return (
    <div className="wf-root">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <header className="wf-header">
        <img src="/images/hidden-haven-logo-full.png" alt="Hidden Haven Realty"
             className="wf-header-logo" onError={e=>e.target.style.display='none'}/>
        <div className="wf-header-center">
          <span className="wf-header-doc">{sessionData?.template_name || 'Listing Agreement'}</span>
          <span className="wf-header-signer">{sessionData?.signer_name}</span>
        </div>
        <div className="wf-header-right">
          {totalRequired > 0 && (
            <span className={`wf-progress-chip ${filledRequired===totalRequired?'complete':''}`}>
              {filledRequired} / {totalRequired} filled
            </span>
          )}
        </div>
      </header>

      {/* ── Step Progress Bar ─────────────────────────────────────────── */}
      <div className="wf-progress-track">
        {steps.map((s, i) => (
          <button key={s.id}
            className={`wf-prog-step ${i===step?'active':''} ${i<step?'done':''}`}
            onClick={() => i < step && setStep(i)}
            disabled={i > step}
            title={s.label}
          >
            <span className="wf-prog-icon" style={i <= step ? { background: s.color } : {}}>
              {i < step ? <Check size={13}/> : <s.icon size={13}/>}
            </span>
            <span className="wf-prog-label">{s.label}</span>
          </button>
        ))}
        <div className="wf-prog-bar" style={{ width: `${steps.length > 1 ? (step / (steps.length-1)) * 100 : 100}%` }}/>
      </div>

      {/* ── Form Content ─────────────────────────────────────────────── */}
      <main className="wf-main">
        <div className="wf-card">
          <div className="wf-card-header" style={{ borderColor: S.color }}>
            <div className="wf-card-icon" style={{ background: S.color }}>
              <S.icon size={22} color="white"/>
            </div>
            <div>
              <h2 className="wf-card-title">{S.label}</h2>
              <p className="wf-card-sub">{S.desc}</p>
            </div>
          </div>

          <div className="wf-fields">
            {/* ── Disclosure step: Yes/No/DK question groups ───────── */}
            {S.id === 'disclosure' && disclosureQs.length > 0 && (
              <div className="wf-disc-list">
                {disclosureQs.map(q => (
                  <YesNoDK
                    key={q.base}
                    label={q.label}
                    value={values[q.yId] === true ? 'Yes' : values[q.nId] === true ? 'No' : values[q.dkId] === true ? "Don't Know" : ''}
                    onChange={opt => {
                      setValue(q.yId,  opt === 'Yes');
                      setValue(q.nId,  opt === 'No');
                      setValue(q.dkId, opt === "Don't Know");
                    }}
                  />
                ))}
              </div>
            )}

            {/* ── Sign step ─────────────────────────────────────────── */}
            {S.id === 'sign' && (
              <div className="wf-sig-section">
                <p className="wf-sig-sub">
                  By signing, you confirm that all information provided is accurate and you agree to the
                  <strong> {sessionData?.template_name}</strong> on behalf of Hidden Haven Realty.
                </p>

                <div className="wf-sig-mode-toggle">
                  <button className={`wf-sig-mode ${sigMode==='draw'?'active':''}`} onClick={()=>setSigMode('draw')}>
                    <PenLine size={14}/> Draw
                  </button>
                  <button className={`wf-sig-mode ${sigMode==='type'?'active':''}`} onClick={()=>setSigMode('type')}>
                    <Type size={14}/> Type
                  </button>
                </div>

                {sigMode === 'draw' ? (
                  <div className="wf-draw-wrap">
                    <div className="wf-canvas-holder">
                      <SignatureCanvas ref={sigRef} penColor="#0a1628"
                        canvasProps={{ width: 520, height: 140, className: 'wf-sig-canvas' }}
                        backgroundColor="white"/>
                      <div className="wf-sig-line"/>
                      <span className="wf-sig-line-label">Sign above this line</span>
                    </div>
                    <button className="wf-clear-sig" onClick={()=>sigRef.current?.clear()}>
                      <X size={12}/> Clear
                    </button>
                  </div>
                ) : (
                  <div className="wf-type-wrap">
                    <input className="wf-type-input" value={typedSig}
                      onChange={e=>setTypedSig(e.target.value)} placeholder="Type your full legal name" autoFocus/>
                    <div className="wf-font-picker">
                      {SIG_FONTS.map((f,i) => (
                        <button key={i} className={`wf-font-opt ${sigFont===i?'selected':''}`}
                          style={f.style} onClick={()=>setSigFont(i)}>
                          {typedSig || 'Your Signature'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Review summary */}
                <div className="wf-review-grid">
                  {steps.filter(s => s.id !== 'sign' && s.id !== 'disclosure').map(s => (
                    <div key={s.id} className="wf-review-card">
                      <h4><s.icon size={12}/> {s.label}</h4>
                      {s.fields.filter(f => f.type !== 'checkbox' && values[f.id]).slice(0,3).map(f => (
                        <p key={f.id}><strong>{f.label}:</strong> {values[f.id]}</p>
                      ))}
                      {s.fields.filter(f => f.type === 'checkbox' && values[f.id]).length > 0 && (
                        <p>{s.fields.filter(f => f.type === 'checkbox' && values[f.id]).map(f => f.label).join(', ')}</p>
                      )}
                    </div>
                  ))}
                </div>

                <p className="wf-legal-note">
                  By clicking "Sign & Submit" you agree this constitutes your legally binding electronic signature.
                  A signed copy will be emailed to you and to Sheila Desautels at Hidden Haven Realty.
                </p>
              </div>
            )}

            {/* ── All other steps: render fields from editor ─────────── */}
            {S.id !== 'sign' && S.id !== 'disclosure' && (() => {
              // Group checkboxes together, separate text fields
              const textFields = S.fields.filter(f => f.type !== 'checkbox');
              const checkFields = S.fields.filter(f => f.type === 'checkbox');

              return (
                <>
                  {textFields.map(f => (
                    <FieldInput key={f.id} field={f} value={values[f.id]} onChange={v => setValue(f.id, v)}/>
                  ))}
                  {checkFields.length > 0 && (
                    <div className="wf-field">
                      <label className="wf-label">Select all that apply</label>
                      <div className="wf-checks">
                        {checkFields.map(f => (
                          <FieldInput key={f.id} field={f} value={values[f.id]} onChange={v => setValue(f.id, v)}/>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* ── Navigation ─────────────────────────────────────────── */}
          <div className="wf-nav">
            <button className="wf-btn-back" onClick={back} disabled={step === 0}>
              <ChevronLeft size={16}/> Back
            </button>
            <div className="wf-dots">
              {steps.map((_,i) => <span key={i} className={`wf-dot ${i===step?'active':''} ${i<step?'done':''}`}/>)}
            </div>
            {!isLastStep ? (
              <button className="wf-btn-next" onClick={next}>
                Continue <ChevronRight size={16}/>
              </button>
            ) : (
              <button className="wf-btn-submit" onClick={handleSubmit} disabled={submitting}>
                {submitting ? <Loader2 size={16} className="wf-spin"/> : <Check size={16}/>}
                Sign & Submit
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ESignSigningPage;
