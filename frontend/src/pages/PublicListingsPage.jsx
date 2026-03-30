import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { publicAPI } from '../lib/api';
import { 
  Search, 
  Bed, 
  Bath, 
  Square, 
  MapPin,
  SlidersHorizontal,
  Grid3X3,
  Map,
  ChevronDown,
  X,
  Loader2,
  Home,
  Building2,
  DollarSign,
  ArrowUpDown,
  Star,
  CheckCircle,
  Gavel,
  Sparkles,
  TrendingDown,
  FileSignature,
  EyeOff,
  Clock,
  Tag
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../components/ui/sheet';
import { Slider } from '../components/ui/slider';
import { useBranding } from '../contexts/BrandingContext';
import { PublicSiteHeader } from '../components/public/PublicSiteHeader';

// Badge configuration with icons and colors
const BADGE_CONFIG = {
  sold: { label: 'SOLD', color: '#ffffff', bg: '#ef4444', icon: CheckCircle },
  featured: { label: 'FEATURED', color: '#1a2744', bg: '#f59e0b', icon: Star },
  private_auction: { label: 'PRIVATE AUCTION', color: '#ffffff', bg: '#8b5cf6', icon: Gavel },
  new_listing: { label: 'NEW LISTING', color: '#ffffff', bg: '#22c55e', icon: Sparkles },
  price_reduced: { label: 'PRICE REDUCED', color: '#ffffff', bg: '#3b82f6', icon: TrendingDown },
  under_contract: { label: 'UNDER CONTRACT', color: '#ffffff', bg: '#ec4899', icon: FileSignature },
  off_market: { label: 'OFF MARKET', color: '#d4a646', bg: '#1a2744', icon: EyeOff },
  coming_soon: { label: 'COMING SOON', color: '#1a2744', bg: '#fbbf24', icon: Clock },
};

const PROPERTY_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'single_family', label: 'Single Family' },
  { value: 'condo', label: 'Condo / Penthouse' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'estate', label: 'Estate' },
  { value: 'land', label: 'Land' },
];

const SORT_OPTIONS = [
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'newest', label: 'Newest First' },
  { value: 'beds_desc', label: 'Most Bedrooms' },
  { value: 'sqft_desc', label: 'Largest' },
];

const FLORIDA_CITIES = [
  'All Areas',
  'Miami',
  'Miami Beach',
  'Palm Beach',
  'Boca Raton',
  'Fort Lauderdale',
  'Naples',
  'Sarasota',
  'Tampa',
  'Orlando',
  'Jupiter',
  'Key Biscayne',
  'Coral Gables',
  'Fisher Island',
  'Star Island',
];

