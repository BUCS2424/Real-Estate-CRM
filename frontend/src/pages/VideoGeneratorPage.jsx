import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Upload, Play, Clock, AlertCircle, CheckCircle, Loader2, Image as ImageIcon, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function VideoGeneratorPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [checking, setChecking] = useState(false);
  const [history, setHistory] = useState([]);
  
  // Form state
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [prompt, setPrompt] = useState('Professional real estate agent presenting a luxury property with confidence');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  
  // Task tracking
  const [currentTask, setCurrentTask] = useState(null);
  const [taskStatus, setTaskStatus] = useState(null);

  useEffect(() => {
    loadConfig();
    loadHistory();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await api.get('/api/skyreels/config');
      setConfig(response.data);
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  const loadHistory = async () => {
    try {
      const response = await api.get('/api/skyreels/history');
      setHistory(response.data.videos || []);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImageUrl('');
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUrlChange = (e) => {
    setImageUrl(e.target.value);
    setImageFile(null);
    setImagePreview(e.target.value);
  };

  const handleGenerate = async () => {
    if (!imageUrl && !imageFile) {
      toast.error('Please provide an image URL or upload an image');
      return;
    }

    setGenerating(true);
    setCurrentTask(null);
    setTaskStatus(null);

    try {
      let response;
      
      if (imageFile) {
        // Upload with file
        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('prompt', prompt);
        formData.append('aspect_ratio', aspectRatio);
        
        response = await api.post('/api/skyreels/generate-with-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        // Use URL
        response = await api.post('/api/skyreels/generate', {
          image_url: imageUrl,
          prompt: prompt,
          aspect_ratio: aspectRatio
        });
      }

      const result = response.data;
      
      if (result.success) {
        if (result.task_id) {
          setCurrentTask(result.task_id);
          setTaskStatus({ status: result.status || 'pending', progress: 0 });
          toast.success('Video generation started! Checking status...');
          // Start polling for status
          pollTaskStatus(result.task_id);
        } else if (result.video_url) {
          toast.success('Video generated successfully!');
          setTaskStatus({ status: 'completed', video_url: result.video_url });
        }
      } else {
        toast.error(result.error || 'Failed to generate video');
      }
      
      loadHistory();
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error.response?.data?.detail || 'Failed to generate video');
    } finally {
      setGenerating(false);
    }
  };

  const pollTaskStatus = async (taskId) => {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes with 5 second intervals
    
    const checkStatus = async () => {
      if (attempts >= maxAttempts) {
        toast.error('Video generation timed out. Please check history later.');
        return;
      }
      
      setChecking(true);
      try {
        const response = await api.get(`/api/skyreels/status/${taskId}?provider=piapi`);
        const result = response.data;
        
        if (result.success) {
          setTaskStatus({
            status: result.status,
            progress: result.progress || 0,
            video_url: result.video_url
          });
          
          if (result.status === 'completed' || result.status === 'success') {
            toast.success('Video generation complete!');
            loadHistory();
            return;
          } else if (result.status === 'failed' || result.status === 'error') {
            toast.error('Video generation failed');
            return;
          }
        }
        
        attempts++;
        setTimeout(checkStatus, 5000);
      } catch (error) {
        console.error('Status check error:', error);
        attempts++;
        setTimeout(checkStatus, 5000);
      } finally {
        setChecking(false);
      }
    };
    
    checkStatus();
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
      case 'success':
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

  return (
    <div className="space-y-6" data-testid="video-generator-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Video Generator</h1>
          <p className="text-muted-foreground">Create stunning AI-generated videos from images</p>
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
                  <span className="text-sm">SkyReels API configured ({config.key_preview})</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  <span className="text-sm">SkyReels API key not configured. Go to Settings → Developer to add your key.</span>
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
              Upload an image or provide a URL to generate an AI video
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Image Input */}
            <div className="space-y-2">
              <Label>Source Image</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Paste image URL..."
                  value={imageUrl}
                  onChange={handleImageUrlChange}
                  className="flex-1"
                  data-testid="image-url-input"
                />
                <Label className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors">
                    <Upload className="h-4 w-4" />
                    Upload
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    data-testid="image-upload-input"
                  />
                </Label>
              </div>
            </div>

            {/* Image Preview */}
            {imagePreview && (
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
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
              <Label>Prompt</Label>
              <Textarea
                placeholder="Describe what the video should look like..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                data-testid="prompt-input"
              />
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-2">
              <Label>Aspect Ratio</Label>
              <Select value={aspectRatio} onValueChange={setAspectRatio}>
                <SelectTrigger data-testid="aspect-ratio-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="9:16">9:16 (Portrait/Reels)</SelectItem>
                  <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                  <SelectItem value="1:1">1:1 (Square)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Generate Button */}
            <Button 
              onClick={handleGenerate} 
              disabled={generating || !config?.configured}
              className="w-full"
              data-testid="generate-button"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
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
                  <span className="text-muted-foreground">Task ID:</span>
                  <code className="bg-muted px-2 py-1 rounded text-xs">{currentTask}</code>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="capitalize font-medium">{taskStatus.status}</span>
                </div>
                {taskStatus.progress > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress:</span>
                      <span>{taskStatus.progress}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${taskStatus.progress}%` }}
                      />
                    </div>
                  </div>
                )}
                {taskStatus.video_url && (
                  <div className="pt-4">
                    <video 
                      src={taskStatus.video_url} 
                      controls 
                      className="w-full rounded-lg"
                      data-testid="generated-video"
                    />
                    <a 
                      href={taskStatus.video_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-sm text-primary hover:underline"
                    >
                      Open in new tab
                    </a>
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
                        {item.result?.success ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.prompt}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.created_at).toLocaleString()}
                        </p>
                        {item.result?.video_url && (
                          <a 
                            href={item.result.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline"
                          >
                            View Video
                          </a>
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
