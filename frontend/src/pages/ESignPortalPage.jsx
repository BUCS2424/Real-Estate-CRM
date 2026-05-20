import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, FileText, CheckSquare, X, AlertCircle, Shield, PenLine } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner';
import axios from 'axios';

const API = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

export const ESignPortalPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [consenting, setConsenting] = useState(false);
  const [showDisclosure, setShowDisclosure] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [declineStep, setDeclineStep] = useState(false);

  useEffect(() => {
    axios.get(`${API}/api/esign/sign/${token}`)
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.detail || 'Invalid or expired signing link'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleGetStarted = async () => {
    if (!agreed) { toast.error('Please agree to the Electronic Records and Signatures Disclosure to continue'); return; }
    setConsenting(true);
    try {
      await axios.post(`${API}/api/esign/sign/${token}/consent`);
      navigate(`/sign/${token}/document`);
    } catch {
      toast.error('Could not record consent. Please try again.');
    } finally { setConsenting(false); }
  };

  const handleDecline = async () => {
    setDeclining(true);
    try {
      await axios.post(`${API}/api/esign/sign/${token}/decline`, { reason: declineReason });
      setDeclineStep(false);
      setData(prev => ({ ...prev, status: 'declined' }));
      toast.success('You have declined to sign this document.');
    } catch { toast.error('Error recording decline.'); }
    finally { setDeclining(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
      <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#0a1628] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h2 className="text-2xl font-serif text-white mb-2">Link Not Found</h2>
        <p className="text-white/60">{error}</p>
      </div>
    </div>
  );

  if (data?.status === 'signed') return (
    <CompletedPage name={data.signer_name} templateName={data.template_name} status="signed" />
  );
  if (data?.status === 'declined') return (
    <CompletedPage name={data.signer_name} templateName={data.template_name} status="declined" />
  );

  const agentName = data?.sent_by_name || 'Sheila Desautels';
  const signerName = data?.signer_name || 'New Client';
  const templateName = data?.template_name || 'Document';

  return (
    <div className="min-h-screen bg-[#f0f4f8] font-sans">
      {/* ── Top Bar ── */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/images/hidden-haven-logo-full.png" alt="Hidden Haven Realty" className="h-10 object-contain"
              onError={e => { e.target.style.display='none'; }} />
            <div>
              <h1 className="font-bold text-[#0a1628] text-lg leading-tight">Signing Ceremony</h1>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[#0a1628]/60 text-sm max-w-sm text-right">
            <Shield className="w-4 h-4 text-amber-500 shrink-0" />
            Before we start signing, let's confirm you are in the right place and receive your consent to sign documents electronically.
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">

        {/* ── Welcome Section ── */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
          <div className="p-8 flex flex-col sm:flex-row gap-8 items-start">
            {/* Illustration */}
            <div className="shrink-0">
              <WelcomeIllustration />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-[#0a1628] mb-4">Welcome {signerName}!</h2>
              <p className="text-[#1a3a6b] mb-3 leading-relaxed">
                <strong>{agentName}</strong> has invited you to review and sign{' '}
                <strong className="text-amber-600">{templateName}</strong> for this session.
              </p>
              <p className="text-gray-600 mb-3 leading-relaxed">
                To get started, please read and agree to the Electronic Records and Signatures Disclosure, then click <strong>Let's Get Started</strong>.
              </p>
              <p className="text-gray-600 mb-3 leading-relaxed">
                You will be able to fully review and download a copy of the documents before actually signing them, and, if you see something that is not quite right, you may decline and provide a reason with details.
              </p>
              {data?.message && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4 text-sm text-amber-900">
                  <strong>Personal note from {agentName}:</strong><br />{data.message}
                </div>
              )}
              <p className="text-gray-500 mt-4 text-sm">
                You can contact{' '}
                <a href="mailto:mel@hiddenhavenrealty.com" className="text-amber-600 hover:underline font-medium">{agentName}</a>{' '}
                with any questions.
              </p>
            </div>
          </div>
        </div>

        {/* ── Legally Speaking ── */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
          <div className="p-8">
            <h3 className="text-xl font-bold text-[#0a1628] mb-6">Legally Speaking...</h3>

            <div className="flex flex-col sm:flex-row gap-8 items-start">
              <div className="flex-1">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
                  <div className="flex gap-4">
                    <div className="shrink-0 mt-1">
                      <PenLine className="w-6 h-6 text-amber-600" />
                    </div>
                    <p className="text-gray-700 leading-relaxed text-sm">
                      When it comes to receiving and signing required documents, you have a right to receive and sign these documents on paper. However, with your consent below and to the delight of trees everywhere, you can receive and sign said documents electronically instead.
                    </p>
                  </div>

                  {/* Consent checkbox */}
                  <div className="mt-5 flex items-center gap-3">
                    <Checkbox
                      id="consent"
                      checked={agreed}
                      onCheckedChange={setAgreed}
                      className="border-amber-500 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 w-5 h-5"
                      data-testid="esign-consent-checkbox"
                    />
                    <label htmlFor="consent" className="text-sm text-gray-700 cursor-pointer select-none">
                      I agree to the{' '}
                      <button
                        onClick={() => setShowDisclosure(true)}
                        className="text-amber-600 hover:underline font-semibold"
                      >
                        Electronic Records and Signatures Disclosure
                      </button>
                    </label>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col items-center gap-4">
                  <Button
                    onClick={handleGetStarted}
                    disabled={!agreed || consenting}
                    className="bg-[#1a3a6b] hover:bg-[#0a1628] text-white px-12 py-4 text-lg font-semibold rounded-xl w-full sm:w-auto shadow-lg disabled:opacity-40"
                    data-testid="esign-get-started-btn"
                  >
                    {consenting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                    Let's Get Started ✍
                  </Button>

                  <button
                    onClick={() => setDeclineStep(true)}
                    className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1.5 transition-colors"
                    data-testid="esign-decline-btn"
                  >
                    <X className="w-4 h-4" /> Decline
                  </button>
                </div>
              </div>

              {/* Right illustration */}
              <div className="shrink-0 hidden sm:block">
                <LegalIllustration />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Disclosure Modal ── */}
      {showDisclosure && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-lg font-bold text-[#0a1628]">Electronic Records and Signatures Disclosure</h3>
              <button onClick={() => setShowDisclosure(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 text-sm text-gray-700 space-y-4 leading-relaxed">
              <p><strong>PLEASE READ THIS INFORMATION CAREFULLY.</strong></p>
              <p>By selecting "I agree," you agree to use electronic records and signatures in connection with agreements, documents, and disclosures that Hidden Haven Realty provides to you.</p>
              <p><strong>Scope of Consent:</strong> Your consent applies to all documents presented through this portal, including but not limited to real estate contracts, listing agreements, disclosure forms, and any other documents requiring your signature.</p>
              <p><strong>Right to Receive Paper Copies:</strong> You have the right to receive any document in paper form. To receive a paper copy, contact Sheila Desautels at mel@hiddenhavenrealty.com or (813) 454-0004.</p>
              <p><strong>Withdrawing Consent:</strong> You may withdraw your consent to electronic signatures at any time by declining to sign and requesting paper documents.</p>
              <p><strong>Hardware/Software Requirements:</strong> To access electronic records, you need: a device with internet access, a current web browser (Chrome, Firefox, Safari, Edge), and ability to download/view PDF files.</p>
              <p><strong>Retention of Records:</strong> You agree to keep a copy of all signed documents. Signed documents will also be emailed to you automatically.</p>
              <p className="text-gray-500">© {new Date().getFullYear()} Hidden Haven Realty. All rights reserved.</p>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <Button onClick={() => { setAgreed(true); setShowDisclosure(false); }} className="bg-amber-500 hover:bg-amber-600 text-black">
                <CheckSquare className="w-4 h-4 mr-2" /> I Agree
              </Button>
              <Button variant="outline" onClick={() => setShowDisclosure(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Decline Modal ── */}
      {declineStep && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#0a1628]">Decline to Sign</h3>
              <button onClick={() => setDeclineStep(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <p className="text-gray-600 text-sm mb-4">Please provide a reason for declining (optional):</p>
            <textarea
              value={declineReason}
              onChange={e => setDeclineReason(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-red-300"
              placeholder="e.g., I need to review with my attorney first..."
            />
            <div className="flex gap-3 mt-4">
              <Button onClick={handleDecline} disabled={declining} className="bg-red-500 hover:bg-red-600 text-white flex-1">
                {declining ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} Confirm Decline
              </Button>
              <Button variant="outline" onClick={() => setDeclineStep(false)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CompletedPage = ({ name, templateName, status }) => (
  <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center px-4">
    <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
      {status === 'signed' ? (
        <>
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckSquare className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-[#0a1628] mb-2">Document Signed!</h2>
          <p className="text-gray-600">Thank you, <strong>{name}</strong>. <strong>{templateName}</strong> has been signed successfully. A copy has been emailed to you.</p>
        </>
      ) : (
        <>
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <X className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-[#0a1628] mb-2">Signing Declined</h2>
          <p className="text-gray-600">You have declined to sign <strong>{templateName}</strong>. Sheila Desautels has been notified and will follow up with you.</p>
        </>
      )}
    </div>
  </div>
);

const WelcomeIllustration = () => (
  <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="80" cy="80" r="75" fill="#e8f0fe" />
    <rect x="35" y="45" width="55" height="70" rx="6" fill="white" stroke="#c5d3e8" strokeWidth="2"/>
    <rect x="45" y="60" width="35" height="4" rx="2" fill="#c5d3e8"/>
    <rect x="45" y="70" width="30" height="4" rx="2" fill="#c5d3e8"/>
    <rect x="45" y="80" width="25" height="4" rx="2" fill="#c5d3e8"/>
    <path d="M65 105 Q75 100 82 108" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" fill="none"/>
    <circle cx="105" cy="65" r="18" fill="#0a1628"/>
    <circle cx="105" cy="60" r="7" fill="white"/>
    <path d="M90 80 Q105 75 120 80" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    <rect x="98" y="83" width="14" height="14" rx="3" fill="#fbbf24"/>
    <path d="M100 90 l3 3 6-6" stroke="#0a1628" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const LegalIllustration = () => (
  <svg width="140" height="160" viewBox="0 0 140 160" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="45" y="20" width="60" height="80" rx="6" fill="white" stroke="#c5d3e8" strokeWidth="2"/>
    <rect x="55" y="35" width="40" height="5" rx="2.5" fill="#e2e8f0"/>
    <rect x="55" y="47" width="35" height="4" rx="2" fill="#e2e8f0"/>
    <rect x="55" y="57" width="38" height="4" rx="2" fill="#e2e8f0"/>
    <rect x="55" y="67" width="30" height="4" rx="2" fill="#e2e8f0"/>
    <rect x="55" y="77" width="34" height="4" rx="2" fill="#e2e8f0"/>
    <path d="M55 93 Q65 87 78 95" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" fill="none"/>
    <circle cx="100" cy="100" r="25" fill="#0a1628"/>
    <circle cx="100" cy="94" r="9" fill="white"/>
    <path d="M82 115 Q100 108 118 115" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    <rect x="88" y="118" width="24" height="20" rx="4" fill="#fbbf24"/>
    <circle cx="95" cy="107" r="3" fill="#fbbf24"/>
    <circle cx="105" cy="107" r="3" fill="#fbbf24"/>
  </svg>
);

export default ESignPortalPage;
