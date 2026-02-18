import React, { useState, useEffect } from 'react';
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
import { Progress } from '../components/ui/progress';
import { 
  Home, 
  MapPin, 
  DollarSign, 
  User, 
  Phone, 
  Mail, 
  FileText, 
  Clock, 
  Tag,
  Building2,
  Bed,
  Bath,
  Square,
  Calendar,
  Download,
  Edit2,
  Trash2,
  Plus,
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Loader2,
  StickyNote,
  Activity,
  ChevronRight,
  MoreVertical,
  Copy,
  ExternalLink,
  FileImage,
  Send,
  Video,
  Globe,
  Printer,
  Megaphone,
  Star,
  Zap,
  QrCode,
  Play,
  Search,
  Image
} from 'lucide-react';
import { toast } from 'sonner';
import { propertyLeadsAPI } from '../lib/api';
import BrochureGeneratorModal from '../components/BrochureGeneratorModal';
import PropertyImagesGallery from '../components/PropertyImagesGallery';

const PropertyLeadDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pullingOwner, setPullingOwner] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  
  // Notes
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  
  // Marketing tab state
  const [leadScore, setLeadScore] = useState(null);
  const [brochureTemplate, setBrochureTemplate] = useState('flyer');
  const [generatingBrochure, setGeneratingBrochure] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailData, setEmailData] = useState({ recipient_email: '', subject: '', message: '' });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [creatingListing, setCreatingListing] = useState(false);
  const [publishingPage, setPublishingPage] = useState(false);
  const [runningWorkflow, setRunningWorkflow] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [addingVideo, setAddingVideo] = useState(false);
  
  // Generate data state
  const [generatingData, setGeneratingData] = useState(false);
  const [convertingToShowcase, setConvertingToShowcase] = useState(false);
  const [showImagesModal, setShowImagesModal] = useState(false);
  
  // Brochure generator modal
  const [showBrochureModal, setShowBrochureModal] = useState(false);

  useEffect(() => {
    if (id) {
      fetchLead();
      fetchLeadScore();
    }
  }, [id]);

  const fetchLead = async () => {
    setLoading(true);
    try {
      const res = await propertyLeadsAPI.getOne(id);
      setLead(res.data);
      setEditData(res.data);
      // Pre-fill email data with owner email
      if (res.data.owner_email) {
        setEmailData(prev => ({ ...prev, recipient_email: res.data.owner_email }));
      }
    } catch (error) {
      toast.error('Failed to load property lead');
      navigate('/property-leads');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await propertyLeadsAPI.update(id, editData);
      toast.success('Property lead updated');
      setEditMode(false);
      fetchLead();
    } catch (error) {
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handlePullOwnerInfo = async () => {
    setPullingOwner(true);
    try {
      const res = await propertyLeadsAPI.pullOwnerInfo(id);
      if (res.data.success) {
        toast.success(res.data.message);
        fetchLead();
      } else {
        toast.error(res.data.message);
      }
    } catch (error) {
      toast.error('Failed to pull owner info');
    } finally {
      setPullingOwner(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    
    setAddingNote(true);
    try {
      await propertyLeadsAPI.addNote(id, { text: newNote });
      toast.success('Note added');
      setNewNote('');
      fetchLead();
    } catch (error) {
      toast.error('Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Delete this note?')) return;
    try {
      await propertyLeadsAPI.deleteNote(id, noteId);
      toast.success('Note deleted');
      fetchLead();
    } catch (error) {
      toast.error('Failed to delete note');
    }
  };

  // Marketing functions
  const fetchLeadScore = async () => {
    try {
      const res = await propertyLeadsAPI.getScore(id);
      setLeadScore(res.data);
    } catch (error) {
      console.error('Failed to fetch lead score');
    }
  };

  const handleGenerateBrochure = async () => {
    setGeneratingBrochure(true);
    try {
      const res = await propertyLeadsAPI.generateBrochure(id, brochureTemplate, true);
      // Create download link
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `brochure-${lead.address?.toLowerCase().replace(/\s+/g, '-') || 'property'}-${brochureTemplate}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Brochure downloaded!');
      fetchLead(); // Refresh activity
    } catch (error) {
      toast.error('Failed to generate brochure');
    } finally {
      setGeneratingBrochure(false);
    }
  };

  const handleEmailBrochure = async () => {
    if (!emailData.recipient_email) {
      toast.error('Recipient email is required');
      return;
    }
    setSendingEmail(true);
    try {
      await propertyLeadsAPI.emailBrochure(id, {
        template: brochureTemplate,
        recipient_email: emailData.recipient_email,
        subject: emailData.subject || undefined,
        message: emailData.message || undefined,
        include_landing_page_link: true
      });
      toast.success(`Email queued for ${emailData.recipient_email}`);
      setEmailModalOpen(false);
      fetchLead();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleCreateListing = async () => {
    setCreatingListing(true);
    try {
      const res = await propertyLeadsAPI.createListing(id, {
        create_landing_page: true,
        theme: 'luxury'
      });
      toast.success('Listing and landing page created!');
      fetchLead();
      fetchLeadScore();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create listing');
    } finally {
      setCreatingListing(false);
    }
  };

  const handlePublishLandingPage = async () => {
    setPublishingPage(true);
    try {
      const res = await propertyLeadsAPI.publishLandingPage(id);
      toast.success('Landing page published!');
      if (res.data.url) {
        window.open(res.data.url, '_blank');
      }
      fetchLead();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to publish landing page');
    } finally {
      setPublishingPage(false);
    }
  };

  const handleAddVideo = async () => {
    if (!videoUrl) {
      toast.error('Video URL is required');
      return;
    }
    setAddingVideo(true);
    try {
      await propertyLeadsAPI.uploadVideo(id, videoUrl, videoTitle);
      toast.success('Video added!');
      setVideoModalOpen(false);
      setVideoUrl('');
      setVideoTitle('');
      fetchLead();
    } catch (error) {
      toast.error('Failed to add video');
    } finally {
      setAddingVideo(false);
    }
  };

  const handleRunMarketingWorkflow = async () => {
    if (!lead.owner_email) {
      toast.error('Owner email is required for marketing workflow. Please add owner email first.');
      return;
    }
    setRunningWorkflow(true);
    try {
      const res = await propertyLeadsAPI.runMarketingWorkflow(id, brochureTemplate);
      toast.success('Marketing workflow initiated!');
      fetchLead();
      fetchLeadScore();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to run marketing workflow');
    } finally {
      setRunningWorkflow(false);
    }
  };

  const handleGenerateData = async () => {
    setGeneratingData(true);
    try {
      const res = await propertyLeadsAPI.generateData(id);
      if (res.data.success) {
        toast.success(`Found data from ${res.data.sources_found.join(', ')}! ${res.data.images_count} images found.`);
      } else {
        toast.info('No data found from Zillow, Redfin, or Realtor.com for this address.');
      }
      fetchLead();
      fetchLeadScore();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate property data');
    } finally {
      setGeneratingData(false);
    }
  };

  const handleConvertToShowcase = async () => {
    if (!window.confirm(`Convert "${lead.address}" to Showcase Listing?`)) {
      return;
    }
    
    setConvertingToShowcase(true);
    try {
      const res = await propertyLeadsAPI.convertToShowcase(id);
      toast.success('Converted to Showcase Listing');
      // Navigate to the new slug-based URL
      navigate(`/listings/${res.data.listing_id}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to convert');
      setConvertingToShowcase(false);
    }
  };

  const handleUnconvertFromShowcase = async () => {
    const deleteListing = window.confirm(
      `Un-convert "${lead.address}" from Showcase Listing?\n\nClick OK to also DELETE the showcase listing.\nClick Cancel to keep the listing but reset this lead.`
    );
    
    if (!window.confirm(`Are you sure you want to un-convert this lead? This will reset its status so it can be edited and re-converted.`)) {
      return;
    }
    
    setConvertingToShowcase(true);
    try {
      const res = await propertyLeadsAPI.unconvertFromShowcase(id, deleteListing);
      toast.success(`Lead un-converted! Status reset to "${res.data.reset_to_status}"${deleteListing && res.data.listing_deleted ? '. Showcase listing deleted.' : ''}`);
      fetchLead(); // Refresh the lead data
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to un-convert');
    } finally {
      setConvertingToShowcase(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-blue-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-red-500';
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
    const colors = {
      new: 'bg-blue-500/20 text-blue-600 border-blue-500/50',
      contacted: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/50',
      qualified: 'bg-green-500/20 text-green-600 border-green-500/50',
      nurturing: 'bg-purple-500/20 text-purple-600 border-purple-500/50',
      not_interested: 'bg-gray-500/20 text-gray-600 border-gray-500/50',
      converted: 'bg-amber-500/20 text-amber-600 border-amber-500/50',
    };
    return colors[status] || 'bg-gray-500/20 text-gray-600';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-gray-500/20 text-gray-600',
      medium: 'bg-blue-500/20 text-blue-600',
      high: 'bg-orange-500/20 text-orange-600',
      urgent: 'bg-red-500/20 text-red-600',
    };
    return colors[priority] || 'bg-gray-500/20 text-gray-600';
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
        <p className="text-lg">Property lead not found</p>
        <Button onClick={() => navigate('/property-leads')} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Property Leads
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-6 min-h-[calc(100vh-6rem)]" data-testid="property-lead-detail">
      {/* Left Sidebar */}
      <div className="w-80 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
        {/* Property Card */}
        <Card>
          <CardContent className="pt-6">
            {/* Property Icon/Image */}
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-amber-400/20 to-amber-600/20 rounded-xl flex items-center justify-center border-2 border-amber-500/30">
              <Home className="w-10 h-10 text-amber-500" />
            </div>
            
            {/* Address */}
            <h2 className="text-xl font-semibold text-center text-foreground mb-1">
              {lead.address}
            </h2>
            <p className="text-center text-muted-foreground text-sm mb-4">
              {lead.city}, {lead.state} {lead.zip_code}
            </p>
            
            {/* Status & Priority */}
            <div className="flex justify-center gap-2 mb-4">
              <Badge className={getStatusColor(lead.status)}>
                {lead.status?.replace('_', ' ').toUpperCase()}
              </Badge>
              <Badge className={getPriorityColor(lead.priority)}>
                {lead.priority?.toUpperCase()}
              </Badge>
            </div>
            
            {/* Quick Actions */}
            <div className="space-y-2">
              {lead.status !== 'converted' ? (
                <Button 
                  onClick={handleConvertToShowcase} 
                  disabled={convertingToShowcase}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  data-testid="convert-to-showcase-btn"
                >
                  {convertingToShowcase ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Building2 className="w-4 h-4 mr-2" />
                  )}
                  Convert to Showcase Listing
                </Button>
              ) : (
                <>
                  {/* Show links to the showcase listing when converted */}
                  {lead.converted_to_listing_id && (
                    <>
                      <Button 
                        onClick={() => navigate(`/listings/${lead.converted_to_listing_id}`)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        data-testid="view-showcase-listing-btn"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Manage Listing
                      </Button>
                      <Button 
                        variant="outline"
                        className="w-full"
                        onClick={() => window.open(`/property/${lead.converted_to_listing_slug || lead.converted_to_listing_id}`, '_blank')}
                        data-testid="view-public-page-btn"
                      >
                        <Globe className="w-4 h-4 mr-2" />
                        View Public Page
                      </Button>
                    </>
                  )}
                  <Button 
                    onClick={handleUnconvertFromShowcase}
                    disabled={convertingToShowcase}
                    variant="outline"
                    className="w-full border-red-500/50 text-red-600 hover:bg-red-500/10"
                    data-testid="unconvert-lead-btn"
                  >
                    {convertingToShowcase ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Un-convert Lead
                  </Button>
                </>
              )}
              <Button 
                onClick={handlePullOwnerInfo} 
                disabled={pullingOwner}
                className="w-full bg-amber-500 hover:bg-amber-600 text-black"
                data-testid="pull-owner-info-btn"
              >
                {pullingOwner ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Pull Owner Info
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setEditMode(true)} data-testid="edit-property-btn">
                <Edit2 className="w-4 h-4 mr-2" />
                Edit Property
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
              <span className="text-sm font-medium">{lead.property_type || '-'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Beds/Baths</span>
              <span className="text-sm font-medium">
                {lead.bedrooms || '-'} / {lead.bathrooms || '-'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Sqft</span>
              <span className="text-sm font-medium">{lead.sqft?.toLocaleString() || '-'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Year Built</span>
              <span className="text-sm font-medium">{lead.year_built || '-'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Parcel ID</span>
              <span className="text-sm font-medium text-xs">{lead.parcel_id || '-'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Owner Info (if available) */}
        {lead.owner_name && (
          <Card className="border-green-500/30 bg-green-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-green-600">
                <User className="w-4 h-4" />
                Owner Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="font-semibold text-foreground">{lead.owner_name}</p>
                {lead.owner_mailing_address && (
                  <p className="text-sm text-muted-foreground">
                    {lead.owner_mailing_address}
                    {lead.owner_mailing_city && `, ${lead.owner_mailing_city}`}
                    {lead.owner_mailing_state && ` ${lead.owner_mailing_state}`}
                    {lead.owner_mailing_zip && ` ${lead.owner_mailing_zip}`}
                  </p>
                )}
              </div>
              {lead.owner_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3 h-3 text-muted-foreground" />
                  <span className="text-sm">{lead.owner_phone}</span>
                  <button onClick={() => copyToClipboard(lead.owner_phone)}>
                    <Copy className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                  </button>
                </div>
              )}
              {lead.owner_email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3 h-3 text-muted-foreground" />
                  <span className="text-sm">{lead.owner_email}</span>
                  <button onClick={() => copyToClipboard(lead.owner_email)}>
                    <Copy className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tags */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Tag className="w-4 h-4 text-amber-500" />
              Tags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lead.tags?.length > 0 ? (
                lead.tags.map((tag, idx) => (
                  <Badge key={idx} variant="outline">{tag}</Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No tags</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={() => navigate('/property-leads')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Property Leads
          </Button>
          <div className="flex gap-2">
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
            <TabsTrigger value="marketing" className="flex items-center gap-2">
              <Megaphone className="w-4 h-4" />
              Marketing
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-2">
              <StickyNote className="w-4 h-4" />
              Notes ({lead.notes?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Activity
            </TabsTrigger>
          </TabsList>

          {/* Tab Content */}
          <div className="flex-1 mt-4 pb-8">
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
                        <p className="font-medium">{lead.property_type || '-'}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Year Built</Label>
                        <p className="font-medium">{lead.year_built || '-'}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Bedrooms</Label>
                        <p className="font-medium flex items-center gap-1">
                          <Bed className="w-4 h-4 text-muted-foreground" />
                          {lead.bedrooms || '-'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Bathrooms</Label>
                        <p className="font-medium flex items-center gap-1">
                          <Bath className="w-4 h-4 text-muted-foreground" />
                          {lead.bathrooms || '-'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Square Feet</Label>
                        <p className="font-medium flex items-center gap-1">
                          <Square className="w-4 h-4 text-muted-foreground" />
                          {lead.sqft?.toLocaleString() || '-'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Lot Size</Label>
                        <p className="font-medium">{lead.lot_size ? `${lead.lot_size} acres` : '-'}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Pool</Label>
                        <p className="font-medium">{lead.pool ? 'Yes' : 'No'}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Garage</Label>
                        <p className="font-medium">{lead.garage || '-'} car</p>
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs text-muted-foreground">Parcel ID</Label>
                        <p className="font-medium font-mono text-sm">{lead.parcel_id || '-'}</p>
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs text-muted-foreground">Zoning</Label>
                        <p className="font-medium">{lead.zoning || '-'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Value Indicator Card */}
                <Card className="border-amber-500/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-amber-500" />
                      Value Indicator
                    </CardTitle>
                    <CardDescription>Property value estimates and history</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Main Value */}
                    <div className="text-center p-4 bg-amber-500/10 rounded-lg border border-amber-500/30 mb-4">
                      <p className="text-sm text-muted-foreground mb-1">Estimated Value</p>
                      <p className="text-3xl font-bold text-amber-600">
                        {formatCurrency(lead.estimated_value)}
                      </p>
                      {lead.sqft && lead.estimated_value && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatCurrency(lead.estimated_value / lead.sqft)}/sqft
                        </p>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Zillow Estimate</p>
                        <p className="font-semibold">{formatCurrency(lead.zillow_estimate)}</p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Redfin Estimate</p>
                        <p className="font-semibold">{formatCurrency(lead.redfin_estimate)}</p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Last Sale Price</p>
                        <p className="font-semibold">{formatCurrency(lead.last_sale_price)}</p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Last Sale Date</p>
                        <p className="font-semibold">{lead.last_sale_date || '-'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tax Collector Data Card */}
                <Card className={lead.tax_assessed_value ? 'border-green-500/30 lg:col-span-2' : 'lg:col-span-2'}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-amber-500" />
                          Tax Collector Data
                        </CardTitle>
                        <CardDescription>
                          {lead.tax_assessed_value 
                            ? `Data from ${lead.county || 'county'} tax records` 
                            : 'Click "Pull Owner Info" to fetch tax records'}
                        </CardDescription>
                      </div>
                      {!lead.tax_assessed_value && (
                        <Button onClick={handlePullOwnerInfo} disabled={pullingOwner}>
                          {pullingOwner ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4 mr-2" />
                          )}
                          Pull Data
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {lead.tax_assessed_value ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 bg-muted/50 rounded-lg text-center">
                          <p className="text-xs text-muted-foreground mb-1">Assessed Value</p>
                          <p className="text-xl font-bold text-foreground">
                            {formatCurrency(lead.tax_assessed_value)}
                          </p>
                        </div>
                        <div className="p-4 bg-muted/50 rounded-lg text-center">
                          <p className="text-xs text-muted-foreground mb-1">Land Value</p>
                          <p className="text-xl font-bold text-foreground">
                            {formatCurrency(lead.tax_land_value)}
                          </p>
                        </div>
                        <div className="p-4 bg-muted/50 rounded-lg text-center">
                          <p className="text-xs text-muted-foreground mb-1">Building Value</p>
                          <p className="text-xl font-bold text-foreground">
                            {formatCurrency(lead.tax_building_value)}
                          </p>
                        </div>
                        <div className="p-4 bg-muted/50 rounded-lg text-center">
                          <p className="text-xs text-muted-foreground mb-1">Homestead</p>
                          <p className="text-xl font-bold text-foreground">
                            {lead.homestead ? (
                              <span className="text-green-600">Yes</span>
                            ) : (
                              <span className="text-red-600">No</span>
                            )}
                          </p>
                        </div>
                        <div className="col-span-2 md:col-span-4 p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                          <p className="text-xs text-green-600 mb-1">Owner on Record</p>
                          <p className="text-lg font-bold text-foreground">{lead.owner_name || '-'}</p>
                          {lead.owner_mailing_address && (
                            <p className="text-sm text-muted-foreground">
                              {lead.owner_mailing_address}
                              {lead.owner_mailing_city && `, ${lead.owner_mailing_city}`}
                              {lead.owner_mailing_state && ` ${lead.owner_mailing_state}`}
                              {lead.owner_mailing_zip && ` ${lead.owner_mailing_zip}`}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No tax data available</p>
                        <p className="text-sm mt-1">Pull owner info to fetch tax records from county</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Marketing Tab */}
            <TabsContent value="marketing" className="mt-0 space-y-4">
              {/* Lead Score Card */}
              <Card className="border-amber-500/30">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-amber-500" />
                        Lead Score
                      </CardTitle>
                      <CardDescription>
                        Quality rating based on available information
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchLeadScore}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {leadScore ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className={`text-5xl font-bold ${getScoreColor(leadScore.score)}`}>
                            {leadScore.score}
                          </p>
                          <p className="text-sm text-muted-foreground">/ 100</p>
                        </div>
                        <div className="flex-1">
                          <Progress value={leadScore.score} className="h-3" />
                          <p className={`text-sm font-medium mt-2 ${getScoreColor(leadScore.score)}`}>
                            {leadScore.rating}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 mt-4">
                        <div className="p-3 bg-muted/50 rounded-lg text-center">
                          <p className="text-xs text-muted-foreground">Address</p>
                          <p className="font-semibold">{leadScore.breakdown?.address || 0}/15</p>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg text-center">
                          <p className="text-xs text-muted-foreground">Property</p>
                          <p className="font-semibold">{leadScore.breakdown?.property || 0}/20</p>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg text-center">
                          <p className="text-xs text-muted-foreground">Value</p>
                          <p className="font-semibold">{leadScore.breakdown?.value || 0}/20</p>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg text-center">
                          <p className="text-xs text-muted-foreground">Owner</p>
                          <p className="font-semibold">{leadScore.breakdown?.owner || 0}/25</p>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg text-center">
                          <p className="text-xs text-muted-foreground">Tax Data</p>
                          <p className="font-semibold">{leadScore.breakdown?.tax || 0}/10</p>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg text-center">
                          <p className="text-xs text-muted-foreground">Status</p>
                          <p className="font-semibold">{leadScore.breakdown?.status || 0}/10</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-500" />
                      <p className="text-sm text-muted-foreground mt-2">Loading score...</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Property Images Gallery */}
              <PropertyImagesGallery 
                leadId={id} 
                images={lead.gallery_images || []} 
                onImagesChange={fetchLead}
              />

              {/* Property Data Generator Card */}
              <Card className="border-2 border-blue-500/30 bg-gradient-to-r from-blue-500/5 to-cyan-500/5">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Search className="w-5 h-5 text-blue-500" />
                        Generate Property Data
                      </CardTitle>
                      <CardDescription>
                        Scrape Zillow, Redfin & Realtor.com for property details and images
                      </CardDescription>
                    </div>
                    <Button 
                      onClick={handleGenerateData}
                      disabled={generatingData}
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      {generatingData ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Zap className="w-4 h-4 mr-2" />
                      )}
                      Generate
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {lead.scraped_data ? (
                    <div className="space-y-4">
                      {/* Sources Found */}
                      <div className="flex flex-wrap gap-2">
                        {lead.scraped_data.sources_found?.map((source) => (
                          <Badge key={source} className="bg-green-500/20 text-green-600 border-green-500/50">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {source.charAt(0).toUpperCase() + source.slice(1)}
                          </Badge>
                        ))}
                        {lead.scraped_data.sources_checked?.filter(s => !lead.scraped_data.sources_found?.includes(s)).map((source) => (
                          <Badge key={source} variant="outline" className="text-muted-foreground">
                            {source.charAt(0).toUpperCase() + source.slice(1)}
                          </Badge>
                        ))}
                      </div>
                      
                      {/* Source URLs */}
                      {lead.scraped_data.source_urls && Object.keys(lead.scraped_data.source_urls).length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Source Links:</p>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(lead.scraped_data.source_urls).map(([source, url]) => (
                              <a 
                                key={source}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                              >
                                {source} <ExternalLink className="w-3 h-3" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Images Preview */}
                      {lead.scraped_images && lead.scraped_images.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium">{lead.scraped_images.length} Images Found</p>
                            <Button variant="outline" size="sm" onClick={() => setShowImagesModal(true)}>
                              View All
                            </Button>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {lead.scraped_images.slice(0, 4).map((img, idx) => (
                              <div key={idx} className="aspect-video rounded-lg overflow-hidden bg-muted">
                                <img 
                                  src={img.url} 
                                  alt={`Property ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => e.target.style.display = 'none'}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Street View */}
                      {lead.street_view && (
                        <div>
                          <p className="text-sm font-medium mb-2">Google Street View</p>
                          <a 
                            href={`https://www.google.com/maps/place/${encodeURIComponent(lead.address + ', ' + lead.city + ', ' + lead.state)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-500 hover:underline flex items-center gap-1"
                          >
                            View on Google Maps <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                      
                      {/* Last Scraped */}
                      {lead.last_scraped_at && (
                        <p className="text-xs text-muted-foreground">
                          Last updated: {new Date(lead.last_scraped_at).toLocaleString()}
                        </p>
                      )}
                      
                      {/* Convert to Showcase Button */}
                      {lead.scraped_images && lead.scraped_images.length > 0 && (
                        <Button 
                          onClick={handleConvertToShowcase}
                          disabled={convertingToShowcase}
                          className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black"
                        >
                          {convertingToShowcase ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Star className="w-4 h-4 mr-2" />
                          )}
                          Convert to Showcase Listing
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Search className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                      <p className="text-sm text-muted-foreground mb-4">
                        Click "Generate" to scrape property data and images from Zillow, Redfin, and Realtor.com
                      </p>
                      <div className="flex justify-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Property Details</span>
                        <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Listing Photos</span>
                        <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Street View</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Brochure Generator Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileImage className="w-5 h-5 text-amber-500" />
                      Brochure Generator
                    </CardTitle>
                    <CardDescription>
                      Create beautifully designed property brochures
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-amber-500/20 rounded-lg">
                          <FileText className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-amber-900 dark:text-amber-100">Professional Brochures</p>
                          <p className="text-sm text-amber-700 dark:text-amber-300">8.5" x 11" luxury design with QR codes</p>
                        </div>
                      </div>
                      <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1 mb-4">
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-3 h-3" /> Navy & gold luxury theme
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-3 h-3" /> Property details & valuation
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="w-3 h-3" /> Agent contact with QR code
                        </li>
                      </ul>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => setShowBrochureModal(true)} 
                        className="flex-1 bg-amber-500 hover:bg-amber-600 text-black"
                      >
                        <Printer className="w-4 h-4 mr-2" />
                        Generate Brochure
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => setEmailModalOpen(true)}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Email
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Landing Page Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="w-5 h-5 text-amber-500" />
                      Property Landing Page
                    </CardTitle>
                    <CardDescription>
                      Create and publish a dedicated page for this property
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {lead.landing_page_id ? (
                      <>
                        <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <span className="font-medium text-green-600">Landing Page Created</span>
                          </div>
                          {lead.landing_page_url && (
                            <a 
                              href={lead.landing_page_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-blue-500 hover:underline flex items-center gap-1"
                            >
                              {lead.landing_page_url}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        <Button 
                          onClick={handlePublishLandingPage} 
                          disabled={publishingPage}
                          className="w-full"
                        >
                          {publishingPage ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Globe className="w-4 h-4 mr-2" />
                          )}
                          Publish / Update
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="p-4 bg-muted/50 rounded-lg text-center">
                          <Globe className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-50" />
                          <p className="text-sm text-muted-foreground">
                            No landing page yet. Create one to showcase this property online.
                          </p>
                        </div>
                        <Button 
                          onClick={handleCreateListing} 
                          disabled={creatingListing}
                          className="w-full bg-amber-500 hover:bg-amber-600 text-black"
                        >
                          {creatingListing ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Plus className="w-4 h-4 mr-2" />
                          )}
                          Create Listing & Landing Page
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Video Upload Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Video className="w-5 h-5 text-amber-500" />
                        Property Videos
                      </CardTitle>
                      <CardDescription>
                        Add walkthrough videos to your landing page
                      </CardDescription>
                    </div>
                    <Button variant="outline" onClick={() => setVideoModalOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Video
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {lead.videos?.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {lead.videos.map((video) => (
                        <div key={video.id} className="p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Play className="w-4 h-4 text-amber-500" />
                            <span className="text-sm font-medium truncate">{video.title}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 truncate">{video.url}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <Video className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No videos added yet</p>
                      <p className="text-xs mt-1">Record yourself with the brochure, then upload the video here</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 1-Click Marketing Workflow */}
              <Card className="border-2 border-amber-500/50 bg-gradient-to-r from-amber-500/5 to-amber-600/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-500" />
                    1-Click Marketing Workflow
                  </CardTitle>
                  <CardDescription>
                    Automatically: Create listing → Publish landing page → Generate brochure → Email to owner
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex-1 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-sm font-bold text-amber-600">1</div>
                      <span className="text-sm">Listing</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-sm font-bold text-amber-600">2</div>
                      <span className="text-sm">Landing Page</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-sm font-bold text-amber-600">3</div>
                      <span className="text-sm">Brochure</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-sm font-bold text-amber-600">4</div>
                      <span className="text-sm">Email</span>
                    </div>
                  </div>
                  
                  {!lead.owner_email && (
                    <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30 mb-4">
                      <p className="text-sm text-yellow-600 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Owner email required for automated workflow. Add it in the edit dialog.
                      </p>
                    </div>
                  )}
                  
                  <Button 
                    onClick={handleRunMarketingWorkflow}
                    disabled={runningWorkflow || !lead.owner_email}
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold"
                    size="lg"
                  >
                    {runningWorkflow ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <Zap className="w-5 h-5 mr-2" />
                    )}
                    Run Full Marketing Workflow
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                  <CardDescription>Add notes about this property</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Add Note */}
                  <div className="flex gap-2 mb-4">
                    <Textarea
                      placeholder="Add a note..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      rows={2}
                      className="flex-1"
                    />
                    <Button onClick={handleAddNote} disabled={addingNote || !newNote.trim()}>
                      {addingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    </Button>
                  </div>
                  
                  {/* Notes List */}
                  <div className="space-y-3">
                    {lead.notes?.length > 0 ? (
                      lead.notes.map((note) => (
                        <div key={note.id} className="p-4 bg-muted/50 rounded-lg">
                          <div className="flex items-start justify-between">
                            <p className="text-sm text-foreground whitespace-pre-wrap">{note.text}</p>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-red-500"
                              onClick={() => handleDeleteNote(note.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            {note.created_by} • {formatDate(note.created_at)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <StickyNote className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No notes yet</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Activity Log</CardTitle>
                  <CardDescription>History of all actions on this property</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {lead.activity?.length > 0 ? (
                      lead.activity.slice().reverse().map((item, idx) => (
                        <div key={idx} className="flex gap-4 items-start">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            {item.type === 'created' && <Plus className="w-4 h-4" />}
                            {item.type === 'updated' && <Edit2 className="w-4 h-4" />}
                            {item.type === 'note_added' && <StickyNote className="w-4 h-4" />}
                            {item.type === 'owner_info_pulled' && <Download className="w-4 h-4 text-green-500" />}
                            {item.type === 'imported' && <FileText className="w-4 h-4" />}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-foreground">{item.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.user} • {formatDate(item.timestamp)}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No activity yet</p>
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
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Property Lead</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Address</Label>
              <Input
                value={editData.address || ''}
                onChange={(e) => setEditData({...editData, address: e.target.value})}
              />
            </div>
            <div>
              <Label>City</Label>
              <Input
                value={editData.city || ''}
                onChange={(e) => setEditData({...editData, city: e.target.value})}
              />
            </div>
            <div>
              <Label>State</Label>
              <Input
                value={editData.state || ''}
                onChange={(e) => setEditData({...editData, state: e.target.value})}
              />
            </div>
            <div>
              <Label>Zip Code</Label>
              <Input
                value={editData.zip_code || ''}
                onChange={(e) => setEditData({...editData, zip_code: e.target.value})}
              />
            </div>
            <div>
              <Label>County</Label>
              <Input
                value={editData.county || ''}
                onChange={(e) => setEditData({...editData, county: e.target.value})}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={editData.status} onValueChange={(v) => setEditData({...editData, status: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="nurturing">Nurturing</SelectItem>
                  <SelectItem value="not_interested">Not Interested</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={editData.priority} onValueChange={(v) => setEditData({...editData, priority: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Estimated Value</Label>
              <Input
                type="number"
                value={editData.estimated_value || ''}
                onChange={(e) => setEditData({...editData, estimated_value: parseFloat(e.target.value) || null})}
              />
            </div>
            <div>
              <Label>Bedrooms</Label>
              <Input
                type="number"
                value={editData.bedrooms || ''}
                onChange={(e) => setEditData({...editData, bedrooms: parseInt(e.target.value) || null})}
              />
            </div>
            <div>
              <Label>Bathrooms</Label>
              <Input
                type="number"
                step="0.5"
                value={editData.bathrooms || ''}
                onChange={(e) => setEditData({...editData, bathrooms: parseFloat(e.target.value) || null})}
              />
            </div>
            <div>
              <Label>Sqft</Label>
              <Input
                type="number"
                value={editData.sqft || ''}
                onChange={(e) => setEditData({...editData, sqft: parseInt(e.target.value) || null})}
              />
            </div>
            <div>
              <Label>Year Built</Label>
              <Input
                type="number"
                value={editData.year_built || ''}
                onChange={(e) => setEditData({...editData, year_built: parseInt(e.target.value) || null})}
              />
            </div>
            <div className="col-span-2">
              <Label>Owner Name</Label>
              <Input
                value={editData.owner_name || ''}
                onChange={(e) => setEditData({...editData, owner_name: e.target.value})}
              />
            </div>
            <div>
              <Label>Owner Phone</Label>
              <Input
                value={editData.owner_phone || ''}
                onChange={(e) => setEditData({...editData, owner_phone: e.target.value})}
              />
            </div>
            <div>
              <Label>Owner Email</Label>
              <Input
                value={editData.owner_email || ''}
                onChange={(e) => setEditData({...editData, owner_email: e.target.value})}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Brochure Modal */}
      <Dialog open={emailModalOpen} onOpenChange={setEmailModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-amber-500" />
              Email Brochure
            </DialogTitle>
            <DialogDescription>
              Send the brochure with a personalized message to the property owner
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>Recipient Email *</Label>
              <Input
                type="email"
                value={emailData.recipient_email}
                onChange={(e) => setEmailData({...emailData, recipient_email: e.target.value})}
                placeholder="owner@email.com"
              />
            </div>
            <div>
              <Label>Subject (optional)</Label>
              <Input
                value={emailData.subject}
                onChange={(e) => setEmailData({...emailData, subject: e.target.value})}
                placeholder={`Exclusive Market Analysis for ${lead?.address || 'Your Property'}`}
              />
            </div>
            <div>
              <Label>Custom Message (optional)</Label>
              <Textarea
                value={emailData.message}
                onChange={(e) => setEmailData({...emailData, message: e.target.value})}
                placeholder="Leave blank to use default personalized message..."
                rows={4}
              />
            </div>
            <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
              <p>• Brochure PDF will be attached</p>
              <p>• Landing page link included (if published)</p>
              <p>• Uses your configured SMTP settings</p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleEmailBrochure} 
              disabled={sendingEmail || !emailData.recipient_email}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              {sendingEmail ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Video Modal */}
      <Dialog open={videoModalOpen} onOpenChange={setVideoModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="w-5 h-5 text-amber-500" />
              Add Property Video
            </DialogTitle>
            <DialogDescription>
              Add a video URL (YouTube, Vimeo, or direct link) to showcase this property
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>Video URL *</Label>
              <Input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=... or direct video URL"
              />
            </div>
            <div>
              <Label>Video Title</Label>
              <Input
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                placeholder="Property Walkthrough"
              />
            </div>
            <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
              <p className="text-sm text-amber-600 flex items-center gap-2">
                <Video className="w-4 h-4" />
                <span>
                  <strong>Tip:</strong> Record yourself holding the printed brochure and talking about the property, 
                  then upload to YouTube and add the link here!
                </span>
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setVideoModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleAddVideo} 
              disabled={addingVideo || !videoUrl}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              {addingVideo ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Add Video
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scraped Images Modal */}
      <Dialog open={showImagesModal} onOpenChange={setShowImagesModal}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileImage className="w-5 h-5 text-blue-500" />
              Property Images ({lead?.scraped_images?.length || 0})
            </DialogTitle>
            <DialogDescription>
              Images scraped from Zillow, Redfin, and Realtor.com
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4">
            {lead?.scraped_images?.map((img, idx) => (
              <div key={idx} className="relative group">
                <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                  <img 
                    src={img.url} 
                    alt={`Property ${idx + 1}`}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    onError={(e) => e.target.parentElement.style.display = 'none'}
                  />
                </div>
                <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Badge variant="secondary" className="text-xs">
                    {img.source}
                  </Badge>
                  <a 
                    href={img.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-1 bg-black/50 rounded-full hover:bg-black/70"
                  >
                    <ExternalLink className="w-3 h-3 text-white" />
                  </a>
                </div>
              </div>
            ))}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImagesModal(false)}>Close</Button>
            {lead?.scraped_images?.length > 0 && !lead?.listing_id && (
              <Button 
                onClick={() => {
                  setShowImagesModal(false);
                  handleConvertToShowcase();
                }}
                className="bg-amber-500 hover:bg-amber-600 text-black"
              >
                <Star className="w-4 h-4 mr-2" />
                Convert to Showcase
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Brochure Generator Modal */}
      <BrochureGeneratorModal
        isOpen={showBrochureModal}
        onClose={() => setShowBrochureModal(false)}
        leadId={id}
        leadAddress={lead?.address}
        onComplete={() => {
          toast.success('Brochure generated successfully!');
        }}
      />
    </div>
  );
};

export default PropertyLeadDetailPage;
