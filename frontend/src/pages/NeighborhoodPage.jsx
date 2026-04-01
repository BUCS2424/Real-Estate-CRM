import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Building2, Loader2 } from 'lucide-react';
import { PublicSiteHeader } from '../components/public/PublicSiteHeader';
import { PublicSeoHead } from '../components/public/PublicSeoHead';
import { MapListingsLayout } from '../components/MapListingsLayout';
import axios from 'axios';

const API_URL = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

export const NeighborhoodPage = () => {
  const { slug } = useParams();
  const [neighborhood, setNeighborhood] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(`${API_URL}/api/neighborhoods/public/${slug}`);
        setNeighborhood(res.data.neighborhood);
        setListings(Array.isArray(res.data.listings) ? res.data.listings : []);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load neighborhood');
      } finally {
        setLoading(false);
      }
    };
    if (slug) fetchData();
  }, [slug]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a1628]">
        <PublicSeoHead title="Neighborhood | Hidden Haven Realty" />
        <PublicSiteHeader activePage="neighborhoods" />
        <div className="text-center py-20">
          <Building2 className="w-16 h-16 mx-auto text-white/20 mb-4" />
          <h2 className="text-2xl font-serif text-white mb-2">Coming Soon</h2>
          <p className="text-white/60 mb-6">This neighborhood page is being built. Check back soon!</p>
          <Link to="/neighborhoods" className="text-amber-400 hover:text-amber-300 text-sm flex items-center justify-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Neighborhoods
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1628] flex flex-col">
      <PublicSeoHead
        title={neighborhood ? `${neighborhood.name} | Hidden Haven Realty` : 'Neighborhoods | Hidden Haven Realty'}
        description={neighborhood ? `Browse active listings in ${neighborhood.name}` : 'Explore Tampa Bay neighborhoods'}
      />
      <PublicSiteHeader activePage="neighborhoods" />

      {/* Back link bar */}
      <div className="bg-[#0d1f3c] border-b border-white/10 px-4 py-2">
        <Link to="/neighborhoods" className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 text-sm" data-testid="back-to-neighborhoods">
          <ArrowLeft className="w-4 h-4" /> All Neighborhoods
        </Link>
      </div>

      <MapListingsLayout
        listings={listings}
        title={neighborhood?.name || 'Loading...'}
        subtitle={loading ? 'Searching MLS...' : `${listings.length} active listing${listings.length !== 1 ? 's' : ''}`}
        loading={loading}
        showFilters={true}
      />
    </div>
  );
};

export default NeighborhoodPage;
