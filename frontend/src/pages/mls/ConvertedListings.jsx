import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  CheckCircle,
  ExternalLink,
  RefreshCw,
  Eye,
  Bed,
  Bath,
  Square,
  MapPin,
  DollarSign,
  Calendar,
  Image
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import api from '../../lib/api';
import { toast } from 'sonner';

export const ConvertedListings = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const response = await api.get('/mls-listings/?status=converted&limit=100');
      setListings(response.data.listings || []);
      setTotal(response.data.total || 0);
    } catch (error) {
      console.error('Error fetching listings:', error);
      toast.error('Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="converted-listings-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold">Converted Listings</h1>
          <p className="text-muted-foreground">
            MLS listings that are now on your Showcase ({total} total)
          </p>
        </div>
        <Button variant="outline" onClick={fetchListings}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Success Message */}
      {listings.length > 0 && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <p>
              <span className="font-medium">{total} listings</span> are live on your website showcase.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Listings Grid */}
      {listings.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No converted listings yet</p>
            <Link to="/mls/moderate">
              <Button variant="outline">
                Go to Moderate
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((listing) => (
            <Card key={listing.mls_id} className="overflow-hidden">
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
                
                {/* Live Badge */}
                <Badge className="absolute top-2 right-2 bg-green-500">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Live
                </Badge>
              </div>

              <CardContent className="p-4">
                {/* Price */}
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-amber-500" />
                  <span className="text-xl font-bold">{formatPrice(listing.list_price)}</span>
                </div>

                {/* Address */}
                <p className="font-medium truncate">{listing.address}</p>
                <p className="text-sm text-muted-foreground mb-3">
                  {listing.city}, {listing.state} {listing.zip_code}
                </p>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
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
                    {listing.sqft?.toLocaleString() || '-'}
                  </span>
                </div>

                {/* Converted Info */}
                <div className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Converted: {formatDate(listing.converted_at)}
                </div>

                <div className="text-xs text-amber-500 mb-3 flex items-center gap-1" data-testid={`converted-listing-photo-count-${listing.mls_id}`}>
                  <Image className="w-3 h-3" />
                  {(listing.photo_count ?? listing.photos?.length ?? 0).toLocaleString()} photos synced
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => window.open(`/property/${listing.converted_to_slug}`, '_blank')}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View on Site
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => window.open(`/listings/${listing.converted_to_property_id}`, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ConvertedListings;
