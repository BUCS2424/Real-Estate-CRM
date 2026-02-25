import React, { useEffect, useState } from 'react';
import { 
  Search,
  MapPin,
  DollarSign,
  Bed,
  Bath,
  Home,
  Database,
  Eye,
  RefreshCw,
  ShieldAlert
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../../components/ui/dialog';
import { useAuth } from '../../contexts/AuthContext';
import { mlsAPI } from '../../lib/api';
import { toast } from 'sonner';

export const MLSSearch = () => {
  const { isAdmin } = useAuth();
  const [statusInfo, setStatusInfo] = useState(null);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [selectedListing, setSelectedListing] = useState(null);
  const [importingId, setImportingId] = useState(null);
  const [searchParams, setSearchParams] = useState({
    dataset: '',
    address: '',
    city: '',
    zip_code: '',
    min_price: '',
    max_price: '',
    bedrooms: '',
    bathrooms: '',
    property_type: '',
    status: 'Active',
    limit: 50,
    offset: 0
  });

  const canAccess = isAdmin();

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await mlsAPI.getStatus();
      setStatusInfo(response.data);
    } catch (error) {
      console.error('Error fetching MLS status:', error);
    }
  };

  const handleSearch = async () => {
    if (!canAccess) {
      toast.error('Admin access required');
      return;
    }

    setSearching(true);
    try {
      const response = await mlsAPI.search({
        dataset: searchParams.dataset || null,
        address: searchParams.address || null,
        city: searchParams.city || null,
        zip_code: searchParams.zip_code || null,
        min_price: searchParams.min_price ? parseInt(searchParams.min_price, 10) : null,
        max_price: searchParams.max_price ? parseInt(searchParams.max_price, 10) : null,
        bedrooms: searchParams.bedrooms ? parseInt(searchParams.bedrooms, 10) : null,
        bathrooms: searchParams.bathrooms ? parseFloat(searchParams.bathrooms) : null,
        property_type: searchParams.property_type || null,
        status: searchParams.status || null,
        limit: searchParams.limit,
        offset: searchParams.offset
      });

      setResults(response.data.properties || []);
      setTotal(response.data.total || 0);

      if (response.data.configured === false) {
        toast.error('Bridge API not configured');
      } else if ((response.data.properties || []).length === 0) {
        toast.info('No MLS results found for these filters');
      } else {
        toast.success(`Found ${response.data.properties.length} listings`);
      }
    } catch (error) {
      console.error('MLS search error:', error);
      toast.error(error.response?.data?.detail || 'MLS search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleImportToLead = async (listing) => {
    setImportingId(listing.mls_id);
    try {
      const response = await mlsAPI.importToLead(listing.mls_id);
      toast.success('Imported to Property Leads');
      return response.data;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Import failed');
    } finally {
      setImportingId(null);
    }
  };

  const formatPrice = (price) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price);
  };

  const getStatusBadge = (status) => {
    if (!status) return null;
    const normalized = status.toLowerCase();
    if (normalized.includes('active')) return <Badge className="bg-green-500">Active</Badge>;
    if (normalized.includes('pending')) return <Badge className="bg-yellow-500">Pending</Badge>;
    if (normalized.includes('closed') || normalized.includes('sold')) return <Badge className="bg-gray-500">Closed</Badge>;
    if (normalized.includes('withdrawn')) return <Badge className="bg-red-500">Withdrawn</Badge>;
    if (normalized.includes('expired')) return <Badge className="bg-orange-500">Expired</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  if (!canAccess) {
    return (
      <div className="space-y-6" data-testid="mls-search-page">
        <div>
          <h1 className="text-2xl font-serif font-bold">MLS Search</h1>
          <p className="text-muted-foreground">Search MLS listings with advanced filters</p>
        </div>
        <Card className="border-red-500/30 bg-red-500/5" data-testid="mls-search-access-denied">
          <CardContent className="p-6 flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-red-500" />
            <div>
              <p className="font-medium text-red-500">Admin access required</p>
              <p className="text-sm text-muted-foreground">Only Admin and Superuser roles can access MLS Search.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="mls-search-page">
      <div>
        <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
          <Search className="w-6 h-6 text-amber-500" />
          MLS Search
        </h1>
        <p className="text-muted-foreground">Search MLS listings with advanced filters</p>
      </div>

      {statusInfo && !statusInfo.configured && (
        <Card className="border-yellow-500/40 bg-yellow-500/10" data-testid="mls-search-config-warning">
          <CardContent className="p-4 flex items-center gap-3">
            <Database className="w-5 h-5 text-yellow-500" />
            <p className="text-sm">
              Bridge API is not configured. Add credentials in Settings → Developer → MLS.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-amber-500" />
            Search Filters
          </CardTitle>
          <CardDescription>Use any MLS-supported filters to refine your search</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dataset">Dataset Code</Label>
              <Input
                id="dataset"
                placeholder="e.g. stellar"
                value={searchParams.dataset}
                onChange={(e) => setSearchParams(prev => ({ ...prev, dataset: e.target.value }))}
                data-testid="mls-search-dataset"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <Home className="w-4 h-4" />
                Address
              </Label>
              <Input
                id="address"
                placeholder="Street address"
                value={searchParams.address}
                onChange={(e) => setSearchParams(prev => ({ ...prev, address: e.target.value }))}
                data-testid="mls-search-address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                City
              </Label>
              <Input
                id="city"
                placeholder="City"
                value={searchParams.city}
                onChange={(e) => setSearchParams(prev => ({ ...prev, city: e.target.value }))}
                data-testid="mls-search-city"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip">ZIP Code</Label>
              <Input
                id="zip"
                placeholder="ZIP Code"
                value={searchParams.zip_code}
                onChange={(e) => setSearchParams(prev => ({ ...prev, zip_code: e.target.value }))}
                data-testid="mls-search-zip"
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
                data-testid="mls-search-min-price"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_price">Max Price</Label>
              <Input
                id="max_price"
                type="number"
                placeholder="e.g. 800000"
                value={searchParams.max_price}
                onChange={(e) => setSearchParams(prev => ({ ...prev, max_price: e.target.value }))}
                data-testid="mls-search-max-price"
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
                data-testid="mls-search-bedrooms"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bathrooms" className="flex items-center gap-2">
                <Bath className="w-4 h-4" />
                Min Bathrooms
              </Label>
              <Input
                id="bathrooms"
                type="number"
                step="0.5"
                placeholder="e.g. 2"
                value={searchParams.bathrooms}
                onChange={(e) => setSearchParams(prev => ({ ...prev, bathrooms: e.target.value }))}
                data-testid="mls-search-bathrooms"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="property_type">Property Type</Label>
              <Input
                id="property_type"
                placeholder="e.g. Single Family"
                value={searchParams.property_type}
                onChange={(e) => setSearchParams(prev => ({ ...prev, property_type: e.target.value }))}
                data-testid="mls-search-property-type"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">MLS Status</Label>
              <Input
                id="status"
                placeholder="Active, Pending, Closed, Withdrawn, Expired"
                value={searchParams.status}
                onChange={(e) => setSearchParams(prev => ({ ...prev, status: e.target.value }))}
                data-testid="mls-search-status"
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
                onChange={(e) => setSearchParams(prev => ({ ...prev, limit: parseInt(e.target.value, 10) || 50 }))}
                data-testid="mls-search-limit"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="offset">Offset</Label>
              <Input
                id="offset"
                type="number"
                min="0"
                value={searchParams.offset}
                onChange={(e) => setSearchParams(prev => ({ ...prev, offset: parseInt(e.target.value, 10) || 0 }))}
                data-testid="mls-search-offset"
              />
            </div>
          </div>

          <Button
            onClick={handleSearch}
            disabled={searching}
            className="w-full bg-amber-500 hover:bg-amber-600"
            data-testid="mls-search-submit"
          >
            {searching ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Searching MLS...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Search MLS Listings
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Results</span>
            <span className="text-sm text-muted-foreground" data-testid="mls-search-total">{total} total</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <div className="text-sm text-muted-foreground" data-testid="mls-search-empty">
              No results yet. Run a search to see MLS listings.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((listing) => (
                <Card key={listing.mls_id} className="overflow-hidden" data-testid={`mls-search-result-${listing.mls_id}`}>
                  <div className="relative h-44 bg-muted">
                    {listing.primary_photo ? (
                      <img
                        src={listing.primary_photo}
                        alt={listing.address}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Home className="w-10 h-10 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      {getStatusBadge(listing.status)}
                    </div>
                  </div>
                  <CardContent className="p-4 space-y-2">
                    <div className="text-lg font-semibold text-amber-600" data-testid={`mls-search-price-${listing.mls_id}`}>
                      {formatPrice(listing.list_price)}
                    </div>
                    <div className="text-sm font-medium truncate" data-testid={`mls-search-address-${listing.mls_id}`}>
                      {listing.address}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {listing.city}, {listing.state} {listing.zip_code}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Bed className="w-3 h-3" />{listing.bedrooms || '-'}</span>
                      <span className="flex items-center gap-1"><Bath className="w-3 h-3" />{listing.bathrooms || '-'}</span>
                      <span className="flex items-center gap-1">{listing.sqft?.toLocaleString() || '-'} sqft</span>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setSelectedListing(listing)}
                        data-testid={`mls-search-view-${listing.mls_id}`}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-green-500 hover:bg-green-600"
                        onClick={() => handleImportToLead(listing)}
                        disabled={importingId === listing.mls_id}
                        data-testid={`mls-search-import-${listing.mls_id}`}
                      >
                        {importingId === listing.mls_id ? 'Importing...' : 'Import Lead'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedListing} onOpenChange={() => setSelectedListing(null)}>
        <DialogContent className="max-w-3xl">
          {selectedListing && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Home className="w-5 h-5 text-amber-500" />
                  {selectedListing.address}
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 h-64 bg-muted rounded-lg overflow-hidden">
                  {selectedListing.primary_photo ? (
                    <img
                      src={selectedListing.primary_photo}
                      alt={selectedListing.address}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Home className="w-12 h-12 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">List Price</p>
                  <p className="text-2xl font-bold text-amber-500">{formatPrice(selectedListing.list_price)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">MLS #</p>
                  <p className="font-medium">{selectedListing.mls_id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{selectedListing.city}, {selectedListing.state} {selectedListing.zip_code}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium">{selectedListing.status || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Beds / Baths</p>
                  <p className="font-medium">{selectedListing.bedrooms || 'N/A'} / {selectedListing.bathrooms || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Square Feet</p>
                  <p className="font-medium">{selectedListing.sqft?.toLocaleString() || 'N/A'}</p>
                </div>
                {selectedListing.description && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground mb-1">Description</p>
                    <p className="text-sm">{selectedListing.description}</p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  onClick={() => handleImportToLead(selectedListing)}
                  className="bg-green-500 hover:bg-green-600"
                  disabled={importingId === selectedListing.mls_id}
                  data-testid="mls-search-dialog-import"
                >
                  {importingId === selectedListing.mls_id ? 'Importing...' : 'Import to Property Leads'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MLSSearch;
