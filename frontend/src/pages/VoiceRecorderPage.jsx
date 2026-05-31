import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic, MicOff, Square, Play, Pause, Trash2, Download, RefreshCw,
  CheckCircle, Clock, AlertCircle, Loader2, ChevronDown, ChevronRight,
  FileText, Tag, Calendar, Search, Filter, Zap, Volume2, MoreVertical,
  Edit2, X, Save
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import axios from 'axios';

const API = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const CATEGORY_COLORS = {
  'Client Meeting':   'bg-blue-100 text-blue-700 border-blue-300',
  'Property Notes':   'bg-amber-100 text-amber-700 border-amber-300',
  'Personal Note':    'bg-purple-100 text-purple-700 border-purple-300',
  'Follow-Up':        'bg-green-100 text-green-700 border-green-300',
  'Market Update':    'bg-teal-100 text-teal-700 border-teal-300',
  'Other':            'bg-gray-100 text-gray-700 border-gray-300',
};

const STATUS_CONFIG = {
  saved:                { icon: Clock,        color: 'text-gray-400',   label: 'Saved'            },
  transcribing:         { icon: Loader2,      color: 'text-blue-500',   label: 'Transcribing…'    },
  summarizing:          { icon: Loader2,      color: 'text-amber-500',  label: 'Summarizing…'     },
  complete:             { icon: CheckCircle,  color: 'text-green-600',  label: 'Complete'         },
  no_speech_detected:   { icon: MicOff,       color: 'text-gray-400',   label: 'No speech'        },
  error:                { icon: AlertCircle,  color: 'text-red-500',    label: 'Error'            },
};

const fmtTime = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
const fmtDur  = (s) => s < 60 ? `${s}s` : `${Math.floor(s/60)}m ${s%60}s`;

