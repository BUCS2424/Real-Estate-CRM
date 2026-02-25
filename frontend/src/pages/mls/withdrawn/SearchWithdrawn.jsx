import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  RefreshCw, 
  XCircle,
  MapPin,
  DollarSign,
  Home,
  Bed,
  AlertCircle,
  Ban
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import api from '../../../lib/api';
import { toast } from 'sonner';

export const SearchWithdrawn = () => {
  const navigate = useNavigate();
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState(null);
  const [stats, setStats] = useState(null);
  const [searchParams, setSearchParams] = useState({
    city: 'Tampa',
    zip_code: '',
    min_price: '',
    max_price: '',
    bedrooms: '',
    limit: 50
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/withdrawn-listings/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSearch = async () => {
    setSearching(true);
    setResult(null);
    
    try {
      const response = await api.post('/withdrawn-listings/search', {
        city: searchParams.city || null,
        zip_code: searchParams.zip_code || null,
        min_price: searchParams.min_price ? parseInt(searchParams.min_price) : null,
        max_price: searchParams.max_price ? parseInt(searchParams.max_price) : null,
        bedrooms: searchParams.bedrooms ? parseInt(searchParams.bedrooms) : null,
        limit: searchParams.limit
      });
      
      setResult(response.data);
      fetchStats();
      
      if (response.data.new_listings > 0) {
        toast.success(`Found ${response.data.new_listings} new withdrawn listings!`);
      } else if (response.data.total_found > 0) {
        toast.info(`Found ${response.data.total_found} listings (already in system or dead leads)`);
      } else {
        toast.info('No withdrawn listings found with these criteria');
      }
    } catch (error) {
      console.error('Error searching:', error);
      toast.error(error.response?.data?.detail || 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="search-withdrawn-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
          <XCircle className="w-6 h-6 text-red-500" />
          Search Withdrawn Listings
        </h1>
        <p className="text-muted-foreground">
          Find withdrawn listings - sellers who pulled their homes off the market
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <Card className="border-red-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-500" data-testid="withdrawn-stats-total">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Found</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-500" data-testid="withdrawn-stats-pending">{stats.by_sync_status?.pending || 0}</p>
                  <p className="text-xs text-muted-foreground">Pending Review</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-500" data-testid="withdrawn-stats-converted">{stats.by_sync_status?.converted || 0}</p>
                  <p className="text-xs text-muted-foreground">Converted to Leads</p>
                </div>
                <div className="text-center border-l pl-4">
                  <p className="text-2xl font-bold text-gray-500" data-testid="withdrawn-stats-dead-leads">{stats.dead_leads_count || 0}</p>
                  <p className="text-xs text-muted-foreground">Dead Leads</p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => navigate('/mls/withdrawn/moderate')}
                data-testid="withdrawn-review-pending-button"
              >
                Review Pending
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-red-500" />
            Search Criteria
          </CardTitle>
          <CardDescription>
            Search for withdrawn listings in Stellar MLS (excludes dead leads)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                City
              </Label>
              <Input
                id="city"
                placeholder="e.g. Tampa"
                value={searchParams.city}
                onChange={(e) => setSearchParams(prev => ({ ...prev, city: e.target.value }))}
                data-testid="withdrawn-search-city-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="zip">ZIP Code</Label>
              <Input
                id="zip"
                placeholder="e.g. 33601"
                value={searchParams.zip_code}
                onChange={(e) => setSearchParams(prev => ({ ...prev, zip_code: e.target.value }))}
                data-testid="withdrawn-search-zip-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bedrooms" className="flex items-center gap-2">
                <Bed className="w-4 h-4" />
                Min Bedrooms
              </Label>
              <Input
                id="bedrooms"
                type="number"
                placeholder="e.g. 3"
                value={searchParams.bedrooms}
                onChange={(e) => setSearchParams(prev => ({ ...prev, bedrooms: e.target.value }))}
                data-testid="withdrawn-search-bedrooms-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="min_price" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Min Price
              </Label>
              <Input
                id="min_price"
                type="number"
                placeholder="e.g. 200000"
                value={searchParams.min_price}
                onChange={(e) => setSearchParams(prev => ({ ...prev, min_price: e.target.value }))}
                data-testid="withdrawn-search-min-price-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="max_price">Max Price</Label>
              <Input
                id="max_price"
                type="number"
                placeholder="e.g. 500000"
                value={searchParams.max_price}
                onChange={(e) => setSearchParams(prev => ({ ...prev, max_price: e.target.value }))}
                data-testid="withdrawn-search-max-price-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="limit">Max Results</Label>
              <Input
                id="limit"
                type="number"
                min="1"
                max="200"
                value={searchParams.limit}
                onChange={(e) => setSearchParams(prev => ({ ...prev, limit: parseInt(e.target.value) || 50 }))}
                data-testid="withdrawn-search-limit-input"
              />
            </div>
          </div>

          <Button 
            onClick={handleSearch} 
            disabled={searching}
            className="w-full bg-red-500 hover:bg-red-600"
            data-testid="search-withdrawn-btn"
          >
            {searching ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Searching MLS...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Search Withdrawn Listings
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card className={result.new_listings > 0 ? 'border-green-500/50' : 'border-muted'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.new_listings > 0 ? (
                <AlertCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-muted-foreground" />
              )}
              Search Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-green-500/10 rounded-lg">
                <p className="text-3xl font-bold text-green-500" data-testid="withdrawn-results-new-count">{result.new_listings}</p>
                <p className="text-sm text-muted-foreground">New Listings</p>
              </div>
              <div className="text-center p-4 bg-blue-500/10 rounded-lg">
                <p className="text-3xl font-bold text-blue-500" data-testid="withdrawn-results-updated-count">{result.updated_listings}</p>
                <p className="text-sm text-muted-foreground">Updated</p>
              </div>
              <div className="text-center p-4 bg-gray-500/10 rounded-lg">
                <p className="text-3xl font-bold text-gray-500" data-testid="withdrawn-results-skipped-count">{result.skipped_dead_leads || 0}</p>
                <p className="text-sm text-muted-foreground">Skipped (Dead)</p>
              </div>
              <div className="text-center p-4 bg-red-500/10 rounded-lg">
                <p className="text-3xl font-bold text-red-500" data-testid="withdrawn-results-total-count">{result.total_found}</p>
                <p className="text-sm text-muted-foreground">Total Found</p>
              </div>
            </div>

            {result.skipped_dead_leads > 0 && (
              <div className="flex items-center gap-2 p-3 bg-gray-500/10 border border-gray-500/30 rounded-lg mb-4">
                <Ban className="w-5 h-5 text-gray-500" />
                <p className="text-sm">
                  <span className="font-medium">{result.skipped_dead_leads} listings</span> were skipped because they're in your dead leads list.
                </p>
              </div>
            )}

            {result.new_listings > 0 && (
              <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg mb-4">
                <AlertCircle className="w-5 h-5 text-yellow-500" />
                <p className="text-sm">
                  <span className="font-medium">{result.new_listings} new withdrawn listings</span> are ready for review. 
                  These sellers may be motivated to relist!
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => navigate('/mls/withdrawn/moderate')}
                className="flex-1"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Review Withdrawn Listings
              </Button>
              <Button 
                variant="outline" 
                onClick={handleSearch}
                disabled={searching}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Search Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Home className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Why Withdrawn Listings?</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Sellers who withdrew may have had issues with their previous agent</li>
                <li>Circumstances may have changed - they might be ready to relist</li>
                <li>Less competition than active listings</li>
                <li>Converted listings are added to your "Dead Leads" list to prevent duplicate pulls</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SearchWithdrawn;
