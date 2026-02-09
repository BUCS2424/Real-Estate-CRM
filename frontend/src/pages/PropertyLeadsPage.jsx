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
  Home, 
  Plus, 
  Upload, 
  Search, 
  Filter,
  MapPin,
  DollarSign,
  User,
  Loader2,
  FileSpreadsheet,
  Trash2,
  Eye,
  MoreVertical,
  Download,
  RefreshCw,
  Building2,
  CheckCircle,
  AlertCircle,
  Users,
  MessageSquare,
  Phone,
  Send
} from 'lucide-react';
import { toast } from 'sonner';
import { propertyLeadsAPI, listingsAPI, contactsAPI } from '../lib/api';

const PropertyLeadsPage = () => {
  const navigate = useNavigate();
  
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  
  // Import modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importDestination, setImportDestination] = useState('leads');
  
  // Add lead modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newLead, setNewLead] = useState({
    address: '',
    city: '',
    state: 'FL',
    zip_code: '',
    county: '',
    property_type: '',
    bedrooms: '',
    bathrooms: '',
    sqft: '',
    estimated_value: ''
  });
  
  // SMS modal
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [smsRecipient, setSmsRecipient] = useState(null);
  const [smsMessage, setSmsMessage] = useState('');
  const [sendingSMS, setSendingSMS] = useState(false);

  useEffect(() => {
    fetchLeads();
    fetchStats();
  }, [filterStatus, filterPriority]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterPriority !== 'all') params.priority = filterPriority;
      
      const res = await propertyLeadsAPI.getAll(params);
      setLeads(res.data.leads || []);
    } catch (error) {
      toast.error('Failed to load property leads');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await propertyLeadsAPI.getStats();
      setStats(res.data);
    } catch (error) {
      console.error('Failed to load stats');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.name.endsWith('.csv')) {
      setImportFile(file);
      setImportResult(null);
    } else {
      toast.error('Please select a CSV file');
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      
      let res;
      if (importDestination === 'leads') {
        res = await propertyLeadsAPI.importCSV(formData);
      } else {
        res = await listingsAPI.importCSV(formData);
      }
      
      setImportResult(res.data);
      
      if (res.data.imported > 0) {
        toast.success(`Imported ${res.data.imported} records to ${importDestination === 'leads' ? 'Property Leads' : 'Listings'}`);
        // Refresh leads if imported to leads
        if (importDestination === 'leads') {
          fetchLeads();
          fetchStats();
        }
      }
    } catch (error) {
      toast.error('Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleSendSMS = async () => {
    if (!smsRecipient || !smsMessage.trim()) return;
    
    setSendingSMS(true);
    try {
      await contactsAPI.sendSMS({
        phone: smsRecipient.owner_phone || smsRecipient.phone,
        message: smsMessage,
        contact_id: smsRecipient.id,
        contact_type: 'property_lead'
      });
      toast.success(`SMS sent to ${smsRecipient.owner_name || smsRecipient.address}`);
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

  const handleCreate = async () => {
    if (!newLead.address || !newLead.city) {
      toast.error('Address and City are required');
      return;
    }

    setCreating(true);
    try {
      const leadData = {
        ...newLead,
        bedrooms: newLead.bedrooms ? parseInt(newLead.bedrooms) : null,
        bathrooms: newLead.bathrooms ? parseFloat(newLead.bathrooms) : null,
        sqft: newLead.sqft ? parseInt(newLead.sqft) : null,
        estimated_value: newLead.estimated_value ? parseFloat(newLead.estimated_value) : null
      };
      await propertyLeadsAPI.create(leadData);
      toast.success('Property lead created');
      setShowAddModal(false);
      setNewLead({
        address: '', city: '', state: 'FL', zip_code: '', county: '',
        property_type: '', bedrooms: '', bathrooms: '', sqft: '', estimated_value: ''
      });
      fetchLeads();
      fetchStats();
    } catch (error) {
      toast.error('Failed to create lead');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (leadId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this property lead?')) return;
    
    try {
      await propertyLeadsAPI.delete(leadId);
      toast.success('Property lead deleted');
      fetchLeads();
      fetchStats();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const formatCurrency = (value) => {
    if (!value) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
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

  const filteredLeads = leads.filter(lead => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      lead.address?.toLowerCase().includes(query) ||
      lead.city?.toLowerCase().includes(query) ||
      lead.owner_name?.toLowerCase().includes(query) ||
      lead.parcel_id?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6" data-testid="property-leads-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif text-foreground mb-2">Property Leads</h1>
          <p className="text-muted-foreground">Manage property-centric leads imported from CSV</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImportModal(true)} data-testid="import-csv-btn">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
          <Button onClick={() => setShowAddModal(true)} className="bg-amber-500 hover:bg-amber-600 text-black" data-testid="add-property-btn">
            <Plus className="w-4 h-4 mr-2" />
            Add Property
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Building2 className="w-8 h-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">New</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.by_status?.new || 0}</p>
                </div>
                <Plus className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Qualified</p>
                  <p className="text-2xl font-bold text-green-600">{stats.by_status?.qualified || 0}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">With Owner</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.with_owner_info || 0}</p>
                </div>
                <User className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">With Value</p>
                  <p className="text-2xl font-bold text-amber-600">{stats.with_value_estimate || 0}</p>
                </div>
                <DollarSign className="w-8 h-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by address, city, owner, or parcel ID..."
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
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="nurturing">Nurturing</SelectItem>
                <SelectItem value="not_interested">Not Interested</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchLeads}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Leads List */}
      <Card>
        <CardHeader>
          <CardTitle>Property Leads ({filteredLeads.length})</CardTitle>
          <CardDescription>Click on a property to view details</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Home className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No property leads found</p>
              <p className="text-sm mt-1">Import a CSV or add a property manually</p>
              <Button onClick={() => setShowImportModal(true)} className="mt-4">
                <Upload className="w-4 h-4 mr-2" />
                Import CSV
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLeads.map(lead => (
                <div
                  key={lead.id}
                  onClick={() => navigate(`/property-leads/${lead.id}`)}
                  className="p-4 rounded-lg border bg-card hover:shadow-md hover:border-amber-500/50 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      {/* Property Icon */}
                      <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                        <Home className="w-6 h-6 text-amber-500" />
                      </div>
                      
                      {/* Property Info */}
                      <div>
                        <h3 className="font-semibold text-foreground">{lead.address}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {lead.city}, {lead.state} {lead.zip_code}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          {lead.estimated_value && (
                            <span className="flex items-center gap-1 text-amber-600">
                              <DollarSign className="w-3 h-3" />
                              {formatCurrency(lead.estimated_value)}
                            </span>
                          )}
                          {lead.owner_name && (
                            <span className="flex items-center gap-1 text-green-600">
                              <User className="w-3 h-3" />
                              {lead.owner_name}
                            </span>
                          )}
                          {lead.bedrooms && (
                            <span className="text-muted-foreground">
                              {lead.bedrooms} bed / {lead.bathrooms} bath
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Right Side */}
                    <div className="flex items-start gap-2">
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex gap-2">
                          <Badge className={getStatusColor(lead.status)}>
                            {lead.status?.replace('_', ' ')}
                          </Badge>
                          <Badge className={getPriorityColor(lead.priority)}>
                            {lead.priority}
                          </Badge>
                        </div>
                        {lead.source && (
                          <span className="text-xs text-muted-foreground">{lead.source}</span>
                        )}
                      </div>
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import CSV Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-amber-500" />
              Import CSV
            </DialogTitle>
            <DialogDescription>
              Import properties from a CSV file (MLS format supported)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Destination Selection */}
            <div>
              <Label>Import To</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant={importDestination === 'leads' ? 'default' : 'outline'}
                  className={`flex-1 ${importDestination === 'leads' ? 'bg-amber-500 hover:bg-amber-600 text-black' : ''}`}
                  onClick={() => setImportDestination('leads')}
                  data-testid="import-to-leads"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Property Leads
                </Button>
                <Button
                  type="button"
                  variant={importDestination === 'listings' ? 'default' : 'outline'}
                  className={`flex-1 ${importDestination === 'listings' ? 'bg-amber-500 hover:bg-amber-600 text-black' : ''}`}
                  onClick={() => setImportDestination('listings')}
                  data-testid="import-to-listings"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Listings
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {importDestination === 'leads' 
                  ? 'Import to CRM property leads for tracking' 
                  : 'Import to public showcase listings'}
              </p>
            </div>

            {/* File Upload */}
            <div>
              <Label>CSV File</Label>
              <div className="mt-2">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
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
            
            {/* Expected Format Info */}
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              <p className="font-medium mb-1">Expected CSV columns:</p>
              <p className="text-xs text-muted-foreground">
                MLS #, Status, Price, Address, City, Property Type, Beds, Baths, Square Footage, Lot Size
              </p>
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
                    <span className="text-yellow-600 ml-2">{importResult.skipped} skipped (duplicates)</span>
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
            <Button variant="outline" onClick={() => setShowImportModal(false)}>
              Cancel
            </Button>
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

      {/* Add Property Lead Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-500" />
              Add Property Lead
            </DialogTitle>
            <DialogDescription>
              Create a new property lead manually. You can also import from CSV.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2">
              <Label>Address *</Label>
              <Input
                value={newLead.address}
                onChange={(e) => setNewLead({...newLead, address: e.target.value})}
                placeholder="123 Main St"
                data-testid="new-lead-address"
              />
            </div>
            <div>
              <Label>City *</Label>
              <Input
                value={newLead.city}
                onChange={(e) => setNewLead({...newLead, city: e.target.value})}
                placeholder="Tampa"
                data-testid="new-lead-city"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>State</Label>
                <Input
                  value={newLead.state}
                  onChange={(e) => setNewLead({...newLead, state: e.target.value})}
                  placeholder="FL"
                />
              </div>
              <div>
                <Label>Zip</Label>
                <Input
                  value={newLead.zip_code}
                  onChange={(e) => setNewLead({...newLead, zip_code: e.target.value})}
                  placeholder="33602"
                />
              </div>
            </div>
            <div>
              <Label>County</Label>
              <Select value={newLead.county} onValueChange={(v) => setNewLead({...newLead, county: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select county" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hillsborough">Hillsborough</SelectItem>
                  <SelectItem value="Pinellas">Pinellas</SelectItem>
                  <SelectItem value="Pasco">Pasco</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Property Type</Label>
              <Select value={newLead.property_type} onValueChange={(v) => setNewLead({...newLead, property_type: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single_family">Single Family</SelectItem>
                  <SelectItem value="condo">Condo</SelectItem>
                  <SelectItem value="townhouse">Townhouse</SelectItem>
                  <SelectItem value="multi_family">Multi Family</SelectItem>
                  <SelectItem value="land">Land</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Bedrooms</Label>
              <Input
                type="number"
                value={newLead.bedrooms}
                onChange={(e) => setNewLead({...newLead, bedrooms: e.target.value})}
                placeholder="3"
              />
            </div>
            <div>
              <Label>Bathrooms</Label>
              <Input
                type="number"
                step="0.5"
                value={newLead.bathrooms}
                onChange={(e) => setNewLead({...newLead, bathrooms: e.target.value})}
                placeholder="2"
              />
            </div>
            <div>
              <Label>Square Feet</Label>
              <Input
                type="number"
                value={newLead.sqft}
                onChange={(e) => setNewLead({...newLead, sqft: e.target.value})}
                placeholder="1500"
              />
            </div>
            <div>
              <Label>Estimated Value</Label>
              <Input
                type="number"
                value={newLead.estimated_value}
                onChange={(e) => setNewLead({...newLead, estimated_value: e.target.value})}
                placeholder="350000"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating} className="bg-amber-500 hover:bg-amber-600 text-black">
              {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Create Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PropertyLeadsPage;
