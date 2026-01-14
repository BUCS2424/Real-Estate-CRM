import React, { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { 
  MessageSquare, 
  Save, 
  Plus, 
  Edit, 
  Search,
  Bold,
  Italic,
  UnderlineIcon,
  Strikethrough,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  Quote,
  Undo,
  Redo,
  Type,
  Palette
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Badge } from '../../../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover';
import { Separator } from '../../../components/ui/separator';
import { ScrollArea } from '../../../components/ui/scroll-area';
import { toast } from 'sonner';

// Toolbar Button Component
const ToolbarButton = ({ onClick, isActive, children, title }) => (
  <Button
    type="button"
    variant={isActive ? 'secondary' : 'ghost'}
    size="sm"
    onClick={onClick}
    className="h-8 w-8 p-0"
    title={title}
  >
    {children}
  </Button>
);

// Color Picker
const ColorPicker = ({ editor, type }) => {
  const colors = [
    '#000000', '#374151', '#6B7280', '#9CA3AF', '#D1D5DB',
    '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
    '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
    '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
    '#EC4899', '#F43F5E',
  ];

  const setColor = (color) => {
    if (type === 'text') {
      editor.chain().focus().setColor(color).run();
    } else {
      editor.chain().focus().toggleHighlight({ color }).run();
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title={type === 'text' ? 'Text Color' : 'Highlight'}>
          {type === 'text' ? <Palette className="h-4 w-4" /> : <Highlighter className="h-4 w-4" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2">
        <div className="grid grid-cols-6 gap-1">
          {colors.map((color) => (
            <button
              key={color}
              className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
              style={{ backgroundColor: color }}
              onClick={() => setColor(color)}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Font Size Selector
const FontSizeSelector = ({ editor }) => {
  const fontSizes = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'];
  
  return (
    <Select onValueChange={(size) => {
      editor.chain().focus().setMark('textStyle', { fontSize: size }).run();
    }}>
      <SelectTrigger className="w-20 h-8">
        <Type className="h-3 w-3 mr-1" />
        <SelectValue placeholder="Size" />
      </SelectTrigger>
      <SelectContent>
        {fontSizes.map((size) => (
          <SelectItem key={size} value={size}>{size}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

// WYSIWYG Editor Toolbar
const EditorToolbar = ({ editor }) => {
  if (!editor) return null;

  return (
    <div className="border-b border-border p-2 flex flex-wrap items-center gap-1">
      {/* Undo/Redo */}
      <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo">
        <Undo className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo">
        <Redo className="h-4 w-4" />
      </ToolbarButton>
      
      <Separator orientation="vertical" className="h-6 mx-1" />
      
      {/* Headings */}
      <ToolbarButton 
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        title="Heading 1"
      >
        <Heading1 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton 
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        title="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton 
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
        title="Heading 3"
      >
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton 
        onClick={() => editor.chain().focus().setParagraph().run()}
        isActive={editor.isActive('paragraph')}
        title="Paragraph"
      >
        <Pilcrow className="h-4 w-4" />
      </ToolbarButton>
      
      <Separator orientation="vertical" className="h-6 mx-1" />
      
      {/* Text Formatting */}
      <ToolbarButton 
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="Bold"
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton 
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="Italic"
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton 
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        title="Underline"
      >
        <UnderlineIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton 
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        title="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>
      
      <Separator orientation="vertical" className="h-6 mx-1" />
      
      {/* Colors */}
      <ColorPicker editor={editor} type="text" />
      <ColorPicker editor={editor} type="highlight" />
      
      <Separator orientation="vertical" className="h-6 mx-1" />
      
      {/* Alignment */}
      <ToolbarButton 
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        isActive={editor.isActive({ textAlign: 'left' })}
        title="Align Left"
      >
        <AlignLeft className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton 
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        isActive={editor.isActive({ textAlign: 'center' })}
        title="Align Center"
      >
        <AlignCenter className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton 
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        isActive={editor.isActive({ textAlign: 'right' })}
        title="Align Right"
      >
        <AlignRight className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton 
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        isActive={editor.isActive({ textAlign: 'justify' })}
        title="Justify"
      >
        <AlignJustify className="h-4 w-4" />
      </ToolbarButton>
      
      <Separator orientation="vertical" className="h-6 mx-1" />
      
      {/* Lists */}
      <ToolbarButton 
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton 
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title="Numbered List"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton 
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        title="Quote"
      >
        <Quote className="h-4 w-4" />
      </ToolbarButton>
    </div>
  );
};

// Main Component
export const SystemMessages = () => {
  const [messages, setMessages] = useState([
    { id: 1, key: 'welcome_message', title: 'Welcome Message', category: 'Onboarding', content: '<h2>Welcome to Fusion Builder CRM!</h2><p>We\'re excited to have you on board. Let\'s get started by exploring the dashboard.</p>' },
    { id: 2, key: 'password_reset', title: 'Password Reset Email', category: 'Authentication', content: '<p>Hi <strong>{user_name}</strong>,</p><p>You requested a password reset. Click the link below to reset your password.</p>' },
    { id: 3, key: 'deal_won', title: 'Deal Won Notification', category: 'Deals', content: '<h3>Congratulations! 🎉</h3><p>The deal <strong>{deal_name}</strong> has been marked as won!</p>' },
    { id: 4, key: 'task_reminder', title: 'Task Reminder', category: 'Tasks', content: '<p>Reminder: You have a task due soon.</p><p><strong>{task_title}</strong></p><p>Due: {due_date}</p>' },
    { id: 5, key: 'new_lead', title: 'New Lead Notification', category: 'CRM', content: '<p>A new lead has been added to the system.</p><p><strong>{lead_name}</strong> - {lead_email}</p>' },
  ]);

  const [selectedMessage, setSelectedMessage] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: selectedMessage?.content || '',
    onUpdate: ({ editor }) => {
      if (selectedMessage) {
        setSelectedMessage({ ...selectedMessage, content: editor.getHTML() });
      }
    },
  });

  // Update editor content when selecting a different message
  React.useEffect(() => {
    if (editor && selectedMessage) {
      editor.commands.setContent(selectedMessage.content);
    }
  }, [editor, selectedMessage?.id]);

  const handleSelectMessage = (message) => {
    setSelectedMessage(message);
    setIsDialogOpen(true);
  };

  const handleSaveMessage = () => {
    if (!selectedMessage) return;
    
    setMessages(prev => prev.map(m => 
      m.id === selectedMessage.id ? selectedMessage : m
    ));
    setIsDialogOpen(false);
    toast.success('Message saved successfully');
  };

  const categories = ['all', ...new Set(messages.map(m => m.category))];
  
  const filteredMessages = messages.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         m.key.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || m.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 animate-fade-in" data-testid="system-messages-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
            <MessageSquare className="w-6 h-6" />
            System Messages
          </h1>
          <p className="text-muted-foreground mt-1">Edit all system messages with rich text formatting</p>
        </div>
        <Button onClick={() => {
          setSelectedMessage({ id: Date.now(), key: '', title: '', category: 'General', content: '' });
          setIsDialogOpen(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          New Message
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search messages..." 
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat} className="capitalize">
                    {cat === 'all' ? 'All Categories' : cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Messages List */}
      <Card>
        <CardHeader>
          <CardTitle>All Messages</CardTitle>
          <CardDescription>{filteredMessages.length} system messages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredMessages.map(message => (
              <div 
                key={message.id} 
                className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => handleSelectMessage(message)}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <MessageSquare className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{message.title}</p>
                    <p className="text-xs text-muted-foreground font-mono">{message.key}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{message.category}</Badge>
                  <Button size="sm" variant="ghost">
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Editor Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit System Message</DialogTitle>
            <DialogDescription>Use the rich text editor to format your message</DialogDescription>
          </DialogHeader>
          
          {selectedMessage && (
            <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Title</Label>
                  <Input 
                    value={selectedMessage.title}
                    onChange={(e) => setSelectedMessage({ ...selectedMessage, title: e.target.value })}
                    placeholder="Message title"
                  />
                </div>
                <div>
                  <Label>Key (for developers)</Label>
                  <Input 
                    value={selectedMessage.key}
                    onChange={(e) => setSelectedMessage({ ...selectedMessage, key: e.target.value })}
                    placeholder="message_key"
                    className="font-mono"
                  />
                </div>
              </div>
              
              <div>
                <Label>Category</Label>
                <Select 
                  value={selectedMessage.category} 
                  onValueChange={(v) => setSelectedMessage({ ...selectedMessage, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="Onboarding">Onboarding</SelectItem>
                    <SelectItem value="Authentication">Authentication</SelectItem>
                    <SelectItem value="CRM">CRM</SelectItem>
                    <SelectItem value="Deals">Deals</SelectItem>
                    <SelectItem value="Tasks">Tasks</SelectItem>
                    <SelectItem value="Notifications">Notifications</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col">
                <Label className="mb-2">Message Content</Label>
                <div className="border border-border rounded-lg overflow-hidden flex-1 flex flex-col bg-background">
                  <EditorToolbar editor={editor} />
                  <ScrollArea className="flex-1">
                    <EditorContent 
                      editor={editor} 
                      className="p-4 min-h-[300px] prose prose-sm dark:prose-invert max-w-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[280px]"
                    />
                  </ScrollArea>
                </div>
              </div>

              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <strong>Available Variables:</strong> {'{user_name}'}, {'{user_email}'}, {'{deal_name}'}, {'{task_title}'}, {'{due_date}'}, {'{lead_name}'}, {'{lead_email}'}
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveMessage}>
              <Save className="w-4 h-4 mr-2" />
              Save Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
