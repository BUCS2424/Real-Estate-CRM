import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../App";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { ScrollArea } from "../components/ui/scroll-area";
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
  PhoneIncoming,
  PhoneOutgoing,
  Mic,
  MicOff,
  Pause,
  Play,
  PhoneForwarded,
  Delete,
  Clock,
  User,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

const DIAL_KEYS = [
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

const DialerPage = () => {
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCallerId, setSelectedCallerId] = useState("");
  const [callState, setCallState] = useState("idle");
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isHeld, setIsHeld] = useState(false);
  const [recentCalls, setRecentCalls] = useState([]);
  const [telnyxClient, setTelnyxClient] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const [forwardNumber, setForwardNumber] = useState("");
  const [credentials, setCredentials] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [incomingCallerInfo, setIncomingCallerInfo] = useState(null);
  const [matchingContacts, setMatchingContacts] = useState([]);
  const [queueSettings, setQueueSettings] = useState(null);
  const [currentCallStartTime, setCurrentCallStartTime] = useState(null);
  const [currentCallNumber, setCurrentCallNumber] = useState(null);
  const [currentCallDirection, setCurrentCallDirection] = useState(null);

  // Available caller IDs — loaded from user's credentials
  const [availableCallerIds, setAvailableCallerIds] = useState([]);
  
  const audioRef = useRef(null);
  const disconnectSoundRef = useRef(null);
  const keypressSoundRef = useRef(null);
  const ringtoneRef = useRef(null);
  const holdMusicRef = useRef(null);
  const durationInterval = useRef(null);
  const isOutboundCallRef = useRef(false);
  const callDurationRef = useRef(0); // mirror of callDuration, safe in event callbacks
  
  // Call recording refs
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const localStreamRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState(null);

  // Ringtone file mapping
  const ringtoneFiles = {
    "happy-go-lucky": "/sounds/happy-go-lucky.mp3",
    "classic": "/sounds/classic-ring.mp3",
    "modern": "/sounds/modern-ring.mp3",
    "gentle": "/sounds/gentle-ring.mp3",
    "urgent": "/sounds/urgent-ring.mp3",
  };

  // Initialize sounds
  useEffect(() => {
    disconnectSoundRef.current = new Audio('/sounds/disconnect.ogg');
    disconnectSoundRef.current.volume = 0.7;
    keypressSoundRef.current = new Audio('/sounds/keypress.mp3');
    keypressSoundRef.current.volume = 0.5;
  }, []);

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
        const url = URL.createObjectURL(blob);
        setRecordingUrl(url);
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
  const uploadRecording = async (blob) => {
    try {
      const formData = new FormData();
      formData.append('file', blob, `call_${Date.now()}.webm`);
      formData.append('call_id', activeCall?.id || 'unknown');
      
      const response = await apiClient.post('/calls/upload-recording', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.url) {
        console.log("Recording uploaded:", response.data.url);
        // Update the call log with the recording URL
        if (activeCall?.id) {
          await apiClient.put(`/calls/${response.data.call_id}/recording`, {
            recording_url: response.data.url
          });
        }
      }
    } catch (error) {
      console.error("Failed to upload recording:", error);
    }
  };

  // Play ringtone for incoming calls
  const playRingtone = () => {
    // Use default ringtone or get from settings
    const ringtoneFile = ringtoneFiles["happy-go-lucky"] || "/sounds/happy-go-lucky.mp3";
    
    // Stop any existing ringtone first
    stopRingtone();
    
    ringtoneRef.current = new Audio(ringtoneFile);
    ringtoneRef.current.loop = true;
    ringtoneRef.current.volume = 0.8;
    ringtoneRef.current.play().catch(e => console.log("Could not play ringtone:", e));
  };

  // Stop ringtone
  const stopRingtone = () => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
      ringtoneRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRingtone();
      stopRecording();
      stopHoldMusic();
    };
  }, []);

  // Load contacts for caller ID
  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const response = await apiClient.get("/contacts");
      setContacts(response.data);
    } catch (error) {
      console.error("Failed to load contacts:", error);
    }
  };

  // Lookup caller info from contacts
  const lookupCallerInfo = (number) => {
    if (!number) return { name: null, isContact: false, company: null };
    
    const cleanNumber = number.replace(/\D/g, "");
    const last10 = cleanNumber.slice(-10);
    
    const contact = contacts.find(c => {
      const contactClean = c.phone_number.replace(/\D/g, "");
      const contactLast10 = contactClean.slice(-10);
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
      };
    }
    
    return { name: null, isContact: false, company: null };
  };

  // Update caller info when incoming call arrives
  useEffect(() => {
    if (incomingCall) {
      const callerNumber = incomingCall.options?.remoteCallerNumber;
      if (callerNumber) {
        const info = lookupCallerInfo(callerNumber);
        setIncomingCallerInfo(info);
      }
    } else {
      setIncomingCallerInfo(null);
    }
  }, [incomingCall, contacts]);

  // T9-style name matching for contact search
  const matchT9 = (name, digits) => {
    const t9Map = {
      '2': 'abc', '3': 'def', '4': 'ghi', '5': 'jkl',
      '6': 'mno', '7': 'pqrs', '8': 'tuv', '9': 'wxyz'
    };
    
    const cleanDigits = digits.replace(/[^2-9]/g, '');
    if (cleanDigits.length < 2) return false;
    
    const lowerName = name.toLowerCase();
    let nameIndex = 0;
    
    for (let i = 0; i < cleanDigits.length && nameIndex < lowerName.length; i++) {
      const digit = cleanDigits[i];
      const letters = t9Map[digit] || '';
      
      // Skip spaces in name
      while (nameIndex < lowerName.length && lowerName[nameIndex] === ' ') {
        nameIndex++;
      }
      
      if (nameIndex >= lowerName.length) return false;
      
      // Check if current character matches any letter for this digit
      if (!letters.includes(lowerName[nameIndex])) {
        return false;
      }
      nameIndex++;
    }
    
    return true;
  };

  // Search contacts as user types in dialer
  useEffect(() => {
    if (!phoneNumber || phoneNumber.length < 2 || callState !== "idle") {
      setMatchingContacts([]);
      return;
    }

    const searchNumber = phoneNumber.replace(/[\s\-\(\)\+]/g, "");
    const matches = contacts.filter(contact => {
      const contactNumber = contact.phone_number.replace(/[\s\-\(\)\+]/g, "");
      const contactName = contact.name.toLowerCase();
      const searchLower = phoneNumber.toLowerCase();
      
      // Match by: number contains search, name contains search (direct), or T9 match
      return contactNumber.includes(searchNumber) || 
             contactName.includes(searchLower) ||
             matchT9(contact.name, phoneNumber);
    }).slice(0, 5); // Show max 5 matches

    setMatchingContacts(matches);
  }, [phoneNumber, contacts, callState]);

  // Play disconnect sound
  const playDisconnectSound = () => {
    if (disconnectSoundRef.current) {
      disconnectSoundRef.current.currentTime = 0;
      disconnectSoundRef.current.play().catch(e => {
        console.log("Could not play disconnect sound:", e);
      });
    }
  };

  // Load credentials and recent calls
  useEffect(() => {
    loadCredentials();
    loadRecentCalls();
    loadCallQueueSettings();
  }, []);

  const loadCallQueueSettings = async () => {
    try {
      const response = await apiClient.get("/admin/call-queue/settings");
      setQueueSettings(response.data);
      console.log("Call queue settings loaded:", response.data);
    } catch (error) {
      console.error("Failed to load call queue settings:", error);
    }
  };

  const loadCredentials = async () => {
    try {
      const response = await apiClient.get("/webrtc/token");
      setCredentials(response.data);
      // Build available caller IDs from the user's assigned pool
      const pool = response.data.available_caller_ids || [];
      if (pool.length > 0) {
        const ids = pool.map((c) => ({
          value: c.number,
          label: c.label || c.number,
        }));
        setAvailableCallerIds(ids);
        setSelectedCallerId(ids[0].value);
      } else if (response.data.outbound_caller_id) {
        // fall back to the single outbound_caller_id
        setAvailableCallerIds([{ value: response.data.outbound_caller_id, label: response.data.outbound_caller_id }]);
        setSelectedCallerId(response.data.outbound_caller_id);
      }
      if (response.data.configured) {
        initializeTelnyxClient(response.data);
      }
    } catch (error) {
      console.error("Failed to load credentials:", error);
    }
  };

  const loadRecentCalls = async () => {
    try {
      const response = await apiClient.get("/calls");
      setRecentCalls(response.data.slice(0, 5));
    } catch (error) {
      console.error("Failed to load calls:", error);
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
      
      console.log("=== INITIALIZING TELNYX CLIENT ===");
      console.log("SIP Username:", creds.sip_username);
      console.log("Voice Connection ID:", creds.voice_connection_id || "not set");
      console.log("Phone Number:", creds.phone_number);
      
      const client = new TelnyxRTC(clientConfig);

      client.on("telnyx.ready", () => {
        console.log("=== TELNYX READY ===");
        console.log("Client connected:", client.connected);
        toast.success("Phone system connected");
      });

      client.on("telnyx.error", (error) => {
        console.error("=== TELNYX ERROR ===", error);
        toast.error("Connection error: " + (error?.message || "Unknown error"));
      });

      client.on("telnyx.notification", (notification) => {
        console.log("=== TELNYX NOTIFICATION ===", notification.type);
        // Don't JSON.stringify as it can fail with circular references
        console.log("Notification object:", notification);
        handleCallNotification(notification);
      });

      client.on("telnyx.socket.error", (error) => {
        console.error("=== TELNYX SOCKET ERROR ===", error);
        toast.error("Socket connection error");
      });
      
      client.on("telnyx.socket.close", () => {
        console.log("=== TELNYX SOCKET CLOSED ===");
      });

      await client.connect();
      console.log("=== CLIENT CONNECTED ===");
      console.log("Client state after connect:", client.connected);
      setTelnyxClient(client);

      // NOTE: Do NOT set client.remoteElement or client.localElement here
      // It causes "Converting circular structure to JSON" errors in the SDK
      // Audio will be handled in the call notification handler
      
    } catch (error) {
      console.error("Failed to initialize Telnyx:", error);
      toast.error("Failed to connect: " + (error?.message || "Unknown error"));
    }
  }, []);

  const handleCallNotification = (notification) => {
    console.log("=== CALL NOTIFICATION ===");
    console.log("Type:", notification.type);
    console.log("Full notification:", notification);
    
    if (notification.type === "callUpdate") {
      const call = notification.call;
      console.log("Call state:", call.state);
      console.log("Call direction:", call.direction);
      console.log("Call ID:", call.id);
      console.log("Call options:", call.options);
      console.log("Call cause:", call.cause);
      console.log("Call causeCode:", call.causeCode);
      
      // Inbound detection - multiple methods:
      const hasRemoteCaller = !!call.options?.remoteCallerNumber;
      const isInbound = call.direction === "inbound" || 
                        (hasRemoteCaller && !isOutboundCallRef.current && callState === "idle");
      
      console.log("=== INBOUND DETECTION ===");
      console.log("Call direction:", call.direction);
      console.log("isOutboundCall ref:", isOutboundCallRef.current);
      console.log("hasRemoteCaller:", hasRemoteCaller);
      console.log("Is inbound call:", isInbound);
      
      // Log any error/hangup cause
      if (call.cause || call.causeCode) {
        console.error("Call terminated with cause:", call.cause, "Code:", call.causeCode);
        if (call.cause !== "NORMAL_CLEARING") {
          toast.error(`Call failed: ${call.cause || call.causeCode}`);
        }
      }
      
      // Handle remote audio stream
      if (call.remoteStream && audioRef.current) {
        console.log("Setting remote audio stream");
        audioRef.current.srcObject = call.remoteStream;
        audioRef.current.play().catch(e => console.log("Audio play error:", e));
      }
      
      switch (call.state) {
        case "new":
          console.log("Call state: NEW");
          if (isInbound && !isOutboundCallRef.current) {
            console.log("=== INCOMING CALL DETECTED ===");
            setIncomingCall(call);
            setCallState("ringing");
            playRingtone();
            toast.info(`Incoming call from ${call.options?.remoteCallerNumber || "Unknown"}`);
          }
          break;
        case "trying":
          console.log("Call state: TRYING (dialing)");
          if (isOutboundCallRef.current) {
            setCallState("connecting");
          }
          break;
        case "early":
          console.log("Call state: EARLY (remote phone ringing)");
          if (isOutboundCallRef.current) {
            setCallState("ringing");
            toast.info("Remote phone is ringing...");
          }
          break;
        case "ringing":
          console.log("Call state: RINGING");
          if (isInbound && !incomingCall && !isOutboundCallRef.current) {
            console.log("=== INCOMING CALL DETECTED (ringing state) ===");
            setIncomingCall(call);
            playRingtone();
          } else if (isOutboundCallRef.current) {
            // Outbound ringing
          }
          setCallState("ringing");
          break;
        case "active":
          console.log("Call state: ACTIVE (call connected)");
          stopRingtone(); // Stop ringtone when call becomes active
          if (call.remoteStream && audioRef.current) {
            audioRef.current.srcObject = call.remoteStream;
            audioRef.current.play().catch(e => console.log("Audio play error:", e));
            // Start recording when call becomes active
            startRecording(call.remoteStream);
          }
          setCallState("active");
          setActiveCall(call);
          setIncomingCall(null);
          startCallDuration();
          
          // Track call details for logging
          setCurrentCallStartTime(Date.now());
          setCurrentCallNumber(call.options?.remoteCallerNumber || phoneNumber || "Unknown");
          setCurrentCallDirection(call.direction === "inbound" ? "inbound" : "outbound");
          
          break;
        case "held":
          console.log("Call state: HELD");
          setCallState("held");
          setIsHeld(true);
          break;
        case "hangup":
        case "destroy":
          console.log("Call state: ENDED", call.cause);
          stopRingtone(); // Stop ringtone on hangup
          stopRecording(); // Stop recording on hangup
          if (audioRef.current) {
            audioRef.current.srcObject = null;
          }
          handleCallEnded(call);
          break;
        default:
          console.log("Unknown call state:", call.state);
          if (isInbound && !incomingCall && !activeCall && !isOutboundCallRef.current) {
            console.log("=== INCOMING CALL DETECTED (unknown state) ===");
            setIncomingCall(call);
            setCallState("ringing");
            playRingtone();
          }
          break;
      }
    }
  };

  const startCallDuration = () => {
    callDurationRef.current = 0;
    setCallDuration(0);
    if (durationInterval.current) clearInterval(durationInterval.current);
    durationInterval.current = setInterval(() => {
      setCallDuration((prev) => {
        callDurationRef.current = prev + 1;
        return prev + 1;
      });
    }, 1000);
  };

  const stopCallDuration = () => {
    console.log("=== STOPPING CALL DURATION TIMER ===");
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }
  };

  const handleCallEnded = async (call) => {
    stopCallDuration();
    playDisconnectSound();
    // Log with ref value — always current, never stale
    const duration = callDurationRef.current;
    try {
      await apiClient.post("/calls", {
        remote_number: call?.options?.destinationNumber || call?.options?.remoteCallerNumber || phoneNumber,
        direction: call?.direction || "outbound",
        duration,
        status: "completed",
      });
      loadRecentCalls();
    } catch (error) {
      console.error("Failed to log call:", error);
    }

    setCallState("ended");
    setTimeout(() => {
      setCallState("idle");
      setCallDuration(0);
      callDurationRef.current = 0;
      setIsMuted(false);
      setIsHeld(false);
      setActiveCall(null);
      setIncomingCall(null);
      isOutboundCallRef.current = false;
    }, 2000);
  };

  const handleDigitPress = (digit) => {
    // Play keypress sound
    if (keypressSoundRef.current) {
      keypressSoundRef.current.currentTime = 0;
      keypressSoundRef.current.play().catch(() => {});
    }
    
    if (callState === "idle") {
      setPhoneNumber((prev) => prev + digit);
    } else if (activeCall) {
      activeCall.dtmf(digit);
    }
  };

  const handleBackspace = () => {
    setPhoneNumber((prev) => prev.slice(0, -1));
  };

  const makeCall = async () => {
    if (!phoneNumber || !telnyxClient) {
      toast.error("Please enter a phone number");
      return;
    }

    if (!credentials?.configured) {
      toast.error("Please configure your Telnyx credentials in Settings");
      navigate("/settings");
      return;
    }

    // Check connection state
    if (!telnyxClient.connected) {
      toast.error("Phone system not connected. Please wait...");
      console.error("Telnyx client not connected. State:", telnyxClient);
      return;
    }

    // Format phone number - handle SIP URIs and E.164 numbers
    let formattedNumber = phoneNumber.trim();
    if (formattedNumber.startsWith("sip:")) {
      // SIP URI — pass through as-is
    } else {
      formattedNumber = formattedNumber.replace(/[\s\-\(\)]/g, "");
      if (!formattedNumber.startsWith("+")) {
        // Assume US number if no country code
        if (formattedNumber.length === 10) {
          formattedNumber = "+1" + formattedNumber;
        } else if (formattedNumber.length === 11 && formattedNumber.startsWith("1")) {
          formattedNumber = "+" + formattedNumber;
        }
      }
    }

    console.log("=== MAKING CALL ===");
    console.log("Destination:", formattedNumber);
    console.log("Selected Caller ID from state:", selectedCallerId);
    console.log("Caller ID type:", typeof selectedCallerId);
    console.log("Telnyx client connected:", telnyxClient.connected);

    try {
      isOutboundCallRef.current = true; // Mark this as an outbound call
      setCallState("connecting");
      
      // Use callerNumber (not callerIdNumber) per Telnyx SDK docs
      const callOptions = {
        destinationNumber: formattedNumber,
        callerNumber: selectedCallerId, // Use the selected caller ID from dropdown
        audio: true,
        video: false,
      };
      
      console.log("Call options being sent to Telnyx:", JSON.stringify(callOptions, null, 2));
      
      const call = telnyxClient.newCall(callOptions);
      
      console.log("Call object created:", call);
      console.log("Call ID:", call?.id);
      console.log("Call state:", call?.state);
      
      setActiveCall(call);
      setPhoneNumber(formattedNumber);
      
    } catch (error) {
      console.error("Failed to make call:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      toast.error("Failed to initiate call: " + (error?.message || "Unknown error"));
      setCallState("idle");
      isOutboundCallRef.current = false; // Reset flag on error
    }
  };

  const answerCall = () => {
    console.log("=== ANSWERING CALL ===");
    stopRingtone(); // Stop ringtone when answering
    if (incomingCall) {
      incomingCall.answer();
      setActiveCall(incomingCall);
    }
  };

  const hangupCall = async () => {
    console.log("=== HANGING UP CALL ===");
    console.log("Active call:", activeCall);
    console.log("Incoming call:", incomingCall);
    console.log("Call state:", callState);
    
    stopRingtone(); // Stop ringtone on hangup
    stopHoldMusic(); // Stop hold music on hangup
    
    // Log the call if it was active
    const shouldLogCall = callState === "active" || callState === "held";
    const finalDuration = callDurationRef.current;  // ref, never stale
    const finalNumber = currentCallNumber;
    const finalDirection = currentCallDirection;
    const finalRecordingUrl = recordingUrl;
    
    try {
      if (activeCall) {
        console.log("Hanging up active call");
        activeCall.hangup();
      }
      if (incomingCall) {
        console.log("Hanging up incoming call");
        incomingCall.hangup();
      }
    } catch (error) {
      console.error("Error during hangup:", error);
    }
    
    // Stop and upload recording if active
    if (isRecording) {
      await stopRecording();
    }

    playDisconnectSound();
    stopCallDuration();
    setCallState("ended");
    
    // Log the call to database
    if (shouldLogCall && finalNumber) {
      try {
        console.log("Logging call to database...");
        await apiClient.post("/calls", {
          remote_number: finalNumber,
          direction: finalDirection || "outbound",
          duration: finalDuration,
          status: "completed",
          recording_url: finalRecordingUrl || null
        });
        console.log("Call logged successfully");
      } catch (error) {
        console.error("Failed to log call:", error);
      }
    }
    
    setTimeout(() => {
      setCallState("idle");
      setCallDuration(0);
      callDurationRef.current = 0;
      setIsMuted(false);
      setIsHeld(false);
      setActiveCall(null);
      setIncomingCall(null);
      setPhoneNumber("");
      setCurrentCallStartTime(null);
      setCurrentCallNumber(null);
      setCurrentCallDirection(null);
      setRecordingUrl(null);
      isOutboundCallRef.current = false; // Reset outbound flag
    }, 1500);
  };

  const toggleMute = () => {
    if (activeCall) {
      if (isMuted) {
        activeCall.unmuteAudio();
      } else {
        activeCall.muteAudio();
      }
      setIsMuted(!isMuted);
    }
  };

  const toggleHold = () => {
    if (activeCall) {
      if (isHeld) {
        // Unhold call
        activeCall.unhold();
        stopHoldMusic();
        setIsHeld(false);
        toast.success("Call resumed");
      } else {
        // Hold call
        activeCall.hold();
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
      // Stop any existing hold music
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
      console.log("Hold music stopped");
    }
  };

  const handleForward = () => {
    if (activeCall && forwardNumber) {
      // Transfer call
      activeCall.transfer(forwardNumber);
      setShowForwardDialog(false);
      setForwardNumber("");
      toast.success(`Forwarding call to ${forwardNumber}`);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto" data-testid="dialer-page">
      <audio ref={audioRef} autoPlay playsInline id="remoteAudio" />
      <audio id="localAudio" autoPlay playsInline muted />
      
      {/* Incoming Call Banner */}
      {incomingCall && (
        <div className="mb-6 p-4 rounded-xl bg-green-600 text-white animate-pulse shadow-lg shadow-green-600/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <PhoneIncoming className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold text-lg">Incoming Call</p>
                <p className="text-white/90 font-medium">
                  {incomingCallerInfo?.name || incomingCall?.options?.remoteCallerNumber || "Unknown"}
                </p>
                {incomingCallerInfo?.name && (
                  <p className="text-white/70 text-sm">{incomingCall?.options?.remoteCallerNumber}</p>
                )}
                {incomingCallerInfo?.company && (
                  <p className="text-white/70 text-sm">{incomingCallerInfo.company}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                size="lg"
                className="h-12 px-6 rounded-full bg-white text-green-600 hover:bg-white/90 font-semibold"
                onClick={answerCall}
                data-testid="answer-banner-btn"
              >
                <Phone className="w-5 h-5 mr-2" />
                Answer
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-6 rounded-full border-white text-white hover:bg-white/10 font-semibold"
                onClick={hangupCall}
                data-testid="decline-banner-btn"
              >
                <PhoneOff className="w-5 h-5 mr-2" />
                Decline
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Dialer Widget */}
        <div className="lg:col-span-5 xl:col-span-4">
          <Card className="border-border/50 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="font-manrope flex items-center gap-2">
                <Phone className="w-5 h-5 text-primary" />
                Dialer
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Caller ID Selector */}
              {callState === "idle" && (
                <div className="mb-4">
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Outbound Caller ID
                  </label>
                  <Select
                    value={selectedCallerId}
                    onValueChange={(value) => {
                      console.log("=== CALLER ID CHANGED ===");
                      console.log("New Caller ID:", value);
                      setSelectedCallerId(value);
                    }}
                  >
                    <SelectTrigger className="w-full" data-testid="caller-id-selector">
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
                  <p className="text-xs text-muted-foreground mt-1">
                    Currently selected: {selectedCallerId}
                  </p>
                </div>
              )}

              {/* Phone Number Display */}
              <div className="relative mb-6">
                <Input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Enter phone number"
                  className="text-2xl font-mono text-center h-14 pr-12"
                  data-testid="phone-number-input"
                  readOnly={callState !== "idle"}
                />
                {phoneNumber && callState === "idle" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={handleBackspace}
                    data-testid="backspace-btn"
                  >
                    <Delete className="w-5 h-5" />
                  </Button>
                )}
              </div>

              {/* Matching Contacts */}
              {matchingContacts.length > 0 && callState === "idle" && (
                <div className="mb-4 border border-border rounded-lg overflow-hidden">
                  {matchingContacts.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => {
                        setPhoneNumber(contact.phone_number);
                        setMatchingContacts([]);
                      }}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-secondary/50 transition-colors border-b border-border last:border-b-0"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-sm">{contact.name}</p>
                        <p className="text-xs text-muted-foreground">{contact.phone_number}</p>
                      </div>
                      <Phone className="w-4 h-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}

              {/* Keypad */}
              {callState === "idle" && (
                <div className="grid grid-cols-3 gap-3 mb-6" data-testid="dial-keypad">
                  {DIAL_KEYS.map(({ digit, letters }) => (
                    <Button
                      key={digit}
                      variant="outline"
                      className="h-16 flex flex-col items-center justify-center neumorphic-btn hover:bg-secondary/50 active:scale-95 transition-all"
                      onClick={() => handleDigitPress(digit)}
                      data-testid={`dial-key-${digit}`}
                    >
                      <span className="text-2xl font-manrope font-medium">{digit}</span>
                      {letters && (
                        <span className="text-[10px] text-muted-foreground tracking-wider">
                          {letters}
                        </span>
                      )}
                    </Button>
                  ))}
                </div>
              )}

              {/* Call Controls */}
              <div className="flex items-center justify-center gap-4">
                {callState === "idle" && (
                  <Button
                    size="lg"
                    className="h-14 w-14 rounded-full bg-green-600 hover:bg-green-700 transition-all active:scale-95"
                    onClick={makeCall}
                    disabled={!phoneNumber}
                    data-testid="call-btn"
                  >
                    <Phone className="w-6 h-6" />
                  </Button>
                )}

                {callState === "ringing" && incomingCall && (
                  <>
                    <Button
                      size="lg"
                      className="h-16 w-16 rounded-full bg-green-600 hover:bg-green-700 animate-pulse shadow-lg shadow-green-600/50"
                      onClick={answerCall}
                      data-testid="answer-btn"
                    >
                      <Phone className="w-7 h-7" />
                    </Button>
                    <Button
                      size="lg"
                      variant="destructive"
                      className="h-16 w-16 rounded-full shadow-lg shadow-red-600/50"
                      onClick={hangupCall}
                      data-testid="decline-btn"
                    >
                      <PhoneOff className="w-7 h-7" />
                    </Button>
                  </>
                )}

                {(callState === "active" || callState === "held" || callState === "connecting" || (callState === "ringing" && !incomingCall)) && (
                  <>
                    <Button
                      size="icon"
                      variant={isMuted ? "destructive" : "secondary"}
                      className="h-12 w-12 rounded-full"
                      onClick={toggleMute}
                      data-testid="mute-btn"
                    >
                      {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </Button>
                    <Button
                      size="icon"
                      variant={isHeld ? "secondary" : "outline"}
                      className="h-12 w-12 rounded-full"
                      onClick={toggleHold}
                      data-testid="hold-btn"
                    >
                      {isHeld ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                    </Button>
                    {/* END CALL BUTTON - More prominent */}
                    <Button
                      size="lg"
                      variant="destructive"
                      className="h-16 px-6 rounded-full shadow-lg shadow-red-600/30 hover:shadow-red-600/50 transition-all flex items-center gap-2"
                      onClick={hangupCall}
                      data-testid="hangup-btn"
                    >
                      <PhoneOff className="w-6 h-6" />
                      <span className="font-semibold">End Call</span>
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-12 w-12 rounded-full"
                      onClick={() => setShowForwardDialog(true)}
                      data-testid="forward-btn"
                    >
                      <PhoneForwarded className="w-5 h-5" />
                    </Button>
                  </>
                )}
              </div>

              {/* Call Status */}
              {callState !== "idle" && (
                <div className="mt-6 text-center animate-fade-in-up">
                  <Badge
                    variant={callState === "active" ? "default" : "secondary"}
                    className={`${
                      callState === "active"
                        ? "bg-green-600"
                        : callState === "held"
                        ? "bg-amber-500"
                        : ""
                    }`}
                  >
                    {callState === "connecting" && "Connecting..."}
                    {callState === "ringing" && "Ringing..."}
                    {callState === "active" && `Active - ${formatDuration(callDuration)}`}
                    {callState === "held" && `On Hold - ${formatDuration(callDuration)}`}
                    {callState === "ended" && "Call Ended"}
                  </Badge>
                  
                  {/* Recording Indicator */}
                  {isRecording && callState === "active" && (
                    <Badge variant="destructive" className="animate-pulse">
                      <span className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
                      Recording
                    </Badge>
                  )}
                </div>
              )}

              {/* Credentials Warning */}
              {!credentials?.configured && (
                <div className="mt-6 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-sm">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-amber-700 dark:text-amber-400">
                    Configure your Telnyx credentials in{" "}
                    <button
                      onClick={() => navigate("/settings")}
                      className="underline font-medium"
                    >
                      Settings
                    </button>
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Calls */}
        <div className="lg:col-span-7 xl:col-span-8">
          <Card className="border-border/50 shadow-lg h-full">
            <CardHeader className="pb-4">
              <CardTitle className="font-manrope flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Recent Calls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {recentCalls.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Phone className="w-12 h-12 mb-4 opacity-20" />
                    <p>No recent calls</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentCalls.map((call) => (
                      <div
                        key={call.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                        onClick={() => setPhoneNumber(call.remote_number)}
                        data-testid={`recent-call-${call.id}`}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              call.direction === "inbound"
                                ? "bg-blue-500/10 text-blue-500"
                                : "bg-green-500/10 text-green-500"
                            }`}
                          >
                            {call.direction === "inbound" ? (
                              <PhoneIncoming className="w-5 h-5" />
                            ) : (
                              <PhoneOutgoing className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">
                              {call.contact_name || call.remote_number}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {call.direction === "inbound" ? "Incoming" : "Outgoing"} •{" "}
                              {formatDuration(call.duration)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            {formatTime(call.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              
              {recentCalls.length > 0 && (
                <Button
                  variant="ghost"
                  className="w-full mt-4"
                  onClick={() => navigate("/history")}
                  data-testid="view-all-calls-btn"
                >
                  View All Call History
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Forward Dialog */}
      <Dialog open={showForwardDialog} onOpenChange={setShowForwardDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-manrope">Forward Call</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              type="tel"
              placeholder="Enter number to forward to"
              value={forwardNumber}
              onChange={(e) => setForwardNumber(e.target.value)}
              data-testid="forward-number-input"
            />
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowForwardDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleForward} disabled={!forwardNumber}>
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

export default DialerPage;
