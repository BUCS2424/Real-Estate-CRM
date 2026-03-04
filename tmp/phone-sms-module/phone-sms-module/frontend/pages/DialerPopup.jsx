import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../App";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
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
} from "../components/ui/dialog";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Pause,
  Play,
  PhoneForwarded,
  PhoneIncoming,
  X,
  Grid3X3,
  Volume2,
  MessageSquare,
  UserPlus,
  User,
  Menu,
  Delete,
  ShieldOff,
  ShieldCheck,
  Sparkles,
  UserCircle,
} from "lucide-react";
import { toast, Toaster } from "sonner";

// Incoming Call Screen Component
const IncomingCallScreen = ({
  incomingCall,
  incomingCallerInfo,
  isNumberBlocked,
  blockNumber,
  unblockNumber,
  answerCall,
  declineCall,
  getAvatarColor,
  getInitials,
}) => {
  const callerNumber = incomingCall?.options?.remoteCallerNumber || "Unknown";
  const isBlocked = isNumberBlocked(callerNumber);
  const callerName = incomingCallerInfo?.name;
  const isKnownContact = incomingCallerInfo?.isContact;

  return (
    <div className="absolute inset-0 z-50 bg-gradient-to-b from-blue-500 via-blue-600 to-blue-800 flex flex-col">
      {/* Header */}
      <div className="pt-8 pb-4 px-6">
        <div className="flex items-center justify-center gap-2 text-white/80 text-sm">
          <span className="w-2 h-2 bg-white/60 rounded-full animate-pulse"></span>
          <span>Incoming call</span>
        </div>
        <p className="text-center text-white/60 text-sm mt-1">{callerNumber}</p>
      </div>

      {/* Profile Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Avatar */}
        <div className="relative mb-6">
          <div className={`w-32 h-32 rounded-full ${
            isKnownContact ? getAvatarColor(callerName) : "bg-white/20"
          } flex items-center justify-center ring-4 ring-white/20 shadow-2xl`}>
            {isKnownContact ? (
              <span className="text-white text-4xl font-bold">
                {getInitials(callerName)}
              </span>
            ) : (
              <User className="w-16 h-16 text-white/70" />
            )}
          </div>
          {isBlocked && (
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-red-500 rounded-full flex items-center justify-center border-4 border-blue-600">
              <ShieldOff className="w-5 h-5 text-white" />
            </div>
          )}
        </div>

        {/* Caller Name */}
        <h1 className="text-white text-3xl font-bold text-center mb-2">
          {callerName || callerNumber}
        </h1>

        {/* Status Badge */}
        {isBlocked ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-500/20 rounded-full">
            <ShieldOff className="w-4 h-4 text-red-400" />
            <span className="text-red-400 text-sm font-medium">Blocked Number</span>
          </div>
        ) : isKnownContact ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className="text-white/90 text-sm font-medium">Saved Contact</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full">
            <UserCircle className="w-4 h-4 text-white/70" />
            <span className="text-white/70 text-sm">Unknown Caller</span>
          </div>
        )}

        {/* Company if available */}
        {incomingCallerInfo?.company && (
          <p className="text-white/60 text-sm mt-2">{incomingCallerInfo.company}</p>
        )}

        {/* Block/Unblock Button */}
        <button
          onClick={() => isBlocked ? unblockNumber(callerNumber) : blockNumber(callerNumber)}
          className={`mt-6 flex items-center gap-2 px-5 py-2.5 rounded-full transition-all ${
            isBlocked 
              ? "bg-green-500/20 text-green-400 hover:bg-green-500/30" 
              : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
          }`}
        >
          {isBlocked ? (
            <>
              <ShieldCheck className="w-5 h-5" />
              <span className="font-medium">Unblock</span>
            </>
          ) : (
            <>
              <ShieldOff className="w-5 h-5" />
              <span className="font-medium">Block</span>
            </>
          )}
        </button>
      </div>

      {/* Action Buttons */}
      <div className="pb-12 px-8">
        <div className="flex items-center justify-center gap-16">
          {/* Decline Button */}
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={declineCall}
              className="w-[72px] h-[72px] rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30 hover:bg-red-400 transition-all active:scale-95"
              data-testid="decline-call-btn"
            >
              <PhoneOff className="w-8 h-8 text-white" />
            </button>
            <span className="text-white/70 text-sm">Decline</span>
          </div>

          {/* Answer Button */}
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={answerCall}
              className="w-[72px] h-[72px] rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/30 hover:bg-green-400 transition-all active:scale-95"
              data-testid="answer-call-btn"
            >
              <Phone className="w-8 h-8 text-white" />
            </button>
            <span className="text-white/70 text-sm">Answer</span>
          </div>
        </div>
      </div>
    </div>
  );
};


