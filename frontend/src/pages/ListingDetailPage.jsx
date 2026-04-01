import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { 
  Home, 
  MapPin, 
  DollarSign, 
  Building2,
  Bed,
  Bath,
  Square,
  Calendar,
  Edit2,
  Trash2,
  ArrowLeft,
  Loader2,
  StickyNote,
  Activity,
  ExternalLink,
  Tag,
  Image,
  FileText,
  Car,
  Sparkles,
  Eye,
  Globe,
  Plus,
  X,
  CheckCircle,
  Clock,
  Upload,
  GripVertical,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import { listingsAPI } from '../lib/api';

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-500/20 text-gray-600 border-gray-500/50' },
  { value: 'active', label: 'Active', color: 'bg-green-500/20 text-green-600 border-green-500/50' },
  { value: 'pending', label: 'Pending', color: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/50' },
  { value: 'sold', label: 'Sold', color: 'bg-blue-500/20 text-blue-600 border-blue-500/50' },
];

const PROPERTY_TYPES = [
  { value: 'single_family', label: 'Single Family Residence' },
  { value: 'condo', label: 'Condo' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'land', label: 'Land' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'multi_family', label: 'Multi Family' },
];

const SAMPLE_FEATURES = [
  'Hardwood Floors', 'Granite Counters', 'Stainless Appliances', 'Central A/C',
  'Fireplace', 'Pool', 'Hot Tub', 'Mountain Views', 'Ocean Views', 'Smart Home',
  'Wine Cellar', 'Home Theater', 'Gym', 'Guest House', 'Gated Community'
];

const ListingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [generatingDescription, setGeneratingDescription] = useState(false);
  
  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  
  // Image upload state
  const [uploadingImages, setUploadingImages] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pullingMLS, setPullingMLS] = useState(false);

  useEffect(() => {
    if (id) {
      fetchListing();
    }
  }, [id]);

  const fetchListing = async () => {
    setLoading(true);
    try {
      const res = await listingsAPI.get(id);
      setListing(res.data);
      setEditData(res.data);
    } catch (error) {
      toast.error('Failed to load listing');
      navigate('/listings');
    } finally {
      setLoading(false);
    }
  };

  // Image upload handlers
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files).filter(
      file => file.type.startsWith('image/')
    );
    
    if (files.length === 0) {
      toast.error('Please drop image files only');
      return;
    }
    
    await uploadImages(files);
  }, [id]);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files).filter(
      file => file.type.startsWith('image/')
    );
    
    if (files.length === 0) return;
    await uploadImages(files);
  };

  const uploadImages = async (files) => {
    setUploadingImages(true);
    setUploadProgress(0);
    
    try {
      const totalFiles = files.length;
      let uploaded = 0;
      
      if (files.length === 1) {
        await listingsAPI.uploadImage(id, files[0]);
        uploaded = 1;
      } else {
        const res = await listingsAPI.uploadMultipleImages(id, files);
        uploaded = res.data.uploaded?.length || 0;
        if (res.data.errors?.length > 0) {
          toast.warning(`${res.data.errors.length} files failed to upload`);
        }
      }
      
      setUploadProgress(100);
      toast.success(`${uploaded} image${uploaded !== 1 ? 's' : ''} uploaded successfully`);
      fetchListing();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload images');
    } finally {
      setUploadingImages(false);
      setUploadProgress(0);
    }
  };

  const handlePullMLSImages = async (mlsId = null) => {
    setPullingMLS(true);
    try {
      const res = await listingsAPI.pullMLSImages(id, mlsId ? { mls_id: mlsId } : undefined);
      if (res.data.added > 0) {
        toast.success(res.data.message);
        fetchListing();
      } else {
        toast.info(res.data.message);
      }
    } catch (error) {
      const detail = error.response?.data?.detail || '';
      if (detail.includes('No MLS listing found')) {
        const manualId = window.prompt('Auto-lookup failed. Enter the MLS # to pull images from:');
        if (manualId && manualId.trim()) {
          setPullingMLS(true);
          try {
            const res2 = await listingsAPI.pullMLSImages(id, { mls_id: manualId.trim() });
            if (res2.data.added > 0) {
              toast.success(res2.data.message);
              fetchListing();
            } else {
              toast.info(res2.data.message);
            }
          } catch (err2) {
            toast.error(err2.response?.data?.detail || 'Failed to pull MLS images');
          }
        }
      } else {
        toast.error(detail || 'Failed to pull MLS images');
      }
    } finally {
      setPullingMLS(false);
    }
  };


  const handleDeleteImage = async (imageId) => {
    if (!window.confirm('Delete this image?')) return;
    
    try {
      await listingsAPI.deleteImage(id, imageId);
      toast.success('Image deleted');
      fetchListing();
    } catch (error) {
      toast.error('Failed to delete image');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await listingsAPI.update(id, editData);
      toast.success('Listing updated');
      setEditMode(false);
      fetchListing();
    } catch (error) {
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateDescription = async () => {
    setGeneratingDescription(true);
    try {
      const res = await listingsAPI.generateDescription(id);
      toast.success('Description generated!');
      fetchListing();
    } catch (error) {
      toast.error('Failed to generate description');
    } finally {
      setGeneratingDescription(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this listing?')) return;
    try {
      await listingsAPI.delete(id);
      toast.success('Listing deleted');
      navigate('/listings');
    } catch (error) {
      toast.error('Failed to delete listing');
    }
  };

  const formatCurrency = (value) => {
    if (!value) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusColor = (status) => {
    return STATUS_OPTIONS.find(s => s.value === status)?.color || 'bg-gray-500/20 text-gray-600';
  };

  const getPropertyTypeLabel = (type) => {
    return PROPERTY_TYPES.find(t => t.value === type)?.label || type?.replace('_', ' ') || '-';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="text-center py-12">
        <Home className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-lg">Listing not found</p>
        <Button onClick={() => navigate('/listings')} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Listings
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-6 min-h-[calc(100vh-6rem)]" data-testid="listing-detail">
      {/* Left Sidebar */}
      <div className="w-80 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
        {/* Property Card */}
        <Card>
          <CardContent className="pt-6">
            {/* Property Image/Icon */}
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-amber-400/20 to-amber-600/20 rounded-xl flex items-center justify-center border-2 border-amber-500/30 overflow-hidden">
              {listing.images?.[0]?.url ? (
                <img 
                  src={listing.images[0].url} 
                  alt={listing.address}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Home className="w-10 h-10 text-amber-500" />
              )}
            </div>
            
            {/* Address */}
            <h2 className="text-xl font-semibold text-center text-foreground mb-1">
              {listing.address}
            </h2>
            <p className="text-center text-muted-foreground text-sm mb-4">
              {listing.city}, {listing.state} {listing.zip_code}
            </p>
            
            {/* Status Badge */}
            <div className="flex justify-center gap-2 mb-4">
              <Badge className={getStatusColor(listing.status)}>
                {STATUS_OPTIONS.find(s => s.value === listing.status)?.label?.toUpperCase() || listing.status?.toUpperCase()}
              </Badge>
            </div>
            
            {/* Price */}
            <div className="text-center mb-4">
              <p className="text-3xl font-bold text-amber-600">{formatCurrency(listing.price)}</p>
              {listing.sqft && listing.price && (
                <p className="text-sm text-muted-foreground">{formatCurrency(listing.price / listing.sqft)}/sqft</p>
              )}
            </div>
            
            {/* Quick Actions */}
            <div className="space-y-2">
              <Button variant="outline" className="w-full" onClick={() => setEditMode(true)}>
                <Edit2 className="w-4 h-4 mr-2" />
                Edit Listing
              </Button>
              <Button variant="outline" className="w-full text-red-500 hover:text-red-600" onClick={handleDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Listing
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-500" />
              Property Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Type</span>
              <span className="text-sm font-medium">{getPropertyTypeLabel(listing.property_type)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Beds/Baths</span>
              <span className="text-sm font-medium">
                {listing.bedrooms || '-'} / {listing.bathrooms || '-'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Sqft</span>
              <span className="text-sm font-medium">{listing.sqft?.toLocaleString() || '-'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Year Built</span>
              <span className="text-sm font-medium">{listing.year_built || '-'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">MLS #</span>
              <span className="text-sm font-medium">{listing.mls_number || listing.mls_id || '-'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Features/Tags */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Tag className="w-4 h-4 text-amber-500" />
              Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {listing.features?.length > 0 ? (
                listing.features.map((feature, idx) => (
                  <Badge key={idx} variant="outline">{feature}</Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No features listed</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={() => navigate('/listings')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Listings
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={`/property/${listing?.slug || id}`} target="_blank" rel="noopener noreferrer">
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </a>
            </Button>
            <Button variant="outline" size="sm">
              <ExternalLink className="w-4 h-4 mr-2" />
              View on Map
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="w-full justify-start bg-muted/50 p-1 rounded-lg">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="images" className="flex items-center gap-2">
              <Image className="w-4 h-4" />
              Images ({listing.images?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="description" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Description
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Activity
            </TabsTrigger>
          </TabsList>

          {/* Tab Content */}
          <div className="flex-1 mt-4 pb-8 overflow-y-auto">
            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-0 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Property Details Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-amber-500" />
                      Property Details
                    </CardTitle>
                    <CardDescription>Details from CSV import or manual entry</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Property Type</Label>
                        <p className="font-medium">{getPropertyTypeLabel(listing.property_type)}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Year Built</Label>
                        <p className="font-medium">{listing.year_built || '-'}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Bedrooms</Label>
                        <p className="font-medium flex items-center gap-1">
                          <Bed className="w-4 h-4 text-muted-foreground" />
                          {listing.bedrooms || '-'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Bathrooms</Label>
                        <p className="font-medium flex items-center gap-1">
                          <Bath className="w-4 h-4 text-muted-foreground" />
                          {listing.bathrooms || '-'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Square Feet</Label>
                        <p className="font-medium flex items-center gap-1">
                          <Square className="w-4 h-4 text-muted-foreground" />
                          {listing.sqft?.toLocaleString() || '-'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Lot Size</Label>
                        <p className="font-medium">{listing.lot_size || '-'}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Garage</Label>
                        <p className="font-medium flex items-center gap-1">
                          <Car className="w-4 h-4 text-muted-foreground" />
                          {listing.garage ? `${listing.garage} car` : '-'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">MLS #</Label>
                        <p className="font-medium font-mono text-sm">{listing.mls_number || listing.mls_id || '-'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Price Card */}
                <Card className="border-amber-500/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-amber-500" />
                      Pricing
                    </CardTitle>
                    <CardDescription>Listing price information</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Main Price */}
                    <div className="text-center p-4 bg-amber-500/10 rounded-lg border border-amber-500/30 mb-4">
                      <p className="text-sm text-muted-foreground mb-1">List Price</p>
                      <p className="text-3xl font-bold text-amber-600">
                        {formatCurrency(listing.price)}
                      </p>
                      {listing.sqft && listing.price && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatCurrency(listing.price / listing.sqft)}/sqft
                        </p>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Status</p>
                        <p className="font-semibold capitalize">{listing.status || '-'}</p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">MLS Status</p>
                        <p className="font-semibold capitalize">{listing.mls_status || '-'}</p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Days on Market</p>
                        <p className="font-semibold">
                          {listing.created_at ? Math.floor((Date.now() - new Date(listing.created_at).getTime()) / (1000 * 60 * 60 * 24)) : '-'}
                        </p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Listed</p>
                        <p className="font-semibold">{formatDate(listing.created_at)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Location Card */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-amber-500" />
                      Location
                    </CardTitle>
                    <CardDescription>Property address and location details</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Address</p>
                        <p className="font-semibold">{listing.address || '-'}</p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">City</p>
                        <p className="font-semibold">{listing.city || '-'}</p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">State</p>
                        <p className="font-semibold">{listing.state || '-'}</p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">ZIP Code</p>
                        <p className="font-semibold">{listing.zip_code || '-'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Images Tab */}
            <TabsContent value="images" className="mt-0">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Image className="w-5 h-5 text-amber-500" />
                        Property Images
                      </CardTitle>
                      <CardDescription>Drag and drop images to upload them to this property</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handlePullMLSImages}
                        disabled={pullingMLS || uploadingImages}
                        data-testid="pull-mls-images-btn"
                      >
                        {pullingMLS ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4 mr-2" />
                        )}
                        Pull MLS Images
                      </Button>
                      <label htmlFor="image-upload">
                        <Button variant="outline" size="sm" asChild disabled={uploadingImages}>
                          <span className="cursor-pointer">
                            {uploadingImages ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Upload className="w-4 h-4 mr-2" />
                            )}
                            Upload Images
                          </span>
                        </Button>
                      </label>
                    </div>
                    <input
                      id="image-upload"
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      disabled={uploadingImages}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Drag and Drop Zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`
                      relative border-2 border-dashed rounded-xl p-8 mb-6 transition-all duration-200
                      ${isDragging 
                        ? 'border-amber-500 bg-amber-500/10' 
                        : 'border-muted-foreground/25 hover:border-amber-500/50 hover:bg-muted/50'
                      }
                    `}
                  >
                    {uploadingImages ? (
                      <div className="text-center">
                        <Loader2 className="w-12 h-12 mx-auto mb-4 text-amber-500 animate-spin" />
                        <p className="text-lg font-medium">Uploading images...</p>
                        <div className="mt-4 w-full max-w-xs mx-auto bg-muted rounded-full h-2 overflow-hidden">
                          <div 
                            className="h-full bg-amber-500 transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-amber-500' : 'text-muted-foreground'}`} />
                        <p className="text-lg font-medium">
                          {isDragging ? 'Drop images here!' : 'Drag & drop images here'}
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                          or click "Upload Images" to browse
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Supports: JPG, PNG, GIF, WebP
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Image Gallery */}
                  {listing.images?.length > 0 ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          {listing.images.length} image{listing.images.length !== 1 ? 's' : ''} • First image is the cover photo
                        </p>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {listing.images.map((img, idx) => (
                          <div 
                            key={img.id || idx} 
                            className="relative group aspect-video rounded-lg overflow-hidden bg-muted border border-border"
                          >
                            <img 
                              src={img.url} 
                              alt={img.original_name || img.caption || `Image ${idx + 1}`}
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            />
                            {/* Overlay on hover */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteImage(img.id)}
                                className="h-8"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            {/* Cover badge */}
                            {idx === 0 && (
                              <Badge className="absolute top-2 left-2 bg-amber-500 text-black text-xs">
                                Cover
                              </Badge>
                            )}
                            {/* File info */}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <p className="text-xs text-white truncate">
                                {img.original_name || img.filename}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Image className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No images uploaded yet</p>
                      <p className="text-sm">Drag and drop images above to get started</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Description Tab */}
            <TabsContent value="description" className="mt-0">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-amber-500" />
                        Property Description
                      </CardTitle>
                      <CardDescription>Marketing description for the listing</CardDescription>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleGenerateDescription}
                      disabled={generatingDescription}
                    >
                      {generatingDescription ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                      )}
                      Generate with AI
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {listing.description ? (
                    <div className="prose prose-sm max-w-none">
                      <p className="whitespace-pre-wrap text-foreground">{listing.description}</p>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No description yet</p>
                      <p className="text-sm">Click "Generate with AI" to create a compelling description</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-amber-500" />
                    Activity History
                  </CardTitle>
                  <CardDescription>Timeline of actions and updates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">Listing Created</p>
                        <p className="text-sm text-muted-foreground">{formatDate(listing.created_at)}</p>
                      </div>
                    </div>
                    {listing.updated_at && listing.updated_at !== listing.created_at && (
                      <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <Edit2 className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">Listing Updated</p>
                          <p className="text-sm text-muted-foreground">{formatDate(listing.updated_at)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Edit Modal */}
      <Dialog open={editMode} onOpenChange={setEditMode}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Listing</DialogTitle>
            <DialogDescription>Update the property details</DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Address</Label>
                <Input
                  value={editData.address || ''}
                  onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                />
              </div>
              <div>
                <Label>City</Label>
                <Input
                  value={editData.city || ''}
                  onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>State</Label>
                  <Input
                    value={editData.state || ''}
                    onChange={(e) => setEditData({ ...editData, state: e.target.value })}
                  />
                </div>
                <div>
                  <Label>ZIP</Label>
                  <Input
                    value={editData.zip_code || ''}
                    onChange={(e) => setEditData({ ...editData, zip_code: e.target.value })}
                  />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Price ($)</Label>
                <Input
                  type="number"
                  value={editData.price || ''}
                  onChange={(e) => setEditData({ ...editData, price: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={editData.status} onValueChange={(v) => setEditData({ ...editData, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Property Type</Label>
                <Select value={editData.property_type} onValueChange={(v) => setEditData({ ...editData, property_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label>Beds</Label>
                <Input
                  type="number"
                  value={editData.bedrooms || ''}
                  onChange={(e) => setEditData({ ...editData, bedrooms: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Baths</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={editData.bathrooms || ''}
                  onChange={(e) => setEditData({ ...editData, bathrooms: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Sqft</Label>
                <Input
                  type="number"
                  value={editData.sqft || ''}
                  onChange={(e) => setEditData({ ...editData, sqft: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Year Built</Label>
                <Input
                  type="number"
                  value={editData.year_built || ''}
                  onChange={(e) => setEditData({ ...editData, year_built: parseInt(e.target.value) || null })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Lot Size</Label>
                <Input
                  value={editData.lot_size || ''}
                  onChange={(e) => setEditData({ ...editData, lot_size: e.target.value })}
                  placeholder="0.5 acres"
                />
              </div>
              <div>
                <Label>Garage</Label>
                <Input
                  type="number"
                  value={editData.garage || ''}
                  onChange={(e) => setEditData({ ...editData, garage: parseInt(e.target.value) || null })}
                />
              </div>
              <div>
                <Label>MLS #</Label>
                <Input
                  value={editData.mls_number || editData.mls_id || ''}
                  onChange={(e) => setEditData({ ...editData, mls_number: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                rows={4}
                value={editData.description || ''}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                placeholder="Property description..."
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-black">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ListingDetailPage;
