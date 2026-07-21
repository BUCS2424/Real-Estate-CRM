import React, { useState, useEffect } from 'react';
import { publicAPI } from '../lib/api';
import { PublicSiteHeader } from '../components/public/PublicSiteHeader';
import { PublicSeoHead } from '../components/public/PublicSeoHead';
import { MapListingsLayout } from '../components/MapListingsLayout';

export const PublicListingsPage = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const allListings = [];
      const seen = new Set();

      // Showcase only ever shows Sheila Desautels' own live listings
      // (Active/Pending) — never other agents' MLS results.
      try {
        const res = await publicAPI.getListings(200);
        const dbListings = Array.isArray(res?.data) ? res.data : [];
        for (const l of dbListings) {
          const key = l.id || l.address;
          if (!seen.has(key)) {
            seen.add(key);
            // Normalize DB listing to match MLS listing shape
            allListings.push({
              mls_id: l.mls_id || null,
              address: l.address,
              city: l.city || '',
              state: l.state || 'FL',
              zip_code: l.zip_code || '',
              bedrooms: l.bedrooms,
              bathrooms: l.bathrooms,
              sqft: l.sqft,
              lot_size: l.lot_size,
              list_price: l.price ? parseInt(String(l.price).replace(/[^0-9]/g, '')) : null,
              year_built: l.year_built,
              property_type: l.property_type,
              primary_photo: l.images?.[0]?.url || l.images?.[0] || l.gallery_images?.[0]?.url || null,
              photos: (l.images || []).map(img => typeof img === 'string' ? img : img?.url).filter(Boolean),
              latitude: l.latitude || null,
              longitude: l.longitude || null,
              status: l.status === 'pending' ? 'Pending' : 'Active',
              days_on_market: null,
              listing_agent: l.listing_agent || 'Sheila M Desautels',
              subdivision: l.subdivision || null,
              _source: 'showcase',
              _showcase_id: l.id,
              _slug: l.slug,
            });
          }
        }
      } catch (e) {
        console.error('Failed to fetch showcase listings', e);
      }

      setListings(allListings);
      setLoading(false);
    };

    fetchAll();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a1628] flex flex-col">
      <PublicSeoHead
        title="Listing Showcase | Hidden Haven Realty"
        description="Browse curated listings, featured homes, and new opportunities from Hidden Haven Realty."
        urlPath="/showcase"
      />
      <PublicSiteHeader activePage="showcase" />

      <MapListingsLayout
        listings={listings}
        title="Listing Showcase"
        subtitle={loading ? 'Loading properties...' : `${listings.length} properties`}
        loading={loading}
        showFilters={true}
      />
    </div>
  );
};

export default PublicListingsPage;
