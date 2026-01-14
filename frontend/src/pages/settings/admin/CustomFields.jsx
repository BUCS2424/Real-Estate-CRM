import React, { useState } from 'react';
import { Columns, Plus, Edit, Trash2, GripVertical, Type, Hash, Calendar, List, ToggleLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Badge } from '../../../components/ui/badge';
import { Switch } from '../../../components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { toast } from 'sonner';

export const CustomFields = () => {
  const [fields, setFields] = useState({
    contacts: [
      { id: 1, name: 'Property Type Preference', type: 'select', required: true, options: ['Condo', 'House', 'Commercial'] },
      { id: 2, name: 'Move-in Timeline', type: 'select', required: false, options: ['ASAP', '1-3 months', '3-6 months', '6+ months'] },
      { id: 3, name: 'Pre-approved', type: 'boolean', required: false },
    ],
    deals: [
      { id: 1, name: 'Commission Rate', type: 'number', required: true },
      { id: 2, name: 'Listing Date', type: 'date', required: true },
      { id: 3, name: 'Open House Scheduled', type: 'boolean', required: false },
    ],
    tasks: [
      { id: 1, name: 'Estimated Hours', type: 'number', required: false },
      { id: 2, name: 'Billable', type: 'boolean', required: false },
    ]
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentModule, setCurrentModule] = useState('contacts');
  const [newField, setNewField] = useState({ name: '', type: 'text', required: false, options: '' });

  const fieldTypes = [
    { value: 'text', label: 'Text', icon: Type },
    { value: 'number', label: 'Number', icon: Hash },
    { value: 'date', label: 'Date', icon: Calendar },
    { value: 'select', label: 'Dropdown', icon: List },
    { value: 'boolean', label: 'Toggle', icon: ToggleLeft },
  ];

  const handleAddField = () => {
    if (!newField.name) {
      toast.error('Please enter a field name');
      return;
    }
    const field = {
      id: Date.now(),
      name: newField.name,
      type: newField.type,
      required: newField.required,
      options: newField.type === 'select' ? newField.options.split(',').map(o => o.trim()) : undefined
    };
    setFields(prev => ({
      ...prev,
      [currentModule]: [...prev[currentModule], field]
    }));
    setNewField({ name: '', type: 'text', required: false, options: '' });
    setIsDialogOpen(false);
    toast.success('Custom field added');
  };

  const handleDeleteField = (module, fieldId) => {
    setFields(prev => ({
      ...prev,
      [module]: prev[module].filter(f => f.id !== fieldId)
    }));
    toast.success('Field deleted');
  };

  const getTypeIcon = (type) => {
    const fieldType = fieldTypes.find(ft => ft.value === type);
    return fieldType ? fieldType.icon : Type;
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="custom-fields-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
            <Columns className="w-6 h-6" />
            Custom Fields
          </h1>
          <p className="text-muted-foreground mt-1">Add custom fields to contacts, deals, and tasks</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Field
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Custom Field</DialogTitle>
              <DialogDescription>Create a new custom field for {currentModule}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Field Name</Label>
                <Input 
                  value={newField.name}
                  onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                  placeholder="e.g., Property Type" 
                />
              </div>
              <div>
                <Label>Field Type</Label>
                <Select value={newField.type} onValueChange={(v) => setNewField({ ...newField, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="w-4 h-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {newField.type === 'select' && (
                <div>
                  <Label>Options (comma-separated)</Label>
                  <Input 
                    value={newField.options}
                    onChange={(e) => setNewField({ ...newField, options: e.target.value })}
                    placeholder="Option 1, Option 2, Option 3" 
                  />
                </div>
              )}
              <div className="flex items-center justify-between">
                <Label>Required Field</Label>
                <Switch checked={newField.required} onCheckedChange={(v) => setNewField({ ...newField, required: v })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddField}>Add Field</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={currentModule} onValueChange={setCurrentModule}>
        <TabsList>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="deals">Deals</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>

        {['contacts', 'deals', 'tasks'].map(module => (
          <TabsContent key={module} value={module}>
            <Card>
              <CardHeader>
                <CardTitle className="capitalize">{module} Custom Fields</CardTitle>
                <CardDescription>Manage custom fields for {module}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {fields[module].map(field => {
                    const TypeIcon = getTypeIcon(field.type);
                    return (
                      <div key={field.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                          <div className="p-2 bg-background rounded-lg">
                            <TypeIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-medium">{field.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{field.type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {field.required && <Badge variant="secondary">Required</Badge>}
                          {field.options && <Badge variant="outline">{field.options.length} options</Badge>}
                          <Button size="icon" variant="ghost">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDeleteField(module, field.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {fields[module].length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No custom fields yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
