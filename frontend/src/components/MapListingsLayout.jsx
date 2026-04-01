import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Home, MapPin, Bed, Bath, Square, DollarSign, Search, SlidersHorizontal, X } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import 'leaflet/dist/leaflet.css';

// Fix default Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const goldIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const activeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const formatPrice = (price) => {
  if (!price) return '';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price);
};

function FitBounds({ listings }) {
  const map = useMap();
  useEffect(() => {
    const coords = listings
      .filter(l => l.latitude && l.longitude)
      .map(l => [l.latitude, l.longitude]);
    if (coords.length > 0) {
      map.fitBounds(coords, { padding: [30, 30], maxZoom: 14 });
    }
  }, [listings, map]);
  return null;
}

export const MapListingsLayout = ({
  listings = [],
  title = 'Properties',
  subtitle = '',
  loading = false,
  showFilters = true,
}) => {
  const [selectedId, setSelectedId] = useState(null);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [beds, setBeds] = useState('any');
  const [sortBy, setSortBy] = useState('newest');
  const [searchText, setSearchText] = useState('');
  const listRef = useRef(null);
  const navigate = useNavigate();

  // Filter listings
  let filtered = [...listings];
  if (minPrice) filtered = filtered.filter(l => (l.list_price || 0) >= parseInt(minPrice));
  if (maxPrice) filtered = filtered.filter(l => (l.list_price || 0) <= parseInt(maxPrice));
  if (beds && beds !== 'any') filtered = filtered.filter(l => (l.bedrooms || 0) >= parseInt(beds));
  if (searchText) {
    const q = searchText.toLowerCase();
    filtered = filtered.filter(l =>
      (l.address || '').toLowerCase().includes(q) ||
      (l.city || '').toLowerCase().includes(q) ||
      (l.zip_code || '').includes(q) ||
      (l.mls_id || '').toLowerCase().includes(q)
    );
  }

  // Sort
  if (sortBy === 'price_asc') filtered.sort((a, b) => (a.list_price || 0) - (b.list_price || 0));
  else if (sortBy === 'price_desc') filtered.sort((a, b) => (b.list_price || 0) - (a.list_price || 0));
  else if (sortBy === 'beds') filtered.sort((a, b) => (b.bedrooms || 0) - (a.bedrooms || 0));

  const mappable = filtered.filter(l => l.latitude && l.longitude);

  const scrollToCard = (mlsId) => {
    setSelectedId(mlsId);
    const el = document.getElementById(`listing-card-${mlsId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]" data-testid="map-listings-layout">
      {/* Filter Bar */}
      {showFilters && (
        <div className="bg-[#0d1f3c] border-b border-white/10 px-4 py-3">
          <div className="flex flex-wrap items-center gap-3 max-w-full">
            <div className="relative flex-1 min-w-[180px] max-w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                placeholder="Search address, city, zip..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 h-9 text-sm"
                data-testid="map-search-input"
              />
            </div>
            <Input
              placeholder="Min Price"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value.replace(/\D/g, ''))}
              className="w-[110px] bg-white/5 border-white/10 text-white placeholder:text-white/30 h-9 text-sm"
              data-testid="min-price-input"
            />
            <Input
              placeholder="Max Price"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value.replace(/\D/g, ''))}
              className="w-[110px] bg-white/5 border-white/10 text-white placeholder:text-white/30 h-9 text-sm"
              data-testid="max-price-input"
            />
            <Select value={beds} onValueChange={setBeds}>
              <SelectTrigger className="w-[100px] bg-white/5 border-white/10 text-white h-9 text-sm">
                <SelectValue placeholder="Beds" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Beds</SelectItem>
                <SelectItem value="1">1+</SelectItem>
                <SelectItem value="2">2+</SelectItem>
                <SelectItem value="3">3+</SelectItem>
                <SelectItem value="4">4+</SelectItem>
                <SelectItem value="5">5+</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[120px] bg-white/5 border-white/10 text-white h-9 text-sm">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price_asc">Price: Low</SelectItem>
                <SelectItem value="price_desc">Price: High</SelectItem>
                <SelectItem value="beds">Most Beds</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-white/50 text-sm ml-auto">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      )}

      {/* Map + Listings Split */}
      <div className="flex flex-1 overflow-hidden">
        {/* Map - Left Side */}
        <div className="w-[55%] lg:w-[60%] relative hidden md:block" data-testid="map-container">
          {loading ? (
            <div className="w-full h-full bg-[#0d1f3c] flex items-center justify-center">
              <div className="animate-spin w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full" />
            </div>
          ) : (
            <MapContainer
              center={[27.95, -82.46]}
              zoom={11}
              className="w-full h-full z-0"
              style={{ background: '#0d1f3c' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              {mappable.length > 0 && <FitBounds listings={mappable} />}
              {mappable.map((listing) => (
                <Marker
                  key={listing.mls_id || listing.address}
                  position={[listing.latitude, listing.longitude]}
                  icon={selectedId === listing.mls_id ? activeIcon : goldIcon}
                  eventHandlers={{
                    click: () => scrollToCard(listing.mls_id),
                  }}
                >
                  <Popup>
                    <div className="text-xs min-w-[180px]">
                      {listing.primary_photo && (
                        <img src={listing.primary_photo} alt="" className="w-full h-20 object-cover rounded mb-1" />
                      )}
                      <p className="font-bold text-amber-600">{formatPrice(listing.list_price)}</p>
                      <p className="font-medium">{listing.address}</p>
                      <p className="text-gray-500">{listing.bedrooms} bd | {listing.bathrooms} ba | {listing.sqft?.toLocaleString()} sqft</p>
                      {listing.mls_id && (
                        <a href={`/mls-property/${listing.mls_id}`} className="text-blue-500 text-[11px] mt-1 block hover:underline">View Details</a>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>

        {/* Listings - Right Side */}
        <div
          ref={listRef}
          className="w-full md:w-[45%] lg:w-[40%] overflow-y-auto bg-[#0a1628] border-l border-white/10"
          data-testid="listings-panel"
        >
          <div className="p-4 border-b border-white/10 sticky top-0 bg-[#0a1628] z-10">
            <h2 className="text-lg font-serif text-white font-bold">{title}</h2>
            {subtitle && <p className="text-white/50 text-sm">{subtitle}</p>}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Home className="w-12 h-12 mx-auto text-white/15 mb-3" />
              <p className="text-white/50 text-sm">No listings found for the selected filters.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filtered.map((listing) => (
                <div
                  key={listing.mls_id || listing.address}
                  id={`listing-card-${listing.mls_id}`}
                  className={`p-4 hover:bg-white/5 cursor-pointer transition-colors ${
                    selectedId === listing.mls_id ? 'bg-amber-400/10 border-l-2 border-amber-400' : ''
                  }`}
                  onClick={() => {
                    if (listing.mls_id) {
                      navigate(`/mls-property/${listing.mls_id}`);
                    } else {
                      setSelectedId(listing.mls_id);
                    }
                  }}
                  data-testid={`listing-card-${listing.mls_id}`}
                >
                  <div className="flex gap-3">
                    <div className="w-28 h-20 rounded-lg overflow-hidden bg-white/5 shrink-0">
                      {listing.primary_photo ? (
                        <img src={listing.primary_photo} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Home className="w-6 h-6 text-white/20" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-amber-400 font-bold text-base">{formatPrice(listing.list_price)}</p>
                      <p className="text-white text-sm truncate">{listing.address}</p>
                      <p className="text-white/40 text-xs">{listing.city}, {listing.state} {listing.zip_code}</p>
                      <div className="flex items-center gap-3 mt-1 text-white/50 text-xs">
                        {listing.bedrooms && <span>{listing.bedrooms} bd</span>}
                        {listing.bathrooms && <span>{listing.bathrooms} ba</span>}
                        {listing.sqft && <span>{listing.sqft?.toLocaleString()} sqft</span>}
                      </div>
                    </div>
                  </div>
                  {listing.mls_id && (
                    <p className="text-white/20 text-[10px] mt-1 ml-[7.5rem]">MLS# {listing.mls_id}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapListingsLayout;
