import React, { useState, useEffect, useMemo } from 'react';
import { dealsAPI, contactsAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Plus, 
  DollarSign,
  MapPin,
  GripVertical,
  MoreVertical,
  Trash2,
  Building2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
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
import { toast } from 'sonner';

const STAGES = [
  { id: 'lead', label: 'Leads', color: 'bg-blue-500' },
  { id: 'qualified', label: 'Qualified', color: 'bg-yellow-500' },
  { id: 'proposal', label: 'Proposal', color: 'bg-purple-500' },
  { id: 'negotiation', label: 'Negotiation', color: 'bg-orange-500' },
  { id: 'closed', label: 'Closed Won', color: 'bg-green-500' },
];

const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(value);
};

// Sortable Deal Card Component
const SortableDealCard = ({ deal, onDelete, isAdmin }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`${isDragging ? 'opacity-50' : ''}`}
    >
      <Card 
        className={`bg-card p-4 rounded-lg shadow-sm hover:shadow-md transition-all border border-border/50 cursor-grab active:cursor-grabbing ${
          isDragging ? 'rotate-2 scale-105 shadow-lg' : ''
        }`}
        data-testid={`deal-card-${deal.id}`}
      >
        <div className="flex items-start gap-2">
          <div
            {...attributes}
            {...listeners}
            className="mt-1 cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-medium truncate">{deal.title}</h4>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
                    <MoreVertical className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => onDelete(deal.id)} className="text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-1 text-sm font-semibold text-chart-1">
                <DollarSign className="w-3 h-3" />
                {formatCurrency(deal.value)}
              </div>
              {deal.property_address && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{deal.property_address}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

// Deal Card for Drag Overlay
const DealCardOverlay = ({ deal }) => (
  <Card className="bg-card p-4 rounded-lg shadow-lg border border-primary/50 rotate-3 scale-105">
    <div className="flex items-start gap-2">
      <GripVertical className="w-4 h-4 text-muted-foreground mt-1" />
      <div className="flex-1">
        <h4 className="font-medium">{deal.title}</h4>
        <div className="mt-2 flex items-center gap-1 text-sm font-semibold text-chart-1">
          <DollarSign className="w-3 h-3" />
          {formatCurrency(deal.value)}
        </div>
      </div>
    </div>
  </Card>
);

// Kanban Column Component
const KanbanColumn = ({ stage, deals, children }) => {
  const totalValue = deals.reduce((sum, d) => sum + d.value, 0);
  
  return (
    <div
      className="min-w-[300px] bg-muted/30 rounded-xl p-4 backdrop-blur-sm border border-border/50 kanban-column"
      data-testid={`kanban-column-${stage.id}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${stage.color}`} />
          <h3 className="font-semibold">{stage.label}</h3>
          <Badge variant="secondary" className="text-xs">{deals.length}</Badge>
        </div>
        <span className="text-xs text-muted-foreground">{formatCurrency(totalValue)}</span>
      </div>
      <div className="space-y-3 min-h-[200px]">
        <SortableContext items={deals.map(d => d.id)} strategy={verticalListSortingStrategy}>
          {children}
        </SortableContext>
      </div>
    </div>
  );
};

const initialFormState = {
  title: '',
  contact_id: '',
  value: 0,
  stage: 'lead',
  property_address: '',
  notes: ''
};

export const DealsPage = () => {
  const [deals, setDeals] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [dealsRes, contactsRes] = await Promise.all([
        dealsAPI.list(),
        contactsAPI.list()
      ]);
      setDeals(dealsRes.data);
      setContacts(contactsRes.data);
    } catch (error) {
      toast.error('Failed to load deals');
    } finally {
      setLoading(false);
    }
  };

  const dealsByStage = useMemo(() => {
    const grouped = {};
    STAGES.forEach(stage => {
      grouped[stage.id] = deals.filter(d => d.stage === stage.id);
    });
    return grouped;
  }, [deals]);

  const activeDeal = activeId ? deals.find(d => d.id === activeId) : null;

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeItem = deals.find(d => d.id === active.id);
    if (!activeItem) return;

    // Find which column the item was dropped in
    let newStage = null;
    for (const stage of STAGES) {
      const stageDeals = dealsByStage[stage.id];
      if (over.id === stage.id || stageDeals.some(d => d.id === over.id)) {
        newStage = stage.id;
        break;
      }
    }

    if (newStage && newStage !== activeItem.stage) {
      try {
        await dealsAPI.updateStage(active.id, newStage);
        setDeals(prev => prev.map(d => 
          d.id === active.id ? { ...d, stage: newStage } : d
        ));
        toast.success(`Deal moved to ${STAGES.find(s => s.id === newStage)?.label}`);
      } catch (error) {
        toast.error('Failed to update deal stage');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await dealsAPI.create({
        ...formData,
        value: parseFloat(formData.value) || 0,
        contact_id: formData.contact_id || null
      });
      toast.success('Deal created');
      fetchData();
      setIsDialogOpen(false);
      setFormData(initialFormState);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create deal');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this deal?')) return;
    try {
      await dealsAPI.delete(id);
      toast.success('Deal deleted');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete deal');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="deals-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold">Deal Pipeline</h1>
          <p className="text-muted-foreground mt-1">Drag and drop deals across stages</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-deal-btn">
              <Plus className="w-4 h-4 mr-2" />
              New Deal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Deal</DialogTitle>
              <DialogDescription>Add a new deal to your pipeline</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Deal Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="e.g., Downtown Condo Sale"
                  data-testid="deal-title-input"
                />
              </div>
              <div>
                <Label htmlFor="contact">Associated Contact</Label>
                <Select 
                  value={formData.contact_id} 
                  onValueChange={(v) => setFormData({ ...formData, contact_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a contact" />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="value">Deal Value ($)</Label>
                  <Input
                    id="value"
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder="0"
                    data-testid="deal-value-input"
                  />
                </div>
                <div>
                  <Label htmlFor="stage">Stage</Label>
                  <Select 
                    value={formData.stage} 
                    onValueChange={(v) => setFormData({ ...formData, stage: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGES.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="property_address">Property Address</Label>
                <Input
                  id="property_address"
                  value={formData.property_address}
                  onChange={(e) => setFormData({ ...formData, property_address: e.target.value })}
                  placeholder="123 Main St, City"
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" data-testid="deal-submit-btn">Create Deal</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6 overflow-x-auto pb-4" data-testid="kanban-board">
          {STAGES.map(stage => (
            <KanbanColumn key={stage.id} stage={stage} deals={dealsByStage[stage.id]}>
              <AnimatePresence mode="popLayout">
                {dealsByStage[stage.id].length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No deals in this stage
                  </div>
                ) : (
                  dealsByStage[stage.id].map(deal => (
                    <SortableDealCard
                      key={deal.id}
                      deal={deal}
                      onDelete={handleDelete}
                      isAdmin={isAdmin()}
                    />
                  ))
                )}
              </AnimatePresence>
            </KanbanColumn>
          ))}
        </div>
        <DragOverlay>
          {activeDeal ? <DealCardOverlay deal={activeDeal} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};
