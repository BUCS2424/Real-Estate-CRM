import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { 
  Star, 
  Plus, 
  Edit2, 
  Trash2, 
  RefreshCw, 
  ExternalLink,
  Quote,
  Eye,
  EyeOff,
  Award,
  Loader2,
  Search,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { reviewsAPI } from '../lib/api';

const ReviewsManagementPage = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [sources, setSources] = useState([]);
  const [filterSource, setFilterSource] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    text: '',
    rating: 5,
    reviewer_name: '',
    reviewer_title: '',
    reviewer_location: '',
    property_address: '',
    source: 'Manual',
    featured: false,
    show_on_homepage: true
  });

  useEffect(() => {
    fetchReviews();
    fetchSources();
  }, [filterSource]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterSource && filterSource !== 'all') {
        params.source = filterSource;
      }
      const res = await reviewsAPI.getAll(params);
      setReviews(res.data.reviews || []);
    } catch (error) {
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const fetchSources = async () => {
    try {
      const res = await reviewsAPI.getSources();
      setSources(res.data.sources || []);
    } catch (error) {
      console.error('Failed to fetch sources');
    }
  };

  const handleSyncRateMyAgent = async () => {
    setSyncing(true);
    try {
      const res = await reviewsAPI.syncRateMyAgent();
      toast.success(res.data.message);
      fetchReviews();
      fetchSources();
    } catch (error) {
      toast.error('Failed to sync reviews');
    } finally {
      setSyncing(false);
    }
  };

  const handleCreateNew = () => {
    setEditingReview(null);
    setFormData({
      title: '',
      text: '',
      rating: 5,
      reviewer_name: '',
      reviewer_title: '',
      reviewer_location: '',
      property_address: '',
      source: 'Manual',
      featured: false,
      show_on_homepage: true
    });
    setShowEditModal(true);
  };

  const handleEdit = (review) => {
    setEditingReview(review);
    setFormData({
      title: review.title || '',
      text: review.text || '',
      rating: review.rating || 5,
      reviewer_name: review.reviewer_name || '',
      reviewer_title: review.reviewer_title || '',
      reviewer_location: review.reviewer_location || '',
      property_address: review.property_address || '',
      source: review.source || 'Manual',
      featured: review.featured || false,
      show_on_homepage: review.show_on_homepage !== false
    });
    setShowEditModal(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.text || !formData.reviewer_name) {
      toast.error('Please fill in required fields');
      return;
    }

    setSaving(true);
    try {
      if (editingReview) {
        await reviewsAPI.update(editingReview.id, formData);
        toast.success('Review updated');
      } else {
        await reviewsAPI.create(formData);
        toast.success('Review created');
      }
      setShowEditModal(false);
      fetchReviews();
    } catch (error) {
      toast.error('Failed to save review');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    
    try {
      await reviewsAPI.delete(reviewId);
      toast.success('Review deleted');
      fetchReviews();
    } catch (error) {
      toast.error('Failed to delete review');
    }
  };

  const handleToggleHomepage = async (review) => {
    try {
      await reviewsAPI.update(review.id, { show_on_homepage: !review.show_on_homepage });
      toast.success(review.show_on_homepage ? 'Hidden from homepage' : 'Shown on homepage');
      fetchReviews();
    } catch (error) {
      toast.error('Failed to update review');
    }
  };

  const handleToggleFeatured = async (review) => {
    try {
      await reviewsAPI.update(review.id, { featured: !review.featured });
      toast.success(review.featured ? 'Unfeatured' : 'Featured');
      fetchReviews();
    } catch (error) {
      toast.error('Failed to update review');
    }
  };

  const renderStars = (rating, interactive = false, onChange = null) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-5 h-5 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'} ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
          onClick={() => interactive && onChange && onChange(star)}
        />
      ))}
    </div>
  );

  const filteredReviews = reviews.filter(review => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      review.title?.toLowerCase().includes(query) ||
      review.text?.toLowerCase().includes(query) ||
      review.reviewer_name?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in" data-testid="reviews-management-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif text-foreground mb-2">Reviews Management</h1>
          <p className="text-muted-foreground">Manage testimonials from all sources</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSyncRateMyAgent} disabled={syncing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sync RateMyAgent
          </Button>
          <Button onClick={handleCreateNew} className="bg-amber-500 hover:bg-amber-600 text-black">
            <Plus className="w-4 h-4 mr-2" />
            Add Review
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Reviews</p>
                <p className="text-2xl font-bold">{reviews.length}</p>
              </div>
              <Quote className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card className={reviews.filter(r => r.status === 'pending').length > 0 ? 'border-orange-500/50 bg-orange-500/5' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Approval</p>
                <p className="text-2xl font-bold text-orange-500">{reviews.filter(r => r.status === 'pending').length}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">On Homepage</p>
                <p className="text-2xl font-bold">{reviews.filter(r => r.show_on_homepage).length}</p>
              </div>
              <Eye className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Featured</p>
                <p className="text-2xl font-bold">{reviews.filter(r => r.featured).length}</p>
              </div>
              <Award className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Rating</p>
                <p className="text-2xl font-bold">
                  {reviews.length ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : '0'}
                </p>
              </div>
              <Star className="w-8 h-8 text-amber-400 fill-amber-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search reviews..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger className="w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {sources.map(source => (
                  <SelectItem key={source} value={source}>{source}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <Card>
        <CardHeader>
          <CardTitle>All Reviews ({filteredReviews.length})</CardTitle>
          <CardDescription>Click to edit, toggle visibility, or delete</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Quote className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No reviews found</p>
              <p className="text-sm mt-1">Add a review or sync from RateMyAgent</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReviews.map(review => (
                <div
                  key={review.id}
                  className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {renderStars(review.rating)}
                        <Badge variant="outline" className="ml-2">{review.source}</Badge>
                        {review.featured && (
                          <Badge className="bg-purple-500/20 text-purple-600 border-purple-500/50">
                            <Award className="w-3 h-3 mr-1" /> Featured
                          </Badge>
                        )}
                        {!review.show_on_homepage && (
                          <Badge variant="secondary">
                            <EyeOff className="w-3 h-3 mr-1" /> Hidden
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-semibold text-foreground mb-1">"{review.title}"</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{review.text}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="font-medium">{review.reviewer_name}</span>
                        {review.property_address && <span>• {review.property_address}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleHomepage(review)}
                        title={review.show_on_homepage ? 'Hide from homepage' : 'Show on homepage'}
                      >
                        {review.show_on_homepage ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleFeatured(review)}
                        title={review.featured ? 'Unfeature' : 'Feature'}
                      >
                        <Award className={`w-4 h-4 ${review.featured ? 'text-purple-500' : ''}`} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(review)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(review.id)} className="text-red-500 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingReview ? 'Edit Review' : 'Add New Review'}</DialogTitle>
            <DialogDescription>
              {editingReview ? 'Update the review details below' : 'Create a new testimonial'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Amazing Experience!"
                />
              </div>
              <div>
                <Label>Rating</Label>
                <div className="mt-2">
                  {renderStars(formData.rating, true, (star) => setFormData({ ...formData, rating: star }))}
                </div>
              </div>
            </div>
            
            <div>
              <Label>Review Text *</Label>
              <Textarea
                value={formData.text}
                onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                placeholder="The full review text..."
                rows={4}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Reviewer Name *</Label>
                <Input
                  value={formData.reviewer_name}
                  onChange={(e) => setFormData({ ...formData, reviewer_name: e.target.value })}
                  placeholder="John Smith"
                />
              </div>
              <div>
                <Label>Reviewer Title</Label>
                <Input
                  value={formData.reviewer_title}
                  onChange={(e) => setFormData({ ...formData, reviewer_title: e.target.value })}
                  placeholder="First-time Homebuyer"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Location</Label>
                <Input
                  value={formData.reviewer_location}
                  onChange={(e) => setFormData({ ...formData, reviewer_location: e.target.value })}
                  placeholder="Tampa, FL"
                />
              </div>
              <div>
                <Label>Property Address</Label>
                <Input
                  value={formData.property_address}
                  onChange={(e) => setFormData({ ...formData, property_address: e.target.value })}
                  placeholder="123 Main St, Tampa"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Source</Label>
                <Select value={formData.source} onValueChange={(val) => setFormData({ ...formData, source: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Manual">Manual Entry</SelectItem>
                    <SelectItem value="RateMyAgent">RateMyAgent</SelectItem>
                    <SelectItem value="Google">Google</SelectItem>
                    <SelectItem value="Zillow">Zillow</SelectItem>
                    <SelectItem value="Realtor.com">Realtor.com</SelectItem>
                    <SelectItem value="Facebook">Facebook</SelectItem>
                    <SelectItem value="Yelp">Yelp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Show on Homepage</Label>
                  <Switch
                    checked={formData.show_on_homepage}
                    onCheckedChange={(checked) => setFormData({ ...formData, show_on_homepage: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Featured</Label>
                  <Switch
                    checked={formData.featured}
                    onCheckedChange={(checked) => setFormData({ ...formData, featured: checked })}
                  />
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-black">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editingReview ? 'Update Review' : 'Create Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReviewsManagementPage;
