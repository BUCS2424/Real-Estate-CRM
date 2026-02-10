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
  Smartphone,
  Apple,
  AlertCircle,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import api, { contactsAPI } from '../lib/api';
import EmailComposerModal from '../components/EmailComposerModal';

const STATUS_OPTIONS = [
  { value: 'new', label: 'New', color: 'bg-blue-500/20 text-blue-600 border-blue-500/50' },
  { value: 'contacted', label: 'Contacted', color: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/50' },
  { value: 'qualified', label: 'Qualified', color: 'bg-green-500/20 text-green-600 border-green-500/50' },
  { value: 'negotiation', label: 'Negotiation', color: 'bg-purple-500/20 text-purple-600 border-purple-500/50' },
  { value: 'closed', label: 'Closed', color: 'bg-gray-500/20 text-gray-600 border-gray-500/50' },
];

const CATEGORY_OPTIONS = [
  { value: 'buyer', label: 'Buyer', color: 'bg-emerald-500/20 text-emerald-600', icon: ShoppingCart },
  { value: 'seller', label: 'Seller', color: 'bg-orange-500/20 text-orange-600', icon: Home },
];

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// Contact Detail Component
const ContactDetail = ({ contactId, onBack }) => {
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    if (contactId) fetchContact();
  }, [contactId]);

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
      setEditMode(false);
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

  const getStatusColor = (status) => STATUS_OPTIONS.find(s => s.value === status)?.color || 'bg-gray-500/20 text-gray-600';
  const getCategoryColor = (cat) => CATEGORY_OPTIONS.find(c => c.value === cat)?.color || 'bg-gray-500/20 text-gray-600';

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
              <Button variant="outline" className="w-full" onClick={() => setEditMode(true)}>
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
                contact.tags.map((tag, idx) => <Badge key={idx} variant="outline">{tag}</Badge>)
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
            <TabsTrigger value="alldata" className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />All Data
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

      {/* Edit Modal */}
      <Dialog open={editMode} onOpenChange={setEditMode}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Name *</Label><Input value={editData.name || ''} onChange={(e) => setEditData({ ...editData, name: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={editData.email || ''} onChange={(e) => setEditData({ ...editData, email: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Phone</Label><Input value={editData.phone || ''} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} /></div>
              <div><Label>Company</Label><Input value={editData.company || ''} onChange={(e) => setEditData({ ...editData, company: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select value={editData.category || ''} onValueChange={(v) => setEditData({ ...editData, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buyer">Buyer</SelectItem>
                    <SelectItem value="seller">Seller</SelectItem>
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
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Budget</Label><Input value={editData.budget || ''} onChange={(e) => setEditData({ ...editData, budget: e.target.value })} placeholder="$300K-$500K" /></div>
              <div><Label>Property Interest</Label><Input value={editData.property_interest || ''} onChange={(e) => setEditData({ ...editData, property_interest: e.target.value })} /></div>
            </div>
            <div><Label>Notes</Label><Textarea rows={3} value={editData.notes || ''} onChange={(e) => setEditData({ ...editData, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-black">
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Save
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

  useEffect(() => {
    if (id) setSelectedContact(id);
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

  const getStatusColor = (status) => STATUS_OPTIONS.find(s => s.value === status)?.color || 'bg-gray-500/20 text-gray-600';
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
                {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
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
                  <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
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
