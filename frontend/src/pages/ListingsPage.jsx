import React, { useState, useEffect } from 'react';
import { listingsAPI, contactsAPI, mediaAPI } from '../lib/api';
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
  Sparkles,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Upload,
  Loader2,
  Building2,
  Calendar,
  Car,
  Maximize,
  Share2,
  Heart,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';

const PROPERTY_TYPES = [
  { value: 'single_family', label: 'Single Family Home' },
  { value: 'condo', label: 'Condo' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'land', label: 'Land' },
  { value: 'commercial', label: 'Commercial' },
];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-700' },
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'sold', label: 'Sold', color: 'bg-blue-100 text-blue-700' },
];

const SAMPLE_FEATURES = [
  'Hardwood Floors', 'Granite Counters', 'Stainless Appliances', 'Central A/C',
  'Fireplace', 'Pool', 'Hot Tub', 'Mountain Views', 'Ocean Views', 'Smart Home',
  'Wine Cellar', 'Home Theater', 'Gym', 'Guest House', 'Gated Community'
];

export const ListingsPage = () => {
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Form state
  const [formData, setFormData] = useState({
    address: '', city: '', state: '', zip_code: '', country: 'USA',
    price: '', bedrooms: '', bathrooms: '', sqft: '', lot_size: '',
    property_type: 'single_family', status: 'draft', description: '',
    features: [], images: [], mls_id: '', year_built: '', garage: ''
  });
  const [addressLookupLoading, setAddressLookupLoading] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      const res = await listingsAPI.list();
      setListings(res.data || []);
    } catch (error) {
      toast.error('Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  const handleAddressLookup = async () => {
    if (!formData.address) {
      toast.error('Please enter an address');
      return;
    }
    setAddressLookupLoading(true);
    try {
      const res = await listingsAPI.lookupAddress(formData.address);
      const data = res.data;
      
      if (data.error) {
        toast.warning(`Partial data loaded: ${data.error}`);
      }
      
      // Update form with all available data
      setFormData(prev => ({
        ...prev,
        address: data.address || prev.address,
        city: data.city || prev.city,
        state: data.state || prev.state,
        zip_code: data.zip_code || prev.zip_code,
        country: data.country || prev.country,
        price: data.estimated_price || prev.price,
        property_type: data.property_type || prev.property_type,
        sqft: data.typical_sqft || prev.sqft,
        bedrooms: data.typical_bedrooms || prev.bedrooms,
        bathrooms: data.typical_bathrooms || prev.bathrooms,
        lot_size: data.lot_size || prev.lot_size,
        year_built: data.year_built_estimate ? data.year_built_estimate.split('-')[0] : prev.year_built,
      }));
      
      // Show additional info in a toast
      if (data.neighborhood_info) {
        toast.info(`Area Info: ${data.neighborhood_info}`, { duration: 5000 });
      }
      if (data.market_trends) {
        toast.info(`Market: ${data.market_trends}`, { duration: 5000 });
      }
      
      toast.success('Property data loaded from AI lookup!');
    } catch (error) {
      toast.error('Failed to lookup address');
    } finally {
      setAddressLookupLoading(false);
    }
  };

  const handleGenerateDescription = async (listingId) => {
    setGeneratingDescription(true);
    try {
      const res = await listingsAPI.generateDescription(listingId || selectedListing?.id);
      if (listingId) {
        setListings(prev => prev.map(l => l.id === listingId ? { ...l, description: res.data.description } : l));
      }
      if (selectedListing) {
        setSelectedListing(prev => ({ ...prev, description: res.data.description }));
      }
      setFormData(prev => ({ ...prev, description: res.data.description }));
      toast.success('Description generated!');
    } catch (error) {
      toast.error('Failed to generate description');
    } finally {
      setGeneratingDescription(false);
    }
  };

  const handleSaveListing = async () => {
    if (!formData.address) {
      toast.error('Address is required');
      return;
    }
    setSaving(true);
    try {
      const data = {
        ...formData,
        price: parseFloat(formData.price) || 0,
        bedrooms: parseInt(formData.bedrooms) || 0,
        bathrooms: parseFloat(formData.bathrooms) || 0,
        sqft: parseInt(formData.sqft) || 0,
        year_built: parseInt(formData.year_built) || null,
        garage: parseInt(formData.garage) || null,
      };
      
      if (selectedListing) {
        await listingsAPI.update(selectedListing.id, data);
        setListings(prev => prev.map(l => l.id === selectedListing.id ? { ...l, ...data } : l));
        toast.success('Listing updated!');
      } else {
        const res = await listingsAPI.create(data);
        setListings(prev => [res.data, ...prev]);
        toast.success('Listing created!');
      }
      setIsCreateOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to save listing');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteListing = async (id) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) return;
    try {
      await listingsAPI.delete(id);
      setListings(prev => prev.filter(l => l.id !== id));
      toast.success('Listing deleted');
    } catch (error) {
      toast.error('Failed to delete listing');
    }
  };

  const handleEditListing = (listing) => {
    setSelectedListing(listing);
    setFormData({
      address: listing.address || '',
      city: listing.city || '',
      state: listing.state || '',
      zip_code: listing.zip_code || '',
      country: listing.country || 'USA',
      price: listing.price || '',
      bedrooms: listing.bedrooms || '',
      bathrooms: listing.bathrooms || '',
      sqft: listing.sqft || '',
      lot_size: listing.lot_size || '',
      property_type: listing.property_type || 'single_family',
      status: listing.status || 'draft',
      description: listing.description || '',
      features: listing.features || [],
      images: listing.images || [],
      mls_id: listing.mls_id || '',
      year_built: listing.year_built || '',
      garage: listing.garage || ''
    });
    setIsCreateOpen(true);
  };

  const handleViewListing = (listing) => {
    setSelectedListing(listing);
    setCurrentImageIndex(0);
    setIsViewOpen(true);
  };

  const resetForm = () => {
    setFormData({
      address: '', city: '', state: '', zip_code: '', country: 'USA',
      price: '', bedrooms: '', bathrooms: '', sqft: '', lot_size: '',
      property_type: 'single_family', status: 'draft', description: '',
      features: [], images: [], mls_id: '', year_built: '', garage: ''
    });
    setSelectedListing(null);
  };

  const toggleFeature = (feature) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature]
    }));
  };

  const addImageUrl = () => {
    const url = window.prompt('Enter image URL:');
    if (url) {
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, { id: Date.now().toString(), url, caption: '', order: prev.images.length }]
      }));
    }
  };

  const removeImage = (imageId) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter(img => img.id !== imageId)
    }));
  };

  const filteredListings = listings.filter(listing => {
    const matchesSearch = listing.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      listing.city?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || listing.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="listings-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold flex items-center gap-3">
            <Home className="w-8 h-8" />
            Property Listings
          </h1>
          <p className="text-muted-foreground mt-1">Showcase your real estate properties</p>
        </div>
        <Button onClick={() => { resetForm(); setIsCreateOpen(true); }} data-testid="new-listing-btn">
          <Plus className="w-4 h-4 mr-2" />
          New Listing
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by address or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUS_OPTIONS.map(s => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Listings Grid */}
      {filteredListings.length === 0 ? (
        <Card className="p-12 text-center">
          <Home className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No listings yet</h3>
          <p className="text-muted-foreground mb-4">Create your first property listing to get started</p>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Listing
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredListings.map(listing => (
            <Card key={listing.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
              {/* Image */}
              <div 
                className="relative h-48 bg-muted"
                onClick={() => handleViewListing(listing)}
              >
                {listing.images?.[0]?.url ? (
                  <img 
                    src={listing.images[0].url} 
                    alt={listing.address}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-muted-foreground/50" />
                  </div>
                )}
                <Badge className={`absolute top-3 left-3 ${STATUS_OPTIONS.find(s => s.value === listing.status)?.color}`}>
                  {STATUS_OPTIONS.find(s => s.value === listing.status)?.label}
                </Badge>
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <Button size="icon" variant="secondary" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleEditListing(listing); }}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="secondary" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleDeleteListing(listing.id); }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              {/* Content */}
              <CardContent className="p-4" onClick={() => handleViewListing(listing)}>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-serif font-semibold text-lg line-clamp-1">{listing.address}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {listing.city}{listing.state ? `, ${listing.state}` : ''} {listing.zip_code}
                </p>
                <p className="text-2xl font-bold text-primary mb-3">{formatPrice(listing.price)}</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Bed className="w-4 h-4" /> {listing.bedrooms}
                  </span>
                  <span className="flex items-center gap-1">
                    <Bath className="w-4 h-4" /> {listing.bathrooms}
                  </span>
                  <span className="flex items-center gap-1">
                    <Square className="w-4 h-4" /> {listing.sqft?.toLocaleString()} ft²
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {selectedListing ? 'Edit Listing' : 'Create New Listing'}
            </DialogTitle>
            <DialogDescription>
              {selectedListing ? 'Update property details' : 'Add a new property to your showcase'}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="images">Images</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              {/* Address with AI Lookup */}
              <div className="space-y-2">
                <Label>Property Address *</Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Enter full address..."
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleAddressLookup}
                    disabled={addressLookupLoading}
                  >
                    {addressLookupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
                    AI Lookup
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label>City</Label>
                  <Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
                </div>
                <div>
                  <Label>State</Label>
                  <Input value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} placeholder="CA" />
                </div>
                <div>
                  <Label>ZIP Code</Label>
                  <Input value={formData.zip_code} onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })} />
                </div>
                <div>
                  <Label>Country</Label>
                  <Input value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <Label>Price ($)</Label>
                  <Input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} />
                </div>
                <div>
                  <Label>Property Type</Label>
                  <Select value={formData.property_type} onValueChange={(v) => setFormData({ ...formData, property_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROPERTY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label>Bedrooms</Label>
                  <Input type="number" value={formData.bedrooms} onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })} />
                </div>
                <div>
                  <Label>Bathrooms</Label>
                  <Input type="number" step="0.5" value={formData.bathrooms} onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })} />
                </div>
                <div>
                  <Label>Square Feet</Label>
                  <Input type="number" value={formData.sqft} onChange={(e) => setFormData({ ...formData, sqft: e.target.value })} />
                </div>
                <div>
                  <Label>Lot Size</Label>
                  <Input value={formData.lot_size} onChange={(e) => setFormData({ ...formData, lot_size: e.target.value })} placeholder="0.5 acre" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Year Built</Label>
                  <Input type="number" value={formData.year_built} onChange={(e) => setFormData({ ...formData, year_built: e.target.value })} />
                </div>
                <div>
                  <Label>Garage</Label>
                  <Input type="number" value={formData.garage} onChange={(e) => setFormData({ ...formData, garage: e.target.value })} placeholder="2 car" />
                </div>
                <div>
                  <Label>MLS ID</Label>
                  <Input value={formData.mls_id} onChange={(e) => setFormData({ ...formData, mls_id: e.target.value })} />
                </div>
              </div>

              {/* Features */}
              <div>
                <Label className="mb-2 block">Features</Label>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_FEATURES.map(feature => (
                    <Badge
                      key={feature}
                      variant={formData.features.includes(feature) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleFeature(feature)}
                    >
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="description" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <Label>Property Description</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => selectedListing ? handleGenerateDescription(selectedListing.id) : toast.error('Save listing first to generate description')}
                  disabled={generatingDescription || !selectedListing}
                >
                  {generatingDescription ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
                  Generate with AI
                </Button>
              </div>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter a compelling description of the property..."
                rows={12}
                className="font-sans"
              />
            </TabsContent>

            <TabsContent value="images" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <Label>Property Images</Label>
                <Button type="button" variant="outline" size="sm" onClick={addImageUrl}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Image URL
                </Button>
              </div>
              
              {formData.images.length === 0 ? (
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No images added yet</p>
                  <p className="text-sm text-muted-foreground">Click "Add Image URL" to add property photos</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {formData.images.map((img, index) => (
                    <div key={img.id} className="relative group">
                      <img src={img.url} alt={`Property ${index + 1}`} className="w-full h-32 object-cover rounded-lg" />
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImage(img.id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                      {index === 0 && <Badge className="absolute bottom-2 left-2">Cover</Badge>}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveListing} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {selectedListing ? 'Update Listing' : 'Create Listing'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Listing Modal - Mansion Global Style */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto p-0">
          {selectedListing && (
            <div>
              {/* Image Gallery */}
              <div className="relative bg-black">
                {selectedListing.images?.length > 0 ? (
                  <>
                    <img
                      src={selectedListing.images[currentImageIndex]?.url}
                      alt={selectedListing.address}
                      className="w-full h-[400px] object-cover"
                    />
                    {selectedListing.images.length > 1 && (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                          onClick={() => setCurrentImageIndex(i => i > 0 ? i - 1 : selectedListing.images.length - 1)}
                        >
                          <ChevronLeft className="w-6 h-6" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                          onClick={() => setCurrentImageIndex(i => i < selectedListing.images.length - 1 ? i + 1 : 0)}
                        >
                          <ChevronRight className="w-6 h-6" />
                        </Button>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 px-3 py-1 rounded-full text-white text-sm">
                          {currentImageIndex + 1} of {selectedListing.images.length}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="w-full h-[300px] flex items-center justify-center bg-muted">
                    <ImageIcon className="w-16 h-16 text-muted-foreground" />
                  </div>
                )}
                
                {/* Action buttons */}
                <div className="absolute top-4 right-4 flex gap-2">
                  <Button size="icon" variant="secondary" className="rounded-full">
                    <Heart className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="secondary" className="rounded-full">
                    <Share2 className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="rounded-full bg-black/50 text-white hover:bg-black/70" onClick={() => setIsViewOpen(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                <Badge className={`absolute top-4 left-4 ${STATUS_OPTIONS.find(s => s.value === selectedListing.status)?.color}`}>
                  {STATUS_OPTIONS.find(s => s.value === selectedListing.status)?.label}
                </Badge>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex flex-col lg:flex-row gap-8">
                  {/* Main Content */}
                  <div className="flex-1">
                    <Badge variant="outline" className="mb-3">
                      {PROPERTY_TYPES.find(t => t.value === selectedListing.property_type)?.label}
                    </Badge>
                    
                    <h1 className="text-3xl font-serif font-bold mb-2">{selectedListing.address}</h1>
                    <p className="text-lg text-muted-foreground mb-4 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {selectedListing.city}{selectedListing.state ? `, ${selectedListing.state}` : ''} {selectedListing.zip_code}
                    </p>
                    
                    <p className="text-4xl font-bold text-primary mb-6">{formatPrice(selectedListing.price)}</p>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <Bed className="w-6 h-6 mx-auto mb-2" />
                        <p className="text-2xl font-bold">{selectedListing.bedrooms}</p>
                        <p className="text-sm text-muted-foreground">Beds</p>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <Bath className="w-6 h-6 mx-auto mb-2" />
                        <p className="text-2xl font-bold">{selectedListing.bathrooms}</p>
                        <p className="text-sm text-muted-foreground">Baths</p>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <Maximize className="w-6 h-6 mx-auto mb-2" />
                        <p className="text-2xl font-bold">{selectedListing.sqft?.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">Sq Ft</p>
                      </div>
                      {selectedListing.lot_size && (
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                          <Square className="w-6 h-6 mx-auto mb-2" />
                          <p className="text-2xl font-bold">{selectedListing.lot_size}</p>
                          <p className="text-sm text-muted-foreground">Lot Size</p>
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    <div className="mb-8">
                      <h2 className="text-xl font-serif font-semibold mb-4">About This Home</h2>
                      {selectedListing.description ? (
                        <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                          {selectedListing.description}
                        </p>
                      ) : (
                        <div className="bg-muted/50 p-4 rounded-lg text-center">
                          <p className="text-muted-foreground mb-2">No description yet</p>
                          <Button variant="outline" size="sm" onClick={() => handleGenerateDescription(selectedListing.id)} disabled={generatingDescription}>
                            {generatingDescription ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
                            Generate with AI
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Features */}
                    {selectedListing.features?.length > 0 && (
                      <div>
                        <h2 className="text-xl font-serif font-semibold mb-4">Features</h2>
                        <div className="flex flex-wrap gap-2">
                          {selectedListing.features.map(feature => (
                            <Badge key={feature} variant="secondary">{feature}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sidebar */}
                  <div className="lg:w-80">
                    <Card>
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-primary-foreground" />
                          </div>
                          <div>
                            <p className="font-semibold">{user?.name}</p>
                            <p className="text-sm text-muted-foreground">Listing Agent</p>
                          </div>
                        </div>
                        
                        {selectedListing.mls_id && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">MLS ID:</span> {selectedListing.mls_id}
                          </div>
                        )}
                        
                        {selectedListing.year_built && (
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span>Built in {selectedListing.year_built}</span>
                          </div>
                        )}
                        
                        {selectedListing.garage && (
                          <div className="flex items-center gap-2 text-sm">
                            <Car className="w-4 h-4 text-muted-foreground" />
                            <span>{selectedListing.garage} Car Garage</span>
                          </div>
                        )}

                        <Button className="w-full" onClick={() => { setIsViewOpen(false); handleEditListing(selectedListing); }}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Listing
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
