import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { leadsAPI } from '../lib/api';
import { 
  Users, 
  UserPlus, 
  Home,
  Phone, 
  Mail, 
  MapPin,
  DollarSign,
  Calendar,
  MoreVertical,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  Filter,
  Search,
  Loader2,
  UserCheck,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';

const STATUS_OPTIONS = [
  { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-700', icon: Clock },
  { value: 'contacted', label: 'Contacted', color: 'bg-yellow-100 text-yellow-700', icon: Phone },
  { value: 'qualified', label: 'Qualified', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  { value: 'converted', label: 'Converted', color: 'bg-purple-100 text-purple-700', icon: CheckCircle },
  { value: 'lost', label: 'Lost', color: 'bg-red-100 text-red-700', icon: XCircle },
];

export const LeadsPage = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchLeads();
  }, [activeTab, statusFilter]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const leadType = activeTab === 'all' ? null : activeTab;
      const status = statusFilter === 'all' ? null : statusFilter;
      const res = await leadsAPI.list(leadType, status);
      setLeads(res.data || []);
    } catch (error) {
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (leadId, newStatus) => {
    try {
      await leadsAPI.update(leadId, { status: newStatus });
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
      toast.success('Lead status updated');
    } catch (error) {
      toast.error('Failed to update lead');
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedLead) return;
    setUpdating(true);
    try {
      await leadsAPI.update(selectedLead.id, { notes });
      setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, notes } : l));
      toast.success('Notes saved');
    } catch (error) {
      toast.error('Failed to save notes');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteLead = async (leadId) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) return;
    try {
      await leadsAPI.delete(leadId);
      setLeads(prev => prev.filter(l => l.id !== leadId));
      setIsDetailOpen(false);
      toast.success('Lead deleted');
    } catch (error) {
      toast.error('Failed to delete lead');
    }
  };

  const openLeadDetail = (lead) => {
    setSelectedLead(lead);
    setNotes(lead.notes || '');
    setIsDetailOpen(true);
  };

  const filteredLeads = leads.filter(lead => 
    lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.phone?.includes(searchTerm)
  );

  const buyerCount = leads.filter(l => l.lead_type === 'buyer').length;
  const sellerCount = leads.filter(l => l.lead_type === 'seller').length;
  const newCount = leads.filter(l => l.status === 'new').length;

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="leads-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold flex items-center gap-3">
            <Users className="w-8 h-8" />
            Lead Management
          </h1>
          <p className="text-muted-foreground mt-1">Track and manage buyer and seller leads</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{leads.length}</p>
              <p className="text-sm text-muted-foreground">Total Leads</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <UserPlus className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{buyerCount}</p>
              <p className="text-sm text-muted-foreground">Buyers</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Home className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{sellerCount}</p>
              <p className="text-sm text-muted-foreground">Sellers</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-amber-100 rounded-lg">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{newCount}</p>
              <p className="text-sm text-muted-foreground">New Leads</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList>
            <TabsTrigger value="all">All Leads</TabsTrigger>
            <TabsTrigger value="buyer">Buyers ({buyerCount})</TabsTrigger>
            <TabsTrigger value="seller">Sellers ({sellerCount})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search leads..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-[200px]"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {STATUS_OPTIONS.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Leads Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredLeads.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No leads yet</h3>
          <p className="text-muted-foreground">Leads captured from your website will appear here</p>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">Name</th>
                  <th className="text-left p-4 font-medium">Contact</th>
                  <th className="text-left p-4 font-medium">Type</th>
                  <th className="text-left p-4 font-medium">Details</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Date</th>
                  <th className="text-left p-4 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map(lead => {
                  const statusInfo = STATUS_OPTIONS.find(s => s.value === lead.status) || STATUS_OPTIONS[0];
                  return (
                    <tr 
                      key={lead.id} 
                      className="border-b hover:bg-muted/50 cursor-pointer"
                      onClick={() => openLeadDetail(lead)}
                    >
                      <td className="p-4">
                        <p className="font-medium">{lead.name}</p>
                        <p className="text-sm text-muted-foreground">{lead.source}</p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="w-3 h-3" /> {lead.email}
                        </div>
                        {lead.phone && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="w-3 h-3" /> {lead.phone}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge variant={lead.lead_type === 'buyer' ? 'default' : 'secondary'}>
                          {lead.lead_type === 'buyer' ? 'Buyer' : 'Seller'}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm">
                        {lead.lead_type === 'buyer' ? (
                          <>
                            {lead.budget && <p><DollarSign className="w-3 h-3 inline" /> {lead.budget}</p>}
                            {lead.areas_of_interest && <p className="text-muted-foreground">{lead.areas_of_interest}</p>}
                          </>
                        ) : (
                          <>
                            {lead.property_address && <p><MapPin className="w-3 h-3 inline" /> {lead.property_address}</p>}
                            {lead.estimated_value && <p className="text-muted-foreground">{lead.estimated_value}</p>}
                          </>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {formatDate(lead.created_at)}
                      </td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {STATUS_OPTIONS.map(s => (
                              <DropdownMenuItem 
                                key={s.value}
                                onClick={(e) => { e.stopPropagation(); handleUpdateStatus(lead.id, s.value); }}
                              >
                                Mark as {s.label}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={(e) => { e.stopPropagation(); handleDeleteLead(lead.id); }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Lead Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg">
          {selectedLead && (
            <>
              <DialogHeader>
                <DialogTitle className="font-serif flex items-center gap-2">
                  {selectedLead.lead_type === 'buyer' ? <UserPlus className="w-5 h-5" /> : <Home className="w-5 h-5" />}
                  {selectedLead.name}
                </DialogTitle>
                <DialogDescription>
                  {selectedLead.lead_type === 'buyer' ? 'Buyer Lead' : 'Seller Lead'} • {formatDate(selectedLead.created_at)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <a href={`mailto:${selectedLead.email}`} className="text-primary hover:underline">{selectedLead.email}</a>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    {selectedLead.phone ? (
                      <a href={`tel:${selectedLead.phone}`} className="text-primary hover:underline">{selectedLead.phone}</a>
                    ) : (
                      <span className="text-muted-foreground">Not provided</span>
                    )}
                  </div>
                </div>

                {selectedLead.lead_type === 'buyer' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Budget</p>
                      <p>{selectedLead.budget || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Areas of Interest</p>
                      <p>{selectedLead.areas_of_interest || 'Not specified'}</p>
                    </div>
                  </div>
                )}

                {selectedLead.lead_type === 'seller' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Property Address</p>
                      <p>{selectedLead.property_address || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Estimated Value</p>
                      <p>{selectedLead.estimated_value || 'Not specified'}</p>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Status</p>
                  <Select 
                    value={selectedLead.status} 
                    onValueChange={(v) => {
                      handleUpdateStatus(selectedLead.id, v);
                      setSelectedLead({ ...selectedLead, status: v });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <Textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes about this lead..."
                    rows={4}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => handleDeleteLead(selectedLead.id)}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
                <Button onClick={handleSaveNotes} disabled={updating}>
                  {updating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Save Notes
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
