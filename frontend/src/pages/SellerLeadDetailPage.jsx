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
import { 
  User, 
  MapPin, 
  DollarSign, 
  Building2,
  Edit2,
  Trash2,
  ArrowLeft,
  Loader2,
  StickyNote,
  Activity,
  ExternalLink,
  Tag,
  Phone,
  Mail,
  Calendar,
  Clock,
  Target,
  TrendingUp,
  Home,
  Plus,
  Send,
  CheckCircle,
  Copy,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';

const STATUS_OPTIONS = [
  { value: 'new', label: 'New', color: 'bg-blue-500/20 text-blue-600 border-blue-500/50' },
  { value: 'contacted', label: 'Contacted', color: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/50' },
  { value: 'qualified', label: 'Qualified', color: 'bg-green-500/20 text-green-600 border-green-500/50' },
  { value: 'nurturing', label: 'Nurturing', color: 'bg-purple-500/20 text-purple-600 border-purple-500/50' },
  { value: 'not_interested', label: 'Not Interested', color: 'bg-gray-500/20 text-gray-600 border-gray-500/50' },
  { value: 'converted', label: 'Converted', color: 'bg-amber-500/20 text-amber-600 border-amber-500/50' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'bg-gray-500/20 text-gray-600' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-500/20 text-blue-600' },
  { value: 'high', label: 'High', color: 'bg-orange-500/20 text-orange-600' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500/20 text-red-600' },
];

const MOTIVATION_OPTIONS = [
  { value: 'relocating', label: 'Relocating' },
  { value: 'downsizing', label: 'Downsizing' },
  { value: 'upgrading', label: 'Upgrading' },
  { value: 'investment', label: 'Investment Sale' },
  { value: 'divorce', label: 'Divorce' },
  { value: 'inheritance', label: 'Inheritance' },
  { value: 'financial', label: 'Financial Reasons' },
  { value: 'other', label: 'Other' },
];

const TIMELINE_OPTIONS = [
  { value: 'immediately', label: 'Immediately' },
  { value: '1-3_months', label: '1-3 Months' },
  { value: '3-6_months', label: '3-6 Months' },
  { value: '6-12_months', label: '6-12 Months' },
  { value: '12+_months', label: '12+ Months' },
  { value: 'just_exploring', label: 'Just Exploring' },
];

const SellerLeadDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  
  // Notes
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    if (id) {
      fetchLead();
    }
  }, [id]);

  const fetchLead = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/seller-leads/${id}`);
      setLead(res.data);
      setEditData(res.data);
    } catch (error) {
      toast.error('Failed to load seller lead');
      navigate('/seller-leads');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/seller-leads/${id}`, editData);
      toast.success('Lead updated');
      setEditMode(false);
      fetchLead();
    } catch (error) {
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this seller lead?')) return;
    try {
      await api.delete(`/seller-leads/${id}`);
      toast.success('Lead deleted');
      navigate('/seller-leads');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    
    setAddingNote(true);
    try {
      await api.post(`/seller-leads/${id}/notes`, { content: newNote });
      toast.success('Note added');
      setNewNote('');
      fetchLead();
    } catch (error) {
      toast.error('Failed to add note');
    } finally {
      setAddingNote(false);
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

  const getPriorityColor = (priority) => {
    return PRIORITY_OPTIONS.find(p => p.value === priority)?.color || 'bg-gray-500/20 text-gray-600';
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
        <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-lg">Seller lead not found</p>
        <Button onClick={() => navigate('/seller-leads')} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Seller Leads
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-6 min-h-[calc(100vh-6rem)]" data-testid="seller-lead-detail">
      {/* Left Sidebar */}
      <div className="w-80 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
        {/* Contact Card */}
        <Card>
          <CardContent className="pt-6">
            {/* Contact Icon */}
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-amber-400/20 to-amber-600/20 rounded-full flex items-center justify-center border-2 border-amber-500/30">
              <User className="w-10 h-10 text-amber-500" />
            </div>
            
            {/* Name */}
            <h2 className="text-xl font-semibold text-center text-foreground mb-1">
              {lead.name}
            </h2>
            
            {/* Contact Details */}
            {(lead.email || lead.phone) && (
              <div className="text-center text-muted-foreground text-sm mb-4 space-y-1">
                {lead.email && (
                  <p className="flex items-center justify-center gap-1">
                    <Mail className="w-3 h-3" />
                    {lead.email}
                  </p>
                )}
                {lead.phone && (
                  <p className="flex items-center justify-center gap-1">
                    <Phone className="w-3 h-3" />
                    {lead.phone}
                  </p>
                )}
              </div>
            )}
            
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
              {lead.phone && (
                <Button asChild className="w-full bg-amber-500 hover:bg-amber-600 text-black">
                  <a href={`tel:${lead.phone}`}>
                    <Phone className="w-4 h-4 mr-2" />
                    Call Seller
                  </a>
                </Button>
              )}
              {lead.email && (
                <Button asChild variant="outline" className="w-full">
                  <a href={`mailto:${lead.email}`}>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Email
                  </a>
                </Button>
              )}
              <Button variant="outline" className="w-full" onClick={() => setEditMode(true)}>
                <Edit2 className="w-4 h-4 mr-2" />
                Edit Lead
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Property Info */}
        {lead.property_address && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Home className="w-4 h-4 text-amber-500" />
                Property to Sell
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-medium">{lead.property_address}</p>
                <p className="text-sm text-muted-foreground">
                  {lead.property_city && `${lead.property_city}, `}
                  {lead.property_state && `${lead.property_state} `}
                  {lead.property_zip}
                </p>
              </div>
              {lead.estimated_value && (
                <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
                  <p className="text-xs text-muted-foreground">Estimated Value</p>
                  <p className="text-xl font-bold text-amber-600">{formatCurrency(lead.estimated_value)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-500" />
              Lead Qualification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Motivation</span>
              <span className="text-sm font-medium capitalize">
                {MOTIVATION_OPTIONS.find(m => m.value === lead.motivation)?.label || lead.motivation || '-'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Timeline</span>
              <span className="text-sm font-medium">
                {TIMELINE_OPTIONS.find(t => t.value === lead.timeline)?.label || lead.timeline || '-'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Lead Score</span>
              <span className="text-sm font-medium">{lead.score || '-'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Source</span>
              <span className="text-sm font-medium capitalize">{lead.source || '-'}</span>
            </div>
          </CardContent>
        </Card>

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
          <Button variant="ghost" onClick={() => navigate('/seller-leads')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Seller Leads
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDelete} className="text-red-500 hover:text-red-600">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="w-full justify-start bg-muted/50 p-1 rounded-lg">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="property" className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              Property
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
          <div className="flex-1 mt-4 pb-8 overflow-y-auto">
            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-0 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Contact Information Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5 text-amber-500" />
                      Contact Information
                    </CardTitle>
                    <CardDescription>Seller contact details</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs text-muted-foreground">Full Name</Label>
                        <p className="font-medium">{lead.name}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Email</Label>
                        <p className="font-medium flex items-center gap-1">
                          {lead.email || '-'}
                          {lead.email && (
                            <button onClick={() => copyToClipboard(lead.email)}>
                              <Copy className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                            </button>
                          )}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Phone</Label>
                        <p className="font-medium flex items-center gap-1">
                          {lead.phone || '-'}
                          {lead.phone && (
                            <button onClick={() => copyToClipboard(lead.phone)}>
                              <Copy className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                            </button>
                          )}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Lead Status Card */}
                <Card className="border-amber-500/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-amber-500" />
                      Lead Status
                    </CardTitle>
                    <CardDescription>Current lead qualification</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Status</p>
                        <Badge className={`${getStatusColor(lead.status)} mt-1`}>
                          {lead.status?.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Priority</p>
                        <Badge className={`${getPriorityColor(lead.priority)} mt-1`}>
                          {lead.priority?.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Motivation</p>
                        <p className="font-semibold capitalize">
                          {MOTIVATION_OPTIONS.find(m => m.value === lead.motivation)?.label || lead.motivation || '-'}
                        </p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Timeline</p>
                        <p className="font-semibold">
                          {TIMELINE_OPTIONS.find(t => t.value === lead.timeline)?.label || lead.timeline || '-'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Timeline Card */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-amber-500" />
                      Timeline
                    </CardTitle>
                    <CardDescription>Lead creation and updates</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Created</p>
                        <p className="font-semibold">{formatDate(lead.created_at)}</p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Last Updated</p>
                        <p className="font-semibold">{formatDate(lead.updated_at)}</p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Source</p>
                        <p className="font-semibold capitalize">{lead.source || '-'}</p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Assigned To</p>
                        <p className="font-semibold">{lead.assigned_to || '-'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Property Tab */}
            <TabsContent value="property" className="mt-0 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Home className="w-5 h-5 text-amber-500" />
                    Property Details
                  </CardTitle>
                  <CardDescription>Information about the property to sell</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Address</Label>
                        <p className="font-medium text-lg">{lead.property_address || '-'}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">City</Label>
                          <p className="font-medium">{lead.property_city || '-'}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">State</Label>
                          <p className="font-medium">{lead.property_state || '-'}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">ZIP</Label>
                          <p className="font-medium">{lead.property_zip || '-'}</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="p-6 bg-amber-500/10 rounded-lg border border-amber-500/30 text-center">
                        <p className="text-sm text-muted-foreground mb-1">Estimated Value</p>
                        <p className="text-3xl font-bold text-amber-600">
                          {formatCurrency(lead.estimated_value)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="mt-0 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <StickyNote className="w-5 h-5 text-amber-500" />
                    Notes
                  </CardTitle>
                  <CardDescription>Add notes about this seller lead</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Add Note Form */}
                  <div className="flex gap-2 mb-4">
                    <Textarea
                      placeholder="Add a note..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      rows={2}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleAddNote} 
                      disabled={!newNote.trim() || addingNote}
                      className="bg-amber-500 hover:bg-amber-600 text-black"
                    >
                      {addingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                  
                  {/* Notes List */}
                  <div className="space-y-3">
                    {lead.notes?.length > 0 ? (
                      [...lead.notes].reverse().map((note, idx) => (
                        <div key={note.id || idx} className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-sm">{note.content}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {note.created_by} • {formatDate(note.created_at)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-muted-foreground py-8">No notes yet</p>
                    )}
                  </div>
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
                        <p className="font-medium">Lead Created</p>
                        <p className="text-sm text-muted-foreground">{formatDate(lead.created_at)}</p>
                      </div>
                    </div>
                    {lead.updated_at && lead.updated_at !== lead.created_at && (
                      <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <Edit2 className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">Lead Updated</p>
                          <p className="text-sm text-muted-foreground">{formatDate(lead.updated_at)}</p>
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
            <DialogTitle>Edit Seller Lead</DialogTitle>
            <DialogDescription>Update the seller lead details</DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name *</Label>
                <Input
                  value={editData.name || ''}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editData.email || ''}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                />
              </div>
            </div>
            
            <div>
              <Label>Phone</Label>
              <Input
                value={editData.phone || ''}
                onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
              />
            </div>

            {/* Property Info */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Property Information</h4>
              <div className="grid gap-4">
                <div>
                  <Label>Property Address</Label>
                  <Input
                    value={editData.property_address || ''}
                    onChange={(e) => setEditData({ ...editData, property_address: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>City</Label>
                    <Input
                      value={editData.property_city || ''}
                      onChange={(e) => setEditData({ ...editData, property_city: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Input
                      value={editData.property_state || ''}
                      onChange={(e) => setEditData({ ...editData, property_state: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>ZIP</Label>
                    <Input
                      value={editData.property_zip || ''}
                      onChange={(e) => setEditData({ ...editData, property_zip: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Estimated Value ($)</Label>
                  <Input
                    type="number"
                    value={editData.estimated_value || ''}
                    onChange={(e) => setEditData({ ...editData, estimated_value: parseFloat(e.target.value) || null })}
                  />
                </div>
              </div>
            </div>

            {/* Qualification */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Qualification</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Motivation</Label>
                  <Select value={editData.motivation || ''} onValueChange={(v) => setEditData({ ...editData, motivation: v })}>
                    <SelectTrigger><SelectValue placeholder="Select motivation" /></SelectTrigger>
                    <SelectContent>
                      {MOTIVATION_OPTIONS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Timeline</Label>
                  <Select value={editData.timeline || ''} onValueChange={(v) => setEditData({ ...editData, timeline: v })}>
                    <SelectTrigger><SelectValue placeholder="Select timeline" /></SelectTrigger>
                    <SelectContent>
                      {TIMELINE_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={editData.status || ''} onValueChange={(v) => setEditData({ ...editData, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={editData.priority || ''} onValueChange={(v) => setEditData({ ...editData, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
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

export default SellerLeadDetailPage;
