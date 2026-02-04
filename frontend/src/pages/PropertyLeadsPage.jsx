import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
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
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { propertyLeadsAPI } from '../lib/api';

const PropertyLeadsPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
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
      
      const res = await propertyLeadsAPI.importCSV(formData);
      setImportResult(res.data);
      
      if (res.data.imported > 0) {
        toast.success(`Imported ${res.data.imported} properties`);
        fetchLeads();
        fetchStats();
      }
    } catch (error) {
      toast.error('Import failed');
    } finally {
      setImporting(false);
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
          <Button variant="outline" onClick={() => setShowImportModal(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
          <Button onClick={() => navigate('/property-leads/new')} className="bg-amber-500 hover:bg-amber-600 text-black">
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
              Import Property Leads from CSV
            </DialogTitle>
            <DialogDescription>
              Upload a CSV file with property data. The importer will automatically map common column names.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* File Input */}
            <div 
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-amber-500/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              {importFile ? (
                <p className="text-foreground font-medium">{importFile.name}</p>
              ) : (
                <>
                  <p className="text-muted-foreground">Click to select a CSV file</p>
                  <p className="text-xs text-muted-foreground mt-1">or drag and drop</p>
                </>
              )}
            </div>
            
            {/* Supported Columns Info */}
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm font-medium mb-2">Supported columns:</p>
              <p className="text-xs text-muted-foreground">
                address, city, state, zip, county, beds, baths, sqft, year_built, 
                parcel_id, value, owner, mailing_address, and more...
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
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={!importFile || importing}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              {importing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PropertyLeadsPage;
