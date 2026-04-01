import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Home, MapPin, Bed, Bath, Square, DollarSign, Loader2, ArrowLeft, Building2 } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { PublicSiteHeader } from '../components/public/PublicSiteHeader';
import { PublicSeoHead } from '../components/public/PublicSeoHead';
import axios from 'axios';

const API_URL = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

const formatPrice = (price) => {
  if (!price) return '';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price);
};

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

  return (
    <div className="min-h-screen bg-[#0a1628]">
      <PublicSeoHead
        title={neighborhood ? `${neighborhood.name} | Hidden Haven Realty` : 'Neighborhoods | Hidden Haven Realty'}
        description={neighborhood ? `Browse active listings in ${neighborhood.name}` : 'Explore Tampa Bay neighborhoods'}
      />
      <PublicSiteHeader activePage="neighborhoods" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link to="/neighborhoods" className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 mb-6 text-sm" data-testid="back-to-neighborhoods">
          <ArrowLeft className="w-4 h-4" /> All Neighborhoods
        </Link>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-10 h-10 animate-spin text-amber-400" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <Building2 className="w-16 h-16 mx-auto text-white/20 mb-4" />
            <h2 className="text-2xl font-serif text-white mb-2">Coming Soon</h2>
            <p className="text-white/60">This neighborhood page is being built. Check back soon!</p>
          </div>
        ) : (
          <>
            <h1 className="text-4xl sm:text-5xl font-serif text-white mb-2" data-testid="neighborhood-title">
              {neighborhood?.name}
            </h1>
            <p className="text-white/60 mb-8">{listings.length} active listing{listings.length !== 1 ? 's' : ''}</p>

            {listings.length === 0 ? (
              <div className="text-center py-20">
                <Home className="w-16 h-16 mx-auto text-white/20 mb-4" />
                <h2 className="text-xl font-serif text-white mb-2">No Active Listings</h2>
                <p className="text-white/60">There are no active listings in this neighborhood right now. Check back soon!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.map((listing) => (
                  <Card key={listing.mls_id || listing.address} className="bg-white/5 border-white/10 overflow-hidden hover:border-amber-400/30 transition-all group">
                    <div className="aspect-[4/3] overflow-hidden bg-white/5">
                      {listing.primary_photo ? (
                        <img
                          src={listing.primary_photo}
                          alt={listing.address}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Home className="w-12 h-12 text-white/20" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <p className="text-amber-400 text-xl font-serif font-bold mb-1">
                        {formatPrice(listing.list_price)}
                      </p>
                      <p className="text-white font-medium text-sm mb-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-amber-400/70" />
                        {listing.address}
                      </p>
                      <p className="text-white/50 text-xs mb-3">
                        {listing.city}, {listing.state} {listing.zip_code}
                      </p>
                      <div className="flex items-center gap-4 text-white/70 text-xs">
                        {listing.bedrooms && (
                          <span className="flex items-center gap-1"><Bed className="w-3 h-3" /> {listing.bedrooms} Beds</span>
                        )}
                        {listing.bathrooms && (
                          <span className="flex items-center gap-1"><Bath className="w-3 h-3" /> {listing.bathrooms} Baths</span>
                        )}
                        {listing.sqft && (
                          <span className="flex items-center gap-1"><Square className="w-3 h-3" /> {listing.sqft?.toLocaleString()} sqft</span>
                        )}
                      </div>
                      {listing.mls_id && (
                        <p className="text-white/30 text-[10px] mt-2">MLS# {listing.mls_id}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default NeighborhoodPage;
