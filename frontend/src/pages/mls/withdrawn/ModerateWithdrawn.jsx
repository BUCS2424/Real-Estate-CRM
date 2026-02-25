import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  CheckCircle, 
  XCircle, 
  UserPlus,
  RefreshCw,
  Eye,
  Bed,
  Bath,
  Square,
  MapPin,
  DollarSign,
  Filter,
  CheckCheck,
  Calendar,
  Tag
} from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../components/ui/dialog';
import api from '../../../lib/api';
import { toast } from 'sonner';

export const ModerateWithdrawn = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [selectedListing, setSelectedListing] = useState(null);
  const [converting, setConverting] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  
  const statusFilter = searchParams.get('status') || 'pending';

  useEffect(() => {
    fetchListings();
  }, [statusFilter]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      params.append('limit', '50');
      
      const response = await api.get(`/withdrawn-listings/?${params}`);
      setListings(response.data.listings || []);
      setTotal(response.data.total || 0);
    } catch (error) {
      console.error('Error fetching listings:', error);
      toast.error('Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (listingId) => {
    try {
      await api.patch(`/withdrawn-listings/${listingId}/status?status=approved`);
      toast.success('Listing approved');
      fetchListings();
    } catch (error) {
      toast.error('Failed to approve listing');
    }
  };

  const handleReject = async (listingId) => {
    try {
      await api.patch(`/withdrawn-listings/${listingId}/status?status=rejected`);
      toast.success('Listing rejected');
      fetchListings();
    } catch (error) {
      toast.error('Failed to reject listing');
    }
  };

  const handleConvertToLead = async (listingId) => {
    setConverting(true);
    try {
      const response = await api.post(`/withdrawn-listings/${listingId}/convert-to-lead`);
      toast.success('Converted to Property Lead with "withdrawn" tag!');
      setSelectedListing(null);
      fetchListings();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to convert');
    } finally {
      setConverting(false);
    }
  };

  const handleBulkConvert = async () => {
    if (selectedIds.length === 0) {
      toast.error('Select listings to convert');
      return;
    }
    
    setConverting(true);
    try {
      const response = await api.post('/withdrawn-listings/bulk-convert', selectedIds);
      const { summary } = response.data;
      toast.success(`Converted ${summary.converted} to property leads`);
      setSelectedIds([]);
      fetchListings();
    } catch (error) {
      toast.error('Bulk conversion failed');
    } finally {
      setConverting(false);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === listings.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(listings.map(l => l.mls_id));
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-500">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="border-green-500 text-green-500">Approved</Badge>;
      case 'converted':
        return <Badge variant="outline" className="border-blue-500 text-blue-500">Converted</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="border-red-500 text-red-500">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatPrice = (price) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="moderate-withdrawn-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
            <XCircle className="w-6 h-6 text-red-500" />
            Moderate Withdrawn Listings
          </h1>
          <p className="text-muted-foreground" data-testid="withdrawn-total-count">
            Review and convert withdrawn listings to leads ({total} total)
          </p>
        </div>
        
        {selectedIds.length > 0 && (
          <Button 
            onClick={handleBulkConvert}
            disabled={converting}
            className="bg-green-500 hover:bg-green-600"
            data-testid="withdrawn-bulk-convert-button"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Convert to Leads ({selectedIds.length})
          </Button>
        )}
      </div>

      {/* Tag Info */}
      <Card className="border-red-500/20 bg-red-500/5">
        <CardContent className="p-3 flex items-center gap-2">
          <Tag className="w-4 h-4 text-red-500" />
          <p className="text-sm">
            Converted listings will be tagged with <Badge variant="outline" className="ml-1 border-red-500 text-red-500">withdrawn</Badge> and added to your dead leads list
          </p>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Filter className="w-4 h-4 text-muted-foreground" />
            
            <Select 
              value={statusFilter} 
              onValueChange={(v) => setSearchParams({ status: v })}
            >
              <SelectTrigger className="w-40" data-testid="withdrawn-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending" data-testid="withdrawn-status-pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={selectAll}>
              <CheckCheck className="w-4 h-4 mr-2" />
              {selectedIds.length === listings.length ? 'Deselect All' : 'Select All'}
            </Button>

            <Button variant="ghost" size="sm" onClick={fetchListings}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Listings Grid */}
      {listings.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <XCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No withdrawn listings found</p>
            <Button variant="outline" onClick={() => window.location.href = '/mls/withdrawn/search'}>
              Search for Withdrawn Listings
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((listing) => (
            <Card 
              key={listing.mls_id} 
              className={`overflow-hidden hover:border-red-500/50 transition-colors ${
                selectedIds.includes(listing.mls_id) ? 'ring-2 ring-red-500' : ''
              }`}
            >
              {/* Image */}
              <div className="relative h-48 bg-muted">
                {listing.primary_photo ? (
                  <img 
                    src={listing.primary_photo} 
                    alt={listing.address}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <MapPin className="w-12 h-12 text-muted-foreground/30" />
                  </div>
                )}
                
                {/* Selection checkbox */}
                <div 
                  className="absolute top-2 left-2 w-6 h-6 rounded border-2 border-white bg-background/80 flex items-center justify-center cursor-pointer"
                  onClick={() => toggleSelect(listing.mls_id)}
                >
                  {selectedIds.includes(listing.mls_id) && (
                    <CheckCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>

                {/* Withdrawn Badge */}
                <Badge className="absolute top-2 right-2 bg-red-500">
                  <XCircle className="w-3 h-3 mr-1" />
                  Withdrawn
                </Badge>
                
                <div className="absolute bottom-2 right-2">
                  {getStatusBadge(listing.sync_status)}
                </div>
              </div>

              <CardContent className="p-4">
                {/* Price */}
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-red-500" />
                  <span className="text-xl font-bold">{formatPrice(listing.list_price)}</span>
                </div>

                {/* Address */}
                <p className="font-medium truncate">{listing.address}</p>
                <p className="text-sm text-muted-foreground mb-2">
                  {listing.city}, {listing.state} {listing.zip_code}
                </p>

                {/* Days on market */}
                {listing.days_on_market && (
                  <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Was on market: {listing.days_on_market} days
                  </p>
                )}

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <Bed className="w-4 h-4" />
                    {listing.bedrooms || '-'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Bath className="w-4 h-4" />
                    {listing.bathrooms || '-'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Square className="w-4 h-4" />
                    {listing.sqft?.toLocaleString() || '-'} sqft
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {listing.sync_status === 'pending' && (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 border-green-500 text-green-500 hover:bg-green-500/10"
                        onClick={() => handleApprove(listing.mls_id)}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="border-red-500 text-red-500 hover:bg-red-500/10"
                        onClick={() => handleReject(listing.mls_id)}
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  
                  {listing.sync_status === 'approved' && (
                    <Button 
                      size="sm" 
                      className="flex-1 bg-green-500 hover:bg-green-600"
                      onClick={() => setSelectedListing(listing)}
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      Convert to Lead
                    </Button>
                  )}

                  {listing.sync_status === 'converted' && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => window.open(`/property-leads/${listing.converted_to_lead_id}`, '_blank')}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Lead
                    </Button>
                  )}

                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => setSelectedListing(listing)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail/Convert Dialog */}
      <Dialog open={!!selectedListing} onOpenChange={() => setSelectedListing(null)}>
        <DialogContent className="max-w-2xl">
          {selectedListing && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-500" />
                  {selectedListing.address}
                </DialogTitle>
              </DialogHeader>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Image */}
                <div className="col-span-2 h-64 bg-muted rounded-lg overflow-hidden">
                  {selectedListing.primary_photo ? (
                    <img 
                      src={selectedListing.primary_photo} 
                      alt={selectedListing.address}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MapPin className="w-16 h-16 text-muted-foreground/30" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div>
                  <p className="text-sm text-muted-foreground">Last List Price</p>
                  <p className="text-2xl font-bold text-red-500">{formatPrice(selectedListing.list_price)}</p>
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
                  <p className="text-sm text-muted-foreground">Days on Market</p>
                  <p className="font-medium">{selectedListing.days_on_market || 'N/A'} days</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Beds / Baths</p>
                  <p className="font-medium">{selectedListing.bedrooms} / {selectedListing.bathrooms}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Square Feet</p>
                  <p className="font-medium">{selectedListing.sqft?.toLocaleString() || 'N/A'}</p>
                </div>

                {/* Tag Info */}
                <div className="col-span-2 p-3 bg-red-500/10 rounded-lg">
                  <p className="text-sm flex items-center gap-2">
                    <Tag className="w-4 h-4 text-red-500" />
                    Will be tagged as: <Badge className="bg-red-500">withdrawn</Badge>
                  </p>
                </div>
              </div>

              <DialogFooter>
                {selectedListing.sync_status !== 'converted' && (
                  <Button 
                    onClick={() => handleConvertToLead(selectedListing.mls_id)}
                    disabled={converting}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    {converting ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <UserPlus className="w-4 h-4 mr-2" />
                    )}
                    Convert to Property Lead
                  </Button>
                )}
                {selectedListing.sync_status === 'converted' && (
                  <Button 
                    onClick={() => window.open(`/property-leads/${selectedListing.converted_to_lead_id}`, '_blank')}
                    variant="outline"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Property Lead
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ModerateWithdrawn;
