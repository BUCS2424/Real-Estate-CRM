import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "../App";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { ScrollArea } from "../components/ui/scroll-area";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import {
  MessageSquare,
  Send,
  ArrowLeft,
  Search,
  Plus,
  User,
  Phone,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { toast } from "sonner";

const MessagesPage = () => {
  const { phoneNumber: selectedPhone } = useParams();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [activeConversation, setActiveConversation] = useState(selectedPhone || null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [newConversationNumber, setNewConversationNumber] = useState("");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [contacts, setContacts] = useState([]);
  const messagesEndRef = useRef(null);
  const smsNotificationRef = useRef(null);
  const lastMessageCountRef = useRef(0);
  const pollingIntervalRef = useRef(null);

  // Initialize SMS notification sound
  useEffect(() => {
    smsNotificationRef.current = new Audio('/sounds/sms-notification.ogg');
    smsNotificationRef.current.volume = 0.7;
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Play notification sound for new SMS
  const playNotificationSound = useCallback(() => {
    if (smsNotificationRef.current) {
      smsNotificationRef.current.currentTime = 0;
      smsNotificationRef.current.play().catch(e => {
        console.log("Could not play notification sound:", e);
      });
    }
  }, []);

  // Poll for new messages every 5 seconds
  useEffect(() => {
    const checkForNewMessages = async () => {
      try {
        const response = await apiClient.get("/messages/conversations");
        const newConversations = response.data;
        
        // Calculate total message count
        const newTotalCount = newConversations.reduce((sum, conv) => sum + (conv.message_count || 0), 0);
        
        // Check if there are new messages
        if (lastMessageCountRef.current > 0 && newTotalCount > lastMessageCountRef.current) {
          playNotificationSound();
          toast.info("New SMS received!");
          
          // Refresh conversations list
          setConversations(newConversations);
          
          // If viewing a conversation, refresh it
          if (activeConversation) {
            loadThread(activeConversation);
          }
        }
        
        lastMessageCountRef.current = newTotalCount;
        setConversations(newConversations);
      } catch (error) {
        console.error("Failed to check for new messages:", error);
      }
    };

    // Initial load
    checkForNewMessages();
    
    // Set up polling interval
    pollingIntervalRef.current = setInterval(checkForNewMessages, 5000);
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [activeConversation, playNotificationSound]);

  useEffect(() => {
    loadContacts();
  }, []);

  useEffect(() => {
    if (activeConversation) {
      loadThread(activeConversation);
    }
  }, [activeConversation]);

  useEffect(() => {
    if (selectedPhone && selectedPhone !== activeConversation) {
      setActiveConversation(selectedPhone);
    }
  }, [selectedPhone]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversations = async () => {
    try {
      const response = await apiClient.get("/messages/conversations");
      setConversations(response.data);
    } catch (error) {
      console.error("Failed to load conversations:", error);
    }
  };

  const loadContacts = async () => {
    try {
      const response = await apiClient.get("/contacts");
      setContacts(response.data);
    } catch (error) {
      console.error("Failed to load contacts:", error);
    }
  };

  const loadThread = async (phone) => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/messages/${encodeURIComponent(phone)}`);
      setMessages(response.data);
    } catch (error) {
      console.error("Failed to load thread:", error);
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation) return;

    setSending(true);
    try {
      await apiClient.post("/messages/send", {
        to: activeConversation,
        text: newMessage,
      });
      setNewMessage("");
      loadThread(activeConversation);
      loadConversations();
      toast.success("Message sent");
    } catch (error) {
      const msg = error.response?.data?.detail || "Failed to send message";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  const startNewConversation = () => {
    if (!newConversationNumber.trim()) return;
    setActiveConversation(newConversationNumber);
    setMessages([]);
    setShowNewDialog(false);
    setNewConversationNumber("");
    navigate(`/messages/${encodeURIComponent(newConversationNumber)}`);
  };

  const getContactName = (phone) => {
    const contact = contacts.find((c) => c.phone_number === phone);
    return contact?.name;
  };

  const getInitials = (name, phone) => {
    if (name) {
      return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return phone?.slice(-2) || "??";
  };

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const filteredConversations = conversations.filter((conv) => {
    const query = searchQuery.toLowerCase();
    return (
      conv.phone_number.toLowerCase().includes(query) ||
      conv.contact_name?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="h-[calc(100vh-4rem)] lg:h-screen flex" data-testid="messages-page">
      {/* Conversations List */}
      <div
        className={`w-full md:w-80 lg:w-96 border-r border-border bg-card flex flex-col ${
          activeConversation ? "hidden md:flex" : "flex"
        }`}
      >
        <div className="p-4 border-b border-border space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-manrope font-semibold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Messages
            </h1>
            <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
              <DialogTrigger asChild>
                <Button size="icon" variant="outline" data-testid="new-message-btn">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-manrope">New Conversation</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <Input
                    type="tel"
                    placeholder="Enter phone number"
                    value={newConversationNumber}
                    onChange={(e) => setNewConversationNumber(e.target.value)}
                    data-testid="new-conversation-input"
                  />
                  <Button
                    onClick={startNewConversation}
                    className="w-full"
                    disabled={!newConversationNumber.trim()}
                  >
                    Start Conversation
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="search-conversations"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
              <p>No conversations yet</p>
            </div>
          ) : (
            <div className="p-2">
              {filteredConversations.map((conv) => (
                <button
                  key={conv.phone_number}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                    activeConversation === conv.phone_number
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-secondary/50"
                  }`}
                  onClick={() => {
                    setActiveConversation(conv.phone_number);
                    navigate(`/messages/${encodeURIComponent(conv.phone_number)}`);
                  }}
                  data-testid={`conversation-${conv.phone_number}`}
                >
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-secondary text-secondary-foreground text-sm">
                      {getInitials(conv.contact_name, conv.phone_number)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">
                        {conv.contact_name || conv.phone_number}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(conv.last_timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {conv.last_message}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat View */}
      <div
        className={`flex-1 flex flex-col bg-background ${
          activeConversation ? "flex" : "hidden md:flex"
        }`}
      >
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="h-16 px-4 flex items-center gap-4 border-b border-border bg-card">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => {
                  setActiveConversation(null);
                  navigate("/messages");
                }}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials(getContactName(activeConversation), activeConversation)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">
                  {getContactName(activeConversation) || activeConversation}
                </p>
                {getContactName(activeConversation) && (
                  <p className="text-sm text-muted-foreground">{activeConversation}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(`/dialer?number=${activeConversation}`)}
                data-testid="call-contact-btn"
              >
                <Phone className="w-5 h-5" />
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
                  <p>No messages yet</p>
                  <p className="text-sm">Send a message to start the conversation</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.direction === "outbound" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                          msg.direction === "outbound"
                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                            : "bg-secondary text-secondary-foreground rounded-tl-sm"
                        }`}
                        data-testid={`message-${msg.id}`}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                        <p
                          className={`text-xs mt-1 ${
                            msg.direction === "outbound"
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground"
                          }`}
                        >
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Message Input */}
            <form onSubmit={sendMessage} className="p-4 border-t border-border bg-card">
              <div className="flex gap-3">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={sending}
                  className="flex-1"
                  data-testid="message-input"
                />
                <Button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  data-testid="send-message-btn"
                >
                  {sending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">Select a conversation</p>
            <p className="text-sm">Choose a conversation or start a new one</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesPage;
