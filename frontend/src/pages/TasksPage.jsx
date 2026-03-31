import React, { useState, useEffect, useMemo } from 'react';
import { tasksAPI, contactsAPI } from '../lib/api';
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
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Plus, 
  GripVertical,
  MoreVertical,
  Trash2,
  Calendar,
  User,
  CheckCircle2,
  Circle,
  Clock,
  Edit2,
  Bell,
  BellOff,
  Loader2
} from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
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
  DropdownMenuSeparator,
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

const STATUSES = [
  { id: 'todo', label: 'To Do', icon: Circle, color: 'text-muted-foreground' },
  { id: 'in_progress', label: 'In Progress', icon: Clock, color: 'text-blue-500' },
  { id: 'done', label: 'Done', icon: CheckCircle2, color: 'text-green-500' },
];

const priorityColors = {
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  high: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
};

// Sortable Task Card
const SortableTaskCard = ({ task, contacts, onDelete, onEdit }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const contact = task.contact_id ? contacts.find(c => c.id === task.contact_id) : null;
  const hasNotifications = task.notifications?.enabled !== false;

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
        data-testid={`task-card-${task.id}`}
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
              <h4 className="font-medium">{task.title}</h4>
              <div className="flex items-center gap-1">
                {hasNotifications && task.due_date && (
                  <Bell className="w-3 h-3 text-amber-500" title="Notifications enabled" />
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
                      <MoreVertical className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(task)}>
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            {task.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {task.description}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className={`text-xs ${priorityColors[task.priority]}`}>
                {task.priority}
              </Badge>
              {contact && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="w-3 h-3" />
                  {contact.name}
                </div>
              )}
              {task.due_date && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {new Date(task.due_date).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

// Task Overlay for dragging
const TaskCardOverlay = ({ task }) => (
  <Card className="bg-card p-4 rounded-lg shadow-lg border border-primary/50 rotate-3 scale-105">
    <div className="flex items-start gap-2">
      <GripVertical className="w-4 h-4 text-muted-foreground mt-1" />
      <div>
        <h4 className="font-medium">{task.title}</h4>
        <Badge variant="secondary" className={`text-xs mt-2 ${priorityColors[task.priority]}`}>
          {task.priority}
        </Badge>
      </div>
    </div>
  </Card>
);

// Task Column
const TaskColumn = ({ status, tasks, children }) => {
  const StatusIcon = status.icon;
  
  return (
    <div
      className="min-w-[320px] bg-muted/30 rounded-xl p-4 backdrop-blur-sm border border-border/50 kanban-column"
      data-testid={`task-column-${status.id}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <StatusIcon className={`w-5 h-5 ${status.color}`} />
          <h3 className="font-semibold">{status.label}</h3>
          <Badge variant="secondary" className="text-xs">{tasks.length}</Badge>
        </div>
      </div>
      <div className="space-y-3 min-h-[200px]">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {children}
        </SortableContext>
      </div>
    </div>
  );
};

const initialFormState = {
  title: '',
  description: '',
  contact_id: '',
  deal_id: '',
  status: 'todo',
  priority: 'medium',
  due_date: '',
  notifications: {
    enabled: true,
    remind_before_hours: 24,
    remind_on_due: true,
    email_notification: false
  }
};

export const TasksPage = () => {
  const [tasks, setTasks] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const [editingTask, setEditingTask] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
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
      const [tasksRes, contactsRes] = await Promise.all([
        tasksAPI.list(),
        contactsAPI.list()
      ]);
      const tasksPayload = tasksRes?.data;
      setTasks(Array.isArray(tasksPayload) ? tasksPayload : (tasksPayload?.tasks || []));
      const contactsPayload = contactsRes?.data;
      setContacts(Array.isArray(contactsPayload) ? contactsPayload : (contactsPayload?.contacts || []));
    } catch (error) {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const tasksByStatus = useMemo(() => {
    const grouped = {};
    STATUSES.forEach(status => {
      grouped[status.id] = tasks.filter(t => t.status === status.id);
    });
    return grouped;
  }, [tasks]);

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeItem = tasks.find(t => t.id === active.id);
    if (!activeItem) return;

    // Find which column the item was dropped in
    let newStatus = null;
    for (const status of STATUSES) {
      const statusTasks = tasksByStatus[status.id];
      if (over.id === status.id || statusTasks.some(t => t.id === over.id)) {
        newStatus = status.id;
        break;
      }
    }

    if (newStatus && newStatus !== activeItem.status) {
      try {
        await tasksAPI.updateStatus(active.id, newStatus);
        setTasks(prev => prev.map(t => 
          t.id === active.id ? { ...t, status: newStatus } : t
        ));
        toast.success(`Task moved to ${STATUSES.find(s => s.id === newStatus)?.label}`);
      } catch (error) {
        toast.error('Failed to update task status');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await tasksAPI.create({
        ...formData,
        contact_id: formData.contact_id || null,
        deal_id: formData.deal_id || null,
        due_date: formData.due_date || null
      });
      toast.success('Task created');
      fetchData();
      setIsDialogOpen(false);
      setFormData(initialFormState);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create task');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await tasksAPI.delete(id);
      toast.success('Task deleted');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete task');
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setFormData({
      title: task.title || '',
      description: task.description || '',
      contact_id: task.contact_id || '',
      deal_id: task.deal_id || '',
      status: task.status || 'todo',
      priority: task.priority || 'medium',
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
      notifications: task.notifications || {
        enabled: true,
        remind_before_hours: 24,
        remind_on_due: true,
        email_notification: false
      }
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingTask) return;
    
    setSaving(true);
    try {
      await tasksAPI.update(editingTask.id, {
        ...formData,
        contact_id: formData.contact_id || null,
        deal_id: formData.deal_id || null,
        due_date: formData.due_date || null
      });
      toast.success('Task updated');
      fetchData();
      setIsEditDialogOpen(false);
      setEditingTask(null);
      setFormData(initialFormState);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update task');
    } finally {
      setSaving(false);
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
    <div className="space-y-6 animate-fade-in" data-testid="tasks-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold">Task Manager</h1>
          <p className="text-muted-foreground mt-1">Manage and track your tasks</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-task-btn">
              <Plus className="w-4 h-4 mr-2" />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>Add a new task to your board</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Task Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="e.g., Follow up with client"
                  data-testid="task-title-input"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  placeholder="Task details..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select 
                    value={formData.priority} 
                    onValueChange={(v) => setFormData({ ...formData, priority: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(v) => setFormData({ ...formData, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="contact">Associated Contact</Label>
                <Select 
                  value={formData.contact_id} 
                  onValueChange={(v) => setFormData({ ...formData, contact_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a contact (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
              
              {/* Notification Settings */}
              <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-500" />
                    <Label className="cursor-pointer">Enable Notifications</Label>
                  </div>
                  <Switch
                    checked={formData.notifications?.enabled ?? true}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      notifications: { ...formData.notifications, enabled: checked }
                    })}
                  />
                </div>
                
                {formData.notifications?.enabled && (
                  <>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-muted-foreground">Remind before due</Label>
                      <Select
                        value={String(formData.notifications?.remind_before_hours || 24)}
                        onValueChange={(v) => setFormData({
                          ...formData,
                          notifications: { ...formData.notifications, remind_before_hours: parseInt(v) }
                        })}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 hour</SelectItem>
                          <SelectItem value="2">2 hours</SelectItem>
                          <SelectItem value="6">6 hours</SelectItem>
                          <SelectItem value="12">12 hours</SelectItem>
                          <SelectItem value="24">1 day</SelectItem>
                          <SelectItem value="48">2 days</SelectItem>
                          <SelectItem value="72">3 days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-muted-foreground">Remind on due date</Label>
                      <Switch
                        checked={formData.notifications?.remind_on_due ?? true}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          notifications: { ...formData.notifications, remind_on_due: checked }
                        })}
                      />
                    </div>
                  </>
                )}
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" data-testid="task-submit-btn">Create Task</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Task Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) {
          setEditingTask(null);
          setFormData(initialFormState);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-amber-500" />
              Edit Task
            </DialogTitle>
            <DialogDescription>Update the task details</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Task Title *</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="e.g., Follow up with client"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                placeholder="Task details..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-priority">Priority</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(v) => setFormData({ ...formData, priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-contact">Associated Contact</Label>
              <Select 
                value={formData.contact_id || "none"} 
                onValueChange={(v) => setFormData({ ...formData, contact_id: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a contact (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {contacts.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-due_date">Due Date</Label>
              <Input
                id="edit-due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
            
            {/* Notification Settings */}
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-500" />
                  <Label className="cursor-pointer">Enable Notifications</Label>
                </div>
                <Switch
                  checked={formData.notifications?.enabled ?? true}
                  onCheckedChange={(checked) => setFormData({
                    ...formData,
                    notifications: { ...formData.notifications, enabled: checked }
                  })}
                />
              </div>
              
              {formData.notifications?.enabled && (
                <>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-muted-foreground">Remind before due</Label>
                    <Select
                      value={String(formData.notifications?.remind_before_hours || 24)}
                      onValueChange={(v) => setFormData({
                        ...formData,
                        notifications: { ...formData.notifications, remind_before_hours: parseInt(v) }
                      })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 hour</SelectItem>
                        <SelectItem value="2">2 hours</SelectItem>
                        <SelectItem value="6">6 hours</SelectItem>
                        <SelectItem value="12">12 hours</SelectItem>
                        <SelectItem value="24">1 day</SelectItem>
                        <SelectItem value="48">2 days</SelectItem>
                        <SelectItem value="72">3 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-muted-foreground">Remind on due date</Label>
                    <Switch
                      checked={formData.notifications?.remind_on_due ?? true}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        notifications: { ...formData.notifications, remind_on_due: checked }
                      })}
                    />
                  </div>
                </>
              )}
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-black">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Edit2 className="w-4 h-4 mr-2" />}
                Update Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Task Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6 overflow-x-auto pb-4" data-testid="task-board">
          {STATUSES.map(status => (
            <TaskColumn key={status.id} status={status} tasks={tasksByStatus[status.id]}>
              <AnimatePresence mode="popLayout">
                {tasksByStatus[status.id].length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No tasks here
                  </div>
                ) : (
                  tasksByStatus[status.id].map(task => (
                    <SortableTaskCard
                      key={task.id}
                      task={task}
                      contacts={contacts}
                      onDelete={handleDelete}
                      onEdit={handleEdit}
                    />
                  ))
                )}
              </AnimatePresence>
            </TaskColumn>
          ))}
        </div>
        <DragOverlay>
          {activeTask ? <TaskCardOverlay task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};
