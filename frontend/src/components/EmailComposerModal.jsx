import React, { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import { Mail, Send, Loader2, AlertCircle, Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Link2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import api, { smtpEmailAPI } from '../lib/api';

const MenuBar = ({ editor }) => {
  if (!editor) return null;

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
      <div className="w-px bg-border mx-1" />
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
      <div className="w-px bg-border mx-1" />
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
      <div className="w-px bg-border mx-1" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          const url = window.prompt('Enter URL:');
          if (url) {
            editor.chain().focus().setLink({ href: url }).run();
          }
        }}
        className={editor.isActive('link') ? 'bg-muted' : ''}
      >
        <Link2 className="w-4 h-4" />
      </Button>
    </div>
  );
};

export const EmailComposerModal = ({ 
  isOpen, 
  onClose, 
  recipientEmail, 
  recipientName,
  defaultSubject = ''
}) => {
  const [subject, setSubject] = useState(defaultSubject);
  const [sending, setSending] = useState(false);
  const [signature, setSignature] = useState(null);
  const [smtpConfigured, setSmtpConfigured] = useState(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[200px] p-3 focus:outline-none',
      },
    },
  });

  useEffect(() => {
    if (isOpen) {
      fetchSignature();
      checkSmtpConfig();
      setSubject(defaultSubject);
      if (editor) {
        editor.commands.setContent('');
      }
    }
  }, [isOpen, defaultSubject, editor]);

  const fetchSignature = async () => {
    try {
      const res = await api.get('/users/me/signature');
      setSignature(res.data);
    } catch (error) {
      // No signature
    }
  };

  const checkSmtpConfig = async () => {
    try {
      const res = await smtpEmailAPI.getSettings();
      setSmtpConfigured(res.data.configured);
    } catch (error) {
      setSmtpConfigured(false);
    }
  };

  const handleSend = async () => {
    if (!recipientEmail) {
      toast.error('No recipient email');
      return;
    }
    if (!subject.trim()) {
      toast.error('Subject is required');
      return;
    }
    
    const bodyHtml = editor?.getHTML() || '';
    if (!bodyHtml.trim() || bodyHtml === '<p></p>') {
      toast.error('Message body is required');
      return;
    }

    setSending(true);
    try {
      await smtpEmailAPI.send({
        to_email: recipientEmail,
        to_name: recipientName,
        subject: subject,
        body_html: bodyHtml
      });
      toast.success(`Email sent to ${recipientName || recipientEmail}`);
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setSubject('');
    if (editor) {
      editor.commands.setContent('');
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-500" />
            Compose Email
          </DialogTitle>
          <DialogDescription>
            Send an email to {recipientName || recipientEmail}
          </DialogDescription>
        </DialogHeader>

        {smtpConfigured === false && (
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-600">SMTP Not Configured</p>
              <p className="text-xs text-muted-foreground">
                Please configure your email settings in Settings → Developer → Email/SMTP before sending emails.
              </p>
            </div>
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Recipient Info */}
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm font-medium">{recipientName || 'Recipient'}</p>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Mail className="w-3 h-3" />
              {recipientEmail}
            </p>
          </div>
          
          {/* Subject */}
          <div>
            <Label>Subject *</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter subject..."
              className="mt-2"
            />
          </div>

          {/* WYSIWYG Editor */}
          <div>
            <Label>Message *</Label>
            <div className="mt-2 border rounded-lg overflow-hidden">
              <MenuBar editor={editor} />
              <EditorContent editor={editor} />
            </div>
          </div>

          {/* Signature Preview */}
          {signature && (signature.name || signature.title || signature.company) && (
            <div className="p-3 rounded-lg bg-muted/30 border border-dashed">
              <p className="text-xs text-muted-foreground mb-2">Your signature will be added:</p>
              <div className="text-sm border-t pt-2 mt-2">
                {signature.name && <p className="font-semibold text-amber-600">{signature.name}</p>}
                {signature.title && <p className="text-muted-foreground">{signature.title}</p>}
                {signature.company && <p className="font-medium">{signature.company}</p>}
                {signature.phone && <p className="text-muted-foreground">📞 {signature.phone}</p>}
                {signature.email && <p className="text-muted-foreground">✉️ {signature.email}</p>}
                {signature.website && <p className="text-muted-foreground">🌐 {signature.website}</p>}
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="mt-4 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button 
            onClick={handleSend} 
            disabled={sending || smtpConfigured === false}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EmailComposerModal;