export const PublicListingsPage = () => {
  const { branding } = useBranding();
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCity, setSelectedCity] = useState(searchParams.get('city') || 'All Areas');
  const [propertyType, setPropertyType] = useState(searchParams.get('type') || 'all');
  const [priceRange, setPriceRange] = useState([0, 100000000]);
  const [minBeds, setMinBeds] = useState(searchParams.get('beds') || 'any');
  const [minBaths, setMinBaths] = useState(searchParams.get('baths') || 'any');
  const [sortBy, setSortBy] = useState('price_desc');

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const res = await publicAPI.getListings();
        setListings(res.data || []);
      } catch (error) {
        console.error('Failed to fetch listings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchListings();
  }, []);

  // Filter and sort listings
  const filteredListings = useMemo(() => {
    let result = [...listings];
    
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l => 
        l.address?.toLowerCase().includes(q) ||
        l.city?.toLowerCase().includes(q) ||
        l.description?.toLowerCase().includes(q)
      );
    }
    
    // City filter
    if (selectedCity !== 'All Areas') {
      result = result.filter(l => 
        l.city?.toLowerCase().includes(selectedCity.toLowerCase())
      );
    }
    
    // Property type
    if (propertyType !== 'all') {
      result = result.filter(l => l.property_type === propertyType);
    }
    
    // Price range
    result = result.filter(l => 
      l.price >= priceRange[0] && l.price <= priceRange[1]
    );
    
    // Bedrooms
    if (minBeds !== 'any') {
      result = result.filter(l => l.bedrooms >= parseInt(minBeds));
    }
    
    // Bathrooms
    if (minBaths !== 'any') {
      result = result.filter(l => l.bathrooms >= parseInt(minBaths));
    }
    
    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'price_asc': return a.price - b.price;
        case 'price_desc': return b.price - a.price;
        case 'beds_desc': return b.bedrooms - a.bedrooms;
        case 'sqft_desc': return b.sqft - a.sqft;
        case 'newest': return new Date(b.created_at) - new Date(a.created_at);
        default: return 0;
      }
    });
    
    return result;
  }, [listings, searchQuery, selectedCity, propertyType, priceRange, minBeds, minBaths, sortBy]);

  const formatPrice = (price) => {
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(price % 1000000 === 0 ? 0 : 1)}M`;
    }
    return `$${price.toLocaleString()}`;
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCity('All Areas');
    setPropertyType('all');
    setPriceRange([0, 100000000]);
    setMinBeds('any');
    setMinBaths('any');
    setSortBy('price_desc');
  };

  const activeFiltersCount = [
    searchQuery.trim(),
    selectedCity !== 'All Areas',
    propertyType !== 'all',
    priceRange[0] > 0 || priceRange[1] < 100000000,
    minBeds !== 'any',
    minBaths !== 'any'
  ].filter(Boolean).length;

  const FilterPanel = ({ className = '' }) => (
    <div className={`space-y-6 ${className}`}>
      {/* Location */}
      <div>
        <label className="text-sm font-medium text-white/80 mb-2 block">Location</label>
        <Select value={selectedCity} onValueChange={setSelectedCity}>
          <SelectTrigger className="bg-[#0d1f3c] border-amber-400/20 text-white">
            <MapPin className="w-4 h-4 mr-2 text-amber-400" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#0d1f3c] border-amber-400/20">
            {FLORIDA_CITIES.map(city => (
              <SelectItem key={city} value={city} className="text-white hover:bg-amber-400/10">
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Property Type */}
      <div>
        <label className="text-sm font-medium text-white/80 mb-2 block">Property Type</label>
        <Select value={propertyType} onValueChange={setPropertyType}>
          <SelectTrigger className="bg-[#0d1f3c] border-amber-400/20 text-white">
            <Building2 className="w-4 h-4 mr-2 text-amber-400" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#0d1f3c] border-amber-400/20">
            {PROPERTY_TYPES.map(type => (
              <SelectItem key={type.value} value={type.value} className="text-white hover:bg-amber-400/10">
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Price Range */}
      <div>
        <label className="text-sm font-medium text-white/80 mb-2 block">
          Price Range: {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])}
        </label>
        <Slider
          value={priceRange}
          onValueChange={setPriceRange}
          min={0}
          max={100000000}
          step={1000000}
          className="my-4"
        />
        <div className="flex justify-between text-xs text-white/50">
          <span>$0</span>
          <span>$100M+</span>
        </div>
      </div>

      {/* Bedrooms */}
      <div>
        <label className="text-sm font-medium text-white/80 mb-2 block">Bedrooms</label>
        <div className="flex gap-2">
          {['any', '1', '2', '3', '4', '5+'].map(val => (
            <button
              key={val}
              onClick={() => setMinBeds(val)}
              className={`flex-1 py-2 rounded text-sm transition-all ${
                minBeds === val 
                  ? 'bg-amber-400 text-black font-medium' 
                  : 'bg-[#0d1f3c] text-white/70 hover:bg-amber-400/20'
              }`}
            >
              {val === 'any' ? 'Any' : val}
            </button>
          ))}
        </div>
      </div>

      {/* Bathrooms */}
      <div>
        <label className="text-sm font-medium text-white/80 mb-2 block">Bathrooms</label>
        <div className="flex gap-2">
          {['any', '1', '2', '3', '4+'].map(val => (
            <button
              key={val}
              onClick={() => setMinBaths(val)}
              className={`flex-1 py-2 rounded text-sm transition-all ${
                minBaths === val 
                  ? 'bg-amber-400 text-black font-medium' 
                  : 'bg-[#0d1f3c] text-white/70 hover:bg-amber-400/20'
              }`}
            >
              {val === 'any' ? 'Any' : val}
            </button>
          ))}
        </div>
      </div>

      {activeFiltersCount > 0 && (
        <Button 
          variant="outline" 
          onClick={clearFilters}
          className="w-full border-amber-400/30 text-amber-400 hover:bg-amber-400/10"
        >
          <X className="w-4 h-4 mr-2" />
          Clear Filters ({activeFiltersCount})
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a1628]">
      <PublicSiteHeader activePage="showcase" contactHref="/#contact" />

      {/* Hero */}
      <div className="pt-24 bg-gradient-to-b from-[#0a1628] via-[#0d1f3c] to-[#0a1628] relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-20 left-10 w-64 h-64 bg-amber-400/5 rounded-full blur-3xl"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-amber-400/3 rounded-full blur-3xl"></div>
        <div className="absolute top-32 left-1/4 w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
        <div className="absolute top-48 right-1/3 w-1.5 h-1.5 bg-amber-400/60 rounded-full"></div>
        <div className="absolute top-24 right-1/4 w-1 h-1 bg-amber-400/40 rounded-full"></div>
        
        {/* Corner Accents */}
        <div className="absolute top-20 left-8 w-16 h-16 border-l-2 border-t-2 border-amber-400/20 rounded-tl-2xl"></div>
        <div className="absolute top-20 right-8 w-16 h-16 border-r-2 border-t-2 border-amber-400/20 rounded-tr-2xl"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center relative z-10">
          <p className="text-amber-400 uppercase tracking-[0.3em] text-sm mb-4">Exclusive Collection</p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-white mb-4">
            Showcase of <span className="italic text-amber-400">Off Market</span> Properties
          </h1>
          <p className="text-lg text-white/60 max-w-2xl mx-auto mb-8">
            Discover exceptional homes in Florida&apos;s most prestigious neighborhoods
          </p>
          
          {/* Search Bar */}
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by address, city, or neighborhood..."
                  className="w-full pl-12 pr-4 py-6 bg-[#0d1f3c]/80 border-amber-400/20 text-white placeholder:text-white/40 text-lg rounded-xl focus:border-amber-400"
                />
              </div>
              <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                <SheetTrigger asChild>
                  <Button 
                    className="lg:hidden bg-amber-400 text-black hover:bg-amber-300 px-6 py-6 rounded-xl"
                  >
                    <SlidersHorizontal className="w-5 h-5" />
                    {activeFiltersCount > 0 && (
                      <Badge className="ml-2 bg-black text-amber-400">{activeFiltersCount}</Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="bg-[#0a1628] border-amber-400/20 w-80">
                  <SheetHeader>
                    <SheetTitle className="text-white font-serif">Filters</SheetTitle>
                    <SheetDescription className="text-white/60">
                      Refine your property search
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-6">
                    <FilterPanel />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Desktop Sidebar Filters */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-24 bg-[#0d1f3c]/50 rounded-2xl p-6 border border-amber-400/10 relative overflow-hidden">
              {/* Decorative glow */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-400/5 rounded-full blur-2xl"></div>
              <h3 className="text-lg font-serif text-white mb-6 flex items-center gap-2 relative z-10">
                <div className="w-10 h-10 bg-amber-400/10 rounded-xl flex items-center justify-center">
                  <SlidersHorizontal className="w-5 h-5 text-amber-400" />
                </div>
                Filters
              </h3>
              <FilterPanel />
            </div>
          </aside>

          {/* Listings Grid */}
          <main className="flex-1">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-white/60">
                  <span className="text-white font-semibold">{filteredListings.length}</span> properties found
                </p>
              </div>
              <div className="flex items-center gap-4">
                {/* Sort */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-48 bg-[#0d1f3c] border-amber-400/20 text-white">
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0d1f3c] border-amber-400/20">
                    {SORT_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value} className="text-white hover:bg-amber-400/10">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* View Toggle */}
                <div className="hidden sm:flex bg-[#0d1f3c] rounded-lg p-1 border border-amber-400/20">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded ${viewMode === 'grid' ? 'bg-amber-400 text-black' : 'text-white/50 hover:text-white'}`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('map')}
                    className={`p-2 rounded ${viewMode === 'map' ? 'bg-amber-400 text-black' : 'text-white/50 hover:text-white'}`}
                  >
                    <Map className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Active Filters Tags */}
            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {selectedCity !== 'All Areas' && (
                  <Badge className="bg-amber-400/20 text-amber-400 hover:bg-amber-400/30 cursor-pointer" onClick={() => setSelectedCity('All Areas')}>
                    {selectedCity} <X className="w-3 h-3 ml-1" />
                  </Badge>
                )}
                {propertyType !== 'all' && (
                  <Badge className="bg-amber-400/20 text-amber-400 hover:bg-amber-400/30 cursor-pointer" onClick={() => setPropertyType('all')}>
                    {PROPERTY_TYPES.find(t => t.value === propertyType)?.label} <X className="w-3 h-3 ml-1" />
                  </Badge>
                )}
                {minBeds !== 'any' && (
                  <Badge className="bg-amber-400/20 text-amber-400 hover:bg-amber-400/30 cursor-pointer" onClick={() => setMinBeds('any')}>
                    {minBeds}+ Beds <X className="w-3 h-3 ml-1" />
                  </Badge>
                )}
                {minBaths !== 'any' && (
                  <Badge className="bg-amber-400/20 text-amber-400 hover:bg-amber-400/30 cursor-pointer" onClick={() => setMinBaths('any')}>
                    {minBaths}+ Baths <X className="w-3 h-3 ml-1" />
                  </Badge>
                )}
              </div>
            )}

            {/* Loading State */}
            {loading ? (
              <div className="flex items-center justify-center h-96">
                <Loader2 className="w-10 h-10 animate-spin text-amber-400" />
              </div>
            ) : viewMode === 'map' ? (
              /* Map View */
              <div className="bg-[#0d1f3c]/50 rounded-2xl border border-amber-400/10 h-[600px] flex items-center justify-center">
                <div className="text-center">
                  <Map className="w-16 h-16 text-amber-400/30 mx-auto mb-4" />
                  <p className="text-white/50">Interactive map coming soon</p>
                  <p className="text-sm text-white/30 mt-2">View properties on a map with location markers</p>
                </div>
              </div>
            ) : filteredListings.length === 0 ? (
              /* Empty State */
              <div className="text-center py-16 relative">
                {/* Decorative rings */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 rounded-full border border-amber-400/10 animate-pulse"></div>
                  <div className="absolute w-40 h-40 rounded-full border border-amber-400/5"></div>
                </div>
                <div className="relative z-10">
                  <div className="w-20 h-20 bg-amber-400/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Home className="w-10 h-10 text-amber-400/50" />
                  </div>
                  <h3 className="text-xl font-serif text-white mb-2">No Properties Found</h3>
                  <p className="text-white/50 mb-6">Try adjusting your filters to see more results</p>
                  <Button onClick={clearFilters} className="bg-amber-400 text-black hover:bg-amber-300">
                    Clear All Filters
                  </Button>
                </div>
              </div>
            ) : (
              /* Grid View */
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredListings.map((listing) => (
                  <Link 
                    key={listing.id} 
                    to={`/property/${listing.slug || listing.id}`}
                    className="group"
                  >
                    <div className="bg-[#0d1f3c]/50 rounded-2xl overflow-hidden border border-amber-400/10 hover:border-amber-400/30 transition-all duration-300 hover:shadow-xl hover:shadow-amber-400/5">
                      {/* Image */}
                      <div className="relative h-64 overflow-hidden">
                        <img 
                          src={typeof listing.images?.[0] === 'string' ? listing.images[0] : (listing.images?.[0]?.url || 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800')}
                          alt={listing.address}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        
                        {/* Price Badge */}
                        <div className="absolute top-4 left-4">
                          <Badge className="bg-amber-400 text-black font-semibold px-3 py-1 text-sm">
                            {formatPrice(listing.price)}
                          </Badge>
                        </div>
                        
                        {/* Custom Badges */}
                        {listing.badges && listing.badges.length > 0 && (
                          <div className="absolute top-4 right-4 flex flex-col gap-2">
                            {listing.badges.map((badgeId) => {
                              const config = BADGE_CONFIG[badgeId];
                              if (!config) return null;
                              const BadgeIcon = config.icon;
                              return (
                                <div
                                  key={badgeId}
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold shadow-lg"
                                  style={{ 
                                    backgroundColor: config.bg, 
                                    color: config.color,
                                    boxShadow: `0 4px 6px -1px ${config.bg}40`
                                  }}
                                >
                                  <BadgeIcon className="w-3 h-3" />
                                  {config.label}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        
                        {/* Property Type */}
                        <div className="absolute bottom-4 left-4">
                          <span className="text-xs text-white/80 uppercase tracking-wider">
                            {listing.property_type?.replace('_', ' ') || 'Luxury Home'}
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-5">
                        <h3 className="text-lg font-serif text-white mb-1 group-hover:text-amber-400 transition-colors line-clamp-1">
                          {listing.address}
                        </h3>
                        <p className="text-white/50 text-sm flex items-center gap-1 mb-4">
                          <MapPin className="w-3 h-3" />
                          {listing.city}, {listing.state}
                        </p>
                        
                        {/* Features */}
                        <div className="flex items-center gap-4 text-white/60 text-sm">
                          <div className="flex items-center gap-1">
                            <Bed className="w-4 h-4 text-amber-400/60" />
                            <span>{listing.bedrooms} Beds</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Bath className="w-4 h-4 text-amber-400/60" />
                            <span>{listing.bathrooms} Baths</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Square className="w-4 h-4 text-amber-400/60" />
                            <span>{listing.sqft?.toLocaleString()} SF</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#060d18] border-t border-amber-400/10 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt={branding.siteName || 'Hidden Haven Realty'} className="h-8 object-contain" data-testid="showcase-footer-logo" />
              ) : (
                <>
                  <Home className="w-5 h-5 text-amber-400" />
                  <span className="font-serif text-white">{branding.siteName || 'Hidden Haven Realty'}</span>
                </>
              )}
            </div>
            <div className="flex gap-6 text-sm text-white/50">
              <Link to="/newsletter-archive" className="hover:text-amber-400 transition-colors">Newsletter Archive</Link>
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
