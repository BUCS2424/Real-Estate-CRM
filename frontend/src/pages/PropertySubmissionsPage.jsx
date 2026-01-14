import React, { useState, useEffect } from 'react';
import { propertySubmissionsAPI } from '../lib/api';
import { 
  Home, MapPin, Phone, Mail, DollarSign, Calendar, Clock, User,
  MoreVertical, Trash2, CheckCircle, XCircle, Eye, ArrowRight,
  Filter, Search, Loader2, FileText, Building
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending Review', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'reviewing', label: 'Under Review', color: 'bg-blue-100 text-blue-700' },
  { value: 'approved', label: 'Approved', color: 'bg-green-100 text-green-700' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-700' },
  { value: 'converted', label: 'Converted', color: 'bg-purple-100 text-purple-700' },
];

const TIMELINE_LABELS = {
  immediate: 'Immediate',
  '1-3_months': '1-3 Months',
  '3-6_months': '3-6 Months',
  flexible: 'Flexible',
};

export const PropertySubmissionsPage = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => { fetchSubmissions(); }, [statusFilter]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const status = statusFilter === 'all' ? null : statusFilter;
      const res = await propertySubmissionsAPI.list(status);
      setSubmissions(res.data || []);
    } catch (error) {
      toast.error('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await propertySubmissionsAPI.update(id, { status: newStatus });
      setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
      if (selectedSubmission?.id === id) setSelectedSubmission(prev => ({ ...prev, status: newStatus }));
      toast.success('Status updated');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedSubmission) return;
    setUpdating(true);
    try {
      await propertySubmissionsAPI.update(selectedSubmission.id, { notes });
      setSubmissions(prev => prev.map(s => s.id === selectedSubmission.id ? { ...s, notes } : s));
      toast.success('Notes saved');
    } catch (error) {
      toast.error('Failed to save notes');
    } finally {
      setUpdating(false);
    }
  };

  const handleConvert = async (id) => {
    if (!window.confirm('Convert this submission to a property listing?')) return;
    try {
      const res = await propertySubmissionsAPI.convert(id);
      setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: 'converted' } : s));
      toast.success(`Listing created! ID: ${res.data.listing_id}`);
      setIsDetailOpen(false);
    } catch (error) {
      toast.error('Failed to convert submission');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this submission?')) return;
    try {
      await propertySubmissionsAPI.delete(id);
      setSubmissions(prev => prev.filter(s => s.id !== id));
      setIsDetailOpen(false);
      toast.success('Submission deleted');
    } catch (error) {
      toast.error('Failed to delete submission');
    }
  };

  const openDetail = (submission) => {
    setSelectedSubmission(submission);
    setNotes(submission.notes || '');
    setIsDetailOpen(true);
  };

  const filteredSubmissions = submissions.filter(s =>
    s.seller_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.seller_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.property_address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const counts = {
    all: submissions.length,
    pending: submissions.filter(s => s.status === 'pending').length,
    reviewing: submissions.filter(s => s.status === 'reviewing').length,
    approved: submissions.filter(s => s.status === 'approved').length,
  };

  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const formatCurrency = (val) => val ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val) : 'N/A';

  return (
    <div className="space-y-6 animate-fade-in" data-testid="property-submissions-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold flex items-center gap-3">
            <Building className="w-8 h-8" />
            Property Submissions
          </h1>
          <p className="text-muted-foreground mt-1">Review and manage seller property submissions</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-lg"><Home className="w-6 h-6 text-blue-600" /></div>
          <div><p className="text-2xl font-bold">{counts.all}</p><p className="text-sm text-muted-foreground">Total</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-4">
          <div className="p-3 bg-yellow-100 rounded-lg"><Clock className="w-6 h-6 text-yellow-600" /></div>
          <div><p className="text-2xl font-bold">{counts.pending}</p><p className="text-sm text-muted-foreground">Pending</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-lg"><Eye className="w-6 h-6 text-blue-600" /></div>
          <div><p className="text-2xl font-bold">{counts.reviewing}</p><p className="text-sm text-muted-foreground">Reviewing</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-4">
          <div className="p-3 bg-green-100 rounded-lg"><CheckCircle className="w-6 h-6 text-green-600" /></div>
          <div><p className="text-2xl font-bold">{counts.approved}</p><p className="text-sm text-muted-foreground">Approved</p></div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="flex-1">
          <TabsList>
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
            <TabsTrigger value="reviewing">Reviewing</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 w-[200px]" />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : filteredSubmissions.length === 0 ? (
        <Card className="p-12 text-center">
          <Building className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No submissions yet</h3>
          <p className="text-muted-foreground">Property submissions from sellers will appear here</p>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b">
                <th className="text-left p-4 font-medium">Property</th>
                <th className="text-left p-4 font-medium">Seller</th>
                <th className="text-left p-4 font-medium">Details</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Date</th>
                <th className="text-left p-4 font-medium"></th>
              </tr></thead>
              <tbody>
                {filteredSubmissions.map(sub => {
                  const statusInfo = STATUS_OPTIONS.find(s => s.value === sub.status) || STATUS_OPTIONS[0];
                  return (
                    <tr key={sub.id} className="border-b hover:bg-muted/50 cursor-pointer" onClick={() => openDetail(sub)}>
                      <td className="p-4">
                        <p className="font-medium">{sub.property_address}</p>
                        <p className="text-sm text-muted-foreground">{sub.city}, {sub.state}</p>
                      </td>
                      <td className="p-4">
                        <p className="font-medium">{sub.seller_name}</p>
                        <p className="text-sm text-muted-foreground">{sub.seller_email}</p>
                      </td>
                      <td className="p-4 text-sm">
                        {sub.asking_price && <p><DollarSign className="w-3 h-3 inline" /> {formatCurrency(sub.asking_price)}</p>}
                        {sub.bedrooms && <p>{sub.bedrooms} bed, {sub.bathrooms} bath</p>}
                      </td>
                      <td className="p-4"><Badge className={statusInfo.color}>{statusInfo.label}</Badge></td>
                      <td className="p-4 text-sm text-muted-foreground">{formatDate(sub.created_at)}</td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {STATUS_OPTIONS.filter(s => s.value !== 'converted').map(s => (
                              <DropdownMenuItem key={s.value} onClick={(e) => { e.stopPropagation(); handleUpdateStatus(sub.id, s.value); }}>
                                Mark as {s.label}
                              </DropdownMenuItem>
                            ))}
                            {sub.status === 'approved' && (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleConvert(sub.id); }}>
                                <ArrowRight className="w-4 h-4 mr-2" /> Convert to Listing
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(sub.id); }}>
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
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

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedSubmission && (
            <>
              <DialogHeader>
                <DialogTitle className="font-serif flex items-center gap-2">
                  <Home className="w-5 h-5" />
                  {selectedSubmission.property_address}
                </DialogTitle>
                <DialogDescription>
                  Submitted {formatDate(selectedSubmission.created_at)} by {selectedSubmission.seller_name}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Seller Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div><p className="text-sm text-muted-foreground">Seller Name</p><p className="font-medium">{selectedSubmission.seller_name}</p></div>
                  <div><p className="text-sm text-muted-foreground">Email</p><a href={`mailto:${selectedSubmission.seller_email}`} className="text-primary hover:underline">{selectedSubmission.seller_email}</a></div>
                  <div><p className="text-sm text-muted-foreground">Phone</p>{selectedSubmission.seller_phone || 'Not provided'}</div>
                  <div><p className="text-sm text-muted-foreground">Timeline</p>{TIMELINE_LABELS[selectedSubmission.timeline] || selectedSubmission.timeline || 'Not specified'}</div>
                </div>

                {/* Property Details */}
                <div className="grid grid-cols-3 gap-4">
                  <div><p className="text-sm text-muted-foreground">Type</p><p className="capitalize">{selectedSubmission.property_type?.replace('_', ' ')}</p></div>
                  <div><p className="text-sm text-muted-foreground">Bedrooms</p><p>{selectedSubmission.bedrooms || 'N/A'}</p></div>
                  <div><p className="text-sm text-muted-foreground">Bathrooms</p><p>{selectedSubmission.bathrooms || 'N/A'}</p></div>
                  <div><p className="text-sm text-muted-foreground">Sq Ft</p><p>{selectedSubmission.sqft?.toLocaleString() || 'N/A'}</p></div>
                  <div><p className="text-sm text-muted-foreground">Year Built</p><p>{selectedSubmission.year_built || 'N/A'}</p></div>
                  <div><p className="text-sm text-muted-foreground">Asking Price</p><p className="font-semibold text-green-600">{formatCurrency(selectedSubmission.asking_price)}</p></div>
                </div>

                {selectedSubmission.description && (
                  <div><p className="text-sm text-muted-foreground mb-1">Description</p><p className="text-sm">{selectedSubmission.description}</p></div>
                )}

                {selectedSubmission.reason_for_selling && (
                  <div><p className="text-sm text-muted-foreground mb-1">Reason for Selling</p><p className="text-sm">{selectedSubmission.reason_for_selling}</p></div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Status</p>
                  <Select value={selectedSubmission.status} onValueChange={(v) => { handleUpdateStatus(selectedSubmission.id, v); setSelectedSubmission(prev => ({ ...prev, status: v })); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add internal notes..." rows={3} />
                </div>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => handleDelete(selectedSubmission.id)} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </Button>
                <Button variant="outline" onClick={handleSaveNotes} disabled={updating}>
                  {updating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Save Notes
                </Button>
                {selectedSubmission.status === 'approved' && (
                  <Button onClick={() => handleConvert(selectedSubmission.id)}>
                    <ArrowRight className="w-4 h-4 mr-2" /> Convert to Listing
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
