import React, { useState, useEffect, useRef } from 'react';
import { mailingListAPI } from '../lib/api';
import { 
  Mail, 
  Plus, 
  Upload, 
  Download, 
  Users, 
  Trash2, 
  Edit2, 
  Search,
  MoreVertical,
  FileSpreadsheet,
  UserPlus,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  X,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
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
  DropdownMenuSeparator,
} from '../components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'general', label: 'General', color: 'bg-gray-500' },
  { value: 'buyers', label: 'Buyers', color: 'bg-blue-500' },
  { value: 'sellers', label: 'Sellers', color: 'bg-green-500' },
  { value: 'vip', label: 'VIP', color: 'bg-amber-500' },
  { value: 'custom', label: 'Custom', color: 'bg-purple-500' },
];

export const MailingListsPage = () => {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedList, setSelectedList] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddSubscriberModal, setShowAddSubscriberModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef(null);
  const [editingList, setEditingList] = useState(null);

  // Form states
  const [formData, setFormData] = useState({ name: '', description: '', category: 'general' });
  const [subscriberForm, setSubscriberForm] = useState({ email: '', name: '', phone: '' });
  const [importSource, setImportSource] = useState('csv');
  const [importCategory, setImportCategory] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const fetchLists = async () => {
    try {
      const res = await mailingListAPI.getLists();
      setLists(res.data);
    } catch (error) {
      toast.error('Failed to load mailing lists');
    } finally {
      setLoading(false);
    }
  };

  const fetchListDetails = async (listId) => {
    try {
      const res = await mailingListAPI.getList(listId);
      setSelectedList(res.data);
    } catch (error) {
      toast.error('Failed to load list details');
    }
  };

  useEffect(() => {
    fetchLists();
  }, []);

  const handleCreateList = async () => {
    if (!formData.name.trim()) {
      toast.error('List name is required');
      return;
    }
    try {
      await mailingListAPI.createList(formData);
      toast.success('Mailing list created');
      setShowCreateModal(false);
      setFormData({ name: '', description: '', category: 'general' });
      fetchLists();
    } catch (error) {
      toast.error('Failed to create list');
    }
  };

  const handleEditList = (list) => {
    setEditingList(list);
    setFormData({
      name: list.name,
      description: list.description || '',
      category: list.category || 'general'
    });
    setShowEditModal(true);
  };

  const handleUpdateList = async () => {
    if (!formData.name.trim()) {
      toast.error('List name is required');
      return;
    }
    try {
      await mailingListAPI.updateList(editingList.id, formData);
      toast.success('Mailing list updated');
      setShowEditModal(false);
      setEditingList(null);
      setFormData({ name: '', description: '', category: 'general' });
      fetchLists();
      // Update selected list if it was the one edited
      if (selectedList?.id === editingList.id) {
        fetchListDetails(editingList.id);
      }
    } catch (error) {
      toast.error('Failed to update list');
    }
  };

  const handleDeleteList = async (listId) => {
    if (!window.confirm('Are you sure you want to delete this list? All subscribers will be removed.')) return;
    try {
      await mailingListAPI.deleteList(listId);
      toast.success('List deleted');
      if (selectedList?.id === listId) setSelectedList(null);
      fetchLists();
    } catch (error) {
      toast.error('Failed to delete list');
    }
  };

  const handleExport = async (listId) => {
    try {
      const res = await mailingListAPI.exportCSV(listId);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `mailing_list_${listId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Export downloaded');
    } catch (error) {
      toast.error('Failed to export list');
    }
  };

  const handleImport = async () => {
    if (!selectedList) return;
    setImporting(true);
    setImportResult(null);

    try {
      let result;
      if (importSource === 'csv') {
        const fileInput = fileInputRef.current;
        if (!fileInput?.files?.length) {
          toast.error('Please select a CSV file');
          setImporting(false);
          return;
        }
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        result = await mailingListAPI.importCSV(selectedList.id, formData);
      } else if (importSource === 'contacts') {
        result = await mailingListAPI.importFromContacts(selectedList.id, importCategory || null);
      } else if (importSource === 'leads') {
        result = await mailingListAPI.importFromLeads(selectedList.id, importCategory || null);
      }
      
      setImportResult(result.data);
      toast.success(`Imported ${result.data.imported} subscribers`);
      fetchListDetails(selectedList.id);
      fetchLists();
    } catch (error) {
      toast.error('Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleAddSubscriber = async () => {
    if (!subscriberForm.email.trim()) {
      toast.error('Email is required');
      return;
    }
    try {
      await mailingListAPI.addSubscriber(selectedList.id, subscriberForm);
      toast.success('Subscriber added');
      setShowAddSubscriberModal(false);
      setSubscriberForm({ email: '', name: '', phone: '' });
      fetchListDetails(selectedList.id);
      fetchLists();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add subscriber');
    }
  };

  const handleRemoveSubscriber = async (subscriberId) => {
    try {
      await mailingListAPI.removeSubscriber(selectedList.id, subscriberId);
      toast.success('Subscriber removed');
      fetchListDetails(selectedList.id);
      fetchLists();
    } catch (error) {
      toast.error('Failed to remove subscriber');
    }
  };

  const getCategoryBadge = (category) => {
    const cat = CATEGORIES.find(c => c.value === category) || CATEGORIES[0];
    return <Badge className={`${cat.color} text-white`}>{cat.label}</Badge>;
  };

  const filteredSubscribers = selectedList?.subscribers?.filter(sub => 
    sub.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sub.name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="mailing-lists-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
            <Mail className="w-6 h-6" />
            Mailing Lists
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage subscriber lists for newsletters and campaigns
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} data-testid="create-list-btn">
          <Plus className="w-4 h-4 mr-2" />
          Create List
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{lists.length}</p>
                <p className="text-sm text-muted-foreground">Total Lists</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{lists.reduce((sum, l) => sum + (l.subscriber_count || 0), 0)}</p>
                <p className="text-sm text-muted-foreground">Total Subscribers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{lists.filter(l => l.category === 'vip').length}</p>
                <p className="text-sm text-muted-foreground">VIP Lists</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <Upload className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm font-medium">Quick Import</p>
                <p className="text-xs text-muted-foreground">CSV, Contacts, Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lists Panel */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Your Lists</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {lists.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileSpreadsheet className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No mailing lists yet</p>
                  <Button variant="link" onClick={() => setShowCreateModal(true)}>
                    Create your first list
                  </Button>
                </div>
              ) : (
                lists.map(list => (
                  <div
                    key={list.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all hover:border-primary/50 ${
                      selectedList?.id === list.id ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => fetchListDetails(list.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium truncate">{list.name}</h4>
                          {getCategoryBadge(list.category)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {list.subscriber_count || 0} subscribers
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditList(list); }}>
                            <Edit2 className="w-4 h-4 mr-2" />
                            Edit List
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExport(list.id)}>
                            <Download className="w-4 h-4 mr-2" />
                            Export CSV
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteList(list.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Subscribers Panel */}
        <div className="lg:col-span-2">
          {selectedList ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {selectedList.name}
                      {getCategoryBadge(selectedList.category)}
                    </CardTitle>
                    <CardDescription>{selectedList.description || 'No description'}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowImportModal(true)}>
                      <Upload className="w-4 h-4 mr-2" />
                      Import
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleExport(selectedList.id)}>
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                    <Button size="sm" onClick={() => setShowAddSubscriberModal(true)}>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Search */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search subscribers..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Subscribers Table */}
                {filteredSubscribers.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No subscribers in this list</p>
                    <div className="flex gap-2 justify-center mt-4">
                      <Button variant="outline" size="sm" onClick={() => setShowImportModal(true)}>
                        <Upload className="w-4 h-4 mr-2" />
                        Import Subscribers
                      </Button>
                      <Button size="sm" onClick={() => setShowAddSubscriberModal(true)}>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add Manually
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSubscribers.slice(0, 50).map(sub => (
                          <TableRow key={sub.id}>
                            <TableCell className="font-medium">{sub.email}</TableCell>
                            <TableCell>{sub.name || '-'}</TableCell>
                            <TableCell>{sub.phone || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={sub.status === 'active' ? 'default' : 'secondary'}>
                                {sub.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleRemoveSubscriber(sub.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {filteredSubscribers.length > 50 && (
                      <div className="p-3 text-center text-sm text-muted-foreground border-t">
                        Showing 50 of {filteredSubscribers.length} subscribers
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <ChevronRight className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Select a list to view subscribers</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create List Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Mailing List</DialogTitle>
            <DialogDescription>Create a new list to organize your subscribers</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>List Name *</Label>
              <Input
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., VIP Buyers"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description..."
                rows={2}
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleCreateList}>Create List</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Subscribers</DialogTitle>
            <DialogDescription>Add subscribers to {selectedList?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Import Source</Label>
              <Select value={importSource} onValueChange={setImportSource}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV File</SelectItem>
                  <SelectItem value="contacts">From Contacts</SelectItem>
                  <SelectItem value="leads">From Leads</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {importSource === 'csv' && (
              <div>
                <Label>CSV File</Label>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  CSV should have columns: email, name (optional), phone (optional)
                </p>
              </div>
            )}

            {importSource === 'contacts' && (
              <div>
                <Label>Filter by Category (optional)</Label>
                <Select value={importCategory} onValueChange={setImportCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="All contacts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Contacts</SelectItem>
                    <SelectItem value="buyer">Buyers</SelectItem>
                    <SelectItem value="seller">Sellers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {importSource === 'leads' && (
              <div>
                <Label>Filter by Lead Type (optional)</Label>
                <Select value={importCategory} onValueChange={setImportCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="All leads" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Leads</SelectItem>
                    <SelectItem value="buyer">Buyer Leads</SelectItem>
                    <SelectItem value="seller">Seller Leads</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {importResult && (
              <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="font-medium">Import Complete</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Imported:</span>
                    <span className="ml-1 font-medium text-green-600">{importResult.imported}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Duplicates:</span>
                    <span className="ml-1 font-medium text-yellow-600">{importResult.duplicates}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Errors:</span>
                    <span className="ml-1 font-medium text-red-600">{importResult.errors || 0}</span>
                  </div>
                </div>
                {importResult.error_details?.length > 0 && (
                  <div className="text-xs text-destructive mt-2">
                    {importResult.error_details.slice(0, 3).map((err, i) => (
                      <p key={i}>{err}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowImportModal(false); setImportResult(null); }}>
              {importResult ? 'Close' : 'Cancel'}
            </Button>
            {!importResult && (
              <Button onClick={handleImport} disabled={importing}>
                {importing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Import
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Subscriber Modal */}
      <Dialog open={showAddSubscriberModal} onOpenChange={setShowAddSubscriberModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Subscriber</DialogTitle>
            <DialogDescription>Add a new subscriber to {selectedList?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={subscriberForm.email}
                onChange={e => setSubscriberForm({ ...subscriberForm, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
            <div>
              <Label>Name</Label>
              <Input
                value={subscriberForm.name}
                onChange={e => setSubscriberForm({ ...subscriberForm, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={subscriberForm.phone}
                onChange={e => setSubscriberForm({ ...subscriberForm, phone: e.target.value })}
                placeholder="+1 234 567 8900"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSubscriberModal(false)}>Cancel</Button>
            <Button onClick={handleAddSubscriber}>Add Subscriber</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