const DialerPopup = () => {
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCallerId, setSelectedCallerId] = useState("");
  const [callState, setCallState] = useState("idle");
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isHeld, setIsHeld] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [telnyxClient, setTelnyxClient] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [queueSettings, setQueueSettings] = useState(null);

  // Available caller IDs — loaded from user's assigned pool
  const [availableCallerIds, setAvailableCallerIds] = useState([]);
  const [credentials, setCredentials] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [waitingCall, setWaitingCall] = useState(null);   // 2nd inbound call while active
  const [waitingCallerInfo, setWaitingCallerInfo] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const [forwardNumber, setForwardNumber] = useState("");
  const [contacts, setContacts] = useState([]);
  const [matchingContacts, setMatchingContacts] = useState([]);
  const [blockedNumbers, setBlockedNumbers] = useState([]);
  const [incomingCallerInfo, setIncomingCallerInfo] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [soundSettings, setSoundSettings] = useState({
    incoming_ringtone: "happy-go-lucky",
    sms_notification: "sms-notification",
    disconnect_sound: "disconnect",
  });
  
  const audioRef = useRef(null);
  const disconnectSoundRef = useRef(null);
  const keypressSoundRef = useRef(null);
  const ringtoneRef = useRef(null);
  const holdMusicRef = useRef(null);
  const durationInterval = useRef(null);
  const isOutboundCallRef = useRef(false);

  // ── Track current call info in refs so handleCallEnded always has current values ──
  const phoneNumberRef = useRef("");
  const callDurationRef = useRef(0);
  const callLogIdRef = useRef(null);  // DB call log ID created when call goes active

  // ── Mirror refs — always current, safe inside Telnyx event callbacks ────────
  const incomingCallRef = useRef(null);
  const activeCallRef = useRef(null);
  const callStateRef = useRef("idle");
  const telnyxClientRef = useRef(null);
  const waitingCallRef = useRef(null);

  // Call recording refs
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const localStreamRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);

  // ── Sync setters: update BOTH state (for render) and ref (for callbacks) ───
  const setIncomingCallSync = useCallback((call) => {
    incomingCallRef.current = call;
    setIncomingCall(call);
  }, []);
  const setActiveCallSync = useCallback((call) => {
    activeCallRef.current = call;
    setActiveCall(call);
  }, []);
  const setCallStateSync = useCallback((s) => {
    callStateRef.current = s;
    setCallState(s);
  }, []);
  const setWaitingCallSync = useCallback((call) => {
    waitingCallRef.current = call;
    setWaitingCall(call);
  }, []);

  // Keep phoneNumber and callDuration accessible in event callbacks via refs
  useEffect(() => { phoneNumberRef.current = phoneNumber; }, [phoneNumber]);
  useEffect(() => { callDurationRef.current = callDuration; }, [callDuration]);

  // Initialize keypress sound
  useEffect(() => {
    keypressSoundRef.current = new Audio('/sounds/keypress.mp3');
    keypressSoundRef.current.volume = 0.5;
  }, []);

  // Read extension/number from URL params (set by ExtensionsPage/FavoriteDials)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ext = params.get("extension");
    const num = params.get("number");
    const name = params.get("name");
    const display = num || ext;
    if (display) {
      setPhoneNumber(display);
      if (name) document.title = `Calling ${name}`;
    }
  }, []);

  // Auto-dial when client connects
  useEffect(() => {
    if (!isConnected) return;
    const params = new URLSearchParams(window.location.search);
    const ext = params.get("extension");
    const num = params.get("number");

    if (num && callState === "idle") {
      // Plain number from Favorite Dials — dial directly
      const timer = setTimeout(() => makeCall(num), 800);
      return () => clearTimeout(timer);
    }

    if (ext && callState === "idle") {
      // Internal extension — resolve to SIP address first
      const timer = setTimeout(async () => {
        try {
          const response = await apiClient.get(`/extensions/resolve/${encodeURIComponent(ext)}`);
          const sipAddress = response.data.sip_address;
          console.log(`Extension ${ext} resolved to: ${sipAddress}`);
          setPhoneNumber(sipAddress);
          makeCall(sipAddress);
        } catch (err) {
          console.error("Could not resolve extension:", err);
          toast.error(
            err.response?.data?.detail ||
            `Cannot call extension ${ext} — make sure this user has SIP credentials configured by an admin.`
          );
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setAuthChecking(false);
        setIsAuthenticated(false);
        return;
      }
      
      try {
        // Verify token is valid by making an API call
        await apiClient.get("/auth/me");
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Auth check failed:", error);
        localStorage.removeItem("token");
        setIsAuthenticated(false);
      } finally {
        setAuthChecking(false);
      }
    };
    
    checkAuth();
  }, []);

  // Ringtone file mapping
  const ringtoneFiles = {
    "happy-go-lucky": "/sounds/happy-go-lucky.mp3",
    "classic-ring": "/sounds/classic-ring.mp3",
    "digital-tone": "/sounds/digital-tone.mp3",
    "soft-bells": "/sounds/soft-bells.mp3",
    "none": null,
  };

  // Load sound settings and initialize sounds
  useEffect(() => {
    loadSoundSettings();
  }, []);

  const loadSoundSettings = async () => {
    try {
      const response = await apiClient.get("/settings/sounds");
      if (response.data) {
        setSoundSettings(response.data);
        // Initialize disconnect sound with user's preference
        const disconnectFile = response.data.disconnect_sound === "none" 
          ? null 
          : "/sounds/disconnect.ogg";
        if (disconnectFile) {
          disconnectSoundRef.current = new Audio(disconnectFile);
          disconnectSoundRef.current.volume = 0.7;
        }
      }
    } catch (error) {
      console.error("Failed to load sound settings:", error);
      // Use default disconnect sound
      disconnectSoundRef.current = new Audio('/sounds/disconnect.ogg');
      disconnectSoundRef.current.volume = 0.7;
    }
  };

  // Play ringtone for incoming calls
  const playRingtone = () => {
    const ringtoneFile = ringtoneFiles[soundSettings.incoming_ringtone];
    if (!ringtoneFile) return;
    
    // Stop any existing ringtone first to prevent multiple playing
    stopRingtone();
    
    ringtoneRef.current = new Audio(ringtoneFile);
    ringtoneRef.current.loop = true;
    ringtoneRef.current.volume = 0.8;
    ringtoneRef.current.play().catch(e => console.log("Could not play ringtone:", e));
  };

  const stopRingtone = () => {
    if (ringtoneRef.current) {
      try {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
      } catch (e) {
        console.log("Error stopping ringtone:", e);
      }
      ringtoneRef.current = null;
    }
  };

  // Start call recording - mixes local and remote audio
  const startRecording = async (remoteStream) => {
    try {
      console.log("=== STARTING CALL RECORDING ===");
      
      // Get local microphone stream
      const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = localStream;
      
      // Create AudioContext for mixing streams
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      
      // Create destination for mixed audio
      const destination = audioContext.createMediaStreamDestination();
      
      // Mix local audio (microphone)
      if (localStream.getAudioTracks().length > 0) {
        const localSource = audioContext.createMediaStreamSource(localStream);
        localSource.connect(destination);
        console.log("Local audio connected to recorder");
      }
      
      // Mix remote audio (other party)
      if (remoteStream && remoteStream.getAudioTracks().length > 0) {
        const remoteSource = audioContext.createMediaStreamSource(remoteStream);
        remoteSource.connect(destination);
        console.log("Remote audio connected to recorder");
      }
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(destination.stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        console.log("=== RECORDING STOPPED ===");
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        console.log("Recording saved, size:", blob.size);
        
        // Upload recording to server
        await uploadRecording(blob);
      };
      
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      console.log("Recording started");
      
    } catch (error) {
      console.error("Failed to start recording:", error);
    }
  };
  
  // Stop call recording
  const stopRecording = () => {
    console.log("=== STOPPING RECORDING ===");
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    // Clean up local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    setIsRecording(false);
  };
  
  // Upload recording to server
  // ── Call logging ─────────────────────────────────────────────────────────────
  const createCallLog = async (call) => {
    try {
      const remoteNumber = call?.options?.remoteCallerNumber ||
                           call?.options?.destinationNumber ||
                           phoneNumberRef.current || "Unknown";
      const direction = isOutboundCallRef.current ? "outbound" : "inbound";
      const res = await apiClient.post("/calls", {
        remote_number: remoteNumber,
        direction,
        duration: 0,
        status: "active",
      });
      callLogIdRef.current = res.data.id;
      console.log("Call log created:", res.data.id, "→", remoteNumber, direction);
    } catch (e) {
      console.error("Failed to create call log:", e);
    }
  };

  const finalizeCallLog = async (duration) => {
    if (!callLogIdRef.current) return;
    try {
      await apiClient.put(`/calls/${callLogIdRef.current}`, { duration, status: "completed" });
    } catch (e) {
      console.error("Failed to finalize call log:", e);
    }
  };

  const uploadRecording = async (blob) => {
    try {
      const formData = new FormData();
      formData.append('file', blob, `call_${Date.now()}.webm`);
      if (callLogIdRef.current) formData.append('call_id', callLogIdRef.current);
      const response = await apiClient.post('/calls/upload-recording', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data.url && callLogIdRef.current) {
        await apiClient.put(`/calls/${callLogIdRef.current}`, { recording_url: response.data.url });
        console.log("Recording linked to call log:", callLogIdRef.current);
      }
    } catch (error) {
      console.error("Failed to upload recording:", error);
    }
  };

  // Cleanup ringtone and recording on unmount
  useEffect(() => {
    return () => {
      stopRingtone();
      stopRecording();
    };
  }, []);

  // Load contacts and blocked numbers on mount
  useEffect(() => {
    loadContacts();
    loadBlockedNumbers();
  }, []);

  const loadContacts = async () => {
    try {
      const response = await apiClient.get("/contacts");
      setContacts(response.data);
    } catch (error) {
      console.error("Failed to load contacts:", error);
    }
  };

  const loadBlockedNumbers = async () => {
    try {
      const response = await apiClient.get("/blocked-numbers");
      setBlockedNumbers(response.data || []);
    } catch (error) {
      console.error("Failed to load blocked numbers:", error);
    }
  };

  const blockNumber = async (number) => {
    try {
      await apiClient.post("/blocked-numbers", { phone_number: number });
      setBlockedNumbers([...blockedNumbers, number]);
      toast.success("Number blocked");
    } catch (error) {
      toast.error("Failed to block number");
    }
  };

  const unblockNumber = async (number) => {
    try {
      await apiClient.delete(`/blocked-numbers/${encodeURIComponent(number)}`);
      setBlockedNumbers(blockedNumbers.filter(n => n !== number));
      toast.success("Number unblocked");
    } catch (error) {
      toast.error("Failed to unblock number");
    }
  };

  const isNumberBlocked = (number) => {
    const cleanNumber = number?.replace(/[\s\-\(\)\+]/g, "");
    return blockedNumbers.some(blocked => 
      blocked.replace(/[\s\-\(\)\+]/g, "") === cleanNumber
    );
  };

  const lookupCallerInfo = (number) => {
    if (!number) return { name: null, isContact: false, company: null };
    
    // Normalize the incoming number - remove all non-digits
    const cleanNumber = number.replace(/\D/g, "");
    // Get last 10 digits for comparison (handles country code variations)
    const last10 = cleanNumber.slice(-10);
    
    const contact = contacts.find(c => {
      // Normalize contact number
      const contactClean = c.phone_number.replace(/\D/g, "");
      const contactLast10 = contactClean.slice(-10);
      
      // Match by last 10 digits (ignores country code differences)
      return contactLast10 === last10 || 
             contactClean === cleanNumber ||
             contactClean.endsWith(cleanNumber) ||
             cleanNumber.endsWith(contactClean);
    });
    
    if (contact) {
      return {
        name: contact.name,
        isContact: true,
        company: contact.notes?.match(/^Company:\s*(.+)$/m)?.[1] || null,
        phone: contact.phone_number,
      };
    }
    
    return {
      name: null,
      isContact: false,
      company: null,
    };
  };

  // Update caller info when incoming call arrives
  useEffect(() => {
    if (incomingCall) {
      const callerNumber = incomingCall.options?.remoteCallerNumber;
      if (callerNumber) {
        const info = lookupCallerInfo(callerNumber);
        setIncomingCallerInfo(info);
        console.log("Caller lookup result:", info, "for number:", callerNumber);
      }
    } else {
      setIncomingCallerInfo(null);
    }
  }, [incomingCall, contacts]);

  // Search contacts as user types
  useEffect(() => {
    if (!phoneNumber || phoneNumber.length < 2) {
      setMatchingContacts([]);
      return;
    }

    const searchNumber = phoneNumber.replace(/[\s\-\(\)\+]/g, "");
    const matches = contacts.filter(contact => {
      const contactNumber = contact.phone_number.replace(/[\s\-\(\)\+]/g, "");
      const contactName = contact.name.toLowerCase();
      
      // Match by number or by T9 style name matching
      return contactNumber.includes(searchNumber) || 
             matchT9(contactName, phoneNumber);
    }).slice(0, 3); // Show max 3 matches

    setMatchingContacts(matches);
  }, [phoneNumber, contacts]);

  // Simple T9 matching - maps digits to letters
  const matchT9 = (name, digits) => {
    const t9Map = {
      '2': 'abc', '3': 'def', '4': 'ghi', '5': 'jkl',
      '6': 'mno', '7': 'pqrs', '8': 'tuv', '9': 'wxyz'
    };
    
    const cleanDigits = digits.replace(/[^2-9]/g, '');
    if (cleanDigits.length < 2) return false;
    
    // Check if the name starts with letters that match the T9 pattern
    let nameIndex = 0;
    for (let i = 0; i < cleanDigits.length && nameIndex < name.length; i++) {
      const digit = cleanDigits[i];
      const letters = t9Map[digit] || '';
      
      // Skip spaces in name
      while (nameIndex < name.length && name[nameIndex] === ' ') {
        nameIndex++;
      }
      
      if (nameIndex >= name.length) return false;
      
      if (!letters.includes(name[nameIndex])) {
        return false;
      }
      nameIndex++;
    }
    
    return cleanDigits.length >= 2;
  };

  // Play disconnect sound
  const playDisconnectSound = () => {
    if (disconnectSoundRef.current) {
      disconnectSoundRef.current.currentTime = 0;
      disconnectSoundRef.current.play().catch(e => {
        console.log("Could not play disconnect sound:", e);
      });
    }
  };

  // Load credentials on mount
  useEffect(() => {
    if (isAuthenticated) {
      loadCredentials();
      loadCallQueueSettings();
    }
  }, [isAuthenticated]);

  const loadCallQueueSettings = async () => {
    try {
      const response = await apiClient.get("/admin/call-queue/settings");
      setQueueSettings(response.data);
      console.log("Popup: Call queue settings loaded:", response.data);
    } catch (error) {
      console.error("Failed to load call queue settings:", error);
    }
  };

  const loadCredentials = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Please login first");
        return;
      }

      const response = await apiClient.get("/webrtc/token");
      setCredentials(response.data);
      // Populate caller ID pool from user's assigned numbers
      const pool = response.data.available_caller_ids || [];
      if (pool.length > 0) {
        const ids = pool.map((c) => ({ value: c.number, label: c.label || c.number }));
        setAvailableCallerIds(ids);
        setSelectedCallerId(ids[0].value);
      } else if (response.data.outbound_caller_id) {
        setAvailableCallerIds([{ value: response.data.outbound_caller_id, label: response.data.outbound_caller_id }]);
        setSelectedCallerId(response.data.outbound_caller_id);
      }
      if (response.data.configured) {
        initializeTelnyxClient(response.data);
      }
    } catch (error) {
      console.error("Failed to load credentials:", error);
      toast.error("Failed to load phone credentials");
    }
  };

  const initializeTelnyxClient = useCallback(async (creds) => {
    if (!creds?.sip_username || !creds?.sip_password) return;

    try {
      const { TelnyxRTC } = await import("@telnyx/webrtc");
      
      const clientConfig = {
        login: creds.sip_username,
        password: creds.sip_password,
        ringtoneFile: null,
        ringbackFile: null,
      };
      
      console.log("Initializing Telnyx client in popup...");
      
      const client = new TelnyxRTC(clientConfig);

      client.on("telnyx.ready", () => {
        console.log("Telnyx ready in popup");
        setIsConnected(true);
        toast.success("Phone connected");
      });

      client.on("telnyx.error", (error) => {
        console.error("Telnyx error:", error);
        toast.error("Connection error");
      });

      // Use a stable wrapper that calls the ref — so it always uses the LATEST handler
      client.on("telnyx.notification", (notification) => {
        handleCallNotificationRef.current(notification);
      });

      client.on("telnyx.socket.error", (error) => {
        console.error("Socket error:", error);
        setIsConnected(false);
      });

      await client.connect();
      telnyxClientRef.current = client;  // store in ref for callbacks
      setTelnyxClient(client);

    } catch (error) {
      console.error("Failed to initialize Telnyx:", error);
      toast.error("Failed to connect phone");
    }
  }, []);

  // Always-current ref so the Telnyx event listener calls the latest version
  const handleCallNotificationRef = useRef(null);

  const handleCallNotification = (notification) => {
    if (notification.type !== "callUpdate") return;
    const call = notification.call;

    // Always read from refs — never from stale closure state
    const curCallState = callStateRef.current;
    const curIncoming = incomingCallRef.current;
    const curActive = activeCallRef.current;

      const hasRemoteCaller = !!call.options?.remoteCallerNumber;
      const isInbound = call.direction === "inbound" ||
                        (hasRemoteCaller && !isOutboundCallRef.current && curCallState === "idle");

      console.log("Call notification:", call.state, "direction:", call.direction,
        "isOutbound:", isOutboundCallRef.current, "isInbound:", isInbound,
        "curCallState:", curCallState);

      if (call.remoteStream && audioRef.current) {
        audioRef.current.srcObject = call.remoteStream;
        audioRef.current.play().catch(e => console.log("Audio play error:", e));
      }

      switch (call.state) {
        case "new":
          if (isInbound && !isOutboundCallRef.current) {
            // Duck radio volume on incoming call
            localStorage.setItem("a2g_call_active", "true");
            window.dispatchEvent(new Event("a2g_call_start"));
            // If already on a call → treat as call waiting
            if (curCallState === "active" || curCallState === "held") {
              setWaitingCallSync(call);
              // Look up caller info for waiting call
              const wNum = call.options?.remoteCallerNumber;
              if (wNum) {
                const match = contacts.find(c =>
                  c.phone_number.replace(/\D/g,'').endsWith(wNum.replace(/\D/g,'').slice(-7))
                );
                setWaitingCallerInfo(match ? { name: match.name, isContact: true } : { name: null, isContact: false });
              }
              toast.info(`Call waiting: ${call.options?.remoteCallerNumber || "Unknown"}`);
            } else {
              setIncomingCallSync(call);
              setCallStateSync("incoming");
              playRingtone();
              toast.info(`Incoming: ${call.options?.remoteCallerNumber || "Unknown"}`);
              if (window.opener) {
                try {
                  window.opener.dispatchEvent(new CustomEvent('telnyx-incoming-call', {
                    detail: { call, remoteNumber: call.options?.remoteCallerNumber }
                  }));
                } catch (e) {}
              }
            }
          }
          break;
        case "trying":
          if (isOutboundCallRef.current) setCallStateSync("connecting");
          break;
        case "early":
        case "ringing":
          if (isInbound && !curIncoming && !isOutboundCallRef.current) {
            setIncomingCallSync(call);
            setCallStateSync("incoming");
            playRingtone();
          } else if (isOutboundCallRef.current) {
            setCallStateSync("ringing");
          }
          break;
        case "active":
          stopRingtone();
          if (call.remoteStream && audioRef.current) {
            audioRef.current.srcObject = call.remoteStream;
            audioRef.current.play().catch(e => console.log("Audio play error:", e));
            startRecording(call.remoteStream);
          }
          setCallStateSync("active");
          setActiveCallSync(call);
          setIncomingCallSync(null);
          startCallDuration();
          // Create call log entry immediately when call goes active
          createCallLog(call);
          break;
        case "held":
          setCallStateSync("held");
          setIsHeld(true);
          break;
        case "hangup":
        case "destroy":
          stopRingtone();
          stopRecording();
          if (audioRef.current) audioRef.current.srcObject = null;
          // If it was the waiting call that hung up, just clear it
          if (waitingCallRef.current && call === waitingCallRef.current) {
            setWaitingCallSync(null);
            setWaitingCallerInfo(null);
            toast.info("Waiting call ended");
          } else {
            // Main call ended — if there's a waiting call, promote it
            if (waitingCallRef.current) {
              const waiting = waitingCallRef.current;
              setWaitingCallSync(null);
              setWaitingCallerInfo(null);
              // Show the waiting call as the new incoming call
              setIncomingCallSync(waiting);
              setCallStateSync("incoming");
              playRingtone();
            } else {
              handleCallEnded();
            }
          }
          break;
        default:
          if (isInbound && !curIncoming && !curActive && !isOutboundCallRef.current) {
            setIncomingCallSync(call);
            setCallStateSync("incoming");
            playRingtone();
          }
          break;
      }
  };

  // Keep the ref current on every render
  handleCallNotificationRef.current = handleCallNotification;

  const startCallDuration = () => {
    setCallDuration(0);
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
    }
    durationInterval.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  };

  const stopCallDuration = () => {
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }
  };

  const makeCall = async (numberToCall) => {
    const number = numberToCall || phoneNumber;
    const client = telnyxClientRef.current;
    if (!number || !client) {
      toast.error("Enter a phone number");
      return;
    }

    let formattedNumber = number.trim();

    // If it's a SIP URI, pass it through as-is
    if (formattedNumber.startsWith("sip:")) {
      // no formatting needed
    } else {
      formattedNumber = formattedNumber.replace(/[\s\-\(\)]/g, "");
      if (!formattedNumber.startsWith("+")) {
        if (formattedNumber.length === 10) {
          formattedNumber = "+1" + formattedNumber;
        } else if (formattedNumber.length === 11 && formattedNumber.startsWith("1")) {
          formattedNumber = "+" + formattedNumber;
        }
      }
    }

    console.log("=== POPUP MAKING CALL ===");
    console.log("Destination:", formattedNumber);
    console.log("Selected Caller ID from state:", selectedCallerId);
    console.log("Caller ID type:", typeof selectedCallerId);

    try {
      isOutboundCallRef.current = true;
      setCallStateSync("connecting");
      setPhoneNumber(formattedNumber);
      // Duck radio on outbound call
      localStorage.setItem("a2g_call_active", "true");
      window.dispatchEvent(new Event("a2g_call_start"));
      const callOptions = {
        destinationNumber: formattedNumber,
        callerNumber: selectedCallerId,
        audio: true,
        video: false,
      };
      console.log("Popup call options:", JSON.stringify(callOptions, null, 2));
      const call = telnyxClientRef.current.newCall(callOptions);
      setActiveCallSync(call);
    } catch (error) {
      console.error("Call failed:", error);
      toast.error("Call failed");
      setCallStateSync("idle");
      isOutboundCallRef.current = false;
    }
  };

  const hangupCall = () => {
    stopRingtone();
    stopHoldMusic();
    try {
      if (activeCallRef.current) activeCallRef.current.hangup();
      else if (incomingCallRef.current) incomingCallRef.current.hangup();
    } catch (error) {
      console.error("Hangup error:", error);
    }
    playDisconnectSound();
    stopCallDuration();
    setCallStateSync("ended");
    setTimeout(() => {
      setCallStateSync("idle");
      setCallDuration(0);
      setActiveCallSync(null);
      setIncomingCallSync(null);
      setIsHeld(false);
      isOutboundCallRef.current = false;
    }, 1500);
  };

  const handleCallEnded = () => {
    const duration = callDurationRef.current;
    stopCallDuration();
    playDisconnectSound();
    finalizeCallLog(duration);
    callLogIdRef.current = null;
    // Restore radio volume
    localStorage.setItem("a2g_call_active", "false");
    window.dispatchEvent(new Event("a2g_call_end"));
    setCallStateSync("ended");
    setWaitingCallSync(null);
    setWaitingCallerInfo(null);
    setTimeout(() => {
      setCallStateSync("idle");
      setCallDuration(0);
      setIsMuted(false);
      setIsHeld(false);
      setActiveCallSync(null);
      setIncomingCallSync(null);
      isOutboundCallRef.current = false;
    }, 1500);
  };

  const answerCall = useCallback(() => {
    const call = incomingCallRef.current;
    console.log("answerCall - incomingCallRef:", call);
    stopRingtone();
    if (call) {
      try {
        call.answer();
        setActiveCallSync(call);
        setCallStateSync("active");  // immediate UI feedback
      } catch (e) {
        console.error("Answer failed:", e);
        toast.error("Could not answer call");
      }
    } else {
      console.warn("answerCall: no incomingCall in ref");
    }
  }, []);

  const declineCall = useCallback(() => {
    const call = incomingCallRef.current;
    stopRingtone();
    if (call) {
      try { call.hangup(); } catch (e) {}
    }
    setIncomingCallSync(null);
    setCallStateSync("idle");
  }, []);

  // ── Call Waiting Actions ──────────────────────────────────────────────────
  const holdAndAnswer = useCallback(() => {
    const current = activeCallRef.current;
    const waiting = waitingCallRef.current;
    if (!waiting) return;
    try {
      if (current) current.hold();
    } catch (e) {}
    try {
      waiting.answer();
      // current call becomes the "waiting" (held) call; waiting becomes active
      setWaitingCallSync(current);  // old active goes to waiting slot (held)
      setActiveCallSync(waiting);
      setCallStateSync("active");
      setIsHeld(false);
      startCallDuration();
      toast.success("Switched to new call — previous call on hold");
    } catch (e) {
      console.error("holdAndAnswer failed:", e);
      toast.error("Could not answer waiting call");
    }
  }, []);

  const endAndAnswer = useCallback(() => {
    const current = activeCallRef.current;
    const waiting = waitingCallRef.current;
    if (!waiting) return;
    try { if (current) current.hangup(); } catch (e) {}
    try {
      waiting.answer();
      setActiveCallSync(waiting);
      setWaitingCallSync(null);
      setWaitingCallerInfo(null);
      setCallStateSync("active");
      setIsHeld(false);
      startCallDuration();
      toast.success("Answered waiting call");
    } catch (e) {
      console.error("endAndAnswer failed:", e);
      toast.error("Could not answer waiting call");
    }
  }, []);

  const declineWaiting = useCallback(() => {
    const waiting = waitingCallRef.current;
    try { if (waiting) waiting.hangup(); } catch (e) {}
    setWaitingCallSync(null);
    setWaitingCallerInfo(null);
    toast.info("Waiting call declined");
  }, []);

  const swapCalls = useCallback(() => {
    const current = activeCallRef.current;
    const waiting = waitingCallRef.current;
    if (!current || !waiting) return;
    try {
      current.hold();
      waiting.unhold();
      setActiveCallSync(waiting);
      setWaitingCallSync(current);
      setIsHeld(false);
      toast.info("Calls swapped");
    } catch (e) {
      console.error("swapCalls failed:", e);
      toast.error("Could not swap calls");
    }
  }, []);

  const toggleMute = () => {
    const call = activeCallRef.current;
    if (call) {
      if (isMuted) { call.unmuteAudio(); } else { call.muteAudio(); }
      setIsMuted(!isMuted);
    }
  };

  const toggleHold = () => {
    const call = activeCallRef.current;
    if (call) {
      if (isHeld) {
        call.unhold();
        stopHoldMusic();
        setIsHeld(false);
        toast.success("Call resumed");
      } else {
        call.hold();
        playHoldMusic();
        setIsHeld(true);
        toast.info("Call on hold");
      }
    }
  };

  const playHoldMusic = () => {
    if (!queueSettings?.hold_music_url) {
      console.log("No hold music configured");
      return;
    }

    try {
      stopHoldMusic();
      console.log("Playing hold music:", queueSettings.hold_music_url);
      
      holdMusicRef.current = new Audio(queueSettings.hold_music_url);
      holdMusicRef.current.loop = true;
      holdMusicRef.current.volume = 0.5;
      holdMusicRef.current.play().catch(e => {
        console.error("Failed to play hold music:", e);
        toast.error("Failed to play hold music");
      });
    } catch (error) {
      console.error("Hold music error:", error);
    }
  };

  const stopHoldMusic = () => {
    if (holdMusicRef.current) {
      holdMusicRef.current.pause();
      holdMusicRef.current.currentTime = 0;
      holdMusicRef.current = null;
    }
  };

  const forwardCall = () => {
    if (!forwardNumber || !activeCall) {
      toast.error("Enter a number to forward to");
      return;
    }

    let formattedNumber = forwardNumber.replace(/[\s\-\(\)]/g, "");
    if (!formattedNumber.startsWith("+")) {
      if (formattedNumber.length === 10) {
        formattedNumber = "+1" + formattedNumber;
      } else if (formattedNumber.length === 11 && formattedNumber.startsWith("1")) {
        formattedNumber = "+" + formattedNumber;
      }
    }

    try {
      if (activeCall.transfer) {
        activeCall.transfer(formattedNumber);
        toast.success(`Forwarding call to ${formattedNumber}`);
      } else {
        toast.info(`Initiating transfer to ${formattedNumber}...`);
      }
      setShowForwardDialog(false);
      setForwardNumber("");
    } catch (error) {
      console.error("Forward error:", error);
      toast.error("Failed to forward call");
    }
  };

  const handleKeypadClick = (digit) => {
    // Play keypress sound
    if (keypressSoundRef.current) {
      keypressSoundRef.current.currentTime = 0;
      keypressSoundRef.current.play().catch(() => {});
    }
    
    setPhoneNumber((prev) => prev + digit);
    if (activeCall) {
      activeCall.dtmf(digit);
    }
  };

  const handleBackspace = () => {
    setPhoneNumber((prev) => prev.slice(0, -1));
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (name) => {
    const colors = [
      "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-pink-500",
      "bg-orange-500", "bg-teal-500", "bg-indigo-500", "bg-rose-500",
    ];
    const index = name ? name.charCodeAt(0) % colors.length : 0;
    return colors[index];
  };

  const keypadButtons = [
    { digit: "1", letters: "" },
    { digit: "2", letters: "ABC" },
    { digit: "3", letters: "DEF" },
    { digit: "4", letters: "GHI" },
    { digit: "5", letters: "JKL" },
    { digit: "6", letters: "MNO" },
    { digit: "7", letters: "PQRS" },
    { digit: "8", letters: "TUV" },
    { digit: "9", letters: "WXYZ" },
    { digit: "*", letters: "" },
    { digit: "0", letters: "+" },
    { digit: "#", letters: "" },
  ];

  // Show loading while checking auth
  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/70">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Show access denied if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center p-8 bg-slate-800 rounded-2xl max-w-sm mx-4">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldOff className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-white text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-white/60 text-sm mb-6">
            You must be logged in to use the dialer. Please log in through the main application.
          </p>
          <Button
            onClick={() => window.close()}
            className="bg-blue-600 hover:bg-blue-500 text-white"
          >
            Close Window
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <audio ref={audioRef} autoPlay playsInline />
      <Toaster position="top-center" richColors />
      
      {/* Incoming Call Screen - Truecaller Style - ALWAYS SHOW IF INCOMING CALL */}
      {incomingCall && (
        <IncomingCallScreen
          incomingCall={incomingCall}
          incomingCallerInfo={incomingCallerInfo}
          isNumberBlocked={isNumberBlocked}
          blockNumber={blockNumber}
          unblockNumber={unblockNumber}
          answerCall={answerCall}
          declineCall={declineCall}
          getAvatarColor={getAvatarColor}
          getInitials={getInitials}
        />
      )}

      {/* Active Call Screen - Only show if NO incoming call */}
      {!incomingCall && (callState === "connecting" || callState === "ringing" || callState === "active" || callState === "held" || callState === "ended") && (
        <div className="flex-1 flex flex-col bg-gradient-to-b from-blue-600 via-blue-800 to-slate-900">

          {/* ── Call Waiting Banner ── */}
          {waitingCall && (callState === "active" || callState === "held") && (
            <div className="bg-amber-500 px-4 py-2.5">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-white text-xs font-bold uppercase tracking-wide">Call Waiting</span>
                <span className="text-white/80 text-xs ml-1">
                  {waitingCallerInfo?.name || waitingCall.options?.remoteCallerNumber || "Unknown"}
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={holdAndAnswer}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold py-1.5 rounded-lg transition-colors"
                  data-testid="hold-and-answer-btn">
                  Hold & Answer
                </button>
                <button onClick={endAndAnswer}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold py-1.5 rounded-lg transition-colors"
                  data-testid="end-and-answer-btn">
                  End & Answer
                </button>
                <button onClick={declineWaiting}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold py-1.5 rounded-lg transition-colors"
                  data-testid="decline-waiting-btn">
                  Decline
                </button>
              </div>
            </div>
          )}

          {/* Held call indicator — when 2nd call is active */}
          {waitingCall && (callState === "active" || callState === "held") && (
            <div className="bg-slate-700/60 px-4 py-1.5 flex items-center justify-between">
              <span className="text-yellow-400 text-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                Previous call on hold
              </span>
              <button onClick={swapCalls}
                className="text-white/80 text-xs border border-white/30 rounded-md px-2.5 py-1 hover:bg-white/10 transition-colors"
                data-testid="swap-calls-btn">
                Swap Calls
              </button>
            </div>
          )}

          {/* Top Section */}
          <div className="text-center pt-8 pb-4">
            <p className="text-white/70 text-sm mb-1">
              {callState === "connecting" && "Calling..."}
              {callState === "ringing" && "Ringing..."}
              {(callState === "active" || callState === "held") && formatDuration(callDuration)}
              {callState === "ended" && "Call Ended"}
            </p>
            <p className="text-white text-xl font-semibold">{phoneNumber || "Unknown"}</p>
          </div>

          {/* Avatar */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-28 h-28 rounded-full bg-slate-700/50 flex items-center justify-center ring-4 ring-white/10">
              <User className="w-14 h-14 text-white/50" />
            </div>
            {isHeld && (
              <span className="mt-4 px-4 py-1 bg-yellow-500/20 text-yellow-400 text-sm rounded-full">
                On Hold
              </span>
            )}
          </div>

          {/* Call Controls */}
          {(callState === "active" || callState === "held") && (
            <div className="grid grid-cols-3 gap-4 px-8 mb-6">
              <button
                onClick={toggleMute}
                className={`flex flex-col items-center p-4 rounded-2xl ${
                  isMuted ? "bg-white text-slate-900" : "bg-slate-800/50 text-white"
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  isMuted ? "bg-slate-900" : "bg-slate-700"
                }`}>
                  {isMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6" />}
                </div>
                <span className="text-xs mt-2">Mute</span>
              </button>

              <button
                onClick={() => setShowKeypad(!showKeypad)}
                className="flex flex-col items-center p-4 rounded-2xl bg-slate-800/50 text-white"
              >
                <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center">
                  <Grid3X3 className="w-6 h-6" />
                </div>
                <span className="text-xs mt-2">Keypad</span>
              </button>

              <button
                onClick={() => setIsSpeaker(!isSpeaker)}
                className={`flex flex-col items-center p-4 rounded-2xl ${
                  isSpeaker ? "bg-white text-slate-900" : "bg-slate-800/50 text-white"
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  isSpeaker ? "bg-slate-900" : "bg-slate-700"
                }`}>
                  <Volume2 className={`w-6 h-6 ${isSpeaker ? "text-white" : ""}`} />
                </div>
                <span className="text-xs mt-2">Speaker</span>
              </button>

              <button className="flex flex-col items-center p-4 rounded-2xl bg-slate-800/50 text-white opacity-50" disabled>
                <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center">
                  <UserPlus className="w-6 h-6" />
                </div>
                <span className="text-xs mt-2">Add call</span>
              </button>

              <button
                onClick={toggleHold}
                className={`flex flex-col items-center p-4 rounded-2xl ${
                  isHeld ? "bg-white text-slate-900" : "bg-slate-800/50 text-white"
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  isHeld ? "bg-slate-900" : "bg-slate-700"
                }`}>
                  {isHeld ? <Play className="w-6 h-6 text-white" /> : <Pause className="w-6 h-6" />}
                </div>
                <span className="text-xs mt-2">Hold</span>
              </button>

              <button className="flex flex-col items-center p-4 rounded-2xl bg-slate-800/50 text-white opacity-50" disabled>
                <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <span className="text-xs mt-2">Message</span>
              </button>
            </div>
          )}

          {/* Bottom Buttons */}
          <div className="flex items-center justify-center gap-4 pb-8">
            {(callState === "active" || callState === "held") && (
              <button
                onClick={() => setShowForwardDialog(true)}
                className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center"
              >
                <PhoneForwarded className="w-6 h-6 text-white" />
              </button>
            )}
            <button
              onClick={hangupCall}
              className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg"
            >
              <PhoneOff className="w-7 h-7 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Idle State - Smart Dialer */}
      {callState === "idle" && !incomingCall && (
        <div className="flex-1 flex flex-col">
          {/* Matching Contacts */}
          {matchingContacts.length > 0 && (
            <div className="bg-slate-800">
              {matchingContacts.map((contact, idx) => (
                <div
                  key={contact.id}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-700 transition-colors ${
                    idx === 0 ? "bg-teal-600" : ""
                  }`}
                  onClick={() => makeCall(contact.phone_number)}
                >
                  <div className={`w-10 h-10 rounded-full ${idx === 0 ? "bg-white/20" : getAvatarColor(contact.name)} flex items-center justify-center`}>
                    {contact.avatar ? (
                      <img src={contact.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <span className="text-white font-semibold text-sm">
                        {getInitials(contact.name)}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-semibold">{contact.name}</p>
                    <p className={`text-sm ${idx === 0 ? "text-teal-100" : "text-slate-400"}`}>
                      {contact.phone_number}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        makeCall(contact.phone_number);
                      }}
                      className="p-2 rounded-full hover:bg-white/10"
                    >
                      <Phone className="w-5 h-5 text-green-400" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/messages/${encodeURIComponent(contact.phone_number)}`);
                      }}
                      className="p-2 rounded-full hover:bg-white/10"
                    >
                      <MessageSquare className="w-5 h-5 text-blue-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Caller ID Selector */}
          <div className="bg-slate-800 px-6 pt-3 pb-2 border-b border-slate-700">
            <label className="text-xs text-slate-400 mb-1 block">Outbound Caller ID</label>
            <Select
              value={selectedCallerId}
              onValueChange={(value) => {
                console.log("=== POPUP CALLER ID CHANGED ===");
                console.log("New Caller ID:", value);
                setSelectedCallerId(value);
              }}
            >
              <SelectTrigger className="w-full bg-slate-700 border-slate-600 text-white" data-testid="popup-caller-id-selector">
                <SelectValue placeholder="Select caller ID" />
              </SelectTrigger>
              <SelectContent>
                {availableCallerIds.map((callerId) => (
                  <SelectItem key={callerId.value} value={callerId.value}>
                    {callerId.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 mt-1">
              Selected: {selectedCallerId}
            </p>
          </div>

          {/* Number Display */}
          <div className="bg-slate-800 px-6 py-4">
            <div className="flex items-center justify-center">
              <Input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Enter number"
                className="text-3xl font-light tracking-wider text-center bg-transparent border-none text-teal-400 placeholder:text-slate-500 focus-visible:ring-0 focus-visible:ring-offset-0"
                disabled={callState !== "idle"}
                autoFocus
              />
            </div>
          </div>

          {/* Connection Status */}
          <div className="flex justify-center py-2 bg-slate-800 border-t border-slate-700">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs ${
              isConnected ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
            }`}>
              <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-400" : "bg-red-400"}`} />
              {isConnected ? "Connected" : "Disconnected"}
            </div>
          </div>

          {/* Keypad */}
          <div className="flex-1 bg-slate-900 p-4">
            <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto">
              {keypadButtons.map(({ digit, letters }) => (
                <button
                  key={digit}
                  className="h-16 flex flex-col items-center justify-center text-white hover:bg-slate-800 rounded-full transition-colors active:bg-slate-700"
                  onClick={() => handleKeypadClick(digit)}
                >
                  <span className="text-2xl font-light">{digit}</span>
                  {letters && <span className="text-[10px] text-slate-500 tracking-wider">{letters}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
            <button className="p-3 text-slate-400">
              <Menu className="w-6 h-6" />
            </button>
            
            <button
              className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 transition-colors disabled:opacity-50"
              onClick={() => makeCall()}
              disabled={!isConnected || !phoneNumber}
            >
              <Phone className="w-7 h-7 text-white" />
            </button>

            {phoneNumber ? (
              <button 
                className="p-3 text-slate-400 hover:text-white"
                onClick={handleBackspace}
              >
                <Delete className="w-6 h-6" />
              </button>
            ) : (
              <button className="p-3 text-slate-400">
                <Grid3X3 className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* In-call Keypad Overlay */}
      {showKeypad && (callState === "active" || callState === "held") && (
        <div className="absolute inset-0 bg-slate-900/95 flex flex-col p-4 z-40">
          <div className="flex justify-between items-center mb-4">
            <span className="text-white font-semibold">Keypad</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowKeypad(false)}
              className="text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-3 flex-1 max-w-xs mx-auto">
            {keypadButtons.map(({ digit, letters }) => (
              <button
                key={digit}
                className="h-16 flex flex-col items-center justify-center bg-slate-800 hover:bg-slate-700 text-white rounded-xl"
                onClick={() => handleKeypadClick(digit)}
              >
                <span className="text-2xl font-semibold">{digit}</span>
                {letters && <span className="text-[10px] text-slate-400">{letters}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Forward Call Dialog */}
      <Dialog open={showForwardDialog} onOpenChange={setShowForwardDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PhoneForwarded className="w-5 h-5 text-emerald-400" />
              Forward Call
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-400 mb-2 block">
                Enter number to forward to:
              </label>
              <Input
                type="tel"
                value={forwardNumber}
                onChange={(e) => setForwardNumber(e.target.value)}
                placeholder="+1 (555) 555-5555"
                className="bg-slate-900 border-slate-600 text-white"
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowForwardDialog(false)}
                className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </Button>
              <Button
                onClick={forwardCall}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500"
              >
                <PhoneForwarded className="w-4 h-4 mr-2" />
                Forward
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DialerPopup;
