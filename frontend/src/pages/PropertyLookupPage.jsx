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
  const [assignTarget, setAssignTarget] = useState('listing'); // 'listing' or 'lead'
  const [selectedLeadForAssign, setSelectedLeadForAssign] = useState('');
  const [allLeadsForAssign, setAllLeadsForAssign] = useState([]);
  
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
    setAssignTarget('listing');
    setSelectedListing('');
    setSelectedLeadForAssign('');
    
    try {
      // Fetch both listings and leads
      const [listingsRes, leadsRes] = await Promise.all([
        listingsAPI.list(),
        propertyLeadsAPI.getAll({ limit: 100 })
      ]);
      setListings(listingsRes.data || []);
      setAllLeadsForAssign(leadsRes.data.leads || []);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoadingListings(false);
    }
  };

  const handleAssignToProperty = async () => {
    if (assignTarget === 'listing') {
      if (!selectedListing || !propertyDetails) {
        toast.error('Please select a listing');
        return;
      }
      
      setAssigning(true);
      try {
        await propertyLookupAPI.assignToProperty(selectedListing, propertyDetails);
        toast.success('County data assigned to listing!');
        setShowAssignModal(false);
        setSelectedListing('');
      } catch (error) {
        toast.error('Failed to assign: ' + (error.response?.data?.detail || error.message));
      } finally {
        setAssigning(false);
      }
    } else {
      // Assign to lead
      if (!selectedLeadForAssign || !propertyDetails) {
        toast.error('Please select a lead');
        return;
      }
      
      setAssigning(true);
      try {
        // Update the lead with county data
        await propertyLeadsAPI.update(selectedLeadForAssign, {
          owner_name: propertyDetails.owner_name,
          owner_mailing_address: propertyDetails.mailing_address,
          estimated_value: propertyDetails.market_value,
          tax_assessed_value: propertyDetails.assessed_value,
          bedrooms: propertyDetails.bedrooms,
          bathrooms: propertyDetails.bathrooms,
          sqft: propertyDetails.sqft,
          year_built: propertyDetails.year_built,
          lot_size: propertyDetails.lot_size,
          zoning: propertyDetails.zoning,
          homestead: propertyDetails.homestead,
          county: propertyDetails.county,
          county_data_imported: true,
          county_data_imported_at: new Date().toISOString()
        });
        toast.success('County data assigned to lead!');
        setShowAssignModal(false);
        setSelectedLeadForAssign('');
        // Refresh leads if we're viewing them
        if (dataSource === 'leads') {
          fetchLeads();
        }
      } catch (error) {
        toast.error('Failed to assign: ' + (error.response?.data?.detail || error.message));
      } finally {
        setAssigning(false);
      }
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

  // Filter leads by search query
  const filteredLeads = leads.filter(lead => {
    if (!leadsSearchQuery) return true;
    const query = leadsSearchQuery.toLowerCase();
    return (
      lead.address?.toLowerCase().includes(query) ||
      lead.city?.toLowerCase().includes(query) ||
      lead.owner_name?.toLowerCase().includes(query) ||
      lead.zip_code?.includes(query)
    );
  });

  const handleViewLead = (lead) => {
    setSelectedLead(lead);
    // Clear county results when viewing a lead
    setSelectedProperty(null);
    setPropertyDetails(null);
  };

  const getStatusColor = (status) => {
    const colors = {
      new: 'bg-blue-500/20 text-blue-600',
      contacted: 'bg-yellow-500/20 text-yellow-600',
      qualified: 'bg-green-500/20 text-green-600',
      nurturing: 'bg-purple-500/20 text-purple-600',
      converted: 'bg-amber-500/20 text-amber-600',
      not_interested: 'bg-gray-500/20 text-gray-600',
    };
    return colors[status] || 'bg-gray-500/20 text-gray-600';
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="property-lookup-page">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-serif text-foreground mb-2">Property Lookup</h1>
          <p className="text-muted-foreground">Search county tax records, MLS listings, or browse imported leads</p>
        </div>
        <Button variant="outline" onClick={() => setShowMLSConfig(true)} data-testid="mls-config-btn">
          <Settings className="w-4 h-4 mr-2" />
          MLS Settings
        </Button>
      </div>

      {/* Data Source Selector */}
      <div className="flex gap-4">
        {DATA_SOURCES.map(source => {
          const Icon = source.icon;
          return (
            <button
              key={source.key}
              onClick={() => setDataSource(source.key)}
              className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                dataSource === source.key
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-border hover:border-amber-500/50 bg-card'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${dataSource === source.key ? 'bg-amber-500/20' : 'bg-muted'}`}>
                  <Icon className={`w-5 h-5 ${dataSource === source.key ? 'text-amber-500' : 'text-muted-foreground'}`} />
                </div>
                <div className="text-left">
                  <p className="font-medium text-foreground">{source.name}</p>
                  <p className="text-sm text-muted-foreground">{source.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* County Records View */}
      {dataSource === 'county' && (
        <>
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
        </>
      )}

      {/* Property Leads View */}
      {dataSource === 'leads' && (
        <>
          {/* Search Leads */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-amber-500" />
                    Imported Property Leads
                  </CardTitle>
                  <CardDescription>
                    Browse and manage property leads imported from CSV
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => navigate('/property-leads')}
                  className="bg-amber-500 hover:bg-amber-600 text-black"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Import Leads
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search by address, city, owner name, or zip..."
                    value={leadsSearchQuery}
                    onChange={(e) => setLeadsSearchQuery(e.target.value)}
                    data-testid="leads-search-input"
                  />
                </div>
                <Button variant="outline" onClick={fetchLeads}>
                  <Loader2 className={`w-4 h-4 mr-2 ${loadingLeads ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Leads Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Leads List */}
            <Card>
              <CardHeader>
                <CardTitle>Property Leads</CardTitle>
                <CardDescription>
                  {filteredLeads.length > 0 ? `${filteredLeads.length} leads found` : 'No leads imported yet'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingLeads ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                  </div>
                ) : filteredLeads.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No property leads found</p>
                    <p className="text-sm mt-1">Import leads from CSV on the Property Leads page</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => navigate('/property-leads')}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Go to Property Leads
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {filteredLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                          selectedLead?.id === lead.id
                            ? 'border-amber-500 bg-amber-500/10'
                            : 'border-border hover:border-amber-500/50 hover:bg-accent'
                        }`}
                        onClick={() => handleViewLead(lead)}
                        data-testid={`lead-${lead.id}`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-foreground">{lead.address || 'No address'}</p>
                            <p className="text-sm text-muted-foreground">
                              {lead.city}, {lead.state} {lead.zip_code}
                            </p>
                          </div>
                          <Badge className={getStatusColor(lead.status)}>
                            {lead.status?.replace('_', ' ').toUpperCase() || 'NEW'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          {lead.owner_name && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {lead.owner_name}
                            </span>
                          )}
                          {lead.estimated_value && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              {formatCurrency(lead.estimated_value)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {lead.bedrooms && (
                            <span className="flex items-center gap-1">
                              <Bed className="w-3 h-3" /> {lead.bedrooms}
                            </span>
                          )}
                          {lead.bathrooms && (
                            <span className="flex items-center gap-1">
                              <Bath className="w-3 h-3" /> {lead.bathrooms}
                            </span>
                          )}
                          {lead.sqft && (
                            <span className="flex items-center gap-1">
                              <Square className="w-3 h-3" /> {lead.sqft.toLocaleString()} sqft
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Lead Details */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-amber-500" />
                      Lead Details
                    </CardTitle>
                    <CardDescription>
                      {selectedLead ? `Viewing: ${selectedLead.address}` : 'Select a lead to view details'}
                    </CardDescription>
                  </div>
                  {selectedLead && (
                    <Button 
                      onClick={() => navigate(`/property-leads/${selectedLead.id}`)}
                      size="sm"
                      className="bg-amber-500 hover:bg-amber-600 text-black"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Full Details
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!selectedLead ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Home className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Select a lead from the list</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Owner Info */}
                    {selectedLead.owner_name && (
                      <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Owner Information</span>
                        </div>
                        <p className="text-xl font-semibold text-foreground">{selectedLead.owner_name}</p>
                        {selectedLead.owner_mailing_address && (
                          <p className="text-sm text-muted-foreground mt-1">{selectedLead.owner_mailing_address}</p>
                        )}
                        {selectedLead.owner_phone && (
                          <p className="text-sm text-muted-foreground">{selectedLead.owner_phone}</p>
                        )}
                        {selectedLead.owner_email && (
                          <p className="text-sm text-muted-foreground">{selectedLead.owner_email}</p>
                        )}
                      </div>
                    )}

                    {/* Address */}
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-foreground">{selectedLead.address}</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedLead.city}, {selectedLead.state} {selectedLead.zip_code}
                        </p>
                        {selectedLead.county && (
                          <Badge variant="outline" className="mt-1">{selectedLead.county} County</Badge>
                        )}
                      </div>
                    </div>

                    {/* Values */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg bg-[#1e3a5f]">
                        <p className="text-xs text-white/70">Estimated Value</p>
                        <p className="text-lg font-semibold text-white">
                          {formatCurrency(selectedLead.estimated_value)}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-[#1e3a5f]">
                        <p className="text-xs text-white/70">Tax Assessed</p>
                        <p className="text-lg font-semibold text-white">
                          {formatCurrency(selectedLead.tax_assessed_value)}
                        </p>
                      </div>
                    </div>

                    {/* Property Details */}
                    <div className="grid grid-cols-4 gap-3">
                      {selectedLead.bedrooms && (
                        <div className="text-center p-2 rounded bg-[#1e3a5f]">
                          <p className="text-lg font-semibold text-white">{selectedLead.bedrooms}</p>
                          <p className="text-xs text-white/70">Beds</p>
                        </div>
                      )}
                      {selectedLead.bathrooms && (
                        <div className="text-center p-2 rounded bg-[#1e3a5f]">
                          <p className="text-lg font-semibold text-white">{selectedLead.bathrooms}</p>
                          <p className="text-xs text-white/70">Baths</p>
                        </div>
                      )}
                      {selectedLead.sqft && (
                        <div className="text-center p-2 rounded bg-[#1e3a5f]">
                          <p className="text-lg font-semibold text-white">{selectedLead.sqft.toLocaleString()}</p>
                          <p className="text-xs text-white/70">Sq Ft</p>
                        </div>
                      )}
                      {selectedLead.year_built && (
                        <div className="text-center p-2 rounded bg-[#1e3a5f]">
                          <p className="text-lg font-semibold text-white">{selectedLead.year_built}</p>
                          <p className="text-xs text-white/70">Built</p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button 
                        onClick={() => navigate(`/property-leads/${selectedLead.id}`)}
                        className="flex-1 bg-amber-500 hover:bg-amber-600 text-black"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Open Full Details
                      </Button>
                    </div>

                    {/* Source */}
                    <p className="text-xs text-muted-foreground text-right">
                      Status: {selectedLead.status?.replace('_', ' ').toUpperCase() || 'NEW'} | 
                      Priority: {selectedLead.priority?.toUpperCase() || 'MEDIUM'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Assign to Property Modal */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign to Property Listing</DialogTitle>
            <DialogDescription>
              Link this county data to an existing property listing or lead.
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
            
            {/* Target Selection - Listing or Lead */}
            <div>
              <Label>Assign To</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant={assignTarget === 'listing' ? 'default' : 'outline'}
                  className={assignTarget === 'listing' ? 'bg-amber-500 hover:bg-amber-600 text-black' : ''}
                  onClick={() => {
                    setAssignTarget('listing');
                    setSelectedLeadForAssign('');
                  }}
                  data-testid="assign-to-listing-btn"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Property Listing
                </Button>
                <Button
                  type="button"
                  variant={assignTarget === 'lead' ? 'default' : 'outline'}
                  className={assignTarget === 'lead' ? 'bg-amber-500 hover:bg-amber-600 text-black' : ''}
                  onClick={() => {
                    setAssignTarget('lead');
                    setSelectedListing('');
                  }}
                  data-testid="assign-to-lead-btn"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Leads
                </Button>
              </div>
            </div>
            
            {/* Property Listing Selection */}
            {assignTarget === 'listing' && (
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
                    <SelectTrigger data-testid="select-listing-dropdown">
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
            )}
            
            {/* Leads Selection */}
            {assignTarget === 'lead' && (
              <div>
                <Label>Select Lead</Label>
                {loadingListings ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                  </div>
                ) : allLeadsForAssign.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <p>No leads found</p>
                    <p className="text-sm">Import leads first to assign county data</p>
                  </div>
                ) : (
                  <Select value={selectedLeadForAssign} onValueChange={setSelectedLeadForAssign}>
                    <SelectTrigger data-testid="select-lead-dropdown">
                      <SelectValue placeholder="Select a lead..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allLeadsForAssign.map(lead => (
                        <SelectItem key={lead.id} value={lead.id}>
                          {lead.property_address || lead.address || 'Unknown'}, {lead.city || ''} - {lead.owner_name || 'No owner'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowAssignModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssignToProperty} 
              disabled={(assignTarget === 'listing' ? !selectedListing : !selectedLeadForAssign) || assigning}
              className="bg-amber-500 hover:bg-amber-600 text-black"
              data-testid="assign-data-btn"
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
