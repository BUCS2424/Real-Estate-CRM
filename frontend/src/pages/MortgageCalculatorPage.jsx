import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { MortgageCalculator } from '../components/MortgageCalculator';
import { PublicSiteHeader } from '../components/public/PublicSiteHeader';

export const MortgageCalculatorPage = () => {
  return (
    <div className="min-h-screen bg-[#0a1628]">
      <PublicSiteHeader contactHref="/#contact" />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 pt-24 pb-12">
        <div className="text-center mb-10">
          <p className="text-amber-400 tracking-[0.2em] text-sm mb-2">FINANCIAL TOOLS</p>
          <h1 className="text-4xl md:text-5xl font-serif text-white mb-4">Mortgage Calculator</h1>
          <p className="text-white/60 max-w-xl mx-auto">
            Calculate your estimated monthly payment, compare loan types, and explore different scenarios 
            to find the perfect financing option for your dream home.
          </p>
        </div>

        <div className="bg-[#0d1f3c]/80 border border-amber-400/20 rounded-2xl overflow-hidden">
          <MortgageCalculator />
        </div>

        {/* Info Section */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <div className="bg-[#0d1f3c]/50 border border-amber-400/10 rounded-xl p-6">
            <h3 className="font-serif text-lg text-amber-400 mb-2">Conventional Loans</h3>
            <p className="text-white/60 text-sm">
              Traditional mortgages with competitive rates. Typically require 3-20% down payment.
              PMI required if down payment is less than 20%.
            </p>
          </div>
          <div className="bg-[#0d1f3c]/50 border border-amber-400/10 rounded-xl p-6">
            <h3 className="font-serif text-lg text-amber-400 mb-2">FHA Loans</h3>
            <p className="text-white/60 text-sm">
              Government-backed loans with lower down payment requirements (3.5%).
              Great for first-time homebuyers with limited savings.
            </p>
          </div>
          <div className="bg-[#0d1f3c]/50 border border-amber-400/10 rounded-xl p-6">
            <h3 className="font-serif text-lg text-amber-400 mb-2">VA & USDA Loans</h3>
            <p className="text-white/60 text-sm">
              Zero down payment options for eligible veterans (VA) or rural property buyers (USDA).
              No private mortgage insurance required.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-12 text-center bg-gradient-to-r from-[#1a2744] to-[#2a3a5c] rounded-2xl p-8 border border-amber-400/20">
          <h2 className="text-2xl font-serif text-white mb-3">Ready to Get Pre-Approved?</h2>
          <p className="text-white/60 mb-6">
            Our trusted lending partners can help you secure the best rates for your home purchase.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/contact">
              <Button className="bg-amber-400 text-black hover:bg-amber-300 px-8">
                Contact an Agent
              </Button>
            </Link>
            <Link to="/showcase">
              <Button variant="outline" className="border-amber-400/50 text-amber-400 hover:bg-amber-400/10 px-8">
                Browse Properties
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 py-8 border-t border-amber-400/10">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-white/40 text-sm">
            Calculator results are estimates only. Actual rates, terms, and payments may vary. 
            Consult with a licensed mortgage professional for accurate quotes.
          </p>
          <p className="text-white/40 text-xs mt-2">
            © {new Date().getFullYear()} Hidden Haven Realty
          </p>
        </div>
      </footer>
    </div>
  );
};

export default MortgageCalculatorPage;
