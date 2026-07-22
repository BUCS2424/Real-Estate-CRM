import React, { useState, useEffect } from 'react';
import { publicAPI } from '../lib/api';
import { PublicSiteHeader } from '../components/public/PublicSiteHeader';
import { PublicSeoHead } from '../components/public/PublicSeoHead';
import { MapListingsLayout } from '../components/MapListingsLayout';

export const ProvenResultsPage = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSold = async () => {
      try {
        const res = await publicAPI.getProvenResults(200);
        const dbListings = Array.isArray(res?.data) ? res.data : [];
        const mapped = dbListings.map((l) => ({
          mls_id: l.mls_id || null,
          address: l.address,
          city: l.city || '',
          state: l.state || 'FL',
          zip_code: l.zip_code || '',
          bedrooms: l.bedrooms,
          bathrooms: l.bathrooms,
          sqft: l.sqft,
          lot_size: l.lot_size,
          list_price: l.close_price || (l.price ? parseInt(String(l.price).replace(/[^0-9]/g, '')) : null),
          year_built: l.year_built,
          property_type: l.property_type,
          primary_photo: l.images?.[0]?.url || l.images?.[0] || l.gallery_images?.[0]?.url || null,
          photos: (l.images || []).map((img) => (typeof img === 'string' ? img : img?.url)).filter(Boolean),
          latitude: l.latitude || null,
          longitude: l.longitude || null,
          status: 'Sold',
          close_date: l.close_date || null,
          days_on_market: null,
          listing_agent: l.listing_agent || 'Sheila M Desautels',
          subdivision: l.subdivision || null,
          _source: 'showcase',
          _showcase_id: l.id,
          _slug: l.slug,
        }));
        setListings(mapped);
      } catch (e) {
        console.error('Failed to fetch proven results', e);
      } finally {
        setLoading(false);
      }
    };
    fetchSold();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a1628] flex flex-col" data-testid="proven-results-page">
      <PublicSeoHead
        title="Proven Results | Hidden Haven Realty"
        description="Sold luxury properties represented by Sheila Desautels — a track record of proven results in Tampa Bay real estate."
        urlPath="/proven-results"
      />
      <PublicSiteHeader activePage="proven-results" />

      <MapListingsLayout
        listings={listings}
        title="Proven Results"
        subtitle={loading ? 'Loading sold properties...' : `${listings.length} homes sold by Sheila Desautels`}
        loading={loading}
        showFilters={true}
      />
    </div>
  );
};

export default ProvenResultsPage;
