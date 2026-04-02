import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ChevronLeft, ChevronRight, Send, Paperclip, X, Download, Play, FileText, Trash2, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import api from '../lib/api';

const POLL_INTERVAL = 4000;

const formatTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

const initials = (name) => (name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

const roleColor = (role) => {
  if (role === 'superuser') return 'bg-amber-500';
  if (role === 'admin') return 'bg-blue-500';
  return 'bg-gray-500';
};

const Attachment = ({ att }) => {
  if (att.type === 'image') {
    return (
      <a href={att.url} target="_blank" rel="noopener noreferrer" className="block mt-1.5 rounded-lg overflow-hidden max-w-[240px] border border-white/10 hover:border-amber-400/30 transition-colors">
        <img src={att.url} alt={att.filename} className="w-full max-h-[200px] object-cover" loading="lazy" />
      </a>
    );
  }
  if (att.type === 'video') {
    return (
      <div className="mt-1.5 rounded-lg overflow-hidden max-w-[280px] border border-white/10">
        <video src={att.url} controls className="w-full max-h-[200px]" preload="metadata" />
      </div>
    );
  }
  return (
    <a href={att.url} target="_blank" rel="noopener noreferrer" className="mt-1.5 flex items-center gap-2 bg-white/5 rounded-lg p-2.5 border border-white/10 hover:border-amber-400/30 transition-colors max-w-[240px]">
      <FileText className="w-5 h-5 text-amber-400 shrink-0" />
      <span className="text-white/70 text-sm truncate">{att.filename}</span>
      <Download className="w-4 h-4 text-white/40 shrink-0 ml-auto" />
    </a>
  );
};

export const StaffChatDrawer = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [unread, setUnread] = useState(0);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastSeenRef = useRef(null);
  const pollRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await api.get('/staff-chat/messages?limit=100');
      const msgs = Array.isArray(res?.data) ? res.data : [];
      setMessages(msgs);
      if (open) {
        lastSeenRef.current = msgs.length;
        setUnread(0);
      } else if (lastSeenRef.current !== null && msgs.length > lastSeenRef.current) {
        setUnread(msgs.length - lastSeenRef.current);
      }
    } catch (e) { /* silent */ }
  }, [open]);

  useEffect(() => {
    if (!user) return;
    fetchMessages();
    pollRef.current = setInterval(fetchMessages, POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [user, fetchMessages]);

  useEffect(() => {
    if (open) {
      scrollToBottom();
      lastSeenRef.current = messages.length;
      setUnread(0);
    }
  }, [open, messages.length, scrollToBottom]);

  const handleSend = async () => {
    const t = text.trim();
    if (!t) return;
    setSending(true);
    try {
      await api.post('/staff-chat/messages', { text: t });
      setText('');
      await fetchMessages();
      scrollToBottom();
    } catch (e) {
      toast.error('Failed to send');
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('message', '');
        await api.post('/staff-chat/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      await fetchMessages();
      scrollToBottom();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/staff-chat/messages/${id}`);
      setMessages(prev => prev.filter(m => m.id !== id));
    } catch (e) {
      toast.error('Failed to delete');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!user) return null;

  return (
    <>
      {/* Tab Handle */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed right-0 top-1/2 -translate-y-1/2 z-40 flex items-center gap-1 px-1.5 py-8 rounded-l-lg transition-all duration-300 ${
          open ? 'translate-x-full opacity-0' : 'bg-[#0d1f3c] border border-r-0 border-amber-400/30 hover:bg-amber-400/10 shadow-lg'
        }`}
        data-testid="chat-toggle"
      >
        <ChevronLeft className="w-4 h-4 text-amber-400" />
        <span className="text-amber-400 text-xs font-medium [writing-mode:vertical-lr] rotate-180">CHAT</span>
        {unread > 0 && (
          <span className="absolute -top-1 -left-1 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">{unread}</span>
        )}
      </button>

      {/* Backdrop */}
      {open && <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-[360px] max-w-[90vw] bg-[#0a1628] border-l border-amber-400/20 z-50 flex flex-col transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        data-testid="staff-chat-drawer"
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <h3 className="text-white font-serif font-bold text-base">Staff Chat</h3>
          <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white" data-testid="chat-close">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className={`flex-1 overflow-y-auto px-3 py-3 space-y-3 ${dragOver ? 'ring-2 ring-amber-400/50 ring-inset bg-amber-400/5' : ''}`}>
          {dragOver && (
            <div className="text-center py-8 text-amber-400 text-sm font-medium">Drop files here to upload</div>
          )}
          {messages.length === 0 && !dragOver && (
            <div className="text-center py-12 text-white/30 text-sm">No messages yet. Start the conversation!</div>
          )}
          {messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`} data-testid={`chat-msg-${msg.id}`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full ${roleColor(msg.sender_role)} flex items-center justify-center shrink-0 text-white text-xs font-bold`}>
                  {initials(msg.sender_name)}
                </div>
                {/* Bubble */}
                <div className={`max-w-[75%] group ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-white/50 text-[11px]">{isMe ? 'You' : msg.sender_name}</span>
                    <span className="text-white/20 text-[10px]">{formatTime(msg.created_at)}</span>
                    {(isMe || user?.role === 'superuser') && (
                      <button onClick={() => handleDelete(msg.id)} className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all" data-testid={`delete-msg-${msg.id}`}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className={`rounded-xl px-3 py-2 text-sm ${isMe ? 'bg-amber-400/15 text-white' : 'bg-white/5 text-white/80'}`}>
                    {msg.text && <p className="whitespace-pre-wrap break-words">{msg.text}</p>}
                    {msg.attachments?.map((att) => <Attachment key={att.id} att={att} />)}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Upload Progress */}
        {uploading && (
          <div className="px-4 py-2 border-t border-white/10 flex items-center gap-2 text-amber-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
          </div>
        )}

        {/* Input Area */}
        <div className="px-3 py-3 border-t border-white/10 shrink-0">
          <div className="flex items-end gap-2">
            <button onClick={() => fileInputRef.current?.click()} className="text-white/40 hover:text-amber-400 p-1.5 shrink-0" data-testid="chat-attach">
              <Paperclip className="w-5 h-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
            />
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 resize-none focus:outline-none focus:border-amber-400/30 min-h-[36px] max-h-[100px]"
              data-testid="chat-input"
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={sending || !text.trim()}
              className="bg-amber-400 hover:bg-amber-500 text-black w-9 h-9 shrink-0"
              data-testid="chat-send"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default StaffChatDrawer;
