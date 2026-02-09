import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Upload, Play, Clock, AlertCircle, CheckCircle, Loader2, Image as ImageIcon, RefreshCw, Info } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';

export default function VideoGeneratorPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [history, setHistory] = useState([]);
  const pollingRef = useRef(null);
  
  // Form state
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [prompt, setPrompt] = useState('Professional real estate agent presenting a luxury property with confidence. Natural hand gestures, warm smile, making eye contact with the camera.');
  const [audioUrl, setAudioUrl] = useState('');
  
  // Task tracking
  const [currentTask, setCurrentTask] = useState(null);
  const [taskStatus, setTaskStatus] = useState(null);

  useEffect(() => {
    loadConfig();
    loadHistory();
    
    // Cleanup polling on unmount
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const loadConfig = async () => {
    try {
      const response = await api.get('/skyreels/config');
      setConfig(response.data);
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  const loadHistory = async () => {
    try {
      const response = await api.get('/skyreels/history');
      setHistory(response.data.videos || []);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const handleImageUrlChange = (e) => {
    setImageUrl(e.target.value);
    setImagePreview(e.target.value);
  };

  const handleGenerate = async () => {
    if (!imageUrl) {
      toast.error('Please provide an image URL. Upload your image to Media Library first.');
      return;
    }

    setGenerating(true);
    setCurrentTask(null);
    setTaskStatus(null);

    try {
      const response = await api.post('/skyreels/generate', {
        image_url: imageUrl,
        prompt: prompt,
        audio_url: audioUrl || undefined
      });

      const result = response.data;
      
      if (result.success) {
        const requestId = result.request_id || result.task_id;
        setCurrentTask(requestId);
        setTaskStatus({ status: 'processing', progress: 0 });
        toast.success('Video generation started! This may take a few minutes...');
        
        // Start polling for status
        startPolling(requestId);
      } else {
        toast.error(result.error || 'Failed to start video generation');
      }
      
      loadHistory();
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error.response?.data?.detail || error.response?.data?.error || 'Failed to generate video');
    } finally {
      setGenerating(false);
    }
  };

  const startPolling = (requestId) => {
    // Clear any existing polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    
    let attempts = 0;
    const maxAttempts = 120; // 10 minutes with 5 second intervals
    
    pollingRef.current = setInterval(async () => {
      if (attempts >= maxAttempts) {
        clearInterval(pollingRef.current);
        toast.error('Video generation timed out. Check history later.');
        return;
      }
      
      try {
        const response = await api.get(`/skyreels/status/${requestId}`);
        const result = response.data;
        
        if (result.success) {
          const status = result.status;
          
          setTaskStatus({
            status: status,
            video_url: result.video_url,
            time_info: result.time_info
          });
          
          if (status === 'success') {
            clearInterval(pollingRef.current);
            toast.success('Video generation complete!');
            loadHistory();
            
            // If we have the video URL, show it
            if (result.video_url) {
              setTaskStatus(prev => ({ ...prev, video_url: result.video_url }));
            } else {
              // Fetch the result
              const resultResponse = await api.get(`/skyreels/result/${requestId}`);
              if (resultResponse.data.success && resultResponse.data.video_url) {
                setTaskStatus(prev => ({ ...prev, video_url: resultResponse.data.video_url }));
              }
            }
          } else if (status === 'error' || status === 'failed') {
            clearInterval(pollingRef.current);
            toast.error('Video generation failed');
          }
        }
        
        attempts++;
      } catch (error) {
        console.error('Status check error:', error);
        attempts++;
      }
    }, 5000); // Poll every 5 seconds
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'processing':
      case 'pending':
        return <Loader2 className="h-5 w-5 text-amber-500 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'processing':
        return 'Generating video... This may take 2-5 minutes';
      case 'success':
        return 'Video ready!';
      case 'error':
      case 'failed':
        return 'Generation failed';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6" data-testid="video-generator-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Video Generator</h1>
          <p className="text-muted-foreground">Create AI avatar videos with SkyReels V3</p>
        </div>
        <Button variant="outline" onClick={loadHistory}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* API Status */}
      {config && (
        <Card className={config.configured ? 'border-green-500/30 bg-green-500/5' : 'border-amber-500/30 bg-amber-500/5'}>
          <CardContent className="py-3">
            <div className="flex items-center gap-2">
              {config.configured ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm">APIFree.ai SkyReels configured ({config.key_preview})</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  <span className="text-sm">SkyReels API key not configured. Add SKYREELS_API_KEY to backend/.env</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Generation Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Generate Video
            </CardTitle>
            <CardDescription>
              Create an AI-generated talking avatar video
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Info Box */}
            <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-200">
                <strong>How it works:</strong> Upload your image to the <strong>Media Library</strong> first, 
                then paste the URL here. The AI will animate the face to create a talking video.
              </div>
            </div>

            {/* Image URL Input */}
            <div className="space-y-2">
              <Label>Avatar Image URL <span className="text-red-500">*</span></Label>
              <Input
                placeholder="https://... (paste URL from Media Library)"
                value={imageUrl}
                onChange={handleImageUrlChange}
                data-testid="image-url-input"
              />
              <p className="text-xs text-muted-foreground">
                Use a clear headshot or portrait image for best results
              </p>
            </div>

            {/* Image Preview */}
            {imagePreview && (
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden max-h-48">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            )}

            {/* Prompt */}
            <div className="space-y-2">
              <Label>Video Description / Prompt</Label>
              <Textarea
                placeholder="Describe how the person should appear and act..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                data-testid="prompt-input"
              />
              <p className="text-xs text-muted-foreground">
                Describe expressions, gestures, and speaking style
              </p>
            </div>

            {/* Audio URL (Optional) */}
            <div className="space-y-2">
              <Label>Audio URL <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                placeholder="https://... (audio file for lip-sync)"
                value={audioUrl}
                onChange={(e) => setAudioUrl(e.target.value)}
                data-testid="audio-url-input"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to use default audio. Upload custom audio to Media Library for personalized narration.
              </p>
            </div>

            {/* Generate Button */}
            <Button 
              onClick={handleGenerate} 
              disabled={generating || !config?.configured || !imageUrl}
              className="w-full"
              data-testid="generate-button"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Starting Generation...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Generate Video
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Status & Results */}
        <div className="space-y-6">
          {/* Current Task Status */}
          {currentTask && taskStatus && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getStatusIcon(taskStatus.status)}
                  Generation Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Request ID:</span>
                  <code className="bg-muted px-2 py-1 rounded text-xs">{currentTask.slice(0, 16)}...</code>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-medium">{getStatusText(taskStatus.status)}</span>
                </div>
                
                {taskStatus.status === 'processing' && (
                  <div className="flex items-center gap-2 text-sm text-amber-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Checking status every 5 seconds...</span>
                  </div>
                )}
                
                {taskStatus.time_info && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    {taskStatus.time_info.submit_time && (
                      <p>Submitted: {new Date(taskStatus.time_info.submit_time).toLocaleString()}</p>
                    )}
                    {taskStatus.time_info.start_execute && (
                      <p>Started: {new Date(taskStatus.time_info.start_execute).toLocaleString()}</p>
                    )}
                  </div>
                )}
                
                {taskStatus.video_url && (
                  <div className="pt-4 space-y-3">
                    <video 
                      src={taskStatus.video_url} 
                      controls 
                      className="w-full rounded-lg"
                      data-testid="generated-video"
                    />
                    <div className="flex gap-2">
                      <a 
                        href={taskStatus.video_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        Open in new tab
                      </a>
                      <span className="text-muted-foreground">|</span>
                      <a 
                        href={taskStatus.video_url} 
                        download
                        className="text-sm text-primary hover:underline"
                      >
                        Download
                      </a>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Generation History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No video generations yet. Create your first one!
                </p>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {history.map((item, index) => (
                    <div 
                      key={index}
                      className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex-shrink-0">
                        {item.result?.success || item.status === 'completed' ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : item.result?.error ? (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        ) : (
                          <Clock className="h-5 w-5 text-amber-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.prompt?.slice(0, 60)}...</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.created_at).toLocaleString()}
                        </p>
                        {item.video_url && (
                          <a 
                            href={item.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline"
                          >
                            View Video
                          </a>
                        )}
                        {item.request_id && !item.video_url && (
                          <Button
                            variant="link"
                            size="sm"
                            className="text-xs p-0 h-auto"
                            onClick={() => {
                              setCurrentTask(item.request_id);
                              startPolling(item.request_id);
                            }}
                          >
                            Check Status
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
