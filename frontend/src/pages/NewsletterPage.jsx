import React, { useState, useEffect, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { newsletterAPI, templateAPI, triggerAPI } from '../lib/api';
import {
  Mail,
  Send,
  Save,
  Clock,
  Users,
  FileText,
  Plus,
  Trash2,
  Edit,
  Bold,
  Italic,
  UnderlineIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Image as ImageIcon,
  Loader2,
  Archive,
  Zap,
  MoreVertical,
  CheckCircle,
  XCircle,
  Calendar,
  Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Switch } from '../components/ui/switch';
import { toast } from 'sonner';

const TRIGGER_TYPES = [
  { value: 'new_lead', label: 'New Lead Captured', description: 'When a new lead submits a form' },
  { value: 'new_listing', label: 'New Listing Added', description: 'When a new property is listed' },
  { value: 'lead_converted', label: 'Lead Converted', description: 'When a lead becomes a contact' },
  { value: 'booking_confirmed', label: 'Booking Confirmed', description: 'When a booking is made' },
];

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-700',
  scheduled: 'bg-blue-100 text-blue-700',
  sending: 'bg-yellow-100 text-yellow-700',
  sent: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

// WYSIWYG Editor Toolbar
const EditorToolbar = ({ editor }) => {
  if (!editor) return null;

  const addLink = () => {
    const url = window.prompt('Enter URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const addImage = () => {
    const url = window.prompt('Enter image URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/30">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={editor.isActive('bold') ? 'bg-muted' : ''}
      >
        <Bold className="w-4 h-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={editor.isActive('italic') ? 'bg-muted' : ''}
      >
        <Italic className="w-4 h-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={editor.isActive('underline') ? 'bg-muted' : ''}
      >
        <UnderlineIcon className="w-4 h-4" />
      </Button>
      <div className="w-px h-6 bg-border mx-1" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={editor.isActive('heading', { level: 1 }) ? 'bg-muted' : ''}
      >
        H1
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={editor.isActive('heading', { level: 2 }) ? 'bg-muted' : ''}
      >
        H2
      </Button>
      <div className="w-px h-6 bg-border mx-1" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={editor.isActive('bulletList') ? 'bg-muted' : ''}
      >
        <List className="w-4 h-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={editor.isActive('orderedList') ? 'bg-muted' : ''}
      >
        <ListOrdered className="w-4 h-4" />
      </Button>
      <div className="w-px h-6 bg-border mx-1" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className={editor.isActive({ textAlign: 'left' }) ? 'bg-muted' : ''}
      >
        <AlignLeft className="w-4 h-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className={editor.isActive({ textAlign: 'center' }) ? 'bg-muted' : ''}
      >
        <AlignCenter className="w-4 h-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className={editor.isActive({ textAlign: 'right' }) ? 'bg-muted' : ''}
      >
        <AlignRight className="w-4 h-4" />
      </Button>
      <div className="w-px h-6 bg-border mx-1" />
      <Button type="button" variant="ghost" size="sm" onClick={addLink}>
        <LinkIcon className="w-4 h-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={addImage}>
        <ImageIcon className="w-4 h-4" />
      </Button>
    </div>
  );
};

export const NewsletterPage = () => {
  const [activeTab, setActiveTab] = useState('compose');
  const [newsletters, setNewsletters] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [triggers, setTriggers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  // Compose state
  const [subject, setSubject] = useState('');
  const [recipientType, setRecipientType] = useState('all');
  const [scheduleDate, setScheduleDate] = useState('');
  const [editingId, setEditingId] = useState(null);
  
  // Template dialog
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateCategory, setTemplateCategory] = useState('general');
  
  // Trigger dialog
  const [triggerDialogOpen, setTriggerDialogOpen] = useState(false);
  const [triggerName, setTriggerName] = useState('');
  const [triggerType, setTriggerType] = useState('new_lead');
  const [triggerTemplate, setTriggerTemplate] = useState('');
  const [triggerRecipients, setTriggerRecipients] = useState('all');

  // Preview dialog
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Underline,
    ],
    content: '<p>Start writing your newsletter...</p>',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none p-4 min-h-[300px] focus:outline-none',
      },
    },
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [nlRes, tplRes, trgRes] = await Promise.all([
        newsletterAPI.list(),
        templateAPI.list(),
        triggerAPI.list()
      ]);
      setNewsletters(nlRes.data || []);
      setTemplates(tplRes.data || []);
      setTriggers(trgRes.data || []);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!subject.trim()) {
      toast.error('Please enter a subject');
      return;
    }
    try {
      const data = {
        subject,
        content: editor.getHTML(),
        recipient_type: recipientType,
        scheduled_at: scheduleDate || null
      };
      
      if (editingId) {
        await newsletterAPI.update(editingId, data);
        toast.success('Newsletter updated');
      } else {
        await newsletterAPI.create(data);
        toast.success('Draft saved');
      }
      fetchData();
      resetForm();
    } catch (error) {
      toast.error('Failed to save');
    }
  };

  const handleSendNow = async () => {
    if (!subject.trim()) {
      toast.error('Please enter a subject');
      return;
    }
    if (!window.confirm('Send this newsletter now?')) return;
    
    setSending(true);
    try {
      // Create and send immediately
      const createRes = await newsletterAPI.create({
        subject,
        content: editor.getHTML(),
        recipient_type: recipientType
      });
      const sendRes = await newsletterAPI.send(createRes.data.id);
      toast.success(`Newsletter sent to ${sendRes.data.recipients_count} recipients!`);
      fetchData();
      resetForm();
    } catch (error) {
      toast.error('Failed to send newsletter');
    } finally {
      setSending(false);
    }
  };

  const handleSendExisting = async (id) => {
    if (!window.confirm('Send this newsletter now?')) return;
    setSending(true);
    try {
      const res = await newsletterAPI.send(id);
      toast.success(`Newsletter sent to ${res.data.recipients_count} recipients!`);
      fetchData();
    } catch (error) {
      toast.error('Failed to send');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this newsletter?')) return;
    try {
      await newsletterAPI.delete(id);
      toast.success('Newsletter deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const handleEditNewsletter = (newsletter) => {
    setEditingId(newsletter.id);
    setSubject(newsletter.subject);
    setRecipientType(newsletter.recipient_type);
    setScheduleDate(newsletter.scheduled_at || '');
    editor?.commands.setContent(newsletter.content);
    setActiveTab('compose');
  };

  const resetForm = () => {
    setSubject('');
    setRecipientType('all');
    setScheduleDate('');
    setEditingId(null);
    editor?.commands.setContent('<p>Start writing your newsletter...</p>');
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    try {
      await templateAPI.create({
        name: templateName,
        subject,
        content: editor.getHTML(),
        category: templateCategory
      });
      toast.success('Template saved');
      setTemplateDialogOpen(false);
      setTemplateName('');
      fetchData();
    } catch (error) {
      toast.error('Failed to save template');
    }
  };

  const handleLoadTemplate = (template) => {
    setSubject(template.subject);
    editor?.commands.setContent(template.content);
    toast.success('Template loaded');
  };

  const handleCreateTrigger = async () => {
    if (!triggerName.trim() || !triggerTemplate) {
      toast.error('Please fill all fields');
      return;
    }
    try {
      await triggerAPI.create({
        name: triggerName,
        trigger_type: triggerType,
        template_id: triggerTemplate,
        recipient_type: triggerRecipients
      });
      toast.success('Auto-trigger created');
      setTriggerDialogOpen(false);
      setTriggerName('');
      fetchData();
    } catch (error) {
      toast.error('Failed to create trigger');
    }
  };

  const handleToggleTrigger = async (id, isActive) => {
    try {
      await triggerAPI.update(id, { is_active: !isActive });
      setTriggers(prev => prev.map(t => t.id === id ? { ...t, is_active: !isActive } : t));
      toast.success(isActive ? 'Trigger disabled' : 'Trigger enabled');
    } catch (error) {
      toast.error('Failed to update trigger');
    }
  };

  const handleDeleteTrigger = async (id) => {
    if (!window.confirm('Delete this trigger?')) return;
    try {
      await triggerAPI.delete(id);
      toast.success('Trigger deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  // Stats
  const sentCount = newsletters.filter(n => n.status === 'sent').length;
  const draftCount = newsletters.filter(n => n.status === 'draft').length;
  const scheduledCount = newsletters.filter(n => n.status === 'scheduled').length;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="newsletter-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold flex items-center gap-3">
            <Mail className="w-8 h-8" />
            Newsletter Center
          </h1>
          <p className="text-muted-foreground mt-1">Create, schedule, and automate email campaigns</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Send className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{sentCount}</p>
              <p className="text-sm text-muted-foreground">Sent</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-gray-100 rounded-lg">
              <FileText className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{draftCount}</p>
              <p className="text-sm text-muted-foreground">Drafts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{scheduledCount}</p>
              <p className="text-sm text-muted-foreground">Scheduled</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Zap className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{triggers.filter(t => t.is_active).length}</p>
              <p className="text-sm text-muted-foreground">Active Triggers</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="compose">
            <Edit className="w-4 h-4 mr-2" />
            Compose
          </TabsTrigger>
          <TabsTrigger value="newsletters">
            <Mail className="w-4 h-4 mr-2" />
            All Newsletters
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileText className="w-4 h-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="triggers">
            <Zap className="w-4 h-4 mr-2" />
            Auto-Triggers
          </TabsTrigger>
          <TabsTrigger value="archive">
            <Archive className="w-4 h-4 mr-2" />
            Archive
          </TabsTrigger>
        </TabsList>

        {/* Compose Tab */}
        <TabsContent value="compose" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{editingId ? 'Edit Newsletter' : 'Compose Newsletter'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Subject Line</Label>
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Enter email subject..."
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Recipients</Label>
                      <Select value={recipientType} onValueChange={setRecipientType}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Contacts</SelectItem>
                          <SelectItem value="buyers">Buyers Only</SelectItem>
                          <SelectItem value="sellers">Sellers Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Schedule (optional)</Label>
                      <Input
                        type="datetime-local"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Content</Label>
                    <div className="mt-1 border rounded-lg overflow-hidden">
                      <EditorToolbar editor={editor} />
                      <EditorContent editor={editor} />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" onClick={handleSaveDraft}>
                      <Save className="w-4 h-4 mr-2" />
                      {editingId ? 'Update' : 'Save Draft'}
                    </Button>
                    <Button variant="outline" onClick={() => setTemplateDialogOpen(true)}>
                      <FileText className="w-4 h-4 mr-2" />
                      Save as Template
                    </Button>
                    <Button onClick={handleSendNow} disabled={sending} className="ml-auto">
                      {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                      Send Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Templates Sidebar */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Templates</CardTitle>
                </CardHeader>
                <CardContent>
                  {templates.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No templates yet</p>
                  ) : (
                    <div className="space-y-2">
                      {templates.slice(0, 5).map(tpl => (
                        <Button
                          key={tpl.id}
                          variant="ghost"
                          className="w-full justify-start text-left h-auto py-2"
                          onClick={() => handleLoadTemplate(tpl)}
                        >
                          <FileText className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span className="truncate">{tpl.name}</span>
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* All Newsletters Tab */}
        <TabsContent value="newsletters">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">Subject</th>
                    <th className="text-left p-4 font-medium">Recipients</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Sent/Scheduled</th>
                    <th className="text-left p-4 font-medium">Opens</th>
                    <th className="text-left p-4 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {newsletters.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        No newsletters yet. Start by composing one!
                      </td>
                    </tr>
                  ) : (
                    newsletters.map(nl => (
                      <tr key={nl.id} className="border-b hover:bg-muted/30">
                        <td className="p-4 font-medium">{nl.subject}</td>
                        <td className="p-4 capitalize">{nl.recipient_type}</td>
                        <td className="p-4">
                          <Badge className={STATUS_COLORS[nl.status]}>{nl.status}</Badge>
                        </td>
                        <td className="p-4 text-sm">
                          {nl.sent_at ? formatDate(nl.sent_at) : nl.scheduled_at ? formatDate(nl.scheduled_at) : '—'}
                        </td>
                        <td className="p-4 text-sm">
                          {nl.status === 'sent' ? `${nl.recipients_count} sent` : '—'}
                        </td>
                        <td className="p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setPreviewContent(nl);
                                setPreviewOpen(true);
                              }}>
                                <Eye className="w-4 h-4 mr-2" />
                                Preview
                              </DropdownMenuItem>
                              {nl.status !== 'sent' && (
                                <>
                                  <DropdownMenuItem onClick={() => handleEditNewsletter(nl)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleSendExisting(nl.id)}>
                                    <Send className="w-4 h-4 mr-2" />
                                    Send Now
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuItem onClick={() => handleDelete(nl.id)} className="text-destructive">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(tpl => (
              <Card key={tpl.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{tpl.name}</CardTitle>
                      <CardDescription className="capitalize">{tpl.category}</CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleLoadTemplate(tpl)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Use Template
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => templateAPI.delete(tpl.id).then(fetchData)} className="text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">Subject: {tpl.subject}</p>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => handleLoadTemplate(tpl)}>
                    Use This Template
                  </Button>
                </CardContent>
              </Card>
            ))}
            {templates.length === 0 && (
              <Card className="col-span-full p-8 text-center">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No templates yet. Save your first one from the compose tab!</p>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Auto-Triggers Tab */}
        <TabsContent value="triggers" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setTriggerDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Trigger
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {triggers.map(trigger => {
              const triggerInfo = TRIGGER_TYPES.find(t => t.value === trigger.trigger_type);
              const template = templates.find(t => t.id === trigger.template_id);
              return (
                <Card key={trigger.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${trigger.is_active ? 'bg-green-100' : 'bg-gray-100'}`}>
                          <Zap className={`w-5 h-5 ${trigger.is_active ? 'text-green-600' : 'text-gray-400'}`} />
                        </div>
                        <div>
                          <h3 className="font-medium">{trigger.name}</h3>
                          <p className="text-sm text-muted-foreground">{triggerInfo?.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Template: {template?.name || 'Unknown'} • Recipients: {trigger.recipient_type}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={trigger.is_active}
                          onCheckedChange={() => handleToggleTrigger(trigger.id, trigger.is_active)}
                        />
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteTrigger(trigger.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {triggers.length === 0 && (
              <Card className="col-span-full p-8 text-center">
                <Zap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No auto-triggers yet. Create one to automate email campaigns!</p>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Archive Tab */}
        <TabsContent value="archive">
          <Card>
            <CardHeader>
              <CardTitle>Sent Newsletter Archive</CardTitle>
              <CardDescription>View all previously sent newsletters</CardDescription>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">Subject</th>
                    <th className="text-left p-4 font-medium">Sent Date</th>
                    <th className="text-left p-4 font-medium">Recipients</th>
                    <th className="text-left p-4 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {newsletters.filter(n => n.status === 'sent').length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-muted-foreground">
                        No sent newsletters yet
                      </td>
                    </tr>
                  ) : (
                    newsletters.filter(n => n.status === 'sent').map(nl => (
                      <tr key={nl.id} className="border-b hover:bg-muted/30">
                        <td className="p-4 font-medium">{nl.subject}</td>
                        <td className="p-4 text-sm">{formatDate(nl.sent_at)}</td>
                        <td className="p-4 text-sm">{nl.recipients_count} contacts</td>
                        <td className="p-4">
                          <Button variant="ghost" size="sm" onClick={() => {
                            setPreviewContent(nl);
                            setPreviewOpen(true);
                          }}>
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
            <DialogDescription>Save this newsletter as a reusable template</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Template Name</Label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Welcome Email"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={templateCategory} onValueChange={setTemplateCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="welcome">Welcome</SelectItem>
                  <SelectItem value="listing">New Listing</SelectItem>
                  <SelectItem value="follow-up">Follow-up</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTemplate}>Save Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Trigger Dialog */}
      <Dialog open={triggerDialogOpen} onOpenChange={setTriggerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Auto-Trigger</DialogTitle>
            <DialogDescription>Automatically send emails when events happen</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Trigger Name</Label>
              <Input
                value={triggerName}
                onChange={(e) => setTriggerName(e.target.value)}
                placeholder="e.g., Welcome New Leads"
              />
            </div>
            <div>
              <Label>When this happens...</Label>
              <Select value={triggerType} onValueChange={setTriggerType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Send this template...</Label>
              <Select value={triggerTemplate} onValueChange={setTriggerTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>To these recipients...</Label>
              <Select value={triggerRecipients} onValueChange={setTriggerRecipients}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Contacts</SelectItem>
                  <SelectItem value="buyers">Buyers Only</SelectItem>
                  <SelectItem value="sellers">Sellers Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTriggerDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTrigger}>Create Trigger</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {previewContent && (
            <>
              <DialogHeader>
                <DialogTitle>{previewContent.subject}</DialogTitle>
                <DialogDescription>
                  {previewContent.sent_at ? `Sent on ${formatDate(previewContent.sent_at)}` : 'Preview'}
                </DialogDescription>
              </DialogHeader>
              <div 
                className="prose prose-sm max-w-none p-4 bg-white rounded-lg border"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewContent.content) }}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
