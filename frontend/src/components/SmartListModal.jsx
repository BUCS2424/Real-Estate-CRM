import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { 
  Search, 
  Send, 
  Users, 
  X, 
  Loader2, 
  Filter,
  ShoppingCart,
  Home,
  Building2,
  Briefcase,
  Mail,
  Check,
  ListFilter,
  Share2
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';

const CATEGORY_OPTIONS = [
  { value: 'buyer', label: 'Buyers', color: 'bg-emerald-500', icon: ShoppingCart },
  { value: 'seller', label: 'Sellers', color: 'bg-orange-500', icon: Home },
  { value: 'lender', label: 'Lenders', color: 'bg-blue-500', icon: Building2 },
  { value: 'vendor', label: 'Vendors', color: 'bg-purple-500', icon: Briefcase },
];

export const SmartListModal = ({ isOpen, onClose, currentUser }) => {
  // Filter state
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [locationFilter, setLocationFilter] = useState({ type: '', value: '' });
  
  // Available options from database
  const [availableStatuses, setAvailableStatuses] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  
  // Results
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Share state
  const [recipientSearch, setRecipientSearch] = useState('');
  const [recipientResults, setRecipientResults] = useState([]);
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [searchingRecipients, setSearchingRecipients] = useState(false);
  const [sending, setSending] = useState(false);
  
  // Fetch available statuses and tags on mount
  useEffect(() => {
    if (isOpen) {
      fetchFilterOptions();
    }
  }, [isOpen]);
  
  const fetchFilterOptions = async () => {
    try {
      const response = await api.get('/contacts/filter-options');
      setAvailableStatuses(response.data.statuses || []);
      setAvailableTags(response.data.tags || []);
    } catch (error) {
      console.error('Failed to fetch filter options:', error);
    }
  };
  
  // Search for filtered contacts
  const searchContacts = useCallback(async () => {
    if (selectedCategories.length === 0) {
      setFilteredContacts([]);
      return;
    }
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      selectedCategories.forEach(cat => params.append('categories', cat));
      selectedStatuses.forEach(status => params.append('statuses', status));
      selectedTags.forEach(tag => params.append('tags', tag));
      if (locationFilter.type && locationFilter.value) {
        params.append('location_type', locationFilter.type);
        params.append('location_value', locationFilter.value);
      }
      
      const response = await api.get(`/contacts/smart-list?${params.toString()}`);
      setFilteredContacts(response.data.contacts || []);
    } catch (error) {
      toast.error('Failed to search contacts');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [selectedCategories, selectedStatuses, selectedTags, locationFilter]);
  
  // Auto-search when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      searchContacts();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchContacts]);
  
  // Search recipients for sharing
  useEffect(() => {
    const searchRecipients = async () => {
      if (recipientSearch.length < 2) {
        setRecipientResults([]);
        return;
      }
      
      setSearchingRecipients(true);
      try {
        const response = await api.get(`/contacts?search=${encodeURIComponent(recipientSearch)}&limit=10`);
        // Filter out contacts without email and contacts already selected
        const results = (response.data || [])
          .filter(c => c.email && !selectedRecipients.find(r => r.id === c.id));
        setRecipientResults(results);
      } catch (error) {
        console.error('Failed to search recipients:', error);
      } finally {
        setSearchingRecipients(false);
      }
    };
    
    const timer = setTimeout(searchRecipients, 300);
    return () => clearTimeout(timer);
  }, [recipientSearch, selectedRecipients]);
  
  const toggleCategory = (category) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };
  
  const toggleStatus = (status) => {
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };
  
  const toggleTag = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };
  
  const addRecipient = (contact) => {
    setSelectedRecipients(prev => [...prev, contact]);
    setRecipientSearch('');
    setRecipientResults([]);
  };
  
  const removeRecipient = (contactId) => {
    setSelectedRecipients(prev => prev.filter(r => r.id !== contactId));
  };
  
  const getListTitle = () => {
    if (selectedCategories.length === 1) {
      const cat = selectedCategories[0];
      return cat.charAt(0).toUpperCase() + cat.slice(1);
    }
    return 'Contact';
  };
  
  const handleSendList = async () => {
    if (selectedRecipients.length === 0) {
      toast.error('Please select at least one recipient');
      return;
    }
    if (filteredContacts.length === 0) {
      toast.error('No contacts in the list to send');
      return;
    }
    
    setSending(true);
    try {
      const response = await api.post('/contacts/smart-list/send', {
        recipient_ids: selectedRecipients.map(r => r.id),
        contact_ids: filteredContacts.map(c => c.id),
        list_type: getListTitle(),
        categories: selectedCategories
      });
      
      toast.success(`List sent to ${selectedRecipients.length} recipient(s)`);
      
      // Reset state
      setSelectedRecipients([]);
      setRecipientSearch('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send list');
    } finally {
      setSending(false);
    }
  };
  
  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedStatuses([]);
    setSelectedTags([]);
    setLocationFilter({ type: '', value: '' });
    setFilteredContacts([]);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ListFilter className="w-6 h-6 text-amber-500" />
            Smart List Builder
          </DialogTitle>
          <DialogDescription>
            Filter contacts by category, status, tags, and location. Then share the list with selected recipients.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Category Filter */}
          <div>
            <Label className="text-sm font-semibold mb-3 block">Select Categories</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map(cat => {
                const Icon = cat.icon;
                const isSelected = selectedCategories.includes(cat.value);
                return (
                  <Button
                    key={cat.value}
                    variant={isSelected ? 'default' : 'outline'}
                    className={isSelected ? `${cat.color} text-white hover:opacity-90` : ''}
                    onClick={() => toggleCategory(cat.value)}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {cat.label}
                    {isSelected && <Check className="w-4 h-4 ml-2" />}
                  </Button>
                );
              })}
            </div>
          </div>
          
          {/* Status Filter */}
          {availableStatuses.length > 0 && (
            <div>
              <Label className="text-sm font-semibold mb-3 block">Filter by Status</Label>
              <div className="flex flex-wrap gap-2">
                {availableStatuses.map(status => (
                  <Badge
                    key={status}
                    variant={selectedStatuses.includes(status) ? 'default' : 'outline'}
                    className={`cursor-pointer ${selectedStatuses.includes(status) ? 'bg-amber-500 text-black' : ''}`}
                    onClick={() => toggleStatus(status)}
                  >
                    {status}
                    {selectedStatuses.includes(status) && <X className="w-3 h-3 ml-1" />}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Tags Filter */}
          {availableTags.length > 0 && (
            <div>
              <Label className="text-sm font-semibold mb-3 block">Filter by Tags</Label>
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                {availableTags.map(tag => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                    className={`cursor-pointer ${selectedTags.includes(tag) ? 'bg-blue-500 text-white' : ''}`}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                    {selectedTags.includes(tag) && <X className="w-3 h-3 ml-1" />}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Location Filter */}
          <div>
            <Label className="text-sm font-semibold mb-3 block">Filter by Location</Label>
            <div className="flex gap-2">
              <select
                className="w-40 px-3 py-2 rounded-md border bg-background"
                value={locationFilter.type}
                onChange={(e) => setLocationFilter({ ...locationFilter, type: e.target.value })}
              >
                <option value="">Select type...</option>
                <option value="zip_code">Zip Code</option>
                <option value="city">City</option>
                <option value="county">County</option>
                <option value="state">State</option>
              </select>
              <Input
                placeholder={locationFilter.type ? `Enter ${locationFilter.type.replace('_', ' ')}...` : 'Select type first'}
                value={locationFilter.value}
                onChange={(e) => setLocationFilter({ ...locationFilter, value: e.target.value })}
                disabled={!locationFilter.type}
                className="flex-1"
              />
            </div>
          </div>
          
          {/* Clear Filters */}
          {(selectedCategories.length > 0 || selectedStatuses.length > 0 || selectedTags.length > 0 || locationFilter.value) && (
            <Button variant="ghost" onClick={clearFilters} className="text-red-500 hover:text-red-600">
              <X className="w-4 h-4 mr-2" />
              Clear All Filters
            </Button>
          )}
          
          {/* Results */}
          <div className="border rounded-lg">
            <div className="p-3 bg-muted/50 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" />
                <span className="font-semibold">
                  {loading ? 'Searching...' : `${filteredContacts.length} Contact${filteredContacts.length !== 1 ? 's' : ''} Found`}
                </span>
              </div>
              {filteredContacts.length > 0 && (
                <Badge variant="outline">{getListTitle()} List</Badge>
              )}
            </div>
            
            <div className="max-h-64 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500" />
                  <p className="text-muted-foreground mt-2">Searching contacts...</p>
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  {selectedCategories.length === 0 
                    ? 'Select at least one category to start'
                    : 'No contacts match your filters'}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredContacts.map(contact => (
                    <div key={contact.id} className="p-3 flex items-center justify-between hover:bg-muted/30">
                      <div>
                        <p className="font-medium">
                          {contact.first_name} {contact.last_name}
                          {contact.company && <span className="text-muted-foreground ml-2">({contact.company})</span>}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          {contact.email && <span>{contact.email}</span>}
                          {contact.phone && <span>{contact.phone}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {contact.status && <Badge variant="outline" className="text-xs">{contact.status}</Badge>}
                        <Badge className={
                          contact.category === 'buyer' ? 'bg-emerald-500' :
                          contact.category === 'seller' ? 'bg-orange-500' :
                          contact.category === 'lender' ? 'bg-blue-500' :
                          'bg-purple-500'
                        }>
                          {contact.category}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Share Section */}
          {filteredContacts.length > 0 && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Share2 className="w-5 h-5 text-amber-500" />
                  <Label className="text-lg font-semibold">Share This List</Label>
                </div>
                
                {/* Recipient Search */}
                <div className="relative">
                  <Label className="text-sm mb-2 block">Search contacts to share with:</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Type name or email to search..."
                      value={recipientSearch}
                      onChange={(e) => setRecipientSearch(e.target.value)}
                      className="pl-10"
                    />
                    {searchingRecipients && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" />
                    )}
                  </div>
                  
                  {/* Search Results Dropdown */}
                  {recipientResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {recipientResults.map(contact => (
                        <button
                          key={contact.id}
                          onClick={() => addRecipient(contact)}
                          className="w-full p-3 text-left hover:bg-muted/50 flex items-center justify-between"
                        >
                          <div>
                            <p className="font-medium">{contact.first_name} {contact.last_name}</p>
                            <p className="text-sm text-muted-foreground">{contact.email}</p>
                          </div>
                          <Mail className="w-4 h-4 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Selected Recipients */}
                {selectedRecipients.length > 0 && (
                  <div>
                    <Label className="text-sm mb-2 block">Will send to:</Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedRecipients.map(recipient => (
                        <Badge 
                          key={recipient.id} 
                          variant="secondary"
                          className="py-1 px-3 flex items-center gap-2"
                        >
                          <Mail className="w-3 h-3" />
                          {recipient.first_name} {recipient.last_name}
                          <button 
                            onClick={() => removeRecipient(recipient.id)}
                            className="hover:text-red-500"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Send Button */}
                <Button
                  onClick={handleSendList}
                  disabled={selectedRecipients.length === 0 || sending}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-black"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send {getListTitle()} List to {selectedRecipients.length} Recipient{selectedRecipients.length !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
                
                <p className="text-xs text-muted-foreground text-center">
                  Each recipient will receive a personalized email with the list and your signature.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SmartListModal;
