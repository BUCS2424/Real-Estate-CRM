import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listingsAPI, propertyLeadsAPI, badgeAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Home,
  Plus,
  Search,
  MapPin,
  Bed,
  Bath,
  Square,
  DollarSign,
  Edit,
  Trash2,
  Eye,
  Loader2,
  Building2,
  RefreshCw,
  FileSpreadsheet,
  Upload,
  Users,
  CheckCircle,
  TrendingUp,
  Calendar,
  Tag,
  Star,
  Gavel,
  Sparkles,
  TrendingDown,
  FileSignature,
  EyeOff,
  Clock,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';

// Badge icons mapping
const BADGE_ICONS = {
  'check-circle': CheckCircle,
  'star': Star,
  'gavel': Gavel,
  'sparkles': Sparkles,
  'trending-down': TrendingDown,
  'file-signature': FileSignature,
  'eye-off': EyeOff,
  'clock': Clock,
  'tag': Tag,
};

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-500/20 text-gray-600 border-gray-500/50' },
  { value: 'active', label: 'Active', color: 'bg-green-500/20 text-green-600 border-green-500/50' },
  { value: 'pending', label: 'Pending', color: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/50' },
  { value: 'sold', label: 'Sold', color: 'bg-blue-500/20 text-blue-600 border-blue-500/50' },
];

const PROPERTY_TYPES = [
  { value: 'single_family', label: 'Single Family' },
  { value: 'condo', label: 'Condo' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'land', label: 'Land' },
  { value: 'commercial', label: 'Commercial' },
];

