import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import {
  User, Home, DollarSign, Megaphone, ClipboardList, PenLine,
  ChevronRight, ChevronLeft, Check, X, Loader2, AlertCircle,
  Type, Phone, Mail, MapPin, Calendar, Building2
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

const SIG_FONTS = [
  { label: 'Script',  style: { fontFamily: "'Dancing Script', cursive",  fontSize: 28, color: '#0a1628' } },
  { label: 'Classic', style: { fontFamily: "'Great Vibes', cursive",      fontSize: 28, color: '#0a1628' } },
  { label: 'Modern',  style: { fontFamily: "'Pacifico', cursive",         fontSize: 22, color: '#0a1628' } },
];

/* ── Disclosure Yes/No/DK Radio ─────────────────────────────────────────── */
const YesNoDK = ({ id, value, onChange, label, hint }) => (
  <div className="yn-row">
    <div className="yn-label-wrap">
      <span className="yn-label">{label}</span>
      {hint && <span className="yn-hint">{hint}</span>}
    </div>
    <div className="yn-btns">
      {['Yes','No',"Don't Know"].map(opt => (
        <button
          key={opt}
          type="button"
          className={`yn-btn ${value===opt?'yn-selected':''} ${opt==='Yes'&&value==='Yes'?'yn-yes':''} ${opt==='No'&&value==='No'?'yn-no':''}`}
          onClick={()=>onChange(opt)}
        >{opt}</button>
      ))}
    </div>
  </div>
);

/* ── Field Input ─────────────────────────────────────────────────────────── */
const Field = ({ label, hint, required, error, children }) => (
  <div className={`wf-field ${error?'wf-field-error':''}`}>
    <label className="wf-label">{label}{required&&<span className="wf-req">*</span>}</label>
    {hint && <p className="wf-hint">{hint}</p>}
    {children}
    {error && <p className="wf-error-msg">{error}</p>}
  </div>
);

const TextInput = ({ value, onChange, placeholder, type='text', ...rest }) => (
  <input
    type={type}
    value={value||''}
    onChange={e=>onChange(e.target.value)}
    placeholder={placeholder}
    className="wf-input"
    {...rest}
  />
);

const CheckGroup = ({ options, values, onChange }) => (
  <div className="wf-checks">
    {options.map(opt => (
      <label key={opt.value} className={`wf-check-label ${values?.[opt.value]?'checked':''}`}>
        <input
          type="checkbox"
          checked={!!values?.[opt.value]}
          onChange={e => onChange(opt.value, e.target.checked)}
          className="wf-check-input"
        />
        <span className="wf-check-box"><Check size={11}/></span>
        {opt.label}
      </label>
    ))}
  </div>
);

/* ════════════════════════════════════════════════════════════════════
   MAIN WIZARD
════════════════════════════════════════════════════════════════════ */
export const ESignSigningPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [sigMode, setSigMode] = useState('draw');
  const [typedSig, setTypedSig] = useState('');
  const [sigFont, setSigFont] = useState(0);
  const [sigDataUrl, setSigDataUrl] = useState(null);
  const sigCanvasRef = useRef(null);

  // Form state — all values flat
  const [form, setForm] = useState({
    // Step 0: Seller Info
    seller_name: '', seller_email: '', seller_phone: '', seller_address: '',
    // Step 1: Property
    property_address: '', property_city: 'Tampa', property_state: 'FL',
    property_zip: '', legal_description: '',
    // Step 2: Listing Terms
    listing_price: '', listing_start: '', listing_end: '',
    financing_cash: false, financing_conventional: false, financing_va: false, financing_fha: false,
    occupancy_type: 'owner',
    // Step 3: Marketing
    marketing_mls: true, marketing_lockbox: false, marketing_sign: false,
    marketing_internet: true, marketing_withhold_verbal: false,
    // Step 4: Disclosure
    q1_systems: '', q2_pests: '', q3_water: '', q4_plumbing: '',
    q5_roof: '', q7_sinkhole: '', q8_hoa: '', q9_environmental: '',
    q10_legal: '', q10_zoning: '',
  });

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));
  const setMany = (updates) => setForm(p => ({ ...p, ...updates }));

  // Load session
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&family=Great+Vibes&family=Pacifico&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    axios.get(`${API}/api/esign/sign/${token}`)
      .then(res => {
        if (!['active','consented'].includes(res.data.status)) {
          navigate(`/sign/${token}`, { replace: true });
          return;
        }
        setSessionData(res.data);
        setForm(p => ({
          ...p,
          seller_name: res.data.signer_name || '',
          seller_email: res.data.signer_email || '',
        }));
        setTypedSig(res.data.signer_name || '');
      })
      .catch(() => setError('Invalid or expired signing link.'))
      .finally(() => setLoading(false));
  }, [token, navigate]);

  // ── Steps definition ────────────────────────────────────────────────────
  const STEPS = [
    { id: 'seller',     icon: User,         label: 'Your Info',         color: '#3b82f6' },
    { id: 'property',   icon: Home,         label: 'Property',          color: '#8b5cf6' },
    { id: 'listing',    icon: DollarSign,   label: 'Listing Terms',     color: '#10b981' },
    { id: 'marketing',  icon: Megaphone,    label: 'Marketing',         color: '#f59e0b' },
    { id: 'disclosure', icon: ClipboardList,label: 'Disclosure',        color: '#ef4444' },
    { id: 'sign',       icon: PenLine,      label: 'Sign & Submit',     color: '#fbbf24' },
  ];

  // ── Validation ──────────────────────────────────────────────────────────
  const validate = () => {
    if (step === 0) {
      if (!form.seller_name.trim()) { toast.error('Please enter your full legal name'); return false; }
      if (!form.seller_email.trim()) { toast.error('Please enter your email'); return false; }
    }
    if (step === 1) {
      if (!form.property_address.trim()) { toast.error('Please enter the property street address'); return false; }
      if (!form.property_zip.trim())     { toast.error('Please enter the ZIP code'); return false; }
    }
    if (step === 2) {
      if (!form.listing_price)   { toast.error('Please enter the listing price'); return false; }
      if (!form.listing_start)   { toast.error('Please enter the listing start date'); return false; }
      if (!form.listing_end)     { toast.error('Please enter the listing end date'); return false; }
    }
    if (step === 5) {
      if (sigMode === 'draw' && (!sigCanvasRef.current || sigCanvasRef.current.isEmpty())) {
        toast.error('Please draw or type your signature to complete signing');
        return false;
      }
      if (sigMode === 'type' && !typedSig.trim()) {
        toast.error('Please type your name to sign');
        return false;
      }
    }
    return true;
  };

  const next = () => { if (validate()) setStep(s => Math.min(STEPS.length - 1, s + 1)); };
  const back = () => setStep(s => Math.max(0, s - 1));

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);

    // Build field_values map for the backend
    const today = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
    const sigDataFinal = sigMode === 'draw' && sigCanvasRef.current
      ? sigCanvasRef.current.toDataURL('image/png')
      : null;
    const typedFinal = sigMode === 'type' ? typedSig.trim() : null;

    const fv = {
      'p1-seller-name':   form.seller_name,
      'p1-price':         form.listing_price ? `$${Number(form.listing_price).toLocaleString()}` : '',
      'p1-cash':          form.financing_cash,
      'p1-conventional':  form.financing_conventional,
      'p1-va':            form.financing_va,
      'p1-fha':           form.financing_fha,
      'p6-email':         form.seller_email,
      'p6-phone':         form.seller_phone,
      'p6-address':       form.seller_address || `${form.property_address}, ${form.property_city}, ${form.property_state} ${form.property_zip}`,
      'p7-q1a-y': form.q1_systems === 'Yes', 'p7-q1a-n': form.q1_systems === 'No',
      'p7-q2a-y': form.q2_pests === 'Yes',   'p7-q2a-n': form.q2_pests === 'No',
      'p7-q3a-y': form.q3_water === 'Yes',   'p7-q3a-n': form.q3_water === 'No',
      'p8-q4g-y': form.q4_plumbing === 'Yes','p8-q4g-n': form.q4_plumbing === 'No',
      'p8-q5a-y': form.q5_roof === 'Yes',    'p8-q5a-n': form.q5_roof === 'No',
      'p8-q7a-y': form.q7_sinkhole === 'Yes','p8-q7a-n': form.q7_sinkhole === 'No',
      'p9-q8a-y': form.q8_hoa === 'Yes',     'p9-q8a-n': form.q8_hoa === 'No',
      'p9-q9b-y': form.q9_environmental === 'Yes', 'p9-q9b-n': form.q9_environmental === 'No',
      'p9-q10a-y':form.q10_legal === 'Yes',  'p9-q10a-n': form.q10_legal === 'No',
      'p10-q10f-y':form.q10_zoning === 'Yes','p10-q10f-n': form.q10_zoning === 'No',
      'p10-print1': form.seller_name,
      // Dates auto-fill
      'p4-date1': today, 'p4-date2': today,
      'p6-date1': today, 'p6-date2': today,
      'p10-date1': today, 'p10-date2': today,
    };

    try {
      await axios.post(`${API}/api/esign/sign/${token}/submit`, {
        field_values: fv,
        signature_data: sigDataFinal,
        typed_signature: typedFinal,
      });
      navigate(`/sign/${token}/complete`);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Submission failed. Please try again.');
    } finally { setSubmitting(false); }
  };

  // ── Loading / Error ──────────────────────────────────────────────────────
  if (loading) return (
    <div className="wf-fullscreen wf-loading">
      <Loader2 className="wf-spin" size={36}/>
      <p>Loading your signing session…</p>
    </div>
  );
  if (error) return (
    <div className="wf-fullscreen wf-error">
      <AlertCircle size={40}/>
      <p>{error}</p>
    </div>
  );

  const S = STEPS[step];

  return (
    <div className="wf-root">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="wf-header">
        <img src="/images/hidden-haven-logo-full.png" alt="Hidden Haven Realty"
             className="wf-header-logo" onError={e=>e.target.style.display='none'}/>
        <div className="wf-header-center">
          <span className="wf-header-doc">{sessionData?.template_name || 'Listing Agreement'}</span>
          <span className="wf-header-signer">{sessionData?.signer_name}</span>
        </div>
        <div className="wf-header-right">
          <span className="wf-header-step">{step + 1} / {STEPS.length}</span>
        </div>
      </header>

      {/* ── Progress Bar ──────────────────────────────────────────────────── */}
      <div className="wf-progress-track">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            className={`wf-prog-step ${i===step?'active':''} ${i<step?'done':''}`}
            onClick={() => i < step && setStep(i)}
            title={s.label}
            disabled={i > step}
          >
            <span className="wf-prog-icon" style={{ background: i <= step ? s.color : undefined }}>
              {i < step ? <Check size={13}/> : <s.icon size={13}/>}
            </span>
            <span className="wf-prog-label">{s.label}</span>
          </button>
        ))}
        <div className="wf-prog-bar" style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}/>
      </div>

      {/* ── Form Content ──────────────────────────────────────────────────── */}
      <main className="wf-main">
        <div className="wf-card">
          {/* Card header */}
          <div className="wf-card-header" style={{ borderColor: S.color }}>
            <div className="wf-card-icon" style={{ background: S.color }}>
              <S.icon size={22} color="white"/>
            </div>
            <div>
              <h2 className="wf-card-title">{S.label}</h2>
              <p className="wf-card-sub">
                {step===0 && 'Tell us about yourself as the seller'}
                {step===1 && 'Details about the property being listed'}
                {step===2 && 'Price, dates, and financing terms'}
                {step===3 && 'How you want the property marketed'}
                {step===4 && 'Required Florida disclosure questions'}
                {step===5 && 'Review your information and sign'}
              </p>
            </div>
          </div>

          {/* ── Step Content ────────────────────────────────────────────── */}
          <div className="wf-fields">

            {/* STEP 0: Seller Info */}
            {step === 0 && <>
              <Field label="Full Legal Name" required>
                <TextInput value={form.seller_name} onChange={v=>set('seller_name',v)} placeholder="As it appears on legal documents"/>
              </Field>
              <div className="wf-row">
                <Field label="Email Address" required>
                  <TextInput type="email" value={form.seller_email} onChange={v=>set('seller_email',v)} placeholder="your@email.com"/>
                </Field>
                <Field label="Phone Number">
                  <TextInput type="tel" value={form.seller_phone} onChange={v=>set('seller_phone',v)} placeholder="(813) 000-0000"/>
                </Field>
              </div>
              <Field label="Current Mailing Address">
                <TextInput value={form.seller_address} onChange={v=>set('seller_address',v)} placeholder="Street address, City, State ZIP"/>
              </Field>
            </>}

            {/* STEP 1: Property */}
            {step === 1 && <>
              <Field label="Property Street Address" required>
                <TextInput value={form.property_address} onChange={v=>set('property_address',v)} placeholder="123 Main Street"/>
              </Field>
              <div className="wf-row-3">
                <Field label="City" required>
                  <TextInput value={form.property_city} onChange={v=>set('property_city',v)} placeholder="Tampa"/>
                </Field>
                <Field label="State">
                  <TextInput value={form.property_state} onChange={v=>set('property_state',v)} placeholder="FL"/>
                </Field>
                <Field label="ZIP Code" required>
                  <TextInput value={form.property_zip} onChange={v=>set('property_zip',v)} placeholder="33602"/>
                </Field>
              </div>
              <Field label="Legal Description" hint="From property deed or tax records — leave blank if unknown">
                <TextInput value={form.legal_description} onChange={v=>set('legal_description',v)} placeholder="e.g. BEACH PARK LOT 3 BLOCK 14"/>
              </Field>
            </>}

            {/* STEP 2: Listing Terms */}
            {step === 2 && <>
              <Field label="Listing Price" required>
                <div className="wf-price-wrap">
                  <span className="wf-price-symbol">$</span>
                  <input
                    type="number"
                    value={form.listing_price}
                    onChange={e=>set('listing_price', e.target.value)}
                    placeholder="850,000"
                    className="wf-input wf-price-input"
                  />
                </div>
              </Field>
              <div className="wf-row">
                <Field label="Listing Start Date" required>
                  <TextInput type="date" value={form.listing_start} onChange={v=>set('listing_start',v)}/>
                </Field>
                <Field label="Listing End Date" required>
                  <TextInput type="date" value={form.listing_end} onChange={v=>set('listing_end',v)}/>
                </Field>
              </div>
              <Field label="Accepted Financing Terms" hint="Check all that apply">
                <CheckGroup
                  options={[
                    { value: 'financing_cash',         label: 'Cash' },
                    { value: 'financing_conventional',  label: 'Conventional' },
                    { value: 'financing_va',            label: 'VA Loan' },
                    { value: 'financing_fha',           label: 'FHA Loan' },
                  ]}
                  values={form}
                  onChange={(key, val) => set(key, val)}
                />
              </Field>
              <Field label="Property Occupancy">
                <div className="wf-radio-group">
                  {[{v:'owner',l:'Owner Occupied'},{v:'tenant',l:'Tenant Occupied'},{v:'vacant',l:'Vacant'}].map(o=>(
                    <label key={o.v} className={`wf-radio ${form.occupancy_type===o.v?'selected':''}`}>
                      <input type="radio" name="occupancy" value={o.v} checked={form.occupancy_type===o.v}
                             onChange={()=>set('occupancy_type',o.v)}/>
                      {o.l}
                    </label>
                  ))}
                </div>
              </Field>
            </>}

            {/* STEP 3: Marketing */}
            {step === 3 && <>
              <p className="wf-section-note">Select how you authorize Hidden Haven Realty to market your property:</p>
              <div className="wf-toggle-list">
                {[
                  { key:'marketing_mls', label:'List on MLS (Multiple Listing Service)', desc:'Makes your property visible to all local agents' },
                  { key:'marketing_internet', label:'Display on the Internet', desc:'Listed on Zillow, Realtor.com, and other sites' },
                  { key:'marketing_sign', label:'Place a For Sale sign on the property', desc:'Physical sign in the yard' },
                  { key:'marketing_lockbox', label:'Use a lockbox for agent access', desc:'Allows showings when you are not home' },
                  { key:'marketing_withhold_verbal', label:'Withhold verbal offers', desc:'Only consider written offers' },
                ].map(item => (
                  <div key={item.key} className={`wf-toggle-item ${form[item.key]?'on':''}`} onClick={()=>set(item.key, !form[item.key])}>
                    <div className="wf-toggle-text">
                      <span className="wf-toggle-label">{item.label}</span>
                      <span className="wf-toggle-desc">{item.desc}</span>
                    </div>
                    <div className={`wf-toggle-switch ${form[item.key]?'on':''}`}>
                      <div className="wf-toggle-knob"/>
                    </div>
                  </div>
                ))}
              </div>
            </>}

            {/* STEP 4: Disclosure */}
            {step === 4 && <>
              <p className="wf-section-note">Florida law requires sellers to disclose known material defects. Answer each question to the best of your knowledge:</p>
              <div className="wf-disclosure-sections">
                <div className="wf-disc-section">
                  <h4 className="wf-disc-heading">Structures & Systems</h4>
                  <YesNoDK id="q1" value={form.q1_systems} onChange={v=>set('q1_systems',v)}
                    label="Are all structures, systems, and appliances in working condition?"
                    hint="Includes HVAC, electrical, plumbing, appliances"/>
                  <YesNoDK id="q2" value={form.q2_pests} onChange={v=>set('q2_pests',v)}
                    label="Has the property ever been treated for termites or other pests?"/>
                </div>
                <div className="wf-disc-section">
                  <h4 className="wf-disc-heading">Water & Roof</h4>
                  <YesNoDK id="q3" value={form.q3_water} onChange={v=>set('q3_water',v)}
                    label="Has the property experienced water intrusion, flooding, or drainage issues?"/>
                  <YesNoDK id="q4" value={form.q4_plumbing} onChange={v=>set('q4_plumbing',v)}
                    label="Are there any known plumbing leaks or defects?"/>
                  <YesNoDK id="q5" value={form.q5_roof} onChange={v=>set('q5_roof',v)}
                    label="Is the roof in sound condition with no known defects or leaks?"/>
                </div>
                <div className="wf-disc-section">
                  <h4 className="wf-disc-heading">Property & Legal</h4>
                  <YesNoDK id="q7" value={form.q7_sinkhole} onChange={v=>set('q7_sinkhole',v)}
                    label="Is there any known sinkhole activity affecting the property?"/>
                  <YesNoDK id="q8" value={form.q8_hoa} onChange={v=>set('q8_hoa',v)}
                    label="Is the property subject to an HOA or deed restrictions?"/>
                  <YesNoDK id="q9" value={form.q9_environmental} onChange={v=>set('q9_environmental',v)}
                    label="Are there any known environmental hazards on or near the property?"/>
                  <YesNoDK id="q10l" value={form.q10_legal} onChange={v=>set('q10_legal',v)}
                    label="Are there any active legal or administrative claims against the property?"/>
                  <YesNoDK id="q10z" value={form.q10_zoning} onChange={v=>set('q10_zoning',v)}
                    label="Are there any known zoning violations or code issues?"/>
                </div>
              </div>
            </>}

            {/* STEP 5: Review & Sign */}
            {step === 5 && <>
              {/* Summary */}
              <div className="wf-review-grid">
                <div className="wf-review-card">
                  <h4><User size={14}/> Seller</h4>
                  <p><strong>{form.seller_name}</strong></p>
                  <p>{form.seller_email}</p>
                  {form.seller_phone && <p>{form.seller_phone}</p>}
                </div>
                <div className="wf-review-card">
                  <h4><Home size={14}/> Property</h4>
                  <p><strong>{form.property_address}</strong></p>
                  <p>{form.property_city}, {form.property_state} {form.property_zip}</p>
                  {form.legal_description && <p className="wf-review-small">{form.legal_description}</p>}
                </div>
                <div className="wf-review-card">
                  <h4><DollarSign size={14}/> Listing</h4>
                  <p><strong>${Number(form.listing_price||0).toLocaleString()}</strong></p>
                  <p>{form.listing_start} → {form.listing_end}</p>
                  <p>{[form.financing_cash&&'Cash',form.financing_conventional&&'Conv.',form.financing_va&&'VA',form.financing_fha&&'FHA'].filter(Boolean).join(' · ') || 'No financing selected'}</p>
                </div>
              </div>

              {/* Signature */}
              <div className="wf-sig-section">
                <h3 className="wf-sig-title">Your Signature</h3>
                <p className="wf-sig-sub">By signing, you agree to the Exclusive Right of Sale Listing Agreement and confirm all information is accurate.</p>

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
                      <SignatureCanvas
                        ref={sigCanvasRef}
                        penColor="#0a1628"
                        canvasProps={{ width: 520, height: 140, className: 'wf-sig-canvas' }}
                        backgroundColor="white"
                        onEnd={() => setSigDataUrl(sigCanvasRef.current?.toDataURL())}
                      />
                      <div className="wf-sig-line"/>
                      <span className="wf-sig-line-label">Sign above</span>
                    </div>
                    <button className="wf-clear-sig" onClick={()=>{ sigCanvasRef.current?.clear(); setSigDataUrl(null); }}>
                      <X size={12}/> Clear
                    </button>
                  </div>
                ) : (
                  <div className="wf-type-wrap">
                    <input
                      className="wf-type-input"
                      value={typedSig}
                      onChange={e=>setTypedSig(e.target.value)}
                      placeholder="Type your full legal name"
                      autoFocus
                    />
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

                <p className="wf-legal-note">
                  By clicking "Sign & Submit" you agree this is your legally binding electronic signature under the Electronic Records and Signatures Disclosure you accepted.
                </p>
              </div>
            </>}
          </div>

          {/* ── Navigation ────────────────────────────────────────────────── */}
          <div className="wf-nav">
            <button className="wf-btn-back" onClick={back} disabled={step===0}>
              <ChevronLeft size={16}/> Back
            </button>
            <div className="wf-dots">
              {STEPS.map((_,i) => <span key={i} className={`wf-dot ${i===step?'active':''} ${i<step?'done':''}`}/>)}
            </div>
            {step < STEPS.length - 1 ? (
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
