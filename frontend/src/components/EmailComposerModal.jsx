import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Mail, Send, Loader2, X, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import api, { smtpEmailAPI } from '../../lib/api';

const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    [{ 'align': [] }],
    ['link'],
    ['clean']
  ],
};

const quillFormats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'color', 'background',
  'list', 'bullet',
  'align',
  'link'
];

export const EmailComposerModal = ({ 
  isOpen, 
  onClose, 
  recipientEmail, 
  recipientName,
  defaultSubject = ''
}) => {
  const [subject, setSubject] = useState(defaultSubject);
  const [bodyHtml, setBodyHtml] = useState('');
  const [sending, setSending] = useState(false);
  const [signature, setSignature] = useState(null);
  const [smtpConfigured, setSmtpConfigured] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchSignature();
      checkSmtpConfig();
      setSubject(defaultSubject);
      setBodyHtml('');
    }
  }, [isOpen, defaultSubject]);

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
    if (!bodyHtml.trim() || bodyHtml === '<p><br></p>') {
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
    setBodyHtml('');
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
              <ReactQuill
                theme="snow"
                value={bodyHtml}
                onChange={setBodyHtml}
                modules={quillModules}
                formats={quillFormats}
                placeholder="Type your message..."
                style={{ minHeight: '200px' }}
              />
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
