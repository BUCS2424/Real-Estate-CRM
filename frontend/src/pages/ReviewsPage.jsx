import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  Star, 
  ExternalLink, 
  RefreshCw, 
  MapPin, 
  DollarSign,
  Home,
  Calendar,
  Quote,
  TrendingUp,
  Award,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';

const ReviewsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/ratemyagent/all');
      setData(res.data);
    } catch (error) {
      toast.error('Failed to load RateMyAgent data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    if (!value) return '$0';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  const renderStars = (rating) => {
    return (
      <div className="flex gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={`star-rating-${i}`}
            className={`w-4 h-4 ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load data</p>
        <Button onClick={fetchData} className="mt-4">Retry</Button>
      </div>
    );
  }

  const { stats, reviews, listings } = data;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="reviews-page">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-serif text-foreground mb-2">Reviews & Listings</h1>
          <p className="text-muted-foreground">Your RateMyAgent profile data</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button asChild className="bg-amber-500 hover:bg-amber-600 text-black">
            <a href={stats.profile_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              View on RateMyAgent
            </a>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rating</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-3xl font-bold text-foreground">{stats.rating}</span>
                  {renderStars(stats.rating)}
                </div>
              </div>
              <Award className="w-10 h-10 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Reviews</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.review_count}</p>
              </div>
              <Quote className="w-10 h-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Listings</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.active_listings}</p>
              </div>
              <Home className="w-10 h-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sales (12 mo)</p>
                <p className="text-3xl font-bold text-foreground mt-1">{formatCurrency(stats.total_sales_value)}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reviews Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Quote className="w-5 h-5 text-amber-500" />
              Client Reviews
            </CardTitle>
            <CardDescription>
              {reviews.count} verified reviews from RateMyAgent
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {reviews.items.map((review, idx) => (
              <div key={idx} className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-foreground">{review.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      {renderStars(review.rating)}
                      <span className="text-xs text-muted-foreground">{review.date}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {review.source}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-4 mt-2">
                  "{review.text}"
                </p>
                {review.property_address && (
                  <div className="flex items-center gap-1 mt-3 text-xs text-amber-600 dark:text-amber-400">
                    <MapPin className="w-3 h-3" />
                    {review.property_address}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Listings Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="w-5 h-5 text-amber-500" />
              Property Listings
            </CardTitle>
            <CardDescription>
              {listings.count} properties from RateMyAgent
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {listings.items.map((listing, idx) => (
              <div key={idx} className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">{listing.address}</h4>
                    <p className="text-sm text-muted-foreground">
                      {listing.city}, {listing.state} {listing.zip_code}
                    </p>
                  </div>
                  <Badge 
                    className={listing.status === 'sold' 
                      ? 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/50' 
                      : 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/50'
                    }
                  >
                    {listing.status === 'sold' ? 'Sold' : 'Active'}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4 text-amber-500" />
                    <span className="font-semibold text-foreground">{formatCurrency(listing.price)}</span>
                  </div>
                  <div className="flex gap-3 text-sm text-muted-foreground">
                    <span>{listing.bedrooms} bed</span>
                    <span>{listing.bathrooms} bath</span>
                    {listing.garage && <span>{listing.garage} car</span>}
                  </div>
                </div>
                
                {listing.sold_date && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    Sold {listing.sold_date}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Footer note */}
      <p className="text-xs text-muted-foreground text-center">
        Data sourced from RateMyAgent. Last updated: {new Date(stats.last_updated).toLocaleString()}
      </p>
    </div>
  );
};

export default ReviewsPage;
