import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { newsletterAPI } from '../lib/api';
import { Mail, Calendar, Users, Home, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { useBranding } from '../contexts/BrandingContext';
import { PublicSiteHeader } from '../components/public/PublicSiteHeader';
import { PublicSeoHead } from '../components/public/PublicSeoHead';

export const NewsletterArchivePage = () => {
  const { branding } = useBranding();
  const [newsletters, setNewsletters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNewsletter, setSelectedNewsletter] = useState(null);

  useEffect(() => {
    const fetchArchive = async () => {
      try {
        const res = await newsletterAPI.getArchive();
        setNewsletters(res.data || []);
      } catch (error) {
        console.error('Failed to load archive');
      } finally {
        setLoading(false);
      }
    };
    fetchArchive();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'long', day: 'numeric', year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-[#0a1628]">
      <PublicSeoHead
        title="Newsletter Archive"
        description="Read our latest market updates, local insights, and luxury real estate guidance."
        urlPath="/newsletter-archive"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "Hidden Haven Realty Newsletter Archive",
          url: typeof window !== 'undefined' ? `${window.location.origin}/newsletter-archive` : '/newsletter-archive'
        }}
      />
      <PublicSiteHeader contactHref="/#contact" />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Hero Section with Decorative Elements */}
        <div className="text-center mb-12 relative">
          {/* Decorative background elements */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-400/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute top-0 left-10 w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
          <div className="absolute top-20 right-20 w-1.5 h-1.5 bg-amber-400/60 rounded-full"></div>
          
          {/* Icon with decorative rings */}
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 w-24 h-24 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 rounded-full border border-amber-400/20 animate-pulse"></div>
            <div className="absolute inset-0 w-20 h-20 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 rounded-full border border-amber-400/10"></div>
            <div className="relative w-16 h-16 bg-gradient-to-br from-amber-400/20 to-amber-600/20 rounded-full flex items-center justify-center">
              <Mail className="w-8 h-8 text-amber-400" />
            </div>
          </div>
          
          <p className="text-amber-400 uppercase tracking-[0.3em] text-sm mb-3">Stay Informed</p>
          <h1 className="text-4xl md:text-5xl font-serif text-white mb-4">Newsletter <span className="italic text-amber-400">Archive</span></h1>
          <p className="text-white/60 max-w-xl mx-auto">Browse our past newsletters and market updates</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
          </div>
        ) : newsletters.length === 0 ? (
          <Card className="bg-[#0d1f3c]/50 border-amber-400/10 text-center py-16 relative overflow-hidden">
            {/* Decorative rings */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 rounded-full border border-amber-400/10 animate-pulse"></div>
              <div className="absolute w-40 h-40 rounded-full border border-amber-400/5"></div>
            </div>
            <CardContent className="relative z-10">
              <div className="w-20 h-20 bg-amber-400/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-10 h-10 text-amber-400/50" />
              </div>
              <h3 className="text-xl font-serif text-white mb-2">No Newsletters Yet</h3>
              <p className="text-white/50">Check back soon for market updates and property insights</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {newsletters.map((nl, index) => (
              <Card 
                key={nl.id} 
                className="bg-[#0d1f3c]/50 border-amber-400/10 hover:border-amber-400/30 transition-all duration-300 cursor-pointer group relative overflow-hidden"
                onClick={() => setSelectedNewsletter(nl)}
              >
                {/* Hover glow effect */}
                <div className="absolute -right-20 -top-20 w-40 h-40 bg-amber-400/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <CardContent className="p-6 relative z-10">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-amber-400/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Mail className="w-6 h-6 text-amber-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-serif text-white mb-2 group-hover:text-amber-400 transition-colors">{nl.subject}</h3>
                        <div className="flex items-center gap-4 text-sm text-white/50">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(nl.sent_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {nl.recipients_count} recipients
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" className="text-amber-400 hover:text-amber-300 hover:bg-amber-400/10">
                      Read →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Newsletter Detail Modal - Simple inline version */}
        {selectedNewsletter && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelectedNewsletter(null)}>
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b">
                <h2 className="text-2xl font-serif">{selectedNewsletter.subject}</h2>
                <p className="text-muted-foreground text-sm mt-1">{formatDate(selectedNewsletter.sent_at)}</p>
              </div>
              <div className="p-6 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: selectedNewsletter.content || '<p>Content not available</p>' }} />
              <div className="p-4 border-t text-right">
                <Button onClick={() => setSelectedNewsletter(null)}>Close</Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#060d18] border-t border-amber-400/10 py-8 mt-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt={branding.siteName || 'Hidden Haven Realty'} className="h-8 object-contain" data-testid="newsletter-footer-logo" />
              ) : (
                <>
                  <Home className="w-5 h-5 text-amber-400" />
                  <span className="font-serif text-white">{branding.siteName || 'Hidden Haven Realty'}</span>
                </>
              )}
            </div>
            <div className="flex gap-6 text-sm text-white/50">
              <Link to="/showcase" className="hover:text-amber-400 transition-colors">Listing Showcase</Link>
              <Link to="/about" className="hover:text-amber-400 transition-colors">About</Link>
              <a href="/#contact" className="hover:text-amber-400 transition-colors">Contact</a>
            </div>
            <p className="text-sm text-white/30">
              Powered By: <a href="https://a2gdesigns.com" target="_blank" rel="noopener noreferrer" className="text-amber-400/70 hover:text-amber-400">A2G</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
