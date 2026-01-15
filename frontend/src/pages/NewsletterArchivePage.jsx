import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { newsletterAPI } from '../lib/api';
import { Mail, Calendar, Users, ArrowLeft, Home, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';

export const NewsletterArchivePage = () => {
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
      {/* Header */}
      <header className="bg-[#0a1628]/95 border-b border-amber-400/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <Home className="w-6 h-6 text-amber-400" />
              <span className="font-serif text-xl text-white">Fusion Luxury Estates</span>
            </Link>
            <Link to="/">
              <Button variant="outline" size="sm" className="border-amber-400/50 text-amber-400 hover:bg-amber-400 hover:text-black">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <Mail className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h1 className="text-4xl font-serif text-white mb-4">Newsletter Archive</h1>
          <p className="text-white/60">Browse our past newsletters and market updates</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
          </div>
        ) : newsletters.length === 0 ? (
          <Card className="bg-[#0d1f3c]/50 border-amber-400/10 text-center py-16">
            <CardContent>
              <Mail className="w-16 h-16 text-amber-400/30 mx-auto mb-4" />
              <h3 className="text-xl font-serif text-white mb-2">No Newsletters Yet</h3>
              <p className="text-white/50">Check back soon for market updates and property insights</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {newsletters.map(nl => (
              <Card 
                key={nl.id} 
                className="bg-[#0d1f3c]/50 border-amber-400/10 hover:border-amber-400/30 transition-colors cursor-pointer"
                onClick={() => setSelectedNewsletter(nl)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-serif text-white mb-2">{nl.subject}</h3>
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-white/40 text-sm">
            Powered By: <a href="https://a2gdesigns.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">A2G</a>
          </p>
        </div>
      </footer>
    </div>
  );
};
