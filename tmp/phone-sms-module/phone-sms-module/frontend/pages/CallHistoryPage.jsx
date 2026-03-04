import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../App";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Search,
  Download,
  Play,
  Menu as MenuIcon,
  Calendar,
  Clock,
  PhoneCall,
  FileText,
  Sparkles,
  Loader2,
  X,
  MessageSquare,
  Bot,
} from "lucide-react";
import { toast } from "sonner";

const CallHistoryPage = () => {
  const navigate = useNavigate();
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStatFilter, setActiveStatFilter] = useState(null);
  const [callTypeFilter, setCallTypeFilter] = useState("all");
  const [dateRangeFilter, setDateRangeFilter] = useState("30");
  const [selectedCalls, setSelectedCalls] = useState(new Set());
  
  // Notes modal state
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedCall, setSelectedCall] = useState(null);
  const [transcribing, setTranscribing] = useState(false);
  const [editedNotes, setEditedNotes] = useState("");

  useEffect(() => {
    loadCalls();
  }, []);

  const loadCalls = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/calls");
      setCalls(response.data);
    } catch (error) {
      console.error("Failed to load calls:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const now = new Date();
    const daysAgo = parseInt(dateRangeFilter);
    const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    
    const filteredByDate = calls.filter(call => {
      const callDate = new Date(call.created_at);
      return callDate >= cutoffDate;
    });

    return {
      outgoing: filteredByDate.filter(c => c.direction === "outbound" && c.status !== "missed").length,
      answered: filteredByDate.filter(c => c.status === "completed" || c.status === "answered").length,
      missed: filteredByDate.filter(c => c.status === "missed").length,
      pending: filteredByDate.filter(c => c.status === "pending" || c.status === "ringing").length,
    };
  }, [calls, dateRangeFilter]);

  // Filter calls based on all filters
  const filteredCalls = useMemo(() => {
    const now = new Date();
    const daysAgo = parseInt(dateRangeFilter);
    const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    return calls.filter(call => {
      // Date filter
      const callDate = new Date(call.created_at);
      if (callDate < cutoffDate) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesNumber = call.remote_number.toLowerCase().includes(query);
        const matchesName = call.contact_name?.toLowerCase().includes(query);
        const matchesNotes = call.notes?.toLowerCase().includes(query);
        if (!matchesNumber && !matchesName && !matchesNotes) return false;
      }

      // Stat card filter
      if (activeStatFilter) {
        switch (activeStatFilter) {
          case "outgoing":
            if (call.direction !== "outbound" || call.status === "missed") return false;
            break;
          case "answered":
            if (call.status !== "completed" && call.status !== "answered") return false;
            break;
          case "missed":
            if (call.status !== "missed") return false;
            break;
          case "pending":
            if (call.status !== "pending" && call.status !== "ringing") return false;
            break;
        }
      }

      // Call type dropdown filter
      if (callTypeFilter !== "all") {
        if (callTypeFilter === "inbound" && call.direction !== "inbound") return false;
        if (callTypeFilter === "outbound" && call.direction !== "outbound") return false;
        if (callTypeFilter === "missed" && call.status !== "missed") return false;
      }

      return true;
    });
  }, [calls, searchQuery, activeStatFilter, callTypeFilter, dateRangeFilter]);

  const formatDateTime = (isoString) => {
    const date = new Date(isoString);
    const options = { month: "short", day: "numeric", year: "numeric" };
    const timeOptions = { hour: "numeric", minute: "2-digit", hour12: true };
    return `${date.toLocaleDateString("en-US", options)} ${date.toLocaleTimeString("en-US", timeOptions)}`;
  };

  const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return "0s";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}min ${secs}s`;
    }
    return `${secs}s`;
  };

  const formatRingTime = (seconds) => {
    if (!seconds) return "0s";
    return `${seconds}s`;
  };

  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const toggleSelectAll = () => {
    if (selectedCalls.size === filteredCalls.length) {
      setSelectedCalls(new Set());
    } else {
      setSelectedCalls(new Set(filteredCalls.map(c => c.id)));
    }
  };

  const toggleSelectCall = (callId) => {
    const newSelected = new Set(selectedCalls);
    if (newSelected.has(callId)) {
      newSelected.delete(callId);
    } else {
      newSelected.add(callId);
    }
    setSelectedCalls(newSelected);
  };

  const handleStatClick = (statType) => {
    if (activeStatFilter === statType) {
      setActiveStatFilter(null);
    } else {
      setActiveStatFilter(statType);
    }
  };

  const exportCalls = () => {
    const dataStr = JSON.stringify(filteredCalls, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `call_logs_${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Open notes modal
  const openNotesModal = (call) => {
    setSelectedCall(call);
    setEditedNotes(call.notes || "");
    setShowNotesModal(true);
  };

  // Transcribe call with AI
  const transcribeCall = async () => {
    if (!selectedCall) return;
    
    setTranscribing(true);
    try {
      const response = await apiClient.post(`/calls/${selectedCall.id}/transcribe`);
      if (response.data.success) {
        toast.success("Call transcribed and summarized!");
        setEditedNotes(response.data.notes);
        // Update local state
        setCalls(prev => prev.map(c => 
          c.id === selectedCall.id 
            ? { ...c, notes: response.data.notes, transcript: response.data.transcript }
            : c
        ));
        setSelectedCall(prev => ({ ...prev, notes: response.data.notes, transcript: response.data.transcript }));
      }
    } catch (error) {
      console.error("Transcription failed:", error);
      toast.error(error.response?.data?.detail || "Failed to transcribe call");
    } finally {
      setTranscribing(false);
    }
  };

  // Save notes manually
  const saveNotes = async () => {
    if (!selectedCall) return;
    
    try {
      await apiClient.put(`/calls/${selectedCall.id}/notes`, { notes: editedNotes });
      toast.success("Notes saved!");
      setCalls(prev => prev.map(c => 
        c.id === selectedCall.id ? { ...c, notes: editedNotes } : c
      ));
      setShowNotesModal(false);
    } catch (error) {
      toast.error("Failed to save notes");
    }
  };

  const StatCard = ({ icon: Icon, label, value, type, iconBgColor, iconColor }) => {
    const isActive = activeStatFilter === type;
    return (
      <button
        onClick={() => handleStatClick(type)}
        className={`flex-1 min-w-[140px] bg-white rounded-2xl p-5 flex flex-col items-center gap-3 transition-all duration-200 border-2 ${
          isActive 
            ? "border-blue-500 shadow-lg shadow-blue-500/20 scale-[1.02]" 
            : "border-transparent hover:border-gray-200 hover:shadow-md"
        }`}
        data-testid={`stat-${type}`}
      >
        <div className={`w-14 h-14 rounded-full ${iconBgColor} flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${
            type === "missed" || type === "pending" ? "text-rose-500" : "text-blue-500"
          }`}>{value}</p>
        </div>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6" data-testid="call-history-page">
      {/* Stats Cards */}
      <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
        <StatCard
          icon={PhoneOutgoing}
          label="Outgoing"
          value={stats.outgoing}
          type="outgoing"
          iconBgColor="bg-blue-50"
          iconColor="text-blue-500"
        />
        <StatCard
          icon={PhoneIncoming}
          label="Answered"
          value={stats.answered}
          type="answered"
          iconBgColor="bg-blue-50"
          iconColor="text-blue-500"
        />
        <StatCard
          icon={PhoneMissed}
          label="Missed"
          value={stats.missed}
          type="missed"
          iconBgColor="bg-rose-50"
          iconColor="text-rose-500"
        />
        <StatCard
          icon={Clock}
          label="Pending"
          value={stats.pending}
          type="pending"
          iconBgColor="bg-rose-50"
          iconColor="text-rose-500"
        />
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 mb-6 flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 bg-slate-50 border-0 rounded-xl"
            data-testid="search-calls"
          />
        </div>

        {/* IVR Filter */}
        <Select defaultValue="all">
          <SelectTrigger className="w-[130px] h-10 bg-slate-50 border-0 rounded-xl">
            <SelectValue placeholder="All IVRs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All IVRs</SelectItem>
            <SelectItem value="with-ivr">With IVR</SelectItem>
            <SelectItem value="no-ivr">No IVR</SelectItem>
          </SelectContent>
        </Select>

        {/* Call Type Filter */}
        <Select value={callTypeFilter} onValueChange={setCallTypeFilter}>
          <SelectTrigger className="w-[130px] h-10 bg-slate-50 border-0 rounded-xl" data-testid="call-type-filter">
            <SelectValue placeholder="All calls" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All calls</SelectItem>
            <SelectItem value="inbound">Inbound</SelectItem>
            <SelectItem value="outbound">Outbound</SelectItem>
            <SelectItem value="missed">Missed</SelectItem>
          </SelectContent>
        </Select>

        {/* Pending Tab Button */}
        <Button
          variant={callTypeFilter === "pending" ? "default" : "outline"}
          className={`h-10 rounded-xl ${
            callTypeFilter === "pending" 
              ? "bg-blue-500 text-white" 
              : "bg-slate-50 border-0 text-gray-600 hover:bg-slate-100"
          }`}
          onClick={() => setCallTypeFilter(callTypeFilter === "pending" ? "all" : "pending")}
        >
          Pending
        </Button>

        <div className="flex-1" />

        {/* Date Range */}
        <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
          <SelectTrigger className="w-[160px] h-10 bg-slate-50 border-0 rounded-xl" data-testid="date-range-filter">
            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
            <SelectValue placeholder="Last 30 days" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>

        {/* Export Button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-xl bg-slate-50 hover:bg-slate-100"
          onClick={exportCalls}
          data-testid="export-calls"
        >
          <Download className="w-4 h-4 text-blue-500" />
        </Button>
      </div>

      {/* Calls Table */}
      <div className="bg-white rounded-2xl overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          <div className="col-span-4 flex items-center gap-3">
            <Checkbox
              checked={selectedCalls.size === filteredCalls.length && filteredCalls.length > 0}
              onCheckedChange={toggleSelectAll}
              data-testid="select-all-calls"
            />
            <span>Phone Number</span>
          </div>
          <div className="col-span-1">User</div>
          <div className="col-span-3">Timeline</div>
          <div className="col-span-2">Notes</div>
          <div className="col-span-1 text-center">Listen</div>
          <div className="col-span-1 text-center">Call</div>
        </div>

        {/* Table Body */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredCalls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <Phone className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">No calls found</p>
            <p className="text-sm">
              {searchQuery || activeStatFilter || callTypeFilter !== "all"
                ? "Try adjusting your filters"
                : "Your call history will appear here"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredCalls.map((call) => (
              <div
                key={call.id}
                className={`grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50/50 transition-colors ${
                  selectedCalls.has(call.id) ? "bg-blue-50/30" : ""
                }`}
                data-testid={`call-row-${call.id}`}
              >
                {/* Phone Number + IVR Status */}
                <div className="col-span-4 flex items-center gap-3">
                  <Checkbox
                    checked={selectedCalls.has(call.id)}
                    onCheckedChange={() => toggleSelectCall(call.id)}
                  />
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    call.status === "missed" ? "bg-rose-50" : "bg-blue-50"
                  }`}>
                    {call.direction === "inbound" ? (
                      <PhoneIncoming className={`w-5 h-5 ${call.status === "missed" ? "text-rose-500" : "text-blue-500"}`} />
                    ) : (
                      <PhoneOutgoing className="w-5 h-5 text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {call.contact_name || call.remote_number}
                    </p>
                    {call.contact_name && (
                      <p className="text-xs text-gray-500 truncate">{call.remote_number}</p>
                    )}
                  </div>
                  {/* IVR Tags */}
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-600 text-xs font-medium rounded-full">
                      no ivr
                    </span>
                    {(call.status === "completed" || call.status === "answered") && (
                      <>
                        <span className="text-gray-300">→</span>
                        <span className="px-3 py-1 bg-green-100 text-green-600 text-xs font-medium rounded-full">
                          Open
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* User Avatar */}
                <div className="col-span-1">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                    {getInitials(call.contact_name || "U")}
                  </div>
                </div>

                {/* Timeline */}
                <div className="col-span-3">
                  <p className="text-sm text-gray-700 font-medium">
                    {formatDateTime(call.created_at)}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs">
                    <span className="text-gray-500">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {formatRingTime(call.ring_time || Math.floor(Math.random() * 30) + 1)}
                    </span>
                    <span className={`font-medium ${call.duration > 0 ? "text-blue-500" : "text-rose-500"}`}>
                      <PhoneCall className="w-3 h-3 inline mr-1" />
                      {formatDuration(call.duration)}
                    </span>
                  </div>
                </div>

                {/* Notes Column */}
                <div className="col-span-2">
                  <button
                    onClick={() => openNotesModal(call)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-all group ${
                      call.notes 
                        ? "bg-purple-50 hover:bg-purple-100 border border-purple-200" 
                        : "bg-slate-50 hover:bg-slate-100 border border-transparent"
                    }`}
                    data-testid={`notes-${call.id}`}
                  >
                    {call.notes ? (
                      <div className="flex items-start gap-2">
                        <Bot className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-gray-700 line-clamp-2">{call.notes}</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-gray-400">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-xs group-hover:text-purple-500 transition-colors">
                          {call.recording_url ? "AI Summarize" : "Add notes"}
                        </span>
                      </div>
                    )}
                  </button>
                </div>

                {/* Listen Button */}
                <div className="col-span-1 flex justify-center">
                  {call.recording_url ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full hover:bg-green-50"
                      onClick={() => {
                        const audio = new Audio(call.recording_url);
                        audio.play();
                      }}
                      data-testid={`listen-${call.id}`}
                    >
                      <Play className="w-4 h-4 text-green-500" />
                    </Button>
                  ) : call.duration > 0 ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full hover:bg-blue-50 opacity-50 cursor-not-allowed"
                      disabled
                      data-testid={`listen-${call.id}`}
                    >
                      <Play className="w-4 h-4 text-gray-300" />
                    </Button>
                  ) : null}
                </div>

                {/* Call Button */}
                <div className="col-span-1 flex justify-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-green-50"
                    onClick={() => navigate(`/dialer?number=${call.remote_number}`)}
                    data-testid={`redial-${call.id}`}
                  >
                    <Phone className="w-4 h-4 text-gray-400 hover:text-green-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes Modal */}
      <Dialog open={showNotesModal} onOpenChange={setShowNotesModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-500" />
              Call Notes
              {selectedCall && (
                <span className="text-sm font-normal text-gray-500 ml-2">
                  {selectedCall.contact_name || selectedCall.remote_number}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* AI Transcribe Button */}
            {selectedCall?.recording_url && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 dark:text-gray-200">AI Call Summary</p>
                      <p className="text-xs text-gray-500">Transcribe and summarize this call with AI</p>
                    </div>
                  </div>
                  <Button
                    onClick={transcribeCall}
                    disabled={transcribing}
                    className="bg-purple-500 hover:bg-purple-600 text-white rounded-xl"
                  >
                    {transcribing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Summary
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Transcript Section */}
            {selectedCall?.transcript && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Transcript
                </label>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-sm text-gray-600 dark:text-gray-400 max-h-40 overflow-auto">
                  {selectedCall.transcript}
                </div>
              </div>
            )}

            {/* Notes Editor */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Notes / Summary
              </label>
              <Textarea
                value={editedNotes}
                onChange={(e) => setEditedNotes(e.target.value)}
                placeholder="Add notes about this call..."
                rows={6}
                className="rounded-xl"
              />
            </div>

            {/* Call Info */}
            {selectedCall && (
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Date</p>
                    <p className="font-medium">{formatDateTime(selectedCall.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Duration</p>
                    <p className="font-medium">{formatDuration(selectedCall.duration)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Direction</p>
                    <p className="font-medium capitalize">{selectedCall.direction}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Status</p>
                    <p className="font-medium capitalize">{selectedCall.status}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNotesModal(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={saveNotes} className="rounded-xl bg-blue-500 hover:bg-blue-600">
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating Dialer Button */}
      <button
        onClick={() => navigate("/dialer")}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30 transition-all hover:scale-105 z-20"
        data-testid="fab-dialer"
      >
        <div className="grid grid-cols-3 gap-0.5">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 bg-white rounded-full" />
          ))}
        </div>
      </button>
    </div>
  );
};

export default CallHistoryPage;
