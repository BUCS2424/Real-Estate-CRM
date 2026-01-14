import React, { useState } from 'react';
import { FileText, Plus, Edit, Trash2, Search, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { toast } from 'sonner';

export const GlossaryManager = () => {
  const [terms, setTerms] = useState([
    { id: 1, term: 'MLS', definition: 'Multiple Listing Service - A database of property listings shared among real estate agents.', category: 'Industry' },
    { id: 2, term: 'Lead Score', definition: 'A numerical value assigned to leads based on their likelihood to convert.', category: 'CRM' },
    { id: 3, term: 'Pipeline', definition: 'The visual representation of deals moving through various stages.', category: 'Sales' },
    { id: 4, term: 'Escrow', definition: 'A neutral third party that holds funds during a real estate transaction.', category: 'Industry' },
    { id: 5, term: 'Closing', definition: 'The final step in a real estate transaction where ownership is transferred.', category: 'Industry' },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTerm, setNewTerm] = useState({ term: '', definition: '', category: '' });

  const filteredTerms = terms.filter(t => 
    t.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.definition.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddTerm = () => {
    if (!newTerm.term || !newTerm.definition) {
      toast.error('Please fill in all fields');
      return;
    }
    setTerms(prev => [...prev, { id: Date.now(), ...newTerm }]);
    setNewTerm({ term: '', definition: '', category: '' });
    setIsDialogOpen(false);
    toast.success('Term added');
  };

  const handleDelete = (id) => {
    setTerms(prev => prev.filter(t => t.id !== id));
    toast.success('Term deleted');
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="glossary-manager-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Glossary Manager
          </h1>
          <p className="text-muted-foreground mt-1">Manage terms and definitions used across the platform</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Term
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Term</DialogTitle>
              <DialogDescription>Add a new glossary term and its definition</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Term</Label>
                <Input 
                  value={newTerm.term}
                  onChange={(e) => setNewTerm({ ...newTerm, term: e.target.value })}
                  placeholder="e.g., ROI" 
                />
              </div>
              <div>
                <Label>Category</Label>
                <Input 
                  value={newTerm.category}
                  onChange={(e) => setNewTerm({ ...newTerm, category: e.target.value })}
                  placeholder="e.g., Finance" 
                />
              </div>
              <div>
                <Label>Definition</Label>
                <Textarea 
                  value={newTerm.definition}
                  onChange={(e) => setNewTerm({ ...newTerm, definition: e.target.value })}
                  placeholder="Explain the term..." 
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddTerm}>Add Term</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Search terms..." 
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Terms List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredTerms.map(item => (
          <Card key={item.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">{item.term}</h3>
                    <Badge variant="secondary">{item.category}</Badge>
                  </div>
                  <p className="text-muted-foreground mt-1">{item.definition}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="icon" variant="ghost">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
