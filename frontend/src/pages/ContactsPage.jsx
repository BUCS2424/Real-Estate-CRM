import React, { useState, useEffect } from 'react';
import { contactsAPI, tasksAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { 
  Plus, 
  Search, 
  Mail, 
  Building2, 
  DollarSign,
  Star,
  MoreVertical,
  Trash2,
  Edit,
  UserPlus,
  Phone,
  Users,
  ShoppingCart,
  Home,
  CheckCircle
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { PhoneVerification } from '../components/PhoneVerification';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';

const statusColors = {
  new: 'bg-blue-500',
  active: 'bg-green-500',
  contacted: 'bg-yellow-500',
  qualified: 'bg-green-500',
  negotiation: 'bg-purple-500',
  closed: 'bg-gray-500'
};

const categoryColors = {
  buyer: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  seller: 'bg-orange-100 text-orange-700 border-orange-200',
};

const initialFormState = {
  name: '',
  email: '',
  phone: '',
  company: '',
  property_interest: '',
  budget: '',
  lead_score: 50,
  status: 'new',
  notes: '',
  tags: [],
  category: ''
};

export const ContactsPage = () => {
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchContacts();
  }, []);

  useEffect(() => {
    let filtered = contacts;
    if (searchQuery) {
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.company?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(c => c.category === categoryFilter);
    }
    setFilteredContacts(filtered);
  }, [contacts, searchQuery, statusFilter, categoryFilter]);

  const fetchContacts = async () => {
    try {
      const res = await contactsAPI.list();
      setContacts(res.data || []);
    } catch (error) {
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingContact) {
        await contactsAPI.update(editingContact.id, formData);
        toast.success('Contact updated');
      } else {
        await contactsAPI.create(formData);
        toast.success('Contact created');
      }
      fetchContacts();
      setIsDialogOpen(false);
      setFormData(initialFormState);
      setEditingContact(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleEdit = (contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      email: contact.email || '',
      phone: contact.phone || '',
      company: contact.company || '',
      property_interest: contact.property_interest || '',
      budget: contact.budget || '',
      lead_score: contact.lead_score || 50,
      status: contact.status || 'new',
      notes: contact.notes || '',
      tags: contact.tags || [],
      category: contact.category || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this contact?')) return;
    try {
      await contactsAPI.delete(id);
      toast.success('Contact deleted');
      fetchContacts();
    } catch (error) {
      toast.error('Failed to delete contact');
    }
  };

  const handleCreateTask = async (contact) => {
    try {
      await tasksAPI.create({
        title: `Follow up with ${contact.name}`,
        description: `Contact: ${contact.email || contact.phone}`,
        priority: 'medium',
        status: 'todo'
      });
      toast.success('Task created');
    } catch (error) {
      toast.error('Failed to create task');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Stats
  const totalCount = contacts.length;
  const buyerCount = contacts.filter(c => c.category === 'buyer').length;
  const sellerCount = contacts.filter(c => c.category === 'seller').length;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="contacts-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold flex items-center gap-3">
            <Users className="w-8 h-8" />
            Contacts
          </h1>
          <p className="text-muted-foreground mt-1">Manage your buyer and seller contacts</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingContact(null);
            setFormData(initialFormState);
          }
        }}>
          <DialogTrigger asChild>
            <Button data-testid="add-contact-btn">
              <Plus className="w-4 h-4 mr-2" />
              Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingContact ? 'Edit Contact' : 'New Contact'}</DialogTitle>
              <DialogDescription>
                {editingContact ? 'Update contact information' : 'Add a new contact'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    data-testid="contact-name-input"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    data-testid="contact-email-input"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="buyer">Buyer</SelectItem>
                      <SelectItem value="seller">Seller</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                      <SelectItem value="negotiation">Negotiation</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="budget">Budget</Label>
                  <Input
                    id="budget"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    placeholder="e.g., $300K-$500K"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="property_interest">Property Interest</Label>
                  <Input
                    id="property_interest"
                    value={formData.property_interest}
                    onChange={(e) => setFormData({ ...formData, property_interest: e.target.value })}
                    placeholder="e.g., Luxury Condos, Single Family"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" data-testid="contact-submit-btn">
                  {editingContact ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalCount}</p>
              <p className="text-sm text-muted-foreground">Total Contacts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-emerald-100 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{buyerCount}</p>
              <p className="text-sm text-muted-foreground">Buyers</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Home className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{sellerCount}</p>
              <p className="text-sm text-muted-foreground">Sellers</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <Tabs value={categoryFilter} onValueChange={setCategoryFilter} className="flex-shrink-0">
          <TabsList>
            <TabsTrigger value="all">All Contacts</TabsTrigger>
            <TabsTrigger value="buyer">Buyers ({buyerCount})</TabsTrigger>
            <TabsTrigger value="seller">Sellers ({sellerCount})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="contact-search"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="negotiation">Negotiation</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Contacts List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : filteredContacts.length === 0 ? (
        <Card className="p-12 text-center">
          <UserPlus className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No contacts found</h3>
          <p className="text-muted-foreground">Add your first contact to get started</p>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium">Contact</th>
                  <th className="text-left p-4 font-medium">Category</th>
                  <th className="text-left p-4 font-medium">Details</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Score</th>
                  <th className="text-left p-4 font-medium">Added</th>
                  <th className="text-left p-4 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map(contact => (
                  <tr key={contact.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-semibold text-primary">
                            {contact.name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{contact.name}</p>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            {contact.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {contact.email}
                              </span>
                            )}
                            {contact.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {contact.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {contact.category ? (
                        <Badge variant="outline" className={`capitalize ${categoryColors[contact.category] || ''}`}>
                          {contact.category === 'buyer' && <ShoppingCart className="w-3 h-3 mr-1" />}
                          {contact.category === 'seller' && <Home className="w-3 h-3 mr-1" />}
                          {contact.category}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </td>
                    <td className="p-4 text-sm">
                      {contact.property_interest && (
                        <p className="flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-muted-foreground" />
                          {contact.property_interest}
                        </p>
                      )}
                      {contact.budget && (
                        <p className="flex items-center gap-1 text-muted-foreground">
                          <DollarSign className="w-3 h-3" />
                          {contact.budget}
                        </p>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${statusColors[contact.status] || 'bg-gray-400'}`} />
                        <span className="text-sm capitalize">{contact.status}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <Star className={`w-4 h-4 ${contact.lead_score >= 80 ? 'text-amber-500 fill-amber-500' : contact.lead_score >= 60 ? 'text-amber-400' : 'text-muted-foreground'}`} />
                        <span className="text-sm font-medium">{contact.lead_score}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {formatDate(contact.created_at)}
                    </td>
                    <td className="p-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(contact)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCreateTask(contact)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Task
                          </DropdownMenuItem>
                          {isAdmin() && (
                            <DropdownMenuItem onClick={() => handleDelete(contact.id)} className="text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
