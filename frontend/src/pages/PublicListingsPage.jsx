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
  ArrowUpDown
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
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a1628]/95 backdrop-blur-md border-b border-amber-400/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <Home className="w-6 h-6 text-amber-400" />
              <span className="font-serif text-xl text-white">Fusion Luxury Estates</span>
            </Link>
            <nav className="hidden md:flex items-center gap-8">
              <Link to="/" className="text-sm text-white/70 hover:text-amber-400 transition-colors">HOME</Link>
              <Link to="/showcase" className="text-sm text-amber-400 border-b border-amber-400">LISTING SHOWCASE</Link>
              <a href="/#about" className="text-sm text-white/70 hover:text-amber-400 transition-colors">ABOUT</a>
              <a href="/#contact" className="text-sm text-white/70 hover:text-amber-400 transition-colors">CONTACT</a>
            </nav>
            <Link to="/login">
              <Button variant="outline" className="border-amber-400/50 text-amber-400 hover:bg-amber-400 hover:text-black">
                Agent Login
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="pt-16 bg-gradient-to-b from-[#0a1628] via-[#0d1f3c] to-[#0a1628]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-white mb-4">
            Luxury Properties
          </h1>
          <p className="text-lg text-white/60 max-w-2xl mx-auto mb-8">
            Discover exceptional homes in Florida's most prestigious neighborhoods
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
            <div className="sticky top-24 bg-[#0d1f3c]/50 rounded-2xl p-6 border border-amber-400/10">
              <h3 className="text-lg font-serif text-white mb-6 flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-amber-400" />
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
              <div className="text-center py-16">
                <Home className="w-16 h-16 text-amber-400/30 mx-auto mb-4" />
                <h3 className="text-xl font-serif text-white mb-2">No Properties Found</h3>
                <p className="text-white/50 mb-6">Try adjusting your filters to see more results</p>
                <Button onClick={clearFilters} className="bg-amber-400 text-black hover:bg-amber-300">
                  Clear All Filters
                </Button>
              </div>
            ) : (
              /* Grid View */
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredListings.map((listing) => (
                  <Link 
                    key={listing.id} 
                    to={`/property/${listing.id}`}
                    className="group"
                  >
                    <div className="bg-[#0d1f3c]/50 rounded-2xl overflow-hidden border border-amber-400/10 hover:border-amber-400/30 transition-all duration-300 hover:shadow-xl hover:shadow-amber-400/5">
                      {/* Image */}
                      <div className="relative h-64 overflow-hidden">
                        <img 
                          src={listing.images?.[0]?.url || 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800'}
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
                        
                        {/* Status Badge */}
                        {listing.status && listing.status !== 'active' && (
                          <div className="absolute top-4 right-4">
                            <Badge variant="secondary" className="capitalize">
                              {listing.status}
                            </Badge>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-white/40 text-sm">
            Powered By: <a href="https://a2gdesigns.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">A2G</a>
          </p>
        </div>
      </footer>
    </div>
  );
};
