import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { publicAPI } from '../lib/api';
import { Loader2 } from 'lucide-react';
import { PublicSiteHeader } from '../components/public/PublicSiteHeader';
import { PublicSeoHead } from '../components/public/PublicSeoHead';
import { MapListingsLayout } from '../components/MapListingsLayout';
import axios from 'axios';

const API_URL = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

export const PublicListingsPage = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const allListings = [];
      const seen = new Set();

      // 1. Fetch our showcase/converted listings from DB
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
              status: 'Active',
              days_on_market: null,
              listing_agent: l.owner_name || null,
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

      // 2. Fetch MLS listings from neighborhoods (pulls active for-sale from MLS)
      try {
        const neighborhoodsRes = await axios.get(`${API_URL}/api/neighborhoods/public/list`);
        const hoods = Array.isArray(neighborhoodsRes.data) ? neighborhoodsRes.data : [];
        
        for (const n of hoods.slice(0, 7)) {
          try {
            const nRes = await axios.get(`${API_URL}/api/neighborhoods/public/${n.slug}`);
            const items = Array.isArray(nRes.data?.listings) ? nRes.data.listings : [];
            for (const item of items) {
              const key = item.mls_id || item.address;
              if (!seen.has(key)) {
                seen.add(key);
                item._source = 'mls';
                allListings.push(item);
              }
            }
          } catch (e) { /* skip */ }
        }
      } catch (e) {
        console.error('Failed to fetch MLS listings', e);
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