// ── Waveform Visualizer ─────────────────────────────────────────────────────
const WaveformCanvas = ({ analyser, isRecording }) => {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);

  useEffect(() => {
    if (!isRecording || !analyser) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      // draw flat line
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = 'rgba(251,191,36,0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    const bufLen = analyser.frequencyBinCount;
    const dataArr = new Uint8Array(bufLen);

    const draw = () => {
      animRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArr);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
      grad.addColorStop(0,   'rgba(251,191,36,0.4)');
      grad.addColorStop(0.5, 'rgba(251,191,36,1)');
      grad.addColorStop(1,   'rgba(251,191,36,0.4)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2.5;
      ctx.lineJoin  = 'round';
      ctx.beginPath();

      const sliceW = canvas.width / bufLen;
      let x = 0;
      for (let i = 0; i < bufLen; i++) {
        const v = dataArr[i] / 128.0;
        const y = (v * canvas.height) / 2;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        x += sliceW;
      }
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [isRecording, analyser]);

  return (
    <canvas ref={canvasRef} width={560} height={80}
      className="w-full rounded-xl" style={{ background: 'rgba(10,22,40,0.4)' }}/>
  );
};

// ── Recording Detail Panel ──────────────────────────────────────────────────
const RecordingDetail = ({ recording, onClose, onReprocess, onDelete }) => {
  const [playing, setPlaying]     = useState(false);
  const [progress, setProgress]   = useState(0);
  const [expanded, setExpanded]   = useState({ transcript: false, summary: true });
  const audioRef = useRef(null);

  const audioUrl = recording.audio_url
    ? `${API}${recording.audio_url}`
    : null;

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); } else { audioRef.current.play(); }
  };

  const sc = STATUS_CONFIG[recording.processing_status] || STATUS_CONFIG.saved;
  const isProcessing = ['transcribing','summarizing'].includes(recording.processing_status);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div className="flex-1 min-w-0 mr-3">
            <h3 className="text-lg font-bold text-foreground truncate">{recording.title}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge className={`${CATEGORY_COLORS[recording.category] || CATEGORY_COLORS.Other} border text-xs`}>
                {recording.category}
              </Badge>
              <span className="text-muted-foreground text-xs flex items-center gap-1">
                <Clock className="w-3 h-3"/> {fmtDur(recording.duration_seconds || 0)}
              </span>
              <span className="text-muted-foreground text-xs">
                {new Date(recording.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}
              </span>
              <span className={`flex items-center gap-1 text-xs ${sc.color}`}>
                <sc.icon className={`w-3 h-3 ${isProcessing?'animate-spin':''}`}/> {sc.label}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {recording.processing_status !== 'complete' && !isProcessing && (
              <Button size="sm" variant="outline" onClick={() => onReprocess(recording.id)}>
                <RefreshCw className="w-3 h-3 mr-1"/> Retry
              </Button>
            )}
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5"/>
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Audio Player */}
          {audioUrl && (
            <div className="bg-muted/30 rounded-xl p-4 border border-border">
              <audio ref={audioRef} src={audioUrl}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => { setPlaying(false); setProgress(0); }}
                onTimeUpdate={() => {
                  if (audioRef.current) {
                    const p = (audioRef.current.currentTime / audioRef.current.duration) * 100;
                    setProgress(isNaN(p) ? 0 : p);
                  }
                }}
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-full bg-amber-500 hover:bg-amber-400 flex items-center justify-center shrink-0"
                >
                  {playing ? <Pause className="w-4 h-4 text-black"/> : <Play className="w-4 h-4 text-black ml-0.5"/>}
                </button>
                <div className="flex-1">
                  <div className="h-1.5 bg-border rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${progress}%` }}/>
                  </div>
                </div>
                <a href={audioUrl} download className="text-muted-foreground hover:text-foreground">
                  <Download className="w-4 h-4"/>
                </a>
              </div>
            </div>
          )}

          {/* AI Summary */}
          {recording.summary && (
            <div>
              <button
                className="flex items-center gap-2 w-full text-left mb-3"
                onClick={() => setExpanded(e => ({ ...e, summary: !e.summary }))}
              >
                <div className="w-6 h-6 rounded-md bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-amber-600"/>
                </div>
                <span className="font-semibold text-sm text-foreground">AI Summary</span>
                <Badge className="bg-amber-100 text-amber-700 border-amber-300 border text-[10px] ml-1">
                  {recording.summary.sentiment}
                </Badge>
                {expanded.summary ? <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto"/> : <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto"/>}
              </button>
              {expanded.summary && (
                <div className="space-y-3 pl-8">
                  <p className="text-sm text-foreground leading-relaxed">{recording.summary.summary}</p>

                  {recording.summary.key_points?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Key Points</p>
                      <ul className="space-y-1">
                        {recording.summary.key_points.map((p, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"/>
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {recording.summary.action_items?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Action Items</p>
                      <ul className="space-y-1">
                        {recording.summary.action_items.map((a, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                            <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0"/>
                            {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 pt-1">
                    {recording.summary.people_mentioned?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">People</p>
                        <div className="flex flex-wrap gap-1">
                          {recording.summary.people_mentioned.map((p,i) => (
                            <span key={i} className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs border border-blue-200">{p}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {recording.summary.properties_mentioned?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Properties</p>
                        <div className="flex flex-wrap gap-1">
                          {recording.summary.properties_mentioned.map((p,i) => (
                            <span key={i} className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs border border-amber-200">{p}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {recording.summary.topics?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Topics</p>
                        <div className="flex flex-wrap gap-1">
                          {recording.summary.topics.map((t,i) => (
                            <span key={i} className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs border border-border">{t}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Transcript */}
          {recording.transcript && (
            <div>
              <button
                className="flex items-center gap-2 w-full text-left mb-3"
                onClick={() => setExpanded(e => ({ ...e, transcript: !e.transcript }))}
              >
                <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground"/>
                </div>
                <span className="font-semibold text-sm text-foreground">Full Transcript</span>
                <span className="text-muted-foreground text-xs ml-1">({recording.transcript.split(' ').length} words)</span>
                {expanded.transcript ? <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto"/> : <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto"/>}
              </button>
              {expanded.transcript && (
                <div className="pl-8">
                  <p className="text-sm text-muted-foreground leading-relaxed bg-muted/30 rounded-xl p-4 border border-border whitespace-pre-wrap">
                    {recording.transcript}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Processing indicator */}
          {isProcessing && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
              <Loader2 className="w-5 h-5 text-amber-500 animate-spin shrink-0"/>
              <div>
                <p className="text-sm font-semibold text-foreground">{sc.label}</p>
                <p className="text-xs text-muted-foreground">This may take up to 30 seconds. You can close this and it'll complete in the background.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/20">
          <p className="text-xs text-muted-foreground">{recording.file_size_kb} KB · {recording.file_ext?.toUpperCase()}</p>
          <button onClick={() => onDelete(recording.id)} className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600">
            <Trash2 className="w-3.5 h-3.5"/> Delete
          </button>
        </div>
      </div>
    </div>
  );
};


// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export const VoiceRecorderPage = () => {
  // Recording state
  const [recState, setRecState]     = useState('idle');   // idle | recording | paused | saving
  const [elapsed, setElapsed]       = useState(0);
  const [title, setTitle]           = useState('');
  const [category, setCategory]     = useState('Personal Note');

  // Audio refs
  const mediaRecorderRef  = useRef(null);
  const audioChunksRef    = useRef([]);
  const timerRef          = useRef(null);
  const streamRef         = useRef(null);
  const analyserRef       = useRef(null);
  const audioCtxRef       = useRef(null);

  // Library state
  const [recordings, setRecordings] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(true);
  const [search, setSearch]           = useState('');
  const [filterCat, setFilterCat]     = useState('');
  const [selected, setSelected]       = useState(null);
  const [pollIds, setPollIds]         = useState(new Set());

  const CATEGORIES = ['Client Meeting','Property Notes','Personal Note','Follow-Up','Market Update','Other'];

  useEffect(() => { loadRecordings(); }, []);

  // Poll in-progress recordings
  useEffect(() => {
    if (pollIds.size === 0) return;
    const interval = setInterval(async () => {
      let updated = false;
      for (const id of pollIds) {
        const res = await axios.get(`${API}/api/voice/${id}`, { headers: authHeaders() }).catch(() => null);
        if (!res) continue;
        const rec = res.data;
        if (!['transcribing','summarizing'].includes(rec.processing_status)) {
          setPollIds(s => { const n = new Set(s); n.delete(id); return n; });
          setRecordings(prev => prev.map(r => r.id === id ? { ...r, ...rec } : r));
          if (rec.processing_status === 'complete') toast.success(`"${rec.title}" is ready!`);
          updated = true;
        }
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [pollIds]);

  const loadRecordings = async () => {
    setLoadingRecs(true);
    try {
      const res = await axios.get(`${API}/api/voice`, { headers: authHeaders() });
      const recs = Array.isArray(res.data) ? res.data : [];
      setRecordings(recs);
      // Start polling any in-progress recordings
      const inProgress = recs.filter(r => ['transcribing','summarizing'].includes(r.processing_status)).map(r => r.id);
      if (inProgress.length) setPollIds(new Set(inProgress));
    } catch { toast.error('Failed to load recordings'); }
    finally { setLoadingRecs(false); }
  };

  // ── Recording logic ────────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up Web Audio for waveform
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const source   = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Determine best MIME type
      const mimeType = ['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus','audio/mp4']
        .find(t => MediaRecorder.isTypeSupported(t)) || '';

      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mediaRecorderRef.current = mr;
      audioChunksRef.current   = [];

      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.start(250);   // collect chunks every 250ms

      setRecState('recording');
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    } catch (err) {
      toast.error('Microphone access denied. Please allow microphone and try again.');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      clearInterval(timerRef.current);
      setRecState('paused');
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
      setRecState('recording');
    }
  };

  const stopAndSave = useCallback(() => {
    if (!mediaRecorderRef.current) return;
    clearInterval(timerRef.current);

    mediaRecorderRef.current.onstop = async () => {
      setRecState('saving');
      const blob = new Blob(audioChunksRef.current, {
        type: mediaRecorderRef.current.mimeType || 'audio/webm'
      });

      try {
        const fd = new FormData();
        const ext = (mediaRecorderRef.current.mimeType || 'audio/webm').split('/')[1]?.split(';')[0] || 'webm';
        fd.append('audio', blob, `recording.${ext}`);
        fd.append('title', title || `Note — ${new Date().toLocaleDateString()}`);
        fd.append('category', category);
        fd.append('duration_seconds', String(elapsed));
        fd.append('auto_process', 'true');

        const res = await axios.post(`${API}/api/voice/save`, fd, {
          headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' },
        });

        const newRec = res.data;
        setRecordings(prev => [newRec, ...prev]);
        setPollIds(s => new Set([...s, newRec.id]));
        toast.success('Recording saved! Transcribing with AI…');
        setSelected(newRec);
      } catch { toast.error('Failed to save recording'); }
      finally {
        setRecState('idle');
        setElapsed(0);
        setTitle('');
        streamRef.current?.getTracks().forEach(t => t.stop());
        audioCtxRef.current?.close();
      }
    };

    if (mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, [title, category, elapsed]);

  const discardRecording = () => {
    clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioCtxRef.current?.close();
    setRecState('idle');
    setElapsed(0);
    setTitle('');
  };

  const handleReprocess = async (id) => {
    await axios.post(`${API}/api/voice/${id}/reprocess`, {}, { headers: authHeaders() });
    setPollIds(s => new Set([...s, id]));
    setRecordings(prev => prev.map(r => r.id === id ? { ...r, processing_status: 'transcribing' } : r));
    toast.success('Reprocessing started');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this recording?')) return;
    await axios.delete(`${API}/api/voice/${id}`, { headers: authHeaders() });
    setRecordings(prev => prev.filter(r => r.id !== id));
    if (selected?.id === id) setSelected(null);
    toast.success('Deleted');
  };

  const isActive = recState === 'recording' || recState === 'paused';

  const filtered = recordings.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.title?.toLowerCase().includes(q) ||
      r.transcript?.toLowerCase().includes(q) || r.summary?.summary?.toLowerCase().includes(q);
    const matchCat = !filterCat || r.category === filterCat;
    return matchSearch && matchCat;
  });

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-foreground">Voice Recorder</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Record, transcribe, and AI-summarize voice notes</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground bg-muted rounded-full px-3 py-1">
            {recordings.length} recording{recordings.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── Recorder Card ────────────────────────────────────────────────── */}
      <Card className={`border-2 transition-all duration-300 ${
        recState === 'recording' ? 'border-red-400/60 shadow-red-500/20 shadow-lg' :
        recState === 'paused'    ? 'border-amber-400/60 shadow-amber-500/20 shadow-lg' :
        'border-border'
      }`}>
        <CardContent className="p-6">
          {/* Waveform */}
          <div className="mb-5">
            <WaveformCanvas analyser={analyserRef.current} isRecording={recState === 'recording'}/>
          </div>

          {/* Timer */}
          <div className="text-center mb-5">
            <span className={`text-5xl font-mono font-bold tabular-nums tracking-tight ${
              recState === 'recording' ? 'text-red-500' :
              recState === 'paused'    ? 'text-amber-500' :
              'text-muted-foreground'
            }`}>
              {fmtTime(elapsed)}
            </span>
            {recState === 'recording' && (
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"/>
                <span className="text-xs text-red-500 font-medium uppercase tracking-wider">Recording</span>
              </div>
            )}
            {recState === 'paused' && (
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <span className="text-xs text-amber-500 font-medium uppercase tracking-wider">Paused</span>
              </div>
            )}
          </div>

          {/* Meta fields (shown when not idle) */}
          {(isActive || recState === 'idle') && (
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Recording Title
                </label>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder={`Note — ${new Date().toLocaleDateString()}`}
                  className="h-10"
                  disabled={recState === 'saving'}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Category
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  disabled={recState === 'saving'}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            {recState === 'idle' && (
              <Button
                onClick={startRecording}
                className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-xl shadow-red-500/40 hover:shadow-red-500/60 transition-all hover:scale-105"
                data-testid="start-recording-btn"
              >
                <Mic className="w-8 h-8"/>
              </Button>
            )}

            {recState === 'recording' && (
              <>
                <Button onClick={pauseRecording} variant="outline" className="w-14 h-14 rounded-full border-2">
                  <Pause className="w-5 h-5"/>
                </Button>
                <Button
                  onClick={stopAndSave}
                  className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-xl shadow-red-500/40"
                  data-testid="stop-recording-btn"
                >
                  <Square className="w-7 h-7"/>
                </Button>
                <Button onClick={discardRecording} variant="ghost" className="w-14 h-14 rounded-full text-muted-foreground hover:text-red-500">
                  <Trash2 className="w-5 h-5"/>
                </Button>
              </>
            )}

            {recState === 'paused' && (
              <>
                <Button onClick={discardRecording} variant="ghost" className="w-14 h-14 rounded-full text-muted-foreground hover:text-red-500">
                  <Trash2 className="w-5 h-5"/>
                </Button>
                <Button
                  onClick={resumeRecording}
                  className="w-20 h-20 rounded-full bg-amber-500 hover:bg-amber-400 text-black shadow-xl shadow-amber-500/40"
                >
                  <Mic className="w-8 h-8"/>
                </Button>
                <Button
                  onClick={stopAndSave}
                  className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 text-white"
                  data-testid="save-recording-btn"
                >
                  <Save className="w-5 h-5"/>
                </Button>
              </>
            )}

            {recState === 'saving' && (
              <div className="flex items-center gap-3 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500"/>
                <span className="text-sm">Saving recording…</span>
              </div>
            )}
          </div>

          {recState === 'idle' && (
            <p className="text-center text-xs text-muted-foreground mt-4">
              Tap the red button to start · Stop to save and auto-transcribe
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Recording Library ─────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search recordings, transcripts…" className="pl-9"/>
          </div>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none">
            <option value="">All categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={loadRecordings}>
            <RefreshCw className="w-4 h-4"/>
          </Button>
        </div>

        {loadingRecs ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin"/> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-muted/20 rounded-xl border border-dashed border-border">
            <Mic className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3"/>
            <p className="text-muted-foreground text-sm">
              {recordings.length === 0
                ? 'No recordings yet. Tap the red button to start!'
                : 'No recordings match your search.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(rec => {
              const sc = STATUS_CONFIG[rec.processing_status] || STATUS_CONFIG.saved;
              const isProc = ['transcribing','summarizing'].includes(rec.processing_status);
              return (
                <div
                  key={rec.id}
                  className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card hover:border-amber-500/30 hover:shadow-sm cursor-pointer transition-all group"
                  onClick={() => setSelected(rec)}
                  data-testid={`recording-row-${rec.id}`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${sc.color === 'text-green-600' ? 'bg-green-50' : sc.color === 'text-red-500' ? 'bg-red-50' : 'bg-muted'}`}>
                    <sc.icon className={`w-4 h-4 ${sc.color} ${isProc ? 'animate-spin' : ''}`}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-foreground truncate">{rec.title}</p>
                      <Badge className={`${CATEGORY_COLORS[rec.category] || CATEGORY_COLORS.Other} border text-[10px] shrink-0`}>
                        {rec.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {rec.summary?.summary
                        ? rec.summary.summary.substring(0, 90) + (rec.summary.summary.length > 90 ? '…' : '')
                        : rec.transcript
                          ? rec.transcript.substring(0, 90) + '…'
                          : sc.label}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-muted-foreground">
                    <span className="text-xs">{fmtDur(rec.duration_seconds || 0)}</span>
                    <span className="text-xs">{new Date(rec.created_at).toLocaleDateString()}</span>
                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity"/>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <RecordingDetail
          recording={selected}
          onClose={() => setSelected(null)}
          onReprocess={handleReprocess}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
};

export default VoiceRecorderPage;
