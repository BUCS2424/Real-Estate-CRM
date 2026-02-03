import React, { useState, useEffect, useRef } from 'react';
import { landingPagesAPI, propertiesAPI } from '../lib/api';
import { 
  Layout, 
  Plus, 
  Search, 
  Eye,
  ExternalLink,
  Globe,
  Trash2,
  Edit,
  Video,
  Image,
  MapPin,
  Phone,
  Mail,
  User,
  Upload,
  Loader2,
  CheckCircle,
  XCircle,
  Play,
  X,
  GripVertical,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
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

const PRODUCTION_DOMAIN = 'https://hiddenhavenrealty.com';

export const LandingPagesPage = () => {
  const [landingPages, setLandingPages] = useState([]);
  const [availableListings, setAvailableListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [editingPage, setEditingPage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    custom_headline: '',
    custom_description: '',
    virtual_tour_url: '',
    show_map: true,
    show_contact_form: true,
    agent_name: '',
    agent_phone: '',
    agent_email: '',
    agent_photo: '',
    theme: 'auto',
    videos: [],
    additional_images: []
  });
  
  // Video form
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const videoFileRef = useRef(null);
  const imageFileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [pagesRes, listingsRes] = await Promise.all([
        landingPagesAPI.getAll(),
        landingPagesAPI.getAvailableListings()
      ]);
      setLandingPages(pagesRes.data);
      setAvailableListings(listingsRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePage = async () => {
    if (!selectedListing) {
      toast.error('Please select a listing');
      return;
    }
    
    setSaving(true);
    try {
      const pageData = {
        listing_id: selectedListing.id,
        ...formData
      };
      
      await landingPagesAPI.create(pageData);
      toast.success('Landing page created');
      setShowCreateModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create landing page');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePage = async () => {
    if (!editingPage) return;
    
    setSaving(true);
    try {
      await landingPagesAPI.update(editingPage.id, formData);
      toast.success('Landing page updated');
      setShowEditModal(false);
      setEditingPage(null);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Failed to update landing page');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePage = async (pageId) => {
    if (!window.confirm('Are you sure you want to delete this landing page?')) return;
    
    try {
      await landingPagesAPI.delete(pageId);
      toast.success('Landing page deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete landing page');
    }
  };

  const handlePublish = async (pageId) => {
    try {
      const res = await landingPagesAPI.publish(pageId);
      toast.success('Landing page published');
      fetchData();
    } catch (error) {
      toast.error('Failed to publish');
    }
  };

  const handleUnpublish = async (pageId) => {
    try {
      await landingPagesAPI.unpublish(pageId);
      toast.success('Landing page unpublished');
      fetchData();
    } catch (error) {
      toast.error('Failed to unpublish');
    }
  };

  const handleEditClick = (page) => {
    setEditingPage(page);
    setFormData({
      custom_headline: page.custom_headline || '',
      custom_description: page.custom_description || '',
      virtual_tour_url: page.virtual_tour_url || '',
      show_map: page.show_map ?? true,
      show_contact_form: page.show_contact_form ?? true,
      agent_name: page.agent_name || '',
      agent_phone: page.agent_phone || '',
      agent_email: page.agent_email || '',
      agent_photo: page.agent_photo || '',
      theme: page.theme || 'auto',
      videos: page.videos || [],
      additional_images: page.additional_images || []
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setSelectedListing(null);
    setFormData({
      custom_headline: '',
      custom_description: '',
      virtual_tour_url: '',
      show_map: true,
      show_contact_form: true,
      agent_name: '',
      agent_phone: '',
      agent_email: '',
      agent_photo: '',
      theme: 'auto',
      videos: [],
      additional_images: []
    });
    setNewVideoUrl('');
    setNewVideoTitle('');
  };

  const addVideoLink = () => {
    if (!newVideoUrl.trim()) return;
    
    // Detect video source
    let source = 'youtube';
    if (newVideoUrl.includes('vimeo')) source = 'vimeo';
    
    const newVideo = {
      id: Date.now().toString(),
      source,
      url: newVideoUrl,
      title: newVideoTitle || 'Video',
      thumbnail: '',
      order: formData.videos.length
    };
    
    setFormData(prev => ({
      ...prev,
      videos: [...prev.videos, newVideo]
    }));
    setNewVideoUrl('');
    setNewVideoTitle('');
    toast.success('Video added');
  };

  const removeVideo = (videoId) => {
    setFormData(prev => ({
      ...prev,
      videos: prev.videos.filter(v => v.id !== videoId)
    }));
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !editingPage) return;
    
    setUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('title', file.name);
      
      const res = await landingPagesAPI.uploadVideo(editingPage.id, formDataUpload);
      
      setFormData(prev => ({
        ...prev,
        videos: [...prev.videos, res.data.video]
      }));
      
      toast.success('Video uploaded');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Upload failed. Make sure iDrive is configured.');
    } finally {
      setUploading(false);
      if (videoFileRef.current) videoFileRef.current.value = '';
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !editingPage) return;
    
    setUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('caption', '');
      
      const res = await landingPagesAPI.uploadImage(editingPage.id, formDataUpload);
      
      setFormData(prev => ({
        ...prev,
        additional_images: [...prev.additional_images, res.data.image]
      }));
      
      toast.success('Image uploaded');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Upload failed. Make sure iDrive is configured.');
    } finally {
      setUploading(false);
      if (imageFileRef.current) imageFileRef.current.value = '';
    }
  };

  const removeImage = (imageId) => {
    setFormData(prev => ({
      ...prev,
      additional_images: prev.additional_images.filter(img => img.id !== imageId)
    }));
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(price);
  };

  const filteredPages = landingPages.filter(page => {
    if (!searchQuery) return true;
    const listing = page.listing || {};
    const search = searchQuery.toLowerCase();
    return (
      listing.address?.toLowerCase().includes(search) ||
      listing.city?.toLowerCase().includes(search) ||
      page.slug?.toLowerCase().includes(search)
    );
  });

  // Stats
  const totalPages = landingPages.length;
  const publishedCount = landingPages.filter(p => p.status === 'published').length;
  const draftCount = landingPages.filter(p => p.status === 'draft').length;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="landing-pages-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold flex items-center gap-3">
            <Layout className="w-8 h-8" />
            Landing Page Generator
          </h1>
          <p className="text-muted-foreground mt-1">Create stunning property landing pages from your listings</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} data-testid="create-landing-page-btn">
          <Plus className="w-4 h-4 mr-2" />
          Create Landing Page
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                <Layout className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalPages}</p>
                <p className="text-sm text-muted-foreground">Total Pages</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                <Globe className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{publishedCount}</p>
                <p className="text-sm text-muted-foreground">Published</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/20 dark:to-amber-900/10">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
                <Edit className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{draftCount}</p>
                <p className="text-sm text-muted-foreground">Drafts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search landing pages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Landing Pages Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredPages.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Layout className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No landing pages yet</h3>
            <p className="text-muted-foreground mb-4">Create your first property landing page</p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Landing Page
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPages.map(page => (
            <Card key={page.id} className="overflow-hidden group hover:shadow-lg transition-shadow">
              {/* Property Image */}
              <div className="relative h-48 bg-muted">
                {page.listing?.images?.[0]?.url ? (
                  <img 
                    src={page.listing.images[0].url} 
                    alt={page.listing.address}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute top-3 right-3">
                  <Badge variant={page.status === 'published' ? 'default' : 'secondary'}>
                    {page.status === 'published' ? (
                      <><Globe className="w-3 h-3 mr-1" /> Published</>
                    ) : (
                      <>Draft</>
                    )}
                  </Badge>
                </div>
                {page.videos?.length > 0 && (
                  <div className="absolute bottom-3 left-3">
                    <Badge variant="secondary" className="bg-black/70 text-white">
                      <Video className="w-3 h-3 mr-1" /> {page.videos.length} video{page.videos.length > 1 ? 's' : ''}
                    </Badge>
                  </div>
                )}
              </div>
              
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg mb-1 line-clamp-1">
                  {page.listing?.address || 'Property'}
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {page.listing?.city}, {page.listing?.state}
                </p>
                <p className="text-lg font-bold text-primary mb-3">
                  {formatPrice(page.listing?.price || 0)}
                </p>
                
                {/* Preview URL */}
                <div className="flex items-center gap-2 p-2 bg-muted/50 rounded text-xs mb-4">
                  <Globe className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  <span className="truncate text-muted-foreground">
                    {page.preview_url}
                  </span>
                </div>
                
                {/* Actions */}
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleEditClick(page)}
                  >
                    <Edit className="w-3 h-3 mr-1" /> Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(`/property/${page.slug}`, '_blank')}
                  >
                    <Eye className="w-3 h-3" />
                  </Button>
                  {page.status === 'published' ? (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleUnpublish(page.id)}
                    >
                      <XCircle className="w-3 h-3" />
                    </Button>
                  ) : (
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => handlePublish(page.id)}
                    >
                      <CheckCircle className="w-3 h-3" />
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeletePage(page.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={(open) => {
        setShowCreateModal(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Create Landing Page
            </DialogTitle>
            <DialogDescription>
              Select a listing and customize the landing page
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="listing" className="mt-4">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="listing">1. Select Listing</TabsTrigger>
              <TabsTrigger value="content" disabled={!selectedListing}>2. Content</TabsTrigger>
              <TabsTrigger value="agent" disabled={!selectedListing}>3. Agent Info</TabsTrigger>
            </TabsList>

            <TabsContent value="listing" className="mt-4">
              <div className="space-y-4">
                <Label>Select a Listing</Label>
                {availableListings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>All listings already have landing pages, or no listings exist.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto">
                    {availableListings.map(listing => (
                      <Card 
                        key={listing.id}
                        className={`cursor-pointer transition-all ${
                          selectedListing?.id === listing.id 
                            ? 'ring-2 ring-primary' 
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => {
                          setSelectedListing(listing);
                          setFormData(prev => ({
                            ...prev,
                            custom_headline: listing.title || `${listing.address}`,
                            custom_description: listing.description || ''
                          }));
                        }}
                      >
                        <CardContent className="p-4 flex gap-4">
                          <div className="w-24 h-24 bg-muted rounded overflow-hidden flex-shrink-0">
                            {listing.images?.[0]?.url ? (
                              <img src={listing.images[0].url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Image className="w-8 h-8 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{listing.address}</p>
                            <p className="text-sm text-muted-foreground">{listing.city}, {listing.state}</p>
                            <p className="text-lg font-bold text-primary mt-1">{formatPrice(listing.price)}</p>
                            <p className="text-xs text-muted-foreground">
                              {listing.bedrooms} bed • {listing.bathrooms} bath • {listing.sqft?.toLocaleString()} sqft
                            </p>
                          </div>
                          {selectedListing?.id === listing.id && (
                            <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="content" className="mt-4 space-y-4">
              <div>
                <Label>Custom Headline</Label>
                <Input
                  value={formData.custom_headline}
                  onChange={e => setFormData(prev => ({ ...prev, custom_headline: e.target.value }))}
                  placeholder="Stunning Oceanfront Estate"
                />
              </div>
              <div>
                <Label>Custom Description</Label>
                <Textarea
                  value={formData.custom_description}
                  onChange={e => setFormData(prev => ({ ...prev, custom_description: e.target.value }))}
                  placeholder="Describe what makes this property special..."
                  rows={4}
                />
              </div>
              <div>
                <Label>Virtual Tour URL (Matterport, etc.)</Label>
                <Input
                  value={formData.virtual_tour_url}
                  onChange={e => setFormData(prev => ({ ...prev, virtual_tour_url: e.target.value }))}
                  placeholder="https://my.matterport.com/show/?m=..."
                />
              </div>
              <div>
                <Label>Theme</Label>
                <Select 
                  value={formData.theme} 
                  onValueChange={v => setFormData(prev => ({ ...prev, theme: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto (Luxury for $1M+)</SelectItem>
                    <SelectItem value="luxury">Luxury Dark Theme</SelectItem>
                    <SelectItem value="modern">Modern Light Theme</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label>Show Location Map</Label>
                <Switch
                  checked={formData.show_map}
                  onCheckedChange={v => setFormData(prev => ({ ...prev, show_map: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Show Contact Form</Label>
                <Switch
                  checked={formData.show_contact_form}
                  onCheckedChange={v => setFormData(prev => ({ ...prev, show_contact_form: v }))}
                />
              </div>
            </TabsContent>

            <TabsContent value="agent" className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Agent Name</Label>
                  <Input
                    value={formData.agent_name}
                    onChange={e => setFormData(prev => ({ ...prev, agent_name: e.target.value }))}
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <Label>Agent Photo URL</Label>
                  <Input
                    value={formData.agent_photo}
                    onChange={e => setFormData(prev => ({ ...prev, agent_photo: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Agent Phone</Label>
                  <Input
                    value={formData.agent_phone}
                    onChange={e => setFormData(prev => ({ ...prev, agent_phone: e.target.value }))}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div>
                  <Label>Agent Email</Label>
                  <Input
                    value={formData.agent_email}
                    onChange={e => setFormData(prev => ({ ...prev, agent_email: e.target.value }))}
                    placeholder="agent@example.com"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePage} disabled={!selectedListing || saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Landing Page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={(open) => {
        setShowEditModal(open);
        if (!open) {
          setEditingPage(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Landing Page</DialogTitle>
            <DialogDescription>
              {editingPage?.listing?.address} - {editingPage?.listing?.city}, {editingPage?.listing?.state}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="content" className="mt-4">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="videos">Videos</TabsTrigger>
              <TabsTrigger value="images">Images</TabsTrigger>
              <TabsTrigger value="agent">Agent</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="mt-4 space-y-4">
              <div>
                <Label>Custom Headline</Label>
                <Input
                  value={formData.custom_headline}
                  onChange={e => setFormData(prev => ({ ...prev, custom_headline: e.target.value }))}
                />
              </div>
              <div>
                <Label>Custom Description</Label>
                <Textarea
                  value={formData.custom_description}
                  onChange={e => setFormData(prev => ({ ...prev, custom_description: e.target.value }))}
                  rows={4}
                />
              </div>
              <div>
                <Label>Virtual Tour URL</Label>
                <Input
                  value={formData.virtual_tour_url}
                  onChange={e => setFormData(prev => ({ ...prev, virtual_tour_url: e.target.value }))}
                />
              </div>
              <div>
                <Label>Theme</Label>
                <Select 
                  value={formData.theme} 
                  onValueChange={v => setFormData(prev => ({ ...prev, theme: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto</SelectItem>
                    <SelectItem value="luxury">Luxury Dark</SelectItem>
                    <SelectItem value="modern">Modern Light</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label>Show Location Map</Label>
                <Switch
                  checked={formData.show_map}
                  onCheckedChange={v => setFormData(prev => ({ ...prev, show_map: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Show Contact Form</Label>
                <Switch
                  checked={formData.show_contact_form}
                  onCheckedChange={v => setFormData(prev => ({ ...prev, show_contact_form: v }))}
                />
              </div>
              
              {/* Preview URL */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <Label className="text-sm text-muted-foreground">Live URL (after publish)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <code className="text-sm">{editingPage?.preview_url}</code>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => window.open(`/property/${editingPage?.slug}`, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="videos" className="mt-4 space-y-4">
              {/* Add Video Link */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Add Video</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>YouTube or Vimeo URL</Label>
                      <Input
                        value={newVideoUrl}
                        onChange={e => setNewVideoUrl(e.target.value)}
                        placeholder="https://youtube.com/watch?v=..."
                      />
                    </div>
                    <div>
                      <Label>Title (optional)</Label>
                      <Input
                        value={newVideoTitle}
                        onChange={e => setNewVideoTitle(e.target.value)}
                        placeholder="Property Tour"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={addVideoLink} disabled={!newVideoUrl.trim()}>
                      <Plus className="w-4 h-4 mr-2" /> Add Link
                    </Button>
                    <span className="text-muted-foreground self-center">or</span>
                    <Button variant="outline" onClick={() => videoFileRef.current?.click()} disabled={uploading}>
                      {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                      Upload to iDrive
                    </Button>
                    <input
                      ref={videoFileRef}
                      type="file"
                      accept="video/*"
                      onChange={handleVideoUpload}
                      className="hidden"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Video List */}
              <div className="space-y-2">
                <Label>Videos ({formData.videos.length})</Label>
                {formData.videos.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No videos added yet</p>
                ) : (
                  <div className="space-y-2">
                    {formData.videos.map((video, idx) => (
                      <div key={video.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                        <div className="w-10 h-10 bg-black rounded flex items-center justify-center">
                          <Play className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{video.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{video.url}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {video.source}
                        </Badge>
                        <Button variant="ghost" size="sm" onClick={() => removeVideo(video.id)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="images" className="mt-4 space-y-4">
              {/* Upload Image */}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => imageFileRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  Upload Image to iDrive
                </Button>
                <input
                  ref={imageFileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              {/* Image Grid */}
              <div className="space-y-2">
                <Label>Additional Images ({formData.additional_images.length})</Label>
                {formData.additional_images.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No additional images. Listing images will be used by default.
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-3">
                    {formData.additional_images.map(img => (
                      <div key={img.id} className="relative group">
                        <img 
                          src={img.url} 
                          alt="" 
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                          onClick={() => removeImage(img.id)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="agent" className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Agent Name</Label>
                  <Input
                    value={formData.agent_name}
                    onChange={e => setFormData(prev => ({ ...prev, agent_name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Agent Photo URL</Label>
                  <Input
                    value={formData.agent_photo}
                    onChange={e => setFormData(prev => ({ ...prev, agent_photo: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Agent Phone</Label>
                  <Input
                    value={formData.agent_phone}
                    onChange={e => setFormData(prev => ({ ...prev, agent_phone: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Agent Email</Label>
                  <Input
                    value={formData.agent_email}
                    onChange={e => setFormData(prev => ({ ...prev, agent_email: e.target.value }))}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePage} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
