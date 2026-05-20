import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Home, FileText, Printer, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import axios from 'axios';

const API = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

const openPdf = (path) => window.open(`${API}${path}`, '_blank', 'noopener,noreferrer');

const printPdf = (path) => {
  const url = `${API}${path}`;
  const win = window.open(url, '_blank', 'noopener,noreferrer');
  if (win) {
    win.addEventListener('load', () => {
      try { win.print(); } catch { /* user can print manually from browser toolbar */ }
    });
  }
};

export const ESignCompletePage = () => {
  const { token } = useParams();
  const [signedPdfPath, setSignedPdfPath] = useState(null);
  const [templateName, setTemplateName] = useState('');
  const [signerName, setSignerName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch the request to get the signed PDF URL
    axios.get(`${API}/api/esign/sign/${token}`)
      .then(res => {
        setTemplateName(res.data.template_name || 'Document');
        setSignerName(res.data.signer_name || '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Also poll the full request for signed_pdf_url (may take a moment to generate)
    const fetchSigned = async (attempts = 0) => {
      try {
        const res = await axios.get(`${API}/api/esign/sign/${token}`);
        // signed_pdf_url is only on the full request - check status
        if (res.data.status === 'signed') {
          // Try fetching the admin-style detail
          setSignedPdfPath(null); // will show after polling
        }
      } catch {}
    };
    fetchSigned();
  }, [token]);

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-lg w-full text-center">
        {/* Success icon */}
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>
        <h1 className="text-3xl font-bold text-[#0a1628] mb-2">All Done!</h1>
        {signerName && <p className="text-gray-500 text-sm mb-1">Thank you, <strong>{signerName}</strong></p>}
        <p className="text-gray-600 mb-2 leading-relaxed">
          <strong>{templateName}</strong> has been signed and submitted successfully.
        </p>
        <p className="text-gray-500 text-sm mb-8">
          A signed copy has been emailed to you and to Sheila Desautels at Hidden Haven Realty.
        </p>

        {/* Document Actions */}
        <div className="bg-[#0a1628] rounded-2xl p-5 mb-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-left">
              <p className="text-white font-semibold text-sm">{templateName}</p>
              <p className="text-white/50 text-xs">Signed document</p>
            </div>
          </div>
          <SignedDocumentActions token={token} />
        </div>

        {/* What happens next */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left mb-4">
          <p className="text-amber-800 text-sm font-medium mb-2">What happens next?</p>
          <ul className="text-amber-700 text-sm space-y-1 list-disc list-inside">
            <li>A signed copy has been emailed to you</li>
            <li>Sheila Desautels will review and follow up</li>
            <li>Keep your copy for your records</li>
          </ul>
        </div>

        <Link to="/">
          <Button className="w-full bg-[#0a1628] hover:bg-[#1a3a6b] text-white gap-2">
            <Home className="w-4 h-4" /> Back to Home
          </Button>
        </Link>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
          <img src="/images/hidden-haven-logo-full.png" alt="HHR" className="h-6 object-contain"
            onError={e => e.target.style.display = 'none'} />
          <span>Hidden Haven Realty — eSign Portal</span>
        </div>
      </div>
    </div>
  );
};

/** Inner component that polls for the signed PDF path */
const SignedDocumentActions = ({ token }) => {
  const [pdfPath, setPdfPath] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let attempts = 0;
    const check = async () => {
      try {
        // The public endpoint doesn't return signed_pdf_url for security
        // We test if the signed PDF exists by trying the likely path from the request id
        // Instead, we call the sign endpoint which returns status; if signed we try to find the PDF
        const res = await axios.get(`${API}/api/esign/sign/${token}`);
        // We don't have signed_pdf_url here but we know it's signed
        // Add template_id to response so we can construct the signed path
        if (res.data.status === 'signed' && res.data.signed_pdf_path) {
          setPdfPath(res.data.signed_pdf_path);
          setChecking(false);
          return;
        }
      } catch {}
      attempts++;
      if (attempts < 5) setTimeout(check, 2000);
      else setChecking(false);
    };
    check();
  }, [token]);

  const pdfUrl = pdfPath ? `${API}${pdfPath}` : null;

  if (checking && !pdfPath) {
    return (
      <div className="flex items-center justify-center gap-2 py-2">
        <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
        <span className="text-white/60 text-sm">Preparing your signed copy...</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <Button
        onClick={() => pdfUrl ? window.open(pdfUrl, '_blank', 'noopener,noreferrer') : null}
        disabled={!pdfUrl}
        className="bg-amber-500 hover:bg-amber-400 text-black font-semibold gap-2 h-11"
        data-testid="view-signed-pdf-btn"
      >
        <ExternalLink className="w-4 h-4" />
        View Document
      </Button>
      <Button
        onClick={() => {
          if (!pdfUrl) return;
          const win = window.open(pdfUrl, '_blank', 'noopener,noreferrer');
          if (win) win.addEventListener('load', () => { try { win.print(); } catch {} });
        }}
        disabled={!pdfUrl}
        variant="outline"
        className="border-white/20 text-white hover:bg-white/10 gap-2 h-11"
        data-testid="print-signed-pdf-btn"
      >
        <Printer className="w-4 h-4" />
        Print
      </Button>
      {!pdfUrl && (
        <p className="col-span-2 text-white/40 text-xs text-center mt-1">
          Document link will be emailed to you momentarily
        </p>
      )}
    </div>
  );
};

export default ESignCompletePage;
