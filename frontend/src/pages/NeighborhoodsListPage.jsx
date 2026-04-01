import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ArrowRight, Loader2, Building2 } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { PublicSiteHeader } from '../components/public/PublicSiteHeader';
import { PublicSeoHead } from '../components/public/PublicSeoHead';
import { MapListingsLayout } from '../components/MapListingsLayout';
import axios from 'axios';

const API_URL = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

export const NeighborhoodsListPage = () => {
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeNeighborhood, setActiveNeighborhood] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/neighborhoods/public/list`);
        const hoods = Array.isArray(res.data) ? res.data : [];
        setNeighborhoods(hoods);

        // Fetch listings for all neighborhoods
        const allListings = [];
        const seen = new Set();
        for (const n of hoods.slice(0, 7)) {
          try {
            const lRes = await axios.get(`${API_URL}/api/neighborhoods/public/${n.slug}`);
            const items = Array.isArray(lRes.data?.listings) ? lRes.data.listings : [];
            for (const item of items) {
              const key = item.mls_id || item.address;
              if (!seen.has(key)) {
                seen.add(key);
                item._neighborhood = n.name;
                allListings.push(item);
              }
            }
          } catch (e) { /* skip failed neighborhood */ }
        }
        setListings(allListings);
      } catch (err) {
        console.error('Failed to load neighborhoods');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredListings = activeNeighborhood
    ? listings.filter(l => l._neighborhood === activeNeighborhood)
    : listings;

  return (
    <div className="min-h-screen bg-[#0a1628] flex flex-col">
      <PublicSeoHead
        title="Neighborhoods | Hidden Haven Realty"
        description="Explore Tampa Bay's most sought-after neighborhoods with Hidden Haven Realty"
      />
      <PublicSiteHeader activePage="neighborhoods" />

      {/* Neighborhood Pills */}
      <div className="bg-[#0d1f3c] border-b border-white/10 px-4 py-3">
        <div className="max-w-full flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              !activeNeighborhood ? 'bg-amber-400 text-black' : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
            onClick={() => setActiveNeighborhood(null)}
            data-testid="filter-all"
          >
            All Neighborhoods
          </button>
          {neighborhoods.map(n => (
            <button
              key={n.id}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeNeighborhood === n.name ? 'bg-amber-400 text-black' : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
              onClick={() => setActiveNeighborhood(activeNeighborhood === n.name ? null : n.name)}
              data-testid={`filter-${n.slug}`}
            >
              {n.name}
            </button>
          ))}
        </div>
      </div>

      <MapListingsLayout
        listings={filteredListings}
        title={activeNeighborhood || 'All Neighborhoods'}
        subtitle={`${filteredListings.length} active listings`}
        loading={loading}
        showFilters={true}
      />
    </div>
  );
};

export default NeighborhoodsListPage;