export const ListingsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState(null);
  
  // Import CSV state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importDestination, setImportDestination] = useState('listings');
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  
  // Badge management state
  const [badgeModalOpen, setBadgeModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [availableBadges, setAvailableBadges] = useState([]);
  const [selectedBadges, setSelectedBadges] = useState([]);
  const [savingBadges, setSavingBadges] = useState(false);

  useEffect(() => {
    fetchListings();
    fetchBadgeTypes();
  }, []);
  
  const fetchBadgeTypes = async () => {
    try {
      const res = await badgeAPI.getTypes();
      setAvailableBadges(res.data.all_badges || []);
    } catch (error) {
      console.error('Failed to load badge types');
    }
  };
  
  const openBadgeModal = (listing, e) => {
    e.stopPropagation();
    setSelectedListing(listing);
    setSelectedBadges(listing.badges || []);
    setBadgeModalOpen(true);
  };
  
  const toggleBadge = (badgeId) => {
    setSelectedBadges(prev => 
      prev.includes(badgeId) 
        ? prev.filter(b => b !== badgeId)
        : [...prev, badgeId]
    );
  };
  
  const saveBadges = async () => {
    if (!selectedListing) return;
    setSavingBadges(true);
    try {
      await badgeAPI.setPropertyBadges(selectedListing.id, selectedBadges);
      // Update local state
      setListings(prev => prev.map(l => 
        l.id === selectedListing.id ? { ...l, badges: selectedBadges } : l
      ));
      toast.success('Badges updated successfully');
      setBadgeModalOpen(false);
    } catch (error) {
      toast.error('Failed to update badges');
    } finally {
      setSavingBadges(false);
    }
  };

  const fetchListings = async () => {
    setLoading(true);
    try {
      const res = await listingsAPI.list();
      const data = res.data || [];
      setListings(data);
      
      // Calculate stats
      const total = data.length;
      const active = data.filter(l => l.status === 'active').length;
      const pending = data.filter(l => l.status === 'pending').length;
      const sold = data.filter(l => l.status === 'sold').length;
      const totalValue = data.reduce((sum, l) => sum + (l.price || 0), 0);
      
      setStats({ total, active, pending, sold, totalValue });
    } catch (error) {
      toast.error('Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  const handleImportCSV = async () => {
    if (!importFile) {
      toast.error('Please select a CSV file');
      return;
    }
    
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      
      let result;
      if (importDestination === 'listings') {
        result = await listingsAPI.importCSV(formData);
      } else {
        result = await propertyLeadsAPI.importCSV(formData);
      }
      
      toast.success(`Imported ${result.data.imported} records, skipped ${result.data.skipped}`);
      setIsImportOpen(false);
      setImportFile(null);
      
      if (importDestination === 'listings') {
        fetchListings();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to import CSV');
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteListing = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this listing?')) return;
    try {
      await listingsAPI.delete(id);
      setListings(prev => prev.filter(l => l.id !== id));
      toast.success('Listing deleted');
      fetchListings(); // Refresh stats
    } catch (error) {
      toast.error('Failed to delete listing');
    }
  };

  const formatPrice = (price) => {
    if (!price) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price);
  };

  const getStatusColor = (status) => {
    return STATUS_OPTIONS.find(s => s.value === status)?.color || 'bg-gray-500/20 text-gray-600';
  };

  const filteredListings = listings.filter(listing => {
    const matchesSearch = listing.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      listing.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      listing.mls_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || listing.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6" data-testid="listings-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif text-foreground mb-2">Property Listings</h1>
          <p className="text-muted-foreground">Showcase your real estate properties</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsImportOpen(true)} data-testid="import-csv-btn">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
          <Button onClick={() => navigate('/listings/new')} className="bg-amber-500 hover:bg-amber-600 text-black" data-testid="new-listing-btn">
            <Plus className="w-4 h-4 mr-2" />
            New Listing
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Building2 className="w-8 h-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <Calendar className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sold</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.sold}</p>
                </div>
                <Home className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <p className="text-2xl font-bold text-amber-600">${(stats.totalValue / 1000000).toFixed(1)}M</p>
                </div>
                <TrendingUp className="w-8 h-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by address, city, or MLS #..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUS_OPTIONS.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchListings}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Listings List */}
      <Card>
        <CardHeader>
          <CardTitle>Listings ({filteredListings.length})</CardTitle>
          <CardDescription>Click on a listing to view details</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Home className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No listings found</p>
              <p className="text-sm mt-1">Import a CSV or create a new listing</p>
              <Button onClick={() => setIsImportOpen(true)} className="mt-4">
                <Upload className="w-4 h-4 mr-2" />
                Import CSV
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredListings.map(listing => (
                <div
                  key={listing.id}
                  onClick={() => navigate(`/listings/${listing.id}`)}
                  className="p-4 rounded-lg border bg-card hover:shadow-md hover:border-amber-500/50 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      {/* Property Image/Icon */}
                      <div className="w-16 h-16 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {listing.images?.[0]?.url ? (
                          <img 
                            src={listing.images[0].url} 
                            alt={listing.address}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Home className="w-8 h-8 text-amber-500" />
                        )}
                      </div>
                      
                      {/* Property Info */}
                      <div>
                        <h3 className="font-semibold text-foreground">{listing.address}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {listing.city}, {listing.state} {listing.zip_code}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="flex items-center gap-1 text-amber-600 font-semibold">
                            <DollarSign className="w-3 h-3" />
                            {formatPrice(listing.price)}
                          </span>
                          {listing.bedrooms > 0 && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Bed className="w-3 h-3" />
                              {listing.bedrooms} bed
                            </span>
                          )}
                          {listing.bathrooms > 0 && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Bath className="w-3 h-3" />
                              {listing.bathrooms} bath
                            </span>
                          )}
                          {listing.sqft > 0 && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Square className="w-3 h-3" />
                              {listing.sqft?.toLocaleString()} ft²
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Right Side */}
                    <div className="flex items-start gap-2">
                      <div className="flex flex-col items-end gap-2">
                        <Badge className={getStatusColor(listing.status)}>
                          {STATUS_OPTIONS.find(s => s.value === listing.status)?.label || listing.status}
                        </Badge>
                        {listing.mls_number && (
                          <span className="text-xs text-muted-foreground">MLS# {listing.mls_number}</span>
                        )}
                        {listing.property_type && (
                          <span className="text-xs text-muted-foreground capitalize">
                            {listing.property_type?.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); navigate(`/listings/${listing.id}`); }}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => handleDeleteListing(listing.id, e)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import CSV Dialog */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Import CSV
            </DialogTitle>
            <DialogDescription>
              Import properties from a CSV file (MLS format supported)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Destination Selection */}
            <div>
              <Label>Import To</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant={importDestination === 'listings' ? 'default' : 'outline'}
                  className={`flex-1 ${importDestination === 'listings' ? 'bg-amber-500 hover:bg-amber-600 text-black' : ''}`}
                  onClick={() => setImportDestination('listings')}
                  data-testid="import-to-listings"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Listings
                </Button>
                <Button
                  type="button"
                  variant={importDestination === 'leads' ? 'default' : 'outline'}
                  className={`flex-1 ${importDestination === 'leads' ? 'bg-amber-500 hover:bg-amber-600 text-black' : ''}`}
                  onClick={() => setImportDestination('leads')}
                  data-testid="import-to-leads"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Property Leads
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {importDestination === 'listings' 
                  ? 'Import to public showcase listings' 
                  : 'Import to CRM property leads for tracking'}
              </p>
            </div>

            {/* File Upload */}
            <div>
              <Label>CSV File</Label>
              <div className="mt-2">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-muted-foreground
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-medium
                    file:bg-amber-500/10 file:text-amber-600
                    hover:file:bg-amber-500/20
                    cursor-pointer"
                  data-testid="import-file-input"
                />
              </div>
              {importFile && (
                <p className="text-sm text-green-600 mt-2">
                  ✓ Selected: {importFile.name}
                </p>
              )}
            </div>

            {/* Expected Format Info */}
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              <p className="font-medium mb-1">Expected CSV columns:</p>
              <p className="text-xs text-muted-foreground">
                MLS #, Status, Price, Address, City, Property Type, Beds, Baths, Square Footage, Lot Size
              </p>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsImportOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleImportCSV}
              disabled={!importFile || importing}
              className="bg-amber-500 hover:bg-amber-600 text-black"
              data-testid="import-submit-btn"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ListingsPage;
