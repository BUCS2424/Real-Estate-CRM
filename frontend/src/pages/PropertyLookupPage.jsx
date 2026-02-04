import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Building2, 
  User, 
  MapPin, 
  DollarSign, 
  Home,
  Loader2,
  FileText,
  ExternalLink,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  Link2,
  Plus,
  Users,
  Database,
  Eye,
  Bed,
  Bath,
  Square
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { propertyLookupAPI, listingsAPI, propertyLeadsAPI } from '../lib/api';
import { toast } from 'sonner';

const COUNTIES = [
  { key: 'hillsborough', name: 'Hillsborough', cities: ['Tampa', 'Brandon', 'Plant City'] },
  { key: 'pinellas', name: 'Pinellas', cities: ['St. Petersburg', 'Clearwater', 'Largo'] },
  { key: 'pasco', name: 'Pasco', cities: ['New Port Richey', 'Wesley Chapel', 'Zephyrhills'] }
];

const DATA_SOURCES = [
  { key: 'county', name: 'County Records', icon: Database, description: 'Search tax records' },
  { key: 'leads', name: 'Property Leads', icon: Users, description: 'Imported leads' }
];

export const PropertyLookupPage = () => {
  const navigate = useNavigate();
  const [dataSource, setDataSource] = useState('county');
  const [searchAddress, setSearchAddress] = useState('');
  const [selectedCounty, setSelectedCounty] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [propertyDetails, setPropertyDetails] = useState(null);
  
  // Property Leads state
  const [leads, setLeads] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [leadsSearchQuery, setLeadsSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  
  // Recent searches
  const [recentSearches, setRecentSearches] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  
  // Assign to property
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [listings, setListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [selectedListing, setSelectedListing] = useState('');
  const [assigning, setAssigning] = useState(false);
  
  // MLS Config
  const [showMLSConfig, setShowMLSConfig] = useState(false);
  const [mlsConfig, setMlsConfig] = useState({
    api_url: '',
    client_id: '',
    client_secret: '',
    api_key: '',
    mls_name: ''
  });
  const [testingMLS, setTestingMLS] = useState(false);
  const [mlsStatus, setMlsStatus] = useState(null);

  useEffect(() => {
    fetchRecentSearches();
  }, []);

  useEffect(() => {
    if (dataSource === 'leads') {
      fetchLeads();
    }
  }, [dataSource]);

  const fetchLeads = async () => {
    setLoadingLeads(true);
    try {
      const res = await propertyLeadsAPI.getAll({ limit: 100 });
      setLeads(res.data.leads || []);
    } catch (error) {
      toast.error('Failed to load property leads');
    } finally {
      setLoadingLeads(false);
    }
  };

  const fetchRecentSearches = async () => {
    try {
      const res = await propertyLookupAPI.getRecentSearches(8);
      setRecentSearches(res.data.searches || []);
    } catch (error) {
      console.error('Failed to load recent searches');
    } finally {
      setLoadingRecent(false);
    }
  };

  const handleSearch = async (address = null) => {
    const searchTerm = address || searchAddress;
    if (!searchTerm.trim()) {
      toast.error('Please enter an address');
      return;
    }
    
    if (address) {
      setSearchAddress(address);
    }
    
    setSearching(true);
    setResults([]);
    setPropertyDetails(null);
    
    try {
      const res = await propertyLookupAPI.searchCounty(searchTerm, selectedCounty || null);
      setResults(res.data.results || []);
      
      if (res.data.results?.length === 0) {
        toast.info('No properties found matching that address');
      } else {
        toast.success(`Found ${res.data.results.length} properties`);
        // Refresh recent searches
        fetchRecentSearches();
      }
    } catch (error) {
      toast.error('Search failed: ' + (error.response?.data?.detail || error.message));
    } finally {
      setSearching(false);
    }
  };

  const handleViewDetails = async (result) => {
    setSelectedProperty(result);
    setLoadingDetails(true);
    setPropertyDetails(null);
    
    try {
      const res = await propertyLookupAPI.getCountyDetails(result.county.toLowerCase(), result.parcel_id);
      setPropertyDetails(res.data.data);
    } catch (error) {
      toast.error('Failed to load property details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleOpenAssignModal = async () => {
    if (!propertyDetails) {
      toast.error('Please select a property first');
      return;
    }
    
    setShowAssignModal(true);
    setLoadingListings(true);
    
    try {
      const res = await listingsAPI.list();
      setListings(res.data || []);
    } catch (error) {
      toast.error('Failed to load listings');
    } finally {
      setLoadingListings(false);
    }
  };

  const handleAssignToProperty = async () => {
    if (!selectedListing || !propertyDetails) {
      toast.error('Please select a listing');
      return;
    }
    
    setAssigning(true);
    try {
      await propertyLookupAPI.assignToProperty(selectedListing, propertyDetails);
      toast.success('County data assigned to property!');
      setShowAssignModal(false);
      setSelectedListing('');
    } catch (error) {
      toast.error('Failed to assign: ' + (error.response?.data?.detail || error.message));
    } finally {
      setAssigning(false);
    }
  };

  const handleSaveMlsConfig = async () => {
    try {
      await propertyLookupAPI.saveMlsConfig(mlsConfig);
      toast.success('MLS configuration saved');
      setShowMLSConfig(false);
    } catch (error) {
      toast.error('Failed to save MLS config');
    }
  };

  const handleTestMLS = async () => {
    setTestingMLS(true);
    try {
      const res = await propertyLookupAPI.testMls();
      setMlsStatus(res.data);
      if (res.data.success) {
        toast.success('MLS connection successful!');
      } else {
        toast.error(res.data.message);
      }
    } catch (error) {
      toast.error('MLS test failed');
    } finally {
      setTestingMLS(false);
    }
  };

  const formatCurrency = (value) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="property-lookup-page">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-serif text-foreground mb-2">Property Lookup</h1>
          <p className="text-muted-foreground">Search county tax records and MLS listings</p>
        </div>
        <Button variant="outline" onClick={() => setShowMLSConfig(true)} data-testid="mls-config-btn">
          <Settings className="w-4 h-4 mr-2" />
          MLS Settings
        </Button>
      </div>

      {/* Recent Searches */}
      {recentSearches.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Recent Searches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((search, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSearch(search.address)}
                  className="border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 hover:border-amber-500"
                >
                  <MapPin className="w-3 h-3 mr-1 text-amber-500" />
                  <span className="text-foreground">{search.address}</span>
                  <Badge className="ml-2 text-xs bg-primary/20 text-primary border-0">{search.county}</Badge>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-amber-500" />
            Search Property Records
          </CardTitle>
          <CardDescription>
            Search Hillsborough, Pinellas, and Pasco county property appraiser records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label>Property Address</Label>
              <Input
                placeholder="Enter street address (e.g., 123 Main St, Tampa)"
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                data-testid="address-input"
              />
            </div>
            <div className="w-full md:w-48">
              <Label>County (Optional)</Label>
              <Select value={selectedCounty || "all"} onValueChange={(val) => setSelectedCounty(val === "all" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Counties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Counties</SelectItem>
                  {COUNTIES.map(c => (
                    <SelectItem key={c.key} value={c.key}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                onClick={() => handleSearch()} 
                disabled={searching}
                className="bg-amber-500 hover:bg-amber-600 text-black"
                data-testid="search-btn"
              >
                {searching ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 mr-2" />
                )}
                Search
              </Button>
            </div>
          </div>
          
          {/* Quick County Links */}
          <div className="mt-4 flex flex-wrap gap-2">
            {COUNTIES.map(c => (
              <Badge 
                key={c.key} 
                variant="outline" 
                className="cursor-pointer hover:bg-accent"
                onClick={() => setSelectedCounty(c.key)}
              >
                {c.name}: {c.cities.join(', ')}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Search Results List */}
        <Card>
          <CardHeader>
            <CardTitle>Search Results</CardTitle>
            <CardDescription>
              {results.length > 0 ? `${results.length} properties found` : 'Enter an address to search'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No results yet</p>
                <p className="text-sm mt-1">Search by address to find property records</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {results.map((result, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedProperty?.parcel_id === result.parcel_id
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-border hover:border-amber-500/50 hover:bg-accent'
                    }`}
                    onClick={() => handleViewDetails(result)}
                    data-testid={`result-${idx}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-foreground">{result.address || 'No address'}</p>
                        <p className="text-sm text-amber-600 dark:text-amber-400">{result.owner_name || 'Owner not found'}</p>
                      </div>
                      <Badge variant="outline">{result.county}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Parcel: {result.parcel_id}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Property Details */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-500" />
                  Property Details
                </CardTitle>
                <CardDescription>
                  {selectedProperty ? `Viewing: ${selectedProperty.address}` : 'Select a property to view details'}
                </CardDescription>
              </div>
              {propertyDetails && (
                <Button 
                  onClick={handleOpenAssignModal}
                  size="sm"
                  className="bg-amber-500 hover:bg-amber-600 text-black"
                  data-testid="assign-btn"
                >
                  <Link2 className="w-4 h-4 mr-1" />
                  Assign to Listing
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingDetails ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              </div>
            ) : !propertyDetails ? (
              <div className="text-center py-8 text-muted-foreground">
                <Home className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Select a property from the results</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Owner Info */}
                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Owner Information</span>
                  </div>
                  <p className="text-xl font-semibold text-foreground">{propertyDetails.owner_name || 'N/A'}</p>
                  {propertyDetails.owner_address && (
                    <p className="text-sm text-muted-foreground mt-1">{propertyDetails.owner_address}</p>
                  )}
                </div>

                {/* Address */}
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-foreground">{propertyDetails.address}</p>
                    <p className="text-sm text-muted-foreground">
                      {propertyDetails.city}, {propertyDetails.zip_code}
                    </p>
                  </div>
                </div>

                {/* Values */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-[#1e3a5f]">
                    <p className="text-xs text-white/70">Market Value</p>
                    <p className="text-lg font-semibold text-white">
                      {formatCurrency(propertyDetails.market_value)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#1e3a5f]">
                    <p className="text-xs text-white/70">Assessed Value</p>
                    <p className="text-lg font-semibold text-white">
                      {formatCurrency(propertyDetails.assessed_value)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#1e3a5f]">
                    <p className="text-xs text-white/70">Land Value</p>
                    <p className="text-lg font-semibold text-white">
                      {formatCurrency(propertyDetails.land_value)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#1e3a5f]">
                    <p className="text-xs text-white/70">Building Value</p>
                    <p className="text-lg font-semibold text-white">
                      {formatCurrency(propertyDetails.building_value)}
                    </p>
                  </div>
                </div>

                {/* Property Details */}
                <div className="grid grid-cols-3 gap-3">
                  {propertyDetails.lot_size && (
                    <div className="text-center p-2 rounded bg-[#1e3a5f]">
                      <p className="text-lg font-semibold text-white">{propertyDetails.lot_size}</p>
                      <p className="text-xs text-white/70">Acres</p>
                    </div>
                  )}
                  {propertyDetails.homestead !== undefined && (
                    <div className="text-center p-2 rounded bg-[#1e3a5f]">
                      <p className="text-lg font-semibold text-white">
                        {propertyDetails.homestead ? 'Yes' : 'No'}
                      </p>
                      <p className="text-xs text-white/70">Homestead</p>
                    </div>
                  )}
                  {propertyDetails.sale_price && (
                    <div className="text-center p-2 rounded bg-[#1e3a5f]">
                      <p className="text-lg font-semibold text-white">{formatCurrency(propertyDetails.sale_price)}</p>
                      <p className="text-xs text-white/70">Last Sale</p>
                    </div>
                  )}
                </div>

                {/* Source */}
                <p className="text-xs text-muted-foreground text-right">
                  Source: {propertyDetails.source}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assign to Property Modal */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign to Property Listing</DialogTitle>
            <DialogDescription>
              Link this county data to an existing property in your listings.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Selected County Data Summary */}
            {propertyDetails && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">County Data to Assign:</p>
                <p className="text-foreground">{propertyDetails.address}</p>
                <p className="text-sm text-muted-foreground">Owner: {propertyDetails.owner_name}</p>
              </div>
            )}
            
            {/* Property Selection */}
            <div>
              <Label>Select Property Listing</Label>
              {loadingListings ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                </div>
              ) : listings.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <p>No listings found</p>
                  <p className="text-sm">Create a listing first to assign county data</p>
                </div>
              ) : (
                <Select value={selectedListing} onValueChange={setSelectedListing}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a property..." />
                  </SelectTrigger>
                  <SelectContent>
                    {listings.map(listing => (
                      <SelectItem key={listing.id} value={listing.id}>
                        {listing.address}, {listing.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowAssignModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssignToProperty} 
              disabled={!selectedListing || assigning}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              {assigning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Link2 className="w-4 h-4 mr-2" />}
              Assign Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MLS Configuration Modal */}
      <Dialog open={showMLSConfig} onOpenChange={setShowMLSConfig}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>MLS API Configuration</DialogTitle>
            <DialogDescription>
              Configure your MLS API credentials to search active listings.
              Most MLS systems use the RESO Web API standard.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>MLS Name</Label>
              <Input
                placeholder="e.g., Stellar MLS, Bright MLS"
                value={mlsConfig.mls_name}
                onChange={(e) => setMlsConfig({...mlsConfig, mls_name: e.target.value})}
              />
            </div>
            <div>
              <Label>API URL</Label>
              <Input
                placeholder="https://api.mlsprovider.com/reso/odata"
                value={mlsConfig.api_url}
                onChange={(e) => setMlsConfig({...mlsConfig, api_url: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Client ID</Label>
                <Input
                  placeholder="OAuth Client ID"
                  value={mlsConfig.client_id}
                  onChange={(e) => setMlsConfig({...mlsConfig, client_id: e.target.value})}
                />
              </div>
              <div>
                <Label>Client Secret</Label>
                <Input
                  type="password"
                  placeholder="OAuth Client Secret"
                  value={mlsConfig.client_secret}
                  onChange={(e) => setMlsConfig({...mlsConfig, client_secret: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label>API Key (if not using OAuth)</Label>
              <Input
                type="password"
                placeholder="Direct API Key"
                value={mlsConfig.api_key}
                onChange={(e) => setMlsConfig({...mlsConfig, api_key: e.target.value})}
              />
            </div>

            {mlsStatus && (
              <div className={`p-3 rounded-lg flex items-center gap-2 ${
                mlsStatus.success ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-500/20 text-red-600 dark:text-red-400'
              }`}>
                {mlsStatus.success ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
                {mlsStatus.message}
              </div>
            )}
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={handleTestMLS} disabled={testingMLS}>
              {testingMLS ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test Connection'}
            </Button>
            <Button onClick={handleSaveMlsConfig} className="bg-amber-500 hover:bg-amber-600 text-black">Save Configuration</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PropertyLookupPage;
