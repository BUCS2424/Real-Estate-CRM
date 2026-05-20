import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Download, Home } from 'lucide-react';
import { Button } from '../components/ui/button';

const API = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

export const ESignCompletePage = () => {
  const { token } = useParams();
  return (
    <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>
        <h1 className="text-3xl font-bold text-[#0a1628] mb-3">All Done!</h1>
        <p className="text-gray-600 mb-2 leading-relaxed">
          Your document has been signed and submitted successfully.
        </p>
        <p className="text-gray-500 text-sm mb-8">
          A signed copy has been emailed to you and to Sheila Desautels at Hidden Haven Realty.
        </p>
        <div className="space-y-3">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
            <p className="text-amber-800 text-sm font-medium">What happens next?</p>
            <ul className="text-amber-700 text-sm mt-2 space-y-1 list-disc list-inside">
              <li>You'll receive a copy via email</li>
              <li>Sheila will review and follow up with you</li>
              <li>Keep your copy for your records</li>
            </ul>
          </div>
          <Link to="/">
            <Button className="w-full bg-[#0a1628] hover:bg-[#1a3a6b] text-white gap-2">
              <Home className="w-4 h-4" /> Back to Home
            </Button>
          </Link>
        </div>
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
          <img src="/images/hidden-haven-logo-full.png" alt="HHR" className="h-6 object-contain" onError={e => e.target.style.display='none'} />
          <span>Powered by Hidden Haven Realty</span>
        </div>
      </div>
    </div>
  );
};

export default ESignCompletePage;
