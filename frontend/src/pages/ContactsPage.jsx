import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  Users, 
  Plus, 
  Search, 
  MapPin,
  DollarSign,
  User,
  Loader2,
  Trash2,
  Eye,
  RefreshCw,
  Building2,
  CheckCircle,
  Phone,
  Mail,
  TrendingUp,
  Clock,
  UserCheck,
  Home,
  ShoppingCart,
  StickyNote,
  Activity,
  Tag,
  Edit2,
  ArrowLeft,
  Send,
  Copy,
  Calendar,
  Target,
  Briefcase,
  Upload,
  FileSpreadsheet,
  Download,
  Smartphone,
  Apple,
  AlertCircle,
  MessageSquare,
  X,
  Link,
  Gift,
  Heart,
  Cake
} from 'lucide-react';
import { toast } from 'sonner';
import api, { contactsAPI } from '../lib/api';
import EmailComposerModal from '../components/EmailComposerModal';

const DEFAULT_STATUS_OPTIONS = [
  { value: 'active', label: 'Active', color: 'bg-green-500/20 text-green-600 border-green-500/50' },
  { value: 'inactive', label: 'Inactive', color: 'bg-gray-500/20 text-gray-600 border-gray-500/50' },
  { value: 'new', label: 'New', color: 'bg-blue-500/20 text-blue-600 border-blue-500/50' },
  { value: 'contacted', label: 'Contacted', color: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/50' },
  { value: 'qualified', label: 'Qualified', color: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/50' },
  { value: 'negotiation', label: 'Negotiation', color: 'bg-purple-500/20 text-purple-600 border-purple-500/50' },
  { value: 'closed', label: 'Closed', color: 'bg-slate-500/20 text-slate-600 border-slate-500/50' },
];

// Load custom statuses from localStorage
const getStatusOptions = () => {
  const customStatuses = JSON.parse(localStorage.getItem('customContactStatuses') || '[]');
  return [...DEFAULT_STATUS_OPTIONS, ...customStatuses];
};

const CATEGORY_OPTIONS = [
  { value: 'buyer', label: 'Buyer', color: 'bg-emerald-500/20 text-emerald-600', icon: ShoppingCart },
  { value: 'seller', label: 'Seller', color: 'bg-orange-500/20 text-orange-600', icon: Home },
];

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// Contact Detail Component
const ContactDetail = ({ contactId, onBack }) => {
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [newTag, setNewTag] = useState('');
  
  // Properties state
  const [properties, setProperties] = useState([]);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [availableProperties, setAvailableProperties] = useState([]);
  const [propertySearch, setPropertySearch] = useState('');
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [addingProperty, setAddingProperty] = useState(false);
  
  // New property form state
  const [showNewPropertyForm, setShowNewPropertyForm] = useState(false);
  const [newPropertyData, setNewPropertyData] = useState({
    address: '',
    city: '',
    state: '',
    zip_code: '',
    price: '',
    bedrooms: '',
    bathrooms: '',
    sqft: '',
    property_type: 'Single Family',
    purchase_date: '',
    anniversary_date: '',
  });
  const [savingNewProperty, setSavingNewProperty] = useState(false);
  
  // Custom status state
  const [statusOptions, setStatusOptions] = useState(getStatusOptions());
  const [showAddStatus, setShowAddStatus] = useState(false);
  const [newStatusName, setNewStatusName] = useState('');
  
  // Send Card modal state
  const [showSendCardModal, setShowSendCardModal] = useState(false);
  const [sendingCard, setSendingCard] = useState(false);
  const [cardData, setCardData] = useState({
    card_url: '',
    occasion: 'birthday',
    message: '',
    schedule_date: ''
  });

  useEffect(() => {
    if (contactId) fetchContact();
  }, [contactId]);
  
  useEffect(() => {
    if (activeTab === 'properties' && contactId) {
      fetchProperties();
    }
  }, [activeTab, contactId]);

  const fetchProperties = async () => {
    setLoadingProperties(true);
    try {
      const res = await contactsAPI.getProperties(contactId);
      setProperties(res.data || []);
    } catch (error) {
      console.error('Failed to load properties');
    } finally {
      setLoadingProperties(false);
    }
  };

  const searchAvailableProperties = async (search) => {
    try {
      const res = await contactsAPI.getAvailableProperties(search);
      setAvailableProperties(res.data || []);
    } catch (error) {
      console.error('Failed to search properties');
    }
  };

  const handleAddProperty = async (property) => {
    setAddingProperty(true);
    try {
      const propertyType = contact.category === 'seller' ? 'selling' : 'buying';
      await contactsAPI.addProperty(contactId, {
        property_id: property.id,
        address: property.address,
        city: property.city || null,
        state: property.state || null,
        type: propertyType,
        status: property.status || null,
        price: property.price ? String(property.price) : null,
      });
      toast.success('Property linked to contact');
      setShowAddProperty(false);
      setPropertySearch('');
      fetchProperties();
      fetchContact();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add property');
    } finally {
      setAddingProperty(false);
    }
  };

  const handleRemoveProperty = async (propertyLinkId) => {
    if (!window.confirm('Remove this property from the contact?')) return;
    try {
      await contactsAPI.removeProperty(contactId, propertyLinkId);
      toast.success('Property removed');
      fetchProperties();
      fetchContact();
    } catch (error) {
      toast.error('Failed to remove property');
    }
  };
  
  // Add new custom status
  const handleAddCustomStatus = () => {
    if (!newStatusName.trim()) return;
    const statusValue = newStatusName.toLowerCase().replace(/\s+/g, '_');
    const newStatus = {
      value: statusValue,
      label: newStatusName.trim(),
      color: 'bg-cyan-500/20 text-cyan-600 border-cyan-500/50',
      custom: true
    };
    const customStatuses = JSON.parse(localStorage.getItem('customContactStatuses') || '[]');
    customStatuses.push(newStatus);
    localStorage.setItem('customContactStatuses', JSON.stringify(customStatuses));
    setStatusOptions(getStatusOptions());
    setEditData({ ...editData, status: statusValue });
    setNewStatusName('');
    setShowAddStatus(false);
    toast.success(`Status "${newStatusName}" added`);
  };
  
  // Create new property for this contact
  const handleCreateNewProperty = async () => {
    if (!newPropertyData.address.trim()) {
      toast.error('Address is required');
      return;
    }
    setSavingNewProperty(true);
    try {
      // Create property lead first
      const propertyType = contact.category === 'seller' ? 'selling' : 'buying';
      const propertyPayload = {
        address: newPropertyData.address,
        city: newPropertyData.city || null,
        state: newPropertyData.state || null,
        zip_code: newPropertyData.zip_code || null,
        list_price: newPropertyData.price ? parseFloat(newPropertyData.price.replace(/[^0-9.]/g, '')) : null,
        bedrooms: newPropertyData.bedrooms ? parseInt(newPropertyData.bedrooms) : null,
        bathrooms: newPropertyData.bathrooms ? parseFloat(newPropertyData.bathrooms) : null,
        sqft: newPropertyData.sqft ? parseInt(newPropertyData.sqft.replace(/[^0-9]/g, '')) : null,
        property_type: newPropertyData.property_type,
        owner_name: contact.display_name || contact.first_name + ' ' + contact.last_name,
        owner_phone: contact.mobile_phone || contact.home_phone || contact.phone,
        owner_email: contact.email,
        status: 'new',
        source: 'contact_added',
      };
      
      // Create property lead via API
      const res = await api.post('/property-leads', propertyPayload);
      const newProperty = res.data;
      
      // Link it to the contact
      await contactsAPI.addProperty(contactId, {
        property_id: newProperty.id,
        address: newProperty.address,
        city: newProperty.city || null,
        state: newProperty.state || null,
        type: propertyType,
        status: 'new',
        price: newPropertyData.price || null,
        purchase_date: newPropertyData.purchase_date || null,
        anniversary_date: newPropertyData.anniversary_date || null,
      });
      
      toast.success('Property created and linked to contact');
      setShowNewPropertyForm(false);
      setNewPropertyData({
        address: '', city: '', state: '', zip_code: '', price: '',
        bedrooms: '', bathrooms: '', sqft: '', property_type: 'Single Family',
        purchase_date: '', anniversary_date: '',
      });
      fetchProperties();
      fetchContact();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create property');
    } finally {
      setSavingNewProperty(false);
    }
  };

  // Initialize tags array from editData
  const tags = editData.tags || [];

  const addTag = () => {
    if (!newTag.trim()) return;
    const tag = newTag.trim();
    if (!tags.includes(tag)) {
      setEditData({ ...editData, tags: [...tags, tag] });
    }
    setNewTag('');
  };

  const removeTag = (tagToRemove) => {
    setEditData({ ...editData, tags: tags.filter(t => t !== tagToRemove) });
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const fetchContact = async () => {
    setLoading(true);
    try {
      const res = await contactsAPI.get(contactId);
      setContact(res.data);
      setEditData(res.data);
    } catch (error) {
      toast.error('Failed to load contact');
      onBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await contactsAPI.update(contactId, editData);
      toast.success('Contact updated');
      setActiveTab('overview');
      fetchContact();
    } catch (error) {
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this contact?')) return;
    try {
      await contactsAPI.delete(contactId);
      toast.success('Contact deleted');
      onBack();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      const notes = [...(contact.notes_list || []), {
        id: Date.now().toString(),
        content: newNote,
        created_at: new Date().toISOString(),
        created_by: 'Admin'
      }];
      await contactsAPI.update(contactId, { notes_list: notes });
      toast.success('Note added');
      setNewNote('');
      fetchContact();
    } catch (error) {
      toast.error('Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusColor = (status) => getStatusOptions().find(s => s.value === status)?.color || 'bg-gray-500/20 text-gray-600';
  const getCategoryColor = (cat) => CATEGORY_OPTIONS.find(c => c.value === cat)?.color || 'bg-gray-500/20 text-gray-600';

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleSendCard = async () => {
    if (!cardData.card_url) {
      toast.error('Please enter a card URL');
      return;
    }
    const email = contact.email || contact.email_2 || contact.email_3;
    if (!email) {
      toast.error('Contact has no email address');
      return;
    }
    setSendingCard(true);
    try {
      const payload = {
        contact_id: contactId,
        card_url: cardData.card_url,
        occasion: cardData.occasion,
        message: cardData.message,
        schedule_date: cardData.schedule_date || null
      };
      await api.post('/jacquie-lawson/send', payload);
      toast.success(cardData.schedule_date ? 'Card scheduled!' : 'Card is being sent!');
      setShowSendCardModal(false);
      setCardData({ card_url: '', occasion: 'birthday', message: '', schedule_date: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send card');
    } finally {
      setSendingCard(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!contact) return null;

  // Build display values for iPhone contact fields
  const displayName = contact.display_name || 
    contact.name || 
    `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 
    contact.organization ||
    'Unknown';
  
  const primaryEmail = contact.email || contact.email_2 || contact.email_3;
  const primaryPhone = contact.phone || contact.mobile_phone || contact.home_phone || contact.business_phone;
  const company = contact.company || contact.organization;
  const jobTitle = contact.position || contact.job_title;

  return (
    <div className="flex gap-6 min-h-[calc(100vh-6rem)]" data-testid="contact-detail">
      {/* Left Sidebar */}
      <div className="w-80 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
        <Card>
          <CardContent className="pt-6">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-amber-400/20 to-amber-600/20 rounded-full flex items-center justify-center border-2 border-amber-500/30">
              <User className="w-10 h-10 text-amber-500" />
            </div>
            
            <h2 className="text-xl font-semibold text-center text-foreground mb-1">{displayName}</h2>
            {jobTitle && <p className="text-center text-muted-foreground text-sm mb-2">{jobTitle}</p>}
            
            {(primaryEmail || primaryPhone) && (
              <div className="text-center text-muted-foreground text-sm mb-4 space-y-1">
                {primaryEmail && (
                  <p className="flex items-center justify-center gap-1">
                    <Mail className="w-3 h-3" />{primaryEmail}
                  </p>
                )}
                {primaryPhone && (
                  <p className="flex items-center justify-center gap-1">
                    <Phone className="w-3 h-3" />{primaryPhone}
                  </p>
                )}
              </div>
            )}
            
            <div className="flex justify-center gap-2 mb-4">
              <Badge className={getStatusColor(contact.status)}>
                {contact.status?.toUpperCase()}
              </Badge>
              {contact.category && (
                <Badge className={getCategoryColor(contact.category)}>
                  {contact.category?.toUpperCase()}
                </Badge>
              )}
            </div>
            
            <div className="space-y-2">
              {primaryPhone && (
                <Button asChild className="w-full bg-amber-500 hover:bg-amber-600 text-black">
                  <a href={`tel:${primaryPhone}`}>
                    <Phone className="w-4 h-4 mr-2" />Call
                  </a>
                </Button>
              )}
              {primaryEmail && (
                <Button asChild variant="outline" className="w-full">
                  <a href={`mailto:${primaryEmail}`}>
                    <Mail className="w-4 h-4 mr-2" />Email
                  </a>
                </Button>
              )}
              <Button variant="outline" className="w-full" onClick={() => setActiveTab('edit')}>
                <Edit2 className="w-4 h-4 mr-2" />Edit Contact
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-500" />Quick Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Category</span>
              <span className="text-sm font-medium capitalize">{contact.category || '-'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Company</span>
              <span className="text-sm font-medium">{company || '-'}</span>
            </div>
            {jobTitle && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Title</span>
                <span className="text-sm font-medium">{jobTitle}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Budget</span>
              <span className="text-sm font-medium">{contact.budget || '-'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Lead Score</span>
              <span className="text-sm font-medium">{contact.lead_score || '-'}</span>
            </div>
            {contact.birthday && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Birthday</span>
                <span className="text-sm font-medium">{contact.birthday}</span>
              </div>
            )}
            {contact.web_page && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Website</span>
                <a href={contact.web_page} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-amber-500 hover:text-amber-600 truncate max-w-[120px]">{contact.web_page}</a>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Tag className="w-4 h-4 text-amber-500" />Tags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {contact.tags?.length > 0 ? (
                contact.tags.map((tag, idx) => (
                  <span 
                    key={idx} 
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 text-amber-600 rounded-full text-xs font-medium border border-amber-500/30"
                  >
                    {tag}
                  </span>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No tags</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />Back to Contacts
          </Button>
          <Button variant="outline" size="sm" onClick={handleDelete} className="text-red-500 hover:text-red-600">
            <Trash2 className="w-4 h-4 mr-2" />Delete
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="w-full justify-start bg-muted/50 p-1 rounded-lg">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <User className="w-4 h-4" />Overview
            </TabsTrigger>
            <TabsTrigger value="properties" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />Properties {contact.properties?.length > 0 && `(${contact.properties.length})`}
            </TabsTrigger>
            <TabsTrigger value="alldata" className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />All Data
            </TabsTrigger>
            <TabsTrigger value="edit" className="flex items-center gap-2">
              <Edit2 className="w-4 h-4" />Edit
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-2">
              <StickyNote className="w-4 h-4" />Notes {(contact.notes || contact.notes_list?.length > 0) && `(${(contact.notes ? 1 : 0) + (contact.notes_list?.length || 0)})`}
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />Activity
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 mt-4 pb-8 overflow-y-auto">
            <TabsContent value="overview" className="mt-0 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Basic Contact Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5 text-amber-500" />Contact Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs text-muted-foreground">Full Name</Label>
                        <p className="font-medium">{displayName}</p>
                      </div>
                      {contact.nickname && (
                        <div className="col-span-2 space-y-1">
                          <Label className="text-xs text-muted-foreground">Nickname</Label>
                          <p className="font-medium">{contact.nickname}</p>
                        </div>
                      )}
                      
                      {/* Emails Section */}
                      <div className="col-span-2 space-y-2">
                        <Label className="text-xs text-muted-foreground">Email Addresses</Label>
                        {(contact.email || contact.email_2 || contact.email_3) ? (
                          <div className="space-y-1">
                            {contact.email && (
                              <p className="font-medium flex items-center gap-1 text-sm">
                                <Mail className="w-3 h-3 text-muted-foreground" />
                                {contact.email}
                                <button onClick={() => copyToClipboard(contact.email)}><Copy className="w-3 h-3 text-muted-foreground hover:text-foreground" /></button>
                              </p>
                            )}
                            {contact.email_2 && (
                              <p className="font-medium flex items-center gap-1 text-sm">
                                <Mail className="w-3 h-3 text-muted-foreground" />
                                {contact.email_2}
                                <button onClick={() => copyToClipboard(contact.email_2)}><Copy className="w-3 h-3 text-muted-foreground hover:text-foreground" /></button>
                              </p>
                            )}
                            {contact.email_3 && (
                              <p className="font-medium flex items-center gap-1 text-sm">
                                <Mail className="w-3 h-3 text-muted-foreground" />
                                {contact.email_3}
                                <button onClick={() => copyToClipboard(contact.email_3)}><Copy className="w-3 h-3 text-muted-foreground hover:text-foreground" /></button>
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">-</p>
                        )}
                      </div>
                      
                      {/* Phone Numbers Section - ALL types */}
                      <div className="col-span-2 space-y-2">
                        <Label className="text-xs text-muted-foreground">Phone Numbers</Label>
                        {(contact.phone || contact.mobile_phone || contact.home_phone || contact.business_phone || contact.pager || contact.home_fax || contact.business_fax) ? (
                          <div className="space-y-1">
                            {contact.mobile_phone && (
                              <p className="font-medium flex items-center gap-1 text-sm">
                                <Smartphone className="w-3 h-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground w-20">Mobile:</span>
                                {contact.mobile_phone}
                                <button onClick={() => copyToClipboard(contact.mobile_phone)}><Copy className="w-3 h-3 text-muted-foreground hover:text-foreground" /></button>
                              </p>
                            )}
                            {contact.home_phone && (
                              <p className="font-medium flex items-center gap-1 text-sm">
                                <Home className="w-3 h-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground w-20">Home:</span>
                                {contact.home_phone}
                                <button onClick={() => copyToClipboard(contact.home_phone)}><Copy className="w-3 h-3 text-muted-foreground hover:text-foreground" /></button>
                              </p>
                            )}
                            {contact.business_phone && (
                              <p className="font-medium flex items-center gap-1 text-sm">
                                <Briefcase className="w-3 h-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground w-20">Work:</span>
                                {contact.business_phone}
                                <button onClick={() => copyToClipboard(contact.business_phone)}><Copy className="w-3 h-3 text-muted-foreground hover:text-foreground" /></button>
                              </p>
                            )}
                            {contact.pager && (
                              <p className="font-medium flex items-center gap-1 text-sm">
                                <Phone className="w-3 h-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground w-20">Pager:</span>
                                {contact.pager}
                                <button onClick={() => copyToClipboard(contact.pager)}><Copy className="w-3 h-3 text-muted-foreground hover:text-foreground" /></button>
                              </p>
                            )}
                            {contact.home_fax && (
                              <p className="font-medium flex items-center gap-1 text-sm">
                                <Phone className="w-3 h-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground w-20">Home Fax:</span>
                                {contact.home_fax}
                                <button onClick={() => copyToClipboard(contact.home_fax)}><Copy className="w-3 h-3 text-muted-foreground hover:text-foreground" /></button>
                              </p>
                            )}
                            {contact.business_fax && (
                              <p className="font-medium flex items-center gap-1 text-sm">
                                <Phone className="w-3 h-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground w-20">Work Fax:</span>
                                {contact.business_fax}
                                <button onClick={() => copyToClipboard(contact.business_fax)}><Copy className="w-3 h-3 text-muted-foreground hover:text-foreground" /></button>
                              </p>
                            )}
                            {contact.phone && !contact.mobile_phone && !contact.home_phone && !contact.business_phone && (
                              <p className="font-medium flex items-center gap-1 text-sm">
                                <Phone className="w-3 h-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground w-20">Phone:</span>
                                {contact.phone}
                                <button onClick={() => copyToClipboard(contact.phone)}><Copy className="w-3 h-3 text-muted-foreground hover:text-foreground" /></button>
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">-</p>
                        )}
                      </div>
                      
                      {/* Company/Organization */}
                      {(company || jobTitle || contact.department) && (
                        <>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Company/Organization</Label>
                            <p className="font-medium">{company || '-'}</p>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Job Title</Label>
                            <p className="font-medium">{jobTitle || '-'}</p>
                          </div>
                          {contact.department && (
                            <div className="col-span-2 space-y-1">
                              <Label className="text-xs text-muted-foreground">Department</Label>
                              <p className="font-medium">{contact.department}</p>
                            </div>
                          )}
                        </>
                      )}
                      
                      {/* Website */}
                      {(contact.web_page || contact.web_page_2) && (
                        <div className="col-span-2 space-y-1">
                          <Label className="text-xs text-muted-foreground">Website</Label>
                          {contact.web_page && (
                            <p className="font-medium text-sm">
                              <a href={contact.web_page} target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:text-amber-600 break-all">
                                {contact.web_page}
                              </a>
                            </p>
                          )}
                          {contact.web_page_2 && (
                            <p className="font-medium text-sm">
                              <a href={contact.web_page_2} target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:text-amber-600 break-all">
                                {contact.web_page_2}
                              </a>
                            </p>
                          )}
                        </div>
                      )}
                      
                      {/* Important Dates */}
                      {(contact.birthday || contact.anniversary) && (
                        <>
                          {contact.birthday && (
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Birthday</Label>
                              <p className="font-medium">{contact.birthday}</p>
                            </div>
                          )}
                          {contact.anniversary && (
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Anniversary</Label>
                              <p className="font-medium">{contact.anniversary}</p>
                            </div>
                          )}
                        </>
                      )}
                      
                      {/* Related Person */}
                      {contact.related_name && (
                        <div className="col-span-2 space-y-1">
                          <Label className="text-xs text-muted-foreground">Related Person</Label>
                          <p className="font-medium">{contact.related_name}</p>
                        </div>
                      )}
                      
                      {/* Categories */}
                      {contact.categories && (
                        <div className="col-span-2 space-y-1">
                          <Label className="text-xs text-muted-foreground">Categories</Label>
                          <p className="font-medium">{contact.categories}</p>
                        </div>
                      )}
                      
                      {contact.property_interest && (
                        <div className="col-span-2 space-y-1">
                          <Label className="text-xs text-muted-foreground">Property Interest</Label>
                          <p className="font-medium">{contact.property_interest}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-amber-500/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-amber-500" />Lead Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Status</p>
                        <Badge className={`${getStatusColor(contact.status)} mt-1`}>{contact.status?.toUpperCase()}</Badge>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Category</p>
                        <Badge className={`${getCategoryColor(contact.category)} mt-1`}>{contact.category?.toUpperCase() || '-'}</Badge>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Budget</p>
                        <p className="font-semibold">{contact.budget || '-'}</p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Lead Score</p>
                        <p className="font-semibold">{contact.lead_score || '-'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="border-pink-500/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="w-5 h-5 text-pink-500" />Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button 
                      onClick={() => setShowSendCardModal(true)}
                      className="w-full bg-pink-500 hover:bg-pink-600 text-white"
                      disabled={!contact.email && !contact.email_2 && !contact.email_3}
                    >
                      <Gift className="w-4 h-4 mr-2" />
                      Send Greeting Card
                    </Button>
                    {(!contact.email && !contact.email_2 && !contact.email_3) && (
                      <p className="text-xs text-muted-foreground text-center">No email address - cannot send cards</p>
                    )}
                    
                    {/* Important Dates Summary */}
                    {(contact.birthday || contact.anniversary || contact.home_purchase_anniversary) && (
                      <div className="pt-2 border-t mt-3">
                        <p className="text-xs text-muted-foreground mb-2">Important Dates:</p>
                        <div className="space-y-1 text-sm">
                          {contact.birthday && (
                            <div className="flex items-center gap-2">
                              <Cake className="w-3 h-3 text-pink-500" />
                              <span className="text-muted-foreground">Birthday:</span>
                              <span className="font-medium">{contact.birthday}</span>
                            </div>
                          )}
                          {contact.anniversary && (
                            <div className="flex items-center gap-2">
                              <Heart className="w-3 h-3 text-red-500" />
                              <span className="text-muted-foreground">Anniversary:</span>
                              <span className="font-medium">{contact.anniversary}</span>
                            </div>
                          )}
                          {contact.home_purchase_anniversary && (
                            <div className="flex items-center gap-2">
                              <Home className="w-3 h-3 text-amber-500" />
                              <span className="text-muted-foreground">Home Purchase:</span>
                              <span className="font-medium">{contact.home_purchase_anniversary}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-amber-500" />Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Created</p>
                        <p className="font-semibold">{formatDate(contact.created_at)}</p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Last Updated</p>
                        <p className="font-semibold">{formatDate(contact.updated_at)}</p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Source</p>
                        <p className="font-semibold capitalize">{contact.source || '-'}</p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Assigned To</p>
                        <p className="font-semibold">{contact.assigned_to || '-'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Address Section - only show if there's address data */}
                {(contact.home_street || contact.home_city || contact.business_address || contact.business_city) && (
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-amber-500" />Addresses
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(contact.home_street || contact.home_city) && (
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                              <Home className="w-3 h-3" />Home Address
                            </p>
                            <div className="text-sm space-y-0.5">
                              {contact.home_street && <p>{contact.home_street}</p>}
                              {(contact.home_city || contact.home_state || contact.home_postal_code) && (
                                <p>
                                  {[contact.home_city, contact.home_state, contact.home_postal_code].filter(Boolean).join(', ')}
                                </p>
                              )}
                              {contact.home_country && <p>{contact.home_country}</p>}
                            </div>
                          </div>
                        )}
                        {(contact.business_address || contact.business_city) && (
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                              <Building2 className="w-3 h-3" />Business Address
                            </p>
                            <div className="text-sm space-y-0.5">
                              {contact.business_address && <p>{contact.business_address}</p>}
                              {(contact.business_city || contact.business_state || contact.business_postal_code) && (
                                <p>
                                  {[contact.business_city, contact.business_state, contact.business_postal_code].filter(Boolean).join(', ')}
                                </p>
                              )}
                              {contact.business_country && <p>{contact.business_country}</p>}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {contact.notes && (
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <StickyNote className="w-5 h-5 text-amber-500" />Notes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* PROPERTIES TAB */}
            <TabsContent value="properties" className="mt-0">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-amber-500" />
                        {contact.category === 'seller' ? 'Properties Being Sold' : contact.category === 'buyer' ? 'Properties Bought/Interested' : 'Linked Properties'}
                      </CardTitle>
                      <CardDescription>
                        {contact.category === 'seller' 
                          ? 'Properties this seller is listing or has sold' 
                          : contact.category === 'buyer' 
                            ? 'Properties this buyer has purchased or is interested in'
                            : 'Properties linked to this contact'}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => setShowNewPropertyForm(true)} variant="outline" className="border-amber-500/50 text-amber-600 hover:bg-amber-500/10">
                        <Plus className="w-4 h-4 mr-2" />Add Property
                      </Button>
                      <Button onClick={() => { setShowAddProperty(true); searchAvailableProperties(''); }} className="bg-amber-500 hover:bg-amber-600 text-black">
                        <Link className="w-4 h-4 mr-2" />Link Existing
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingProperties ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                    </div>
                  ) : properties.length > 0 ? (
                    <div className="space-y-4">
                      {properties.map((prop) => (
                        <div key={prop.id} className="p-4 bg-muted/30 rounded-lg border border-muted hover:border-amber-500/30 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold">{prop.address}</h4>
                                <Badge className={prop.type === 'selling' ? 'bg-orange-500/20 text-orange-600' : 'bg-emerald-500/20 text-emerald-600'}>
                                  {prop.type === 'selling' ? 'Selling' : 'Buying'}
                                </Badge>
                                {prop.status && (
                                  <Badge variant="outline">{prop.status}</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {[prop.city, prop.state].filter(Boolean).join(', ')}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-sm">
                                {prop.price && (
                                  <span className="flex items-center gap-1">
                                    <DollarSign className="w-3 h-3" />
                                    {typeof prop.price === 'number' ? `$${prop.price.toLocaleString()}` : prop.price}
                                  </span>
                                )}
                                {prop.bedrooms && (
                                  <span>{prop.bedrooms} bed</span>
                                )}
                                {prop.bathrooms && (
                                  <span>{prop.bathrooms} bath</span>
                                )}
                                {prop.sqft && (
                                  <span>{prop.sqft.toLocaleString()} sqft</span>
                                )}
                              </div>
                              {prop.added_at && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  Linked {formatDate(prop.added_at)}
                                </p>
                              )}
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveProperty(prop.id)} className="text-muted-foreground hover:text-red-500">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="font-semibold mb-2">No Properties Linked</h3>
                      <p className="text-muted-foreground mb-4">
                        {contact.category === 'seller' 
                          ? 'Link properties that this seller is listing or has sold.' 
                          : contact.category === 'buyer' 
                            ? 'Link properties that this buyer has purchased or is interested in.'
                            : 'Link properties to track this contact\'s real estate activity.'}
                      </p>
                      <Button onClick={() => { setShowAddProperty(true); searchAvailableProperties(''); }} variant="outline">
                        <Plus className="w-4 h-4 mr-2" />Link First Property
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Add Property Dialog */}
              <Dialog open={showAddProperty} onOpenChange={setShowAddProperty}>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Link Property to Contact</DialogTitle>
                    <DialogDescription>Search for a property to link to this contact</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search by address, city, or owner..." 
                        value={propertySearch}
                        onChange={(e) => {
                          setPropertySearch(e.target.value);
                          searchAvailableProperties(e.target.value);
                        }}
                        className="pl-10"
                      />
                    </div>
                    <div className="max-h-[400px] overflow-y-auto space-y-2">
                      {availableProperties.length > 0 ? (
                        availableProperties.map((prop) => (
                          <div 
                            key={prop.id} 
                            className="p-3 border rounded-lg hover:border-amber-500 cursor-pointer transition-colors"
                            onClick={() => handleAddProperty(prop)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{prop.address}</p>
                                <p className="text-sm text-muted-foreground">
                                  {[prop.city, prop.state].filter(Boolean).join(', ')}
                                </p>
                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                  {prop.price && <span>${typeof prop.price === 'number' ? prop.price.toLocaleString() : prop.price}</span>}
                                  {prop.bedrooms && <span>{prop.bedrooms} bed</span>}
                                  {prop.bathrooms && <span>{prop.bathrooms} bath</span>}
                                </div>
                              </div>
                              {addingProperty ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Plus className="w-4 h-4 text-amber-500" />
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-muted-foreground py-8">
                          {propertySearch ? 'No properties found' : 'Search for a property to link'}
                        </p>
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Add New Property Dialog */}
              <Dialog open={showNewPropertyForm} onOpenChange={setShowNewPropertyForm}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Property for {contact.display_name || contact.first_name}</DialogTitle>
                    <DialogDescription>Create a new property listing for this {contact.category === 'seller' ? 'seller' : 'buyer'}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {/* Address */}
                    <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                      <h4 className="font-semibold text-sm text-amber-500">Property Address</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <Label>Street Address *</Label>
                          <Input 
                            value={newPropertyData.address} 
                            onChange={(e) => setNewPropertyData({...newPropertyData, address: e.target.value})}
                            placeholder="123 Main Street"
                          />
                        </div>
                        <div>
                          <Label>City</Label>
                          <Input 
                            value={newPropertyData.city} 
                            onChange={(e) => setNewPropertyData({...newPropertyData, city: e.target.value})}
                            placeholder="Tampa"
                          />
                        </div>
                        <div>
                          <Label>State</Label>
                          <Input 
                            value={newPropertyData.state} 
                            onChange={(e) => setNewPropertyData({...newPropertyData, state: e.target.value})}
                            placeholder="FL"
                          />
                        </div>
                        <div>
                          <Label>ZIP Code</Label>
                          <Input 
                            value={newPropertyData.zip_code} 
                            onChange={(e) => setNewPropertyData({...newPropertyData, zip_code: e.target.value})}
                            placeholder="33601"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Property Details */}
                    <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                      <h4 className="font-semibold text-sm text-amber-500">Property Details</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <Label>Price</Label>
                          <Input 
                            value={newPropertyData.price} 
                            onChange={(e) => setNewPropertyData({...newPropertyData, price: e.target.value})}
                            placeholder="$500,000"
                          />
                        </div>
                        <div>
                          <Label>Bedrooms</Label>
                          <Input 
                            type="number"
                            value={newPropertyData.bedrooms} 
                            onChange={(e) => setNewPropertyData({...newPropertyData, bedrooms: e.target.value})}
                            placeholder="3"
                          />
                        </div>
                        <div>
                          <Label>Bathrooms</Label>
                          <Input 
                            value={newPropertyData.bathrooms} 
                            onChange={(e) => setNewPropertyData({...newPropertyData, bathrooms: e.target.value})}
                            placeholder="2.5"
                          />
                        </div>
                        <div>
                          <Label>Sqft</Label>
                          <Input 
                            value={newPropertyData.sqft} 
                            onChange={(e) => setNewPropertyData({...newPropertyData, sqft: e.target.value})}
                            placeholder="2,500"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label>Property Type</Label>
                          <Select value={newPropertyData.property_type} onValueChange={(v) => setNewPropertyData({...newPropertyData, property_type: v})}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Single Family">Single Family</SelectItem>
                              <SelectItem value="Condo">Condo</SelectItem>
                              <SelectItem value="Townhouse">Townhouse</SelectItem>
                              <SelectItem value="Multi-Family">Multi-Family</SelectItem>
                              <SelectItem value="Land">Land</SelectItem>
                              <SelectItem value="Commercial">Commercial</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Purchase/Anniversary Dates (for buyers) */}
                    {contact.category === 'buyer' && (
                      <div className="space-y-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                        <h4 className="font-semibold text-sm text-emerald-600 flex items-center gap-2">
                          <Gift className="w-4 h-4" />Purchase Information
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Purchase Date</Label>
                            <Input 
                              type="date"
                              value={newPropertyData.purchase_date} 
                              onChange={(e) => setNewPropertyData({...newPropertyData, purchase_date: e.target.value})}
                            />
                          </div>
                          <div>
                            <Label>Anniversary Date</Label>
                            <Input 
                              type="date"
                              value={newPropertyData.anniversary_date} 
                              onChange={(e) => setNewPropertyData({...newPropertyData, anniversary_date: e.target.value})}
                            />
                            <p className="text-xs text-muted-foreground mt-1">For annual follow-ups</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowNewPropertyForm(false)}>Cancel</Button>
                    <Button onClick={handleCreateNewProperty} disabled={savingNewProperty} className="bg-amber-500 hover:bg-amber-600 text-black">
                      {savingNewProperty && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      Create Property
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>

            {/* ALL DATA TAB - Shows every single imported field */}
            <TabsContent value="alldata" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-amber-500" />All Imported Data
                  </CardTitle>
                  <CardDescription>Complete data from the imported contact file</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Name Fields */}
                    <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                      <h4 className="font-semibold text-sm text-amber-500 border-b border-amber-500/30 pb-2">Name Information</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Display Name:</span><span className="font-medium">{contact.display_name || '-'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">First Name:</span><span className="font-medium">{contact.first_name || '-'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Last Name:</span><span className="font-medium">{contact.last_name || '-'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Nickname:</span><span className="font-medium">{contact.nickname || '-'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Gender:</span><span className="font-medium">{contact.gender || '-'}</span></div>
                      </div>
                    </div>

                    {/* Email Fields */}
                    <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                      <h4 className="font-semibold text-sm text-amber-500 border-b border-amber-500/30 pb-2">Email Addresses</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Email 1:</span><span className="font-medium break-all">{contact.email || '-'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Email 2:</span><span className="font-medium break-all">{contact.email_2 || '-'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Email 3:</span><span className="font-medium break-all">{contact.email_3 || '-'}</span></div>
                      </div>
                    </div>

                    {/* Phone Fields */}
                    <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                      <h4 className="font-semibold text-sm text-amber-500 border-b border-amber-500/30 pb-2">Phone Numbers</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Mobile Phone:</span><span className="font-medium">{contact.mobile_phone || '-'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Home Phone:</span><span className="font-medium">{contact.home_phone || '-'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Business Phone:</span><span className="font-medium">{contact.business_phone || '-'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Home Fax:</span><span className="font-medium">{contact.home_fax || '-'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Business Fax:</span><span className="font-medium">{contact.business_fax || '-'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Pager:</span><span className="font-medium">{contact.pager || '-'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Country Code:</span><span className="font-medium">{contact.country_code || '-'}</span></div>
                      </div>
                    </div>

                    {/* Work/Organization Fields */}
                    <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                      <h4 className="font-semibold text-sm text-amber-500 border-b border-amber-500/30 pb-2">Work Information</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Organization:</span><span className="font-medium">{contact.organization || '-'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Job Title:</span><span className="font-medium">{contact.job_title || '-'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Department:</span><span className="font-medium">{contact.department || '-'}</span></div>
                      </div>
                    </div>

                    {/* Home Address Fields */}
                    <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                      <h4 className="font-semibold text-sm text-amber-500 border-b border-amber-500/30 pb-2">Home Address</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Street:</span><span className="font-medium">{contact.home_street || '-'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Address 2:</span><span className="font-medium">{contact.home_address_2 || '-'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">City:</span><span className="font-medium">{contact.home_city || '-'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">State:</span><span className="font-medium">{contact.home_state || '-'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Postal Code:</span><span className="font-medium">{contact.home_postal_code || '-'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Country:</span><span className="font-medium">{contact.home_country || '-'}</span></div>
                      </div>
                    </div>

                    {/* Business Address Fields */}
                    <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                      <h4 className="font-semibold text-sm text-amber-500 border-b border-amber-500/30 pb-2">Business Address</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Address:</span><span className="font-medium">{contact.business_address || '-'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Address 2:</span><span className="font-medium">{contact.business_address_2 || '-'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">City:</span><span className="font-medium">{contact.business_city || '-'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">State:</span><span className="font-medium">{contact.business_state || '-'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Postal Code:</span><span className="font-medium">{contact.business_postal_code || '-'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Country:</span><span className="font-medium">{contact.business_country || '-'}</span></div>
                      </div>
                    </div>

                    {/* Web & Online Fields */}
                    <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                      <h4 className="font-semibold text-sm text-amber-500 border-b border-amber-500/30 pb-2">Web & Online</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Web Page:</span><span className="font-medium break-all">{contact.web_page || '-'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Web Page 2:</span><span className="font-medium break-all">{contact.web_page_2 || '-'}</span></div>
                      </div>
                    </div>

                    {/* Personal Fields */}
                    <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                      <h4 className="font-semibold text-sm text-amber-500 border-b border-amber-500/30 pb-2">Personal Information</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Birthday:</span><span className="font-medium">{contact.birthday || '-'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Anniversary:</span><span className="font-medium">{contact.anniversary || '-'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Related Name:</span><span className="font-medium">{contact.related_name || '-'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Categories:</span><span className="font-medium">{contact.categories || '-'}</span></div>
                      </div>
                    </div>

                    {/* Notes Field */}
                    <div className="space-y-3 p-4 bg-muted/30 rounded-lg md:col-span-2 lg:col-span-3">
                      <h4 className="font-semibold text-sm text-amber-500 border-b border-amber-500/30 pb-2">Notes (Imported)</h4>
                      <div className="text-sm">
                        <p className="whitespace-pre-wrap">{contact.notes || '-'}</p>
                      </div>
                    </div>

                    {/* System Fields */}
                    <div className="space-y-3 p-4 bg-muted/30 rounded-lg md:col-span-2 lg:col-span-3">
                      <h4 className="font-semibold text-sm text-amber-500 border-b border-amber-500/30 pb-2">System Information</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div><span className="text-muted-foreground">ID:</span><span className="font-medium ml-2 break-all">{contact.id || '-'}</span></div>
                        <div><span className="text-muted-foreground">Source:</span><span className="font-medium ml-2">{contact.source || '-'}</span></div>
                        <div><span className="text-muted-foreground">Created:</span><span className="font-medium ml-2">{formatDate(contact.created_at)}</span></div>
                        <div><span className="text-muted-foreground">Updated:</span><span className="font-medium ml-2">{formatDate(contact.updated_at)}</span></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* EDIT TAB - Full inline editing of all fields */}
            <TabsContent value="edit" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Edit2 className="w-5 h-5 text-amber-500" />Edit Contact
                  </CardTitle>
                  <CardDescription>Update all contact information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Contact Type - Buyer/Seller Selection */}
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <Label className="text-sm font-semibold text-amber-600 mb-3 block">Contact Type</Label>
                    <div className="flex gap-4">
                      <Button 
                        type="button"
                        variant={editData.category === 'buyer' ? 'default' : 'outline'}
                        className={editData.category === 'buyer' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : ''}
                        onClick={() => setEditData({ ...editData, category: 'buyer' })}
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />Buyer
                      </Button>
                      <Button 
                        type="button"
                        variant={editData.category === 'seller' ? 'default' : 'outline'}
                        className={editData.category === 'seller' ? 'bg-orange-500 hover:bg-orange-600 text-white' : ''}
                        onClick={() => setEditData({ ...editData, category: 'seller' })}
                      >
                        <Home className="w-4 h-4 mr-2" />Seller
                      </Button>
                    </div>
                  </div>

                  {/* Status and Tags */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-semibold mb-2 block">Status</Label>
                      <div className="flex gap-2">
                        <Select value={editData.status || ''} onValueChange={(v) => setEditData({ ...editData, status: v })}>
                          <SelectTrigger className="flex-1"><SelectValue placeholder="Select status" /></SelectTrigger>
                          <SelectContent>
                            {statusOptions.map(s => (
                              <SelectItem key={s.value} value={s.value}>
                                <span className="flex items-center gap-2">
                                  {s.label}
                                  {s.custom && <span className="text-xs text-muted-foreground">(custom)</span>}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button type="button" onClick={() => setShowAddStatus(true)} variant="outline" size="icon" title="Add custom status">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      {/* Add Custom Status Inline */}
                      {showAddStatus && (
                        <div className="mt-2 p-3 bg-muted/50 rounded-lg border">
                          <Label className="text-xs text-muted-foreground mb-1 block">New Status Name</Label>
                          <div className="flex gap-2">
                            <Input 
                              value={newStatusName}
                              onChange={(e) => setNewStatusName(e.target.value)}
                              placeholder="e.g., On Hold, VIP"
                              className="flex-1"
                              onKeyDown={(e) => e.key === 'Enter' && handleAddCustomStatus()}
                            />
                            <Button type="button" size="sm" onClick={handleAddCustomStatus} className="bg-amber-500 hover:bg-amber-600 text-black">Add</Button>
                            <Button type="button" size="sm" variant="ghost" onClick={() => { setShowAddStatus(false); setNewStatusName(''); }}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <Label className="text-sm font-semibold mb-2 block">Tags</Label>
                      <div className="flex gap-2">
                        <Input 
                          value={newTag} 
                          onChange={(e) => setNewTag(e.target.value)} 
                          onKeyDown={handleTagKeyDown}
                          placeholder="Type tag and press Enter"
                          className="flex-1"
                        />
                        <Button type="button" onClick={addTag} variant="outline" size="icon">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Tags Display */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag, idx) => (
                        <span 
                          key={idx} 
                          className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/20 text-amber-600 rounded-full text-sm font-medium border border-amber-500/30 hover:bg-amber-500/30 transition-colors"
                        >
                          <Tag className="w-3 h-3" />
                          {tag}
                          <button 
                            type="button"
                            onClick={() => removeTag(tag)} 
                            className="ml-1 hover:text-red-500 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Name Information */}
                  <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                    <h4 className="font-semibold text-sm text-amber-500 border-b border-amber-500/30 pb-2">Name Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div><Label>Display Name</Label><Input value={editData.display_name || ''} onChange={(e) => setEditData({ ...editData, display_name: e.target.value })} /></div>
                      <div><Label>First Name</Label><Input value={editData.first_name || ''} onChange={(e) => setEditData({ ...editData, first_name: e.target.value })} /></div>
                      <div><Label>Last Name</Label><Input value={editData.last_name || ''} onChange={(e) => setEditData({ ...editData, last_name: e.target.value })} /></div>
                      <div><Label>Nickname</Label><Input value={editData.nickname || ''} onChange={(e) => setEditData({ ...editData, nickname: e.target.value })} /></div>
                      <div><Label>Gender</Label><Input value={editData.gender || ''} onChange={(e) => setEditData({ ...editData, gender: e.target.value })} /></div>
                    </div>
                  </div>

                  {/* Email Addresses */}
                  <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                    <h4 className="font-semibold text-sm text-amber-500 border-b border-amber-500/30 pb-2">Email Addresses</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div><Label>Email 1</Label><Input type="email" value={editData.email || ''} onChange={(e) => setEditData({ ...editData, email: e.target.value })} /></div>
                      <div><Label>Email 2</Label><Input type="email" value={editData.email_2 || ''} onChange={(e) => setEditData({ ...editData, email_2: e.target.value })} /></div>
                      <div><Label>Email 3</Label><Input type="email" value={editData.email_3 || ''} onChange={(e) => setEditData({ ...editData, email_3: e.target.value })} /></div>
                    </div>
                  </div>

                  {/* Phone Numbers */}
                  <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                    <h4 className="font-semibold text-sm text-amber-500 border-b border-amber-500/30 pb-2">Phone Numbers</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div><Label>Mobile Phone</Label><Input value={editData.mobile_phone || ''} onChange={(e) => setEditData({ ...editData, mobile_phone: e.target.value })} /></div>
                      <div><Label>Home Phone</Label><Input value={editData.home_phone || ''} onChange={(e) => setEditData({ ...editData, home_phone: e.target.value })} /></div>
                      <div><Label>Business Phone</Label><Input value={editData.business_phone || ''} onChange={(e) => setEditData({ ...editData, business_phone: e.target.value })} /></div>
                      <div><Label>Home Fax</Label><Input value={editData.home_fax || ''} onChange={(e) => setEditData({ ...editData, home_fax: e.target.value })} /></div>
                      <div><Label>Business Fax</Label><Input value={editData.business_fax || ''} onChange={(e) => setEditData({ ...editData, business_fax: e.target.value })} /></div>
                      <div><Label>Pager</Label><Input value={editData.pager || ''} onChange={(e) => setEditData({ ...editData, pager: e.target.value })} /></div>
                    </div>
                  </div>

                  {/* Work Information */}
                  <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                    <h4 className="font-semibold text-sm text-amber-500 border-b border-amber-500/30 pb-2">Work Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div><Label>Organization</Label><Input value={editData.organization || ''} onChange={(e) => setEditData({ ...editData, organization: e.target.value })} /></div>
                      <div><Label>Job Title</Label><Input value={editData.job_title || ''} onChange={(e) => setEditData({ ...editData, job_title: e.target.value })} /></div>
                      <div><Label>Department</Label><Input value={editData.department || ''} onChange={(e) => setEditData({ ...editData, department: e.target.value })} /></div>
                    </div>
                  </div>

                  {/* Home Address */}
                  <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                    <h4 className="font-semibold text-sm text-amber-500 border-b border-amber-500/30 pb-2">Home Address</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="md:col-span-2"><Label>Street</Label><Input value={editData.home_street || ''} onChange={(e) => setEditData({ ...editData, home_street: e.target.value })} /></div>
                      <div><Label>Address 2</Label><Input value={editData.home_address_2 || ''} onChange={(e) => setEditData({ ...editData, home_address_2: e.target.value })} /></div>
                      <div><Label>City</Label><Input value={editData.home_city || ''} onChange={(e) => setEditData({ ...editData, home_city: e.target.value })} /></div>
                      <div><Label>State</Label><Input value={editData.home_state || ''} onChange={(e) => setEditData({ ...editData, home_state: e.target.value })} /></div>
                      <div><Label>Postal Code</Label><Input value={editData.home_postal_code || ''} onChange={(e) => setEditData({ ...editData, home_postal_code: e.target.value })} /></div>
                      <div><Label>Country</Label><Input value={editData.home_country || ''} onChange={(e) => setEditData({ ...editData, home_country: e.target.value })} /></div>
                    </div>
                  </div>

                  {/* Business Address */}
                  <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                    <h4 className="font-semibold text-sm text-amber-500 border-b border-amber-500/30 pb-2">Business Address</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="md:col-span-2"><Label>Address</Label><Input value={editData.business_address || ''} onChange={(e) => setEditData({ ...editData, business_address: e.target.value })} /></div>
                      <div><Label>Address 2</Label><Input value={editData.business_address_2 || ''} onChange={(e) => setEditData({ ...editData, business_address_2: e.target.value })} /></div>
                      <div><Label>City</Label><Input value={editData.business_city || ''} onChange={(e) => setEditData({ ...editData, business_city: e.target.value })} /></div>
                      <div><Label>State</Label><Input value={editData.business_state || ''} onChange={(e) => setEditData({ ...editData, business_state: e.target.value })} /></div>
                      <div><Label>Postal Code</Label><Input value={editData.business_postal_code || ''} onChange={(e) => setEditData({ ...editData, business_postal_code: e.target.value })} /></div>
                      <div><Label>Country</Label><Input value={editData.business_country || ''} onChange={(e) => setEditData({ ...editData, business_country: e.target.value })} /></div>
                    </div>
                  </div>

                  {/* Web & Online */}
                  <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                    <h4 className="font-semibold text-sm text-amber-500 border-b border-amber-500/30 pb-2">Web & Online</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><Label>Web Page</Label><Input value={editData.web_page || ''} onChange={(e) => setEditData({ ...editData, web_page: e.target.value })} /></div>
                      <div><Label>Web Page 2</Label><Input value={editData.web_page_2 || ''} onChange={(e) => setEditData({ ...editData, web_page_2: e.target.value })} /></div>
                    </div>
                  </div>

                  {/* Personal Information */}
                  <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                    <h4 className="font-semibold text-sm text-amber-500 border-b border-amber-500/30 pb-2">Personal Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div><Label>Birthday</Label><Input type="date" value={editData.birthday || ''} onChange={(e) => setEditData({ ...editData, birthday: e.target.value })} /></div>
                      <div><Label>Anniversary</Label><Input type="date" value={editData.anniversary || ''} onChange={(e) => setEditData({ ...editData, anniversary: e.target.value })} /></div>
                      <div><Label>Home Purchase Anniversary</Label><Input type="date" value={editData.home_purchase_anniversary || ''} onChange={(e) => setEditData({ ...editData, home_purchase_anniversary: e.target.value })} /></div>
                      <div><Label>Related Name</Label><Input value={editData.related_name || ''} onChange={(e) => setEditData({ ...editData, related_name: e.target.value })} /></div>
                    </div>
                  </div>

                  {/* Real Estate Specific */}
                  <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                    <h4 className="font-semibold text-sm text-amber-500 border-b border-amber-500/30 pb-2">Real Estate Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><Label>Budget</Label><Input value={editData.budget || ''} onChange={(e) => setEditData({ ...editData, budget: e.target.value })} placeholder="$300K-$500K" /></div>
                      <div><Label>Property Interest</Label><Input value={editData.property_interest || ''} onChange={(e) => setEditData({ ...editData, property_interest: e.target.value })} placeholder="3BR/2BA in Tampa" /></div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                    <h4 className="font-semibold text-sm text-amber-500 border-b border-amber-500/30 pb-2">Notes</h4>
                    <Textarea 
                      rows={4} 
                      value={editData.notes || ''} 
                      onChange={(e) => setEditData({ ...editData, notes: e.target.value })} 
                      placeholder="Add notes about this contact..."
                    />
                  </div>

                  {/* Save/Cancel Buttons */}
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={() => { setEditData(contact); setActiveTab('overview'); }}>
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-black">
                      {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <StickyNote className="w-5 h-5 text-amber-500" />Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Imported Notes from iPhone */}
                  {contact.notes && (
                    <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                      <p className="text-xs text-amber-600 font-medium mb-2 flex items-center gap-1">
                        <Apple className="w-3 h-3" />
                        Imported Notes
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
                    </div>
                  )}
                  
                  {/* Add New Note */}
                  <div className="flex gap-2 mb-4">
                    <Textarea placeholder="Add a note..." value={newNote} onChange={(e) => setNewNote(e.target.value)} rows={2} className="flex-1" />
                    <Button onClick={handleAddNote} disabled={!newNote.trim() || addingNote} className="bg-amber-500 hover:bg-amber-600 text-black">
                      {addingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                  
                  {/* CRM Notes List */}
                  <div className="space-y-3">
                    {contact.notes_list?.length > 0 ? (
                      [...contact.notes_list].reverse().map((note, idx) => (
                        <div key={note.id || idx} className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-sm">{note.content}</p>
                          <p className="text-xs text-muted-foreground mt-2">{note.created_by} • {formatDate(note.created_at)}</p>
                        </div>
                      ))
                    ) : (
                      !contact.notes && <p className="text-center text-muted-foreground py-8">No notes yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-amber-500" />Activity History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">Contact Created</p>
                        <p className="text-sm text-muted-foreground">{formatDate(contact.created_at)}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
      
      {/* Send Card Modal */}
      <Dialog open={showSendCardModal} onOpenChange={setShowSendCardModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-pink-500" />
              Send Greeting Card
            </DialogTitle>
            <DialogDescription>
              Send a Jacquie Lawson animated card to {displayName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Occasion</Label>
              <Select value={cardData.occasion} onValueChange={(v) => setCardData({...cardData, occasion: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="birthday">Birthday</SelectItem>
                  <SelectItem value="anniversary">Anniversary</SelectItem>
                  <SelectItem value="home_anniversary">Home Purchase Anniversary</SelectItem>
                  <SelectItem value="holiday">Holiday</SelectItem>
                  <SelectItem value="thank_you">Thank You</SelectItem>
                  <SelectItem value="congratulations">Congratulations</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Card URL</Label>
              <Input
                value={cardData.card_url}
                onChange={(e) => setCardData({...cardData, card_url: e.target.value})}
                placeholder="https://www.jacquielawson.com/card/..."
              />
              <p className="text-xs text-muted-foreground">
                Browse cards at{' '}
                <a href="https://www.jacquielawson.com/cards" target="_blank" rel="noopener noreferrer" className="text-pink-500 hover:underline">
                  jacquielawson.com/cards
                </a>
                {' '}and paste the URL here
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Personal Message (optional)</Label>
              <Textarea
                value={cardData.message}
                onChange={(e) => setCardData({...cardData, message: e.target.value})}
                placeholder="Add a personal message to your card..."
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Schedule (optional)</Label>
              <Input
                type="date"
                value={cardData.schedule_date}
                onChange={(e) => setCardData({...cardData, schedule_date: e.target.value})}
              />
              <p className="text-xs text-muted-foreground">Leave empty to send immediately</p>
            </div>
            
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm">
                <strong>Sending to:</strong> {contact?.email || contact?.email_2 || contact?.email_3 || 'No email'}
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendCardModal(false)}>Cancel</Button>
            <Button 
              onClick={handleSendCard} 
              disabled={sendingCard || !cardData.card_url}
              className="bg-pink-500 hover:bg-pink-600 text-white"
            >
              {sendingCard ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              {cardData.schedule_date ? 'Schedule Card' : 'Send Now'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Main Contacts List Page
export const ContactsPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [contacts, setContacts] = useState([]);
  const [stats, setStats] = useState({ total: 0, buyers: 0, sellers: 0, new: 0, qualified: 0, by_letter: {} });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [selectedContact, setSelectedContact] = useState(id || null);
  const [selectedLetter, setSelectedLetter] = useState(null);
  const [nameFilter, setNameFilter] = useState('last');
  
  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '', email: '', phone: '', company: '', category: '', status: 'new', budget: '', property_interest: '', notes: ''
  });
  
  // Import modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);
  
  // Export
  const [exporting, setExporting] = useState(false);
  
  // SMS modal
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [smsRecipient, setSmsRecipient] = useState(null);
  const [smsMessage, setSmsMessage] = useState('');
  const [sendingSMS, setSendingSMS] = useState(false);
  
  // Email modal (using EmailComposerModal component)
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState(null);
  
  // Pagination
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [letterCounts, setLetterCounts] = useState({});
  const LIMIT = 100;

  useEffect(() => {
    fetchStats();
    fetchContacts();
  }, []);
  
  useEffect(() => {
    fetchContacts();
  }, [selectedLetter, page]);

  // Live search - debounced to avoid too many API calls
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPage(0);
      fetchContacts();
    }, 300); // 300ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    // If URL has id, show that contact. If no id, show list view.
    setSelectedContact(id || null);
  }, [id]);

  const fetchStats = async () => {
    try {
      const res = await contactsAPI.getStats();
      setStats(res.data);
      setLetterCounts(res.data.by_letter || {});
    } catch (error) {
      console.error('Failed to load stats');
    }
  };

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const params = {
        skip: page * LIMIT,
        limit: LIMIT,
      };
      if (selectedLetter) {
        params.letter = selectedLetter;
      }
      if (searchQuery) {
        params.search = searchQuery;
      }
      
      const res = await contactsAPI.list(params);
      const data = res.data || [];
      
      if (page === 0) {
        setContacts(data);
      } else {
        setContacts(prev => [...prev, ...data]);
      }
      
      setHasMore(data.length === LIMIT);
    } catch (error) {
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSearch = () => {
    setPage(0);
    fetchContacts();
  };
  
  const handleLetterClick = (letter) => {
    setSelectedLetter(letter === selectedLetter ? '' : letter);
    setPage(0);
  };
  
  const loadMore = () => {
    setPage(prev => prev + 1);
  };

  const handleAddContact = async () => {
    if (!newContact.name) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      await contactsAPI.create(newContact);
      toast.success('Contact added');
      setShowAddModal(false);
      setNewContact({ name: '', email: '', phone: '', company: '', category: '', status: 'new', budget: '', property_interest: '', notes: '' });
      setPage(0);
      fetchStats();
      fetchStats();
      fetchContacts();
    } catch (error) {
      toast.error('Failed to add contact');
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      
      const res = await contactsAPI.importVCard(formData);
      setImportResult(res.data);
      
      if (res.data.imported > 0) {
        toast.success(`Imported ${res.data.imported} contacts`);
        setPage(0);
        fetchStats();
        fetchContacts();
      }
    } catch (error) {
      toast.error('Import failed');
      setImportResult({ imported: 0, skipped: 0, errors: [error.message] });
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await api.get('/contacts/export', { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contacts_export_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Contacts exported successfully!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to export contacts');
    } finally {
      setExporting(false);
    }
  };

  const handleSendSMS = async () => {
    if (!smsRecipient || !smsMessage.trim()) return;
    
    setSendingSMS(true);
    try {
      await contactsAPI.sendSMS({
        phone: smsRecipient.phone,
        message: smsMessage,
        contact_id: smsRecipient.id,
        contact_type: 'contact'
      });
      toast.success(`SMS sent to ${smsRecipient.name}`);
      setShowSMSModal(false);
      setSmsMessage('');
      setSmsRecipient(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send SMS');
    } finally {
      setSendingSMS(false);
    }
  };

  const openSMSModal = (contact, e) => {
    e.stopPropagation();
    setSmsRecipient(contact);
    setShowSMSModal(true);
  };

  const openEmailModal = (contact, e) => {
    e.stopPropagation();
    setEmailRecipient(contact);
    setShowEmailModal(true);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this contact?')) return;
    try {
      await contactsAPI.delete(id);
      toast.success('Contact deleted');
      setPage(0);
      fetchStats();
      fetchContacts();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const handleSelectContact = (contactId) => {
    setSelectedContact(contactId);
    navigate(`/contacts/${contactId}`);
  };

  const handleBack = () => {
    setSelectedContact(null);
    navigate('/contacts');
  };

  const getStatusColor = (status) => getStatusOptions().find(s => s.value === status)?.color || 'bg-gray-500/20 text-gray-600';
  const getCategoryColor = (cat) => CATEGORY_OPTIONS.find(c => c.value === cat)?.color || 'bg-gray-500/20 text-gray-600';

  const getFirstName = (name) => {
    if (!name) return '';
    return name.split(' ')[0] || '';
  };

  const getLastName = (name) => {
    if (!name) return '';
    const parts = name.split(' ');
    return parts.length > 1 ? parts[parts.length - 1] : parts[0];
  };

  // Use contacts directly - filtering is done server-side
  const filteredContacts = contacts;

  // Show detail view if contact is selected
  if (selectedContact) {
    return <ContactDetail contactId={selectedContact} onBack={handleBack} />;
  }

  return (
    <div className="space-y-6" data-testid="contacts-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif text-foreground mb-2">Contacts</h1>
          <p className="text-muted-foreground">Manage your buyers and sellers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImportModal(true)} data-testid="import-contacts-btn">
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button onClick={() => setShowAddModal(true)} className="bg-amber-500 hover:bg-amber-600 text-black" data-testid="add-contact-btn">
            <Plus className="w-4 h-4 mr-2" />Add Contact
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold">{stats.total}</p></div><Users className="w-8 h-8 text-amber-500" /></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Buyers</p><p className="text-2xl font-bold text-emerald-600">{stats.buyers}</p></div><ShoppingCart className="w-8 h-8 text-emerald-500" /></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Sellers</p><p className="text-2xl font-bold text-orange-600">{stats.sellers}</p></div><Home className="w-8 h-8 text-orange-500" /></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">New</p><p className="text-2xl font-bold text-blue-600">{stats.new}</p></div><Clock className="w-8 h-8 text-blue-500" /></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Qualified</p><p className="text-2xl font-bold text-green-600">{stats.qualified}</p></div><CheckCircle className="w-8 h-8 text-green-500" /></div></CardContent></Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by name, email, or company..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="buyer">Buyers</SelectItem>
                <SelectItem value="seller">Sellers</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {getStatusOptions().map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchContacts}><RefreshCw className="w-4 h-4" /></Button>
          </div>
          
          {/* Alphabet Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={nameFilter} onValueChange={setNameFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last">Last Name</SelectItem>
                <SelectItem value="first">First Name</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-1 flex-wrap">
              <Button
                variant={selectedLetter === null ? "default" : "ghost"}
                size="sm"
                className={`h-8 px-2 ${selectedLetter === null ? 'bg-amber-500 hover:bg-amber-600 text-black' : ''}`}
                onClick={() => handleLetterClick(null)}
              >
                All ({stats.total || 0})
              </Button>
              {ALPHABET.map(letter => {
                const count = letterCounts[letter] || 0;
                return (
                  <Button
                    key={letter}
                    variant={selectedLetter === letter ? "default" : "ghost"}
                    size="sm"
                    className={`w-8 h-8 p-0 ${selectedLetter === letter ? 'bg-amber-500 hover:bg-amber-600 text-black' : ''} ${count === 0 ? 'opacity-40' : ''}`}
                    onClick={() => handleLetterClick(letter)}
                    disabled={count === 0}
                    title={`${count} contacts`}
                  >
                    {letter}
                  </Button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contacts List */}
      <Card>
        <CardHeader>
          <CardTitle>Contacts ({stats.total || contacts.length})</CardTitle>
          <CardDescription>Click on a contact to view details</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No contacts found</p>
              <Button onClick={() => setShowAddModal(true)} className="mt-4 bg-amber-500 hover:bg-amber-600 text-black"><Plus className="w-4 h-4 mr-2" />Add Contact</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredContacts.map(contact => {
                // Build display name from available fields
                const displayName = contact.display_name || 
                  contact.name || 
                  `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 
                  contact.organization ||
                  'Unknown';
                
                // Get best email
                const email = contact.email || contact.email_2 || contact.email_3;
                
                // Get best phone
                const phone = contact.phone || contact.mobile_phone || contact.home_phone || contact.business_phone;
                
                // Get company/organization
                const company = contact.company || contact.organization;
                
                return (
                  <div key={contact.id} onClick={() => handleSelectContact(contact.id)} className="p-4 rounded-lg border bg-card hover:shadow-md hover:border-amber-500/50 transition-all cursor-pointer">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                          <User className="w-6 h-6 text-amber-500" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{displayName}</h3>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                            {email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{email}</span>}
                            {phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{phone}</span>}
                          </div>
                          {company && <p className="text-sm text-muted-foreground mt-1"><Building2 className="w-3 h-3 inline mr-1" />{company}</p>}
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="flex flex-col items-end gap-2">
                          <Badge className={getStatusColor(contact.status)}>{contact.status?.toUpperCase() || 'ACTIVE'}</Badge>
                        {contact.category && <Badge className={getCategoryColor(contact.category)}>{contact.category?.toUpperCase()}</Badge>}
                      </div>
                      <div className="flex gap-1">
                        {email && (
                          <Button variant="ghost" size="icon" onClick={(e) => openEmailModal({...contact, email}, e)} className="text-blue-500 hover:text-blue-600" title="Send Email">
                            <Mail className="w-4 h-4" />
                          </Button>
                        )}
                        {phone && (
                          <Button variant="ghost" size="icon" onClick={(e) => openSMSModal({...contact, phone}, e)} className="text-green-500 hover:text-green-600" title="Send SMS">
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleSelectContact(contact.id); }} className="text-muted-foreground hover:text-foreground"><Eye className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={(e) => handleDelete(contact.id, e)} className="text-red-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  </div>
                </div>
                );
              })}
              
              {/* Load More Button */}
              {hasMore && !loading && (
                <div className="flex justify-center pt-4">
                  <Button 
                    variant="outline" 
                    onClick={loadMore}
                    className="w-full max-w-xs"
                  >
                    Load More Contacts
                  </Button>
                </div>
              )}
              
              {loading && page > 0 && (
                <div className="flex justify-center pt-4">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Contact Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-amber-500" />Add Contact</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Name *</Label><Input value={newContact.name} onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} placeholder="Full name" /></div>
              <div><Label>Email</Label><Input type="email" value={newContact.email} onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} placeholder="email@example.com" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Phone</Label><Input value={newContact.phone} onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} placeholder="(555) 123-4567" /></div>
              <div><Label>Company</Label><Input value={newContact.company} onChange={(e) => setNewContact({ ...newContact, company: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select value={newContact.category} onValueChange={(v) => setNewContact({ ...newContact, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent><SelectItem value="buyer">Buyer</SelectItem><SelectItem value="seller">Seller</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={newContact.status} onValueChange={(v) => setNewContact({ ...newContact, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{getStatusOptions().map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Budget</Label><Input value={newContact.budget} onChange={(e) => setNewContact({ ...newContact, budget: e.target.value })} placeholder="$300K-$500K" /></div>
              <div><Label>Property Interest</Label><Input value={newContact.property_interest} onChange={(e) => setNewContact({ ...newContact, property_interest: e.target.value })} /></div>
            </div>
            <div><Label>Notes</Label><Textarea rows={3} value={newContact.notes} onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleAddContact} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-black">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}Add Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Contacts Modal */}
      <Dialog open={showImportModal} onOpenChange={(open) => { setShowImportModal(open); if (!open) { setImportFile(null); setImportResult(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-amber-500" />
              Import Contacts
            </DialogTitle>
            <DialogDescription>
              Import contacts from vCard files (.vcf) exported from iPhone, Android, or other devices
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Supported Formats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <Smartphone className="w-6 h-6 mx-auto mb-1 text-green-500" />
                <p className="text-xs font-medium">Android</p>
                <p className="text-xs text-muted-foreground">.vcf</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <Apple className="w-6 h-6 mx-auto mb-1 text-gray-500" />
                <p className="text-xs font-medium">iPhone</p>
                <p className="text-xs text-muted-foreground">.vcf</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <FileSpreadsheet className="w-6 h-6 mx-auto mb-1 text-blue-500" />
                <p className="text-xs font-medium">Outlook</p>
                <p className="text-xs text-muted-foreground">.vcf</p>
              </div>
            </div>

            {/* File Upload */}
            <div>
              <Label>Select File</Label>
              <div className="mt-2">
                <input
                  type="file"
                  accept=".vcf,.vcard"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-muted-foreground
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-medium
                    file:bg-amber-500/10 file:text-amber-600
                    hover:file:bg-amber-500/20
                    cursor-pointer"
                  data-testid="import-file-input"
                />
              </div>
              {importFile && (
                <p className="text-sm text-green-600 mt-2">
                  ✓ Selected: {importFile.name}
                </p>
              )}
            </div>

            {/* Import Result */}
            {importResult && (
              <div className={`p-4 rounded-lg ${importResult.imported > 0 ? 'bg-green-500/10 border border-green-500/30' : 'bg-yellow-500/10 border border-yellow-500/30'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {importResult.imported > 0 ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                  )}
                  <span className="font-medium">Import Complete</span>
                </div>
                <p className="text-sm">
                  <span className="text-green-600">{importResult.imported} imported</span>
                  {importResult.skipped > 0 && (
                    <span className="text-yellow-600 ml-2">{importResult.skipped} skipped</span>
                  )}
                </p>
                {importResult.errors?.length > 0 && (
                  <p className="text-xs text-red-500 mt-1">
                    Errors: {importResult.errors.join(', ')}
                  </p>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowImportModal(false)}>Cancel</Button>
            <Button 
              onClick={handleImport} 
              disabled={!importFile || importing}
              className="bg-amber-500 hover:bg-amber-600 text-black"
              data-testid="import-submit-btn"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SMS Modal */}
      <Dialog open={showSMSModal} onOpenChange={(open) => { setShowSMSModal(open); if (!open) { setSmsMessage(''); setSmsRecipient(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-green-500" />
              Send SMS
            </DialogTitle>
            <DialogDescription>
              Send a text message to {smsRecipient?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm font-medium">{smsRecipient?.name}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {smsRecipient?.phone}
              </p>
            </div>
            
            <div>
              <Label>Message</Label>
              <Textarea
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                placeholder="Type your message..."
                rows={4}
                maxLength={160}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {smsMessage.length}/160 characters
              </p>
            </div>
          </div>
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowSMSModal(false)}>Cancel</Button>
            <Button 
              onClick={handleSendSMS} 
              disabled={!smsMessage.trim() || sendingSMS}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              {sendingSMS ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send SMS
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Modal - WYSIWYG with SMTP */}
      <EmailComposerModal
        isOpen={showEmailModal}
        onClose={() => { setShowEmailModal(false); setEmailRecipient(null); }}
        recipientEmail={emailRecipient?.email}
        recipientName={emailRecipient?.name}
      />
    </div>
  );
};

export default ContactsPage;
