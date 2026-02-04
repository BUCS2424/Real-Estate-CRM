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
  Play
} from 'lucide-react';
import { toast } from 'sonner';
import { propertyLeadsAPI } from '../lib/api';

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
    <div className="flex gap-6 h-[calc(100vh-6rem)]" data-testid="property-lead-detail">
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
              <Button 
                onClick={handlePullOwnerInfo} 
                disabled={pullingOwner}
                className="w-full bg-amber-500 hover:bg-amber-600 text-black"
              >
                {pullingOwner ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Pull Owner Info
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setEditMode(true)}>
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
      <div className="flex-1 flex flex-col overflow-hidden">
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
          <div className="flex-1 overflow-y-auto mt-4">
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
    </div>
  );
};

export default PropertyLeadDetailPage;
