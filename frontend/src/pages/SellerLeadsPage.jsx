import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { 
  Users, 
  Plus, 
  Search, 
  Filter,
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
  MessageSquare,
  Send,
  Mail as MailIcon
} from 'lucide-react';
import { toast } from 'sonner';
import api, { contactsAPI } from '../lib/api';

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

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const SellerLeadsPage = () => {
  const navigate = useNavigate();
  
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [selectedLetter, setSelectedLetter] = useState(null);
  const [nameFilter, setNameFilter] = useState('last'); // 'first' or 'last'
  
  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newLead, setNewLead] = useState({
    name: '',
    email: '',
    phone: '',
    property_address: '',
    property_city: '',
    property_state: '',
    property_zip: '',
    estimated_value: '',
    motivation: '',
    timeline: '',
    status: 'new',
    priority: 'medium'
  });
  
  // SMS modal
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [smsRecipient, setSmsRecipient] = useState(null);
  const [smsMessage, setSmsMessage] = useState('');
  const [sendingSMS, setSendingSMS] = useState(false);
  
  // Email modal
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [userSignature, setUserSignature] = useState(null);

  useEffect(() => {
    fetchLeads();
    fetchStats();
    fetchSignature();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await api.get('/seller-leads');
      setLeads(res.data);
    } catch (error) {
      toast.error('Failed to load seller leads');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/seller-leads/stats');
      setStats(res.data);
    } catch (error) {
      console.error('Failed to load stats');
    }
  };

  const fetchSignature = async () => {
    try {
      const res = await api.get('/users/me/signature');
      setUserSignature(res.data);
    } catch (error) {
      // No signature set
    }
  };

  const handleAddLead = async () => {
    if (!newLead.name) {
      toast.error('Name is required');
      return;
    }
    
    setSaving(true);
    try {
      const leadData = {
        ...newLead,
        estimated_value: newLead.estimated_value ? parseFloat(newLead.estimated_value) : null
      };
      await api.post('/seller-leads', leadData);
      toast.success('Seller lead added');
      setShowAddModal(false);
      setNewLead({
        name: '', email: '', phone: '', property_address: '', property_city: '',
        property_state: '', property_zip: '', estimated_value: '', motivation: '',
        timeline: '', status: 'new', priority: 'medium'
      });
      fetchLeads();
      fetchStats();
    } catch (error) {
      toast.error('Failed to add lead');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this seller lead?')) return;
    
    try {
      await api.delete(`/seller-leads/${id}`);
      toast.success('Lead deleted');
      fetchLeads();
      fetchStats();
    } catch (error) {
      toast.error('Failed to delete');
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
        contact_type: 'seller_lead'
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

  const openSMSModal = (lead, e) => {
    e.stopPropagation();
    setSmsRecipient(lead);
    setShowSMSModal(true);
  };

  const openEmailModal = (lead, e) => {
    e.stopPropagation();
    setEmailRecipient(lead);
    setEmailSubject('');
    setEmailBody('');
    setShowEmailModal(true);
  };

  const getSignatureText = () => {
    if (!userSignature) return '';
    const sig = userSignature;
    let text = '\n\n--\n';
    if (sig.name) text += sig.name + '\n';
    if (sig.title) text += sig.title + '\n';
    if (sig.company) text += sig.company + '\n';
    if (sig.phone) text += 'Phone: ' + sig.phone + '\n';
    if (sig.email) text += 'Email: ' + sig.email + '\n';
    if (sig.website) text += sig.website + '\n';
    return text;
  };

  const handleSendEmail = () => {
    if (!emailRecipient?.email) return;
    
    const signature = getSignatureText();
    const fullBody = emailBody + signature;
    
    const mailtoUrl = `mailto:${emailRecipient.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(fullBody)}`;
    window.open(mailtoUrl, '_blank');
    
    setShowEmailModal(false);
    setEmailSubject('');
    setEmailBody('');
    toast.success('Opening email client...');
  };

  const formatCurrency = (value) => {
    if (!value) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  const getStatusColor = (status) => {
    return STATUS_OPTIONS.find(s => s.value === status)?.color || 'bg-gray-500/20 text-gray-600';
  };

  const getPriorityColor = (priority) => {
    return PRIORITY_OPTIONS.find(p => p.value === priority)?.color || 'bg-gray-500/20 text-gray-600';
  };

  const getFirstName = (name) => {
    if (!name) return '';
    return name.split(' ')[0] || '';
  };

  const getLastName = (name) => {
    if (!name) return '';
    const parts = name.split(' ');
    return parts.length > 1 ? parts[parts.length - 1] : parts[0];
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = !searchQuery || 
      lead.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.property_address?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || lead.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || lead.priority === filterPriority;
    
    // Alphabet filter
    let matchesLetter = true;
    if (selectedLetter) {
      const nameToCheck = nameFilter === 'first' ? getFirstName(lead.name) : getLastName(lead.name);
      matchesLetter = nameToCheck.toUpperCase().startsWith(selectedLetter);
    }
    
    return matchesSearch && matchesStatus && matchesPriority && matchesLetter;
  });

  return (
    <div className="space-y-6" data-testid="seller-leads-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif text-foreground mb-2">Seller Leads</h1>
          <p className="text-muted-foreground">Manage potential property sellers</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddModal(true)} className="bg-amber-500 hover:bg-amber-600 text-black" data-testid="add-seller-lead-btn">
            <Plus className="w-4 h-4 mr-2" />
            Add Seller Lead
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Users className="w-8 h-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">New</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.new}</p>
                </div>
                <Clock className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Contacted</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.contacted}</p>
                </div>
                <Phone className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Qualified</p>
                  <p className="text-2xl font-bold text-green-600">{stats.qualified}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Converted</p>
                  <p className="text-2xl font-bold text-amber-600">{stats.converted}</p>
                </div>
                <UserCheck className="w-8 h-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <p className="text-2xl font-bold text-green-600">${((stats.total_value || 0) / 1000000).toFixed(1)}M</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or property address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUS_OPTIONS.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                {PRIORITY_OPTIONS.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => { fetchLeads(); fetchStats(); }}>
              <RefreshCw className="w-4 h-4" />
            </Button>
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
                className={`w-8 h-8 p-0 ${selectedLetter === null ? 'bg-amber-500 hover:bg-amber-600 text-black' : ''}`}
                onClick={() => setSelectedLetter(null)}
              >
                All
              </Button>
              {ALPHABET.map(letter => (
                <Button
                  key={letter}
                  variant={selectedLetter === letter ? "default" : "ghost"}
                  size="sm"
                  className={`w-8 h-8 p-0 ${selectedLetter === letter ? 'bg-amber-500 hover:bg-amber-600 text-black' : ''}`}
                  onClick={() => setSelectedLetter(letter)}
                >
                  {letter}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leads List */}
      <Card>
        <CardHeader>
          <CardTitle>Seller Leads ({filteredLeads.length})</CardTitle>
          <CardDescription>Click on a lead to view details</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No seller leads found</p>
              <p className="text-sm mt-1">Add a new seller lead to get started</p>
              <Button onClick={() => setShowAddModal(true)} className="mt-4 bg-amber-500 hover:bg-amber-600 text-black">
                <Plus className="w-4 h-4 mr-2" />
                Add Seller Lead
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLeads.map(lead => (
                <div
                  key={lead.id}
                  onClick={() => navigate(`/seller-leads/${lead.id}`)}
                  className="p-4 rounded-lg border bg-card hover:shadow-md hover:border-amber-500/50 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      {/* Contact Icon */}
                      <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-6 h-6 text-amber-500" />
                      </div>
                      
                      {/* Lead Info */}
                      <div>
                        <h3 className="font-semibold text-foreground">{lead.name}</h3>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          {lead.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {lead.email}
                            </span>
                          )}
                          {lead.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {lead.phone}
                            </span>
                          )}
                        </div>
                        {lead.property_address && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" />
                            {lead.property_address}{lead.property_city && `, ${lead.property_city}`}
                          </p>
                        )}
                        {lead.estimated_value && (
                          <p className="text-sm text-amber-600 font-semibold mt-1">
                            Est. Value: {formatCurrency(lead.estimated_value)}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Right Side */}
                    <div className="flex items-start gap-2">
                      <div className="flex flex-col items-end gap-2">
                        <Badge className={getStatusColor(lead.status)}>
                          {lead.status?.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <Badge className={getPriorityColor(lead.priority)}>
                          {lead.priority?.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        {lead.phone && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={(e) => openSMSModal(lead, e)}
                            className="text-green-500 hover:text-green-600"
                            title="Send SMS"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); navigate(`/seller-leads/${lead.id}`); }}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => handleDelete(lead.id, e)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Seller Lead Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500" />
              Add Seller Lead
            </DialogTitle>
            <DialogDescription>
              Add a new potential property seller to the CRM
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name *</Label>
                <Input
                  value={newLead.name}
                  onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                  placeholder="Full name"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newLead.email}
                  onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
            </div>
            
            <div>
              <Label>Phone</Label>
              <Input
                value={newLead.phone}
                onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>

            {/* Property Info */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Property Information</h4>
              <div className="grid gap-4">
                <div>
                  <Label>Property Address</Label>
                  <Input
                    value={newLead.property_address}
                    onChange={(e) => setNewLead({ ...newLead, property_address: e.target.value })}
                    placeholder="123 Main Street"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>City</Label>
                    <Input
                      value={newLead.property_city}
                      onChange={(e) => setNewLead({ ...newLead, property_city: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Input
                      value={newLead.property_state}
                      onChange={(e) => setNewLead({ ...newLead, property_state: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>ZIP</Label>
                    <Input
                      value={newLead.property_zip}
                      onChange={(e) => setNewLead({ ...newLead, property_zip: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Estimated Value ($)</Label>
                  <Input
                    type="number"
                    value={newLead.estimated_value}
                    onChange={(e) => setNewLead({ ...newLead, estimated_value: e.target.value })}
                    placeholder="500000"
                  />
                </div>
              </div>
            </div>

            {/* Qualification Info */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Qualification</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Motivation</Label>
                  <Select value={newLead.motivation} onValueChange={(v) => setNewLead({ ...newLead, motivation: v })}>
                    <SelectTrigger><SelectValue placeholder="Select motivation" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relocating">Relocating</SelectItem>
                      <SelectItem value="downsizing">Downsizing</SelectItem>
                      <SelectItem value="upgrading">Upgrading</SelectItem>
                      <SelectItem value="investment">Investment Sale</SelectItem>
                      <SelectItem value="divorce">Divorce</SelectItem>
                      <SelectItem value="inheritance">Inheritance</SelectItem>
                      <SelectItem value="financial">Financial Reasons</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Timeline</Label>
                  <Select value={newLead.timeline} onValueChange={(v) => setNewLead({ ...newLead, timeline: v })}>
                    <SelectTrigger><SelectValue placeholder="Select timeline" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediately">Immediately</SelectItem>
                      <SelectItem value="1-3_months">1-3 Months</SelectItem>
                      <SelectItem value="3-6_months">3-6 Months</SelectItem>
                      <SelectItem value="6-12_months">6-12 Months</SelectItem>
                      <SelectItem value="12+_months">12+ Months</SelectItem>
                      <SelectItem value="just_exploring">Just Exploring</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={newLead.status} onValueChange={(v) => setNewLead({ ...newLead, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={newLead.priority} onValueChange={(v) => setNewLead({ ...newLead, priority: v })}>
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
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleAddLead} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-black">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Add Seller Lead
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
    </div>
  );
};

export default SellerLeadsPage;
