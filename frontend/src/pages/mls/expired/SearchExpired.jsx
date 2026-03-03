import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  RefreshCw, 
  Clock,
  MapPin,
  DollarSign,
  Home,
  Bed,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Checkbox } from '../../../components/ui/checkbox';
import api from '../../../lib/api';
import { toast } from 'sonner';

export const SearchExpired = () => {
  const navigate = useNavigate();
  const [searching, setSearching] = useState(false);
  const [runningAutomation, setRunningAutomation] = useState(false);
  const [result, setResult] = useState(null);
  const [stats, setStats] = useState(null);
  const [searchParams, setSearchParams] = useState({
    city: '',
    zip_code: '33602, 33606',
    min_price: '750000',
    max_price: '',
    bedrooms: '',
    property_type: 'Single Family',
    exclude_rentals: true,
    exclude_commercial: true,
    limit: 50
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/expired-listings/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSearch = async () => {
    setSearching(true);
    setResult(null);
    
    try {
      const response = await api.post('/expired-listings/search', {
        city: searchParams.city || null,
        zip_codes: searchParams.zip_code ? searchParams.zip_code.split(',').map(zip => zip.trim()).filter(Boolean) : null,
        min_price: searchParams.min_price ? parseInt(searchParams.min_price) : null,
        max_price: searchParams.max_price ? parseInt(searchParams.max_price) : null,
        bedrooms: searchParams.bedrooms ? parseInt(searchParams.bedrooms) : null,
        property_type: searchParams.property_type || null,
        exclude_rentals: !!searchParams.exclude_rentals,
        exclude_commercial: !!searchParams.exclude_commercial,
        limit: searchParams.limit
      });
      
      setResult(response.data);
      fetchStats();
      
      if (response.data.new_listings > 0) {
        toast.success(`Found ${response.data.new_listings} new expired listings!`);
      } else if (response.data.total_found > 0) {
        toast.info(`Found ${response.data.total_found} listings (already in system)`);
      } else {
        toast.info('No expired listings found with these criteria');
      }
    } catch (error) {
      console.error('Error searching:', error);
      toast.error(error.response?.data?.detail || 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleTestNow = async () => {
    setRunningAutomation(true);
    try {
      const response = await api.post('/expired-listings/automation/run', {});
      const converted = response.data?.converted_leads?.length || 0;
      const errors = response.data?.conversion_errors || [];
      if (errors.length > 0) {
        toast.error(`Automation finished with ${errors.length} error(s). Check email/landing page settings.`);
      } else {
        toast.success(`Automation run complete. Converted ${converted} leads.`);
      }
    } catch (error) {
      console.error('Automation run failed:', error);
      toast.error(error.response?.data?.detail || 'Automation run failed');
    } finally {
      setRunningAutomation(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="search-expired-page">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
            <Clock className="w-6 h-6 text-orange-500" />
            Search Expired Listings
          </h1>
          <p className="text-muted-foreground">
            Find expired listings in your area to prospect for new seller leads
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleTestNow}
            disabled={runningAutomation}
            data-testid="expired-test-now-button"
          >
            {runningAutomation ? 'Running...' : 'Test Now'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && stats.total > 0 && (
        <Card className="border-orange-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-500" data-testid="expired-stats-total">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Found</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-500" data-testid="expired-stats-pending">{stats.by_sync_status?.pending || 0}</p>
                  <p className="text-xs text-muted-foreground">Pending Review</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-500" data-testid="expired-stats-converted">{stats.by_sync_status?.converted || 0}</p>
                  <p className="text-xs text-muted-foreground">Converted to Leads</p>
                </div>
              </div>
              <Button variant="outline" onClick={() => navigate('/mls/expired/moderate')} data-testid="expired-review-pending-button">
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
            <Search className="w-5 h-5 text-orange-500" />
            Search Criteria
          </CardTitle>
          <CardDescription>
            Search for expired or withdrawn listings in Stellar MLS
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
                data-testid="expired-search-city-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="zip">ZIP Codes (comma separated)</Label>
              <Input
                id="zip"
                placeholder="e.g. 33602, 33606"
                value={searchParams.zip_code}
                onChange={(e) => setSearchParams(prev => ({ ...prev, zip_code: e.target.value }))}
                data-testid="expired-search-zip-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="property_type" className="flex items-center gap-2">
                <Home className="w-4 h-4" />
                Property Type
              </Label>
              <Input
                id="property_type"
                placeholder="e.g. Single Family"
                value={searchParams.property_type}
                onChange={(e) => setSearchParams(prev => ({ ...prev, property_type: e.target.value }))}
                data-testid="expired-search-property-type-input"
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
                data-testid="expired-search-bedrooms-input"
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
                data-testid="expired-search-min-price-input"
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
                data-testid="expired-search-max-price-input"
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
                data-testid="expired-search-limit-input"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={searchParams.exclude_rentals}
                onCheckedChange={(checked) => setSearchParams(prev => ({ ...prev, exclude_rentals: !!checked }))}
                data-testid="expired-search-exclude-rentals"
              />
              Exclude rentals/leases
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={searchParams.exclude_commercial}
                onCheckedChange={(checked) => setSearchParams(prev => ({ ...prev, exclude_commercial: !!checked }))}
                data-testid="expired-search-exclude-commercial"
              />
              Exclude commercial
            </label>
          </div>

          <Button 
            onClick={handleSearch} 
            disabled={searching}
            className="w-full bg-orange-500 hover:bg-orange-600"
            data-testid="search-expired-btn"
          >
            {searching ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Searching MLS...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Search Expired Listings
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
                <Clock className="w-5 h-5 text-muted-foreground" />
              )}
              Search Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-green-500/10 rounded-lg">
                <p className="text-3xl font-bold text-green-500" data-testid="expired-results-new-count">{result.new_listings}</p>
                <p className="text-sm text-muted-foreground">New Listings</p>
              </div>
              <div className="text-center p-4 bg-blue-500/10 rounded-lg">
                <p className="text-3xl font-bold text-blue-500" data-testid="expired-results-updated-count">{result.updated_listings}</p>
                <p className="text-sm text-muted-foreground">Updated</p>
              </div>
              <div className="text-center p-4 bg-orange-500/10 rounded-lg">
                <p className="text-3xl font-bold text-orange-500" data-testid="expired-results-total-count">{result.total_found}</p>
                <p className="text-sm text-muted-foreground">Total Found</p>
              </div>
            </div>

            {result.filtered_out > 0 && (
              <div className="text-sm text-muted-foreground mb-4" data-testid="expired-results-filtered-out">
                Filtered out {result.filtered_out} listings that did not match the required criteria.
              </div>
            )}

            {result.new_listings > 0 && (
              <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg mb-4">
                <AlertCircle className="w-5 h-5 text-yellow-500" />
                <p className="text-sm">
                  <span className="font-medium">{result.new_listings} new expired listings</span> are ready for review. 
                  These are potential seller leads!
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => navigate('/mls/expired/moderate')}
                className="flex-1"
              >
                <Clock className="w-4 h-4 mr-2" />
                Review Expired Listings
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
              <p className="font-medium text-foreground mb-1">Why Expired Listings?</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Homeowners who failed to sell may be motivated to relist</li>
                <li>They've already shown intent to sell</li>
                <li>Previous agent relationship may have ended</li>
                <li>Great opportunity for prospecting calls</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SearchExpired;
