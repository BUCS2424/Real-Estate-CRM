import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Music2,
  Image as ImageIcon,
  Send,
  Clock,
  Sparkles,
  Loader2,
  Upload,
  X,
  Calendar,
  Home,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';

const platformConfig = {
  facebook: { icon: Facebook, color: 'text-blue-600', bg: 'bg-blue-500', name: 'Facebook', limit: 63206 },
  instagram: { icon: Instagram, color: 'text-pink-600', bg: 'bg-pink-500', name: 'Instagram', limit: 2200 },
  linkedin: { icon: Linkedin, color: 'text-blue-700', bg: 'bg-blue-700', name: 'LinkedIn', limit: 3000 },
  twitter: { icon: Twitter, color: 'text-sky-500', bg: 'bg-sky-500', name: 'Twitter', limit: 280 },
  tiktok: { icon: Music2, color: 'text-black', bg: 'bg-gray-800', name: 'TikTok', limit: 2200 },
  pinterest: { icon: ImageIcon, color: 'text-red-600', bg: 'bg-red-500', name: 'Pinterest', limit: 500 }
};

export const ComposePost = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [loadingProperty, setLoadingProperty] = useState(false);
  
  const [post, setPost] = useState({
    content: '',
    platforms: [],
    media: [],
    scheduled_for: '',
    hashtags: [],
    property_id: null
  });
  
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [hashtagInput, setHashtagInput] = useState('');

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/social/accounts');
      setAccounts(res.data.accounts || []);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePlatform = (platform) => {
    setPost(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }));
  };

  const handleGenerateAI = async () => {
    setGeneratingAI(true);
    try {
      const res = await api.post('/social/ai/generate', {
        prompt_type: selectedProperty ? 'listing' : 'custom',
        property_id: selectedProperty?.id,
        platforms: post.platforms.length ? post.platforms : ['instagram'],
        tone: 'professional',
        custom_prompt: !selectedProperty ? 'Write a general real estate tip or market insight' : null
      });

      if (res.data.success) {
        setPost(prev => ({
          ...prev,
          content: res.data.content,
          hashtags: res.data.hashtags || [],
          is_ai_generated: true
        }));
        toast.success('AI content generated!');
      } else {
        toast.error(res.data.error || 'Failed to generate content');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate AI content');
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleRandomProperty = async () => {
    setLoadingProperty(true);
    try {
      const res = await api.get('/social/random-property');
      setSelectedProperty(res.data.property);
      setPost(prev => ({ ...prev, property_id: res.data.property.id }));
      toast.success('Random property selected!');
    } catch (error) {
      toast.error('No active properties found');
    } finally {
      setLoadingProperty(false);
    }
  };

  const handleAddHashtag = () => {
    if (hashtagInput.trim()) {
      const tag = hashtagInput.startsWith('#') ? hashtagInput : `#${hashtagInput}`;
      if (!post.hashtags.includes(tag)) {
        setPost(prev => ({ ...prev, hashtags: [...prev.hashtags, tag] }));
      }
      setHashtagInput('');
    }
  };

  const handleRemoveHashtag = (tag) => {
    setPost(prev => ({ ...prev, hashtags: prev.hashtags.filter(t => t !== tag) }));
  };

  const handleSubmit = async (publishNow = false) => {
    if (!post.content.trim()) {
      toast.error('Please enter post content');
      return;
    }
    if (post.platforms.length === 0) {
      toast.error('Please select at least one platform');
      return;
    }

    setPosting(true);
    try {
      const payload = {
        content: post.content + (post.hashtags.length ? '\n\n' + post.hashtags.join(' ') : ''),
        platforms: post.platforms,
        media: post.media,
        scheduled_for: publishNow ? null : post.scheduled_for || null,
        property_id: post.property_id,
        hashtags: post.hashtags,
        is_ai_generated: post.is_ai_generated || false
      };

      const res = await api.post('/social/posts', payload);
      
      if (publishNow) {
        toast.success('Post is being published!');
      } else if (post.scheduled_for) {
        toast.success('Post scheduled!');
      } else {
        toast.success('Post saved as draft');
      }
      
      navigate('/social-media');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create post');
    } finally {
      setPosting(false);
    }
  };

  const connectedPlatforms = accounts.map(a => a.platform);
  const maxLength = Math.min(...(post.platforms.map(p => platformConfig[p]?.limit || 2000)));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl" data-testid="compose-post">
      <div>
        <h1 className="text-3xl font-serif font-bold">Create Post</h1>
        <p className="text-muted-foreground">Compose and schedule social media posts</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Platform Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Platforms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {Object.entries(platformConfig).map(([key, config]) => {
                  const Icon = config.icon;
                  const isConnected = connectedPlatforms.includes(key);
                  const isSelected = post.platforms.includes(key);

                  return (
                    <button
                      key={key}
                      onClick={() => isConnected && togglePlatform(key)}
                      disabled={!isConnected}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                        isSelected 
                          ? `${config.bg} text-white border-transparent` 
                          : isConnected
                            ? 'border-border hover:border-foreground'
                            : 'border-border opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : config.color}`} />
                      <span className="text-sm font-medium">{config.name}</span>
                      {!isConnected && <Badge variant="outline" className="text-xs">Not connected</Badge>}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Post Content
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateAI}
                  disabled={generatingAI}
                >
                  {generatingAI ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2 text-purple-500" />
                  )}
                  Generate with AI
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={post.content}
                onChange={(e) => setPost(prev => ({ ...prev, content: e.target.value }))}
                placeholder="What do you want to share?"
                rows={6}
                className="resize-none"
              />
              <div className="flex items-center justify-between text-sm">
                <span className={post.content.length > maxLength ? 'text-red-500' : 'text-muted-foreground'}>
                  {post.content.length} / {maxLength} characters
                </span>
                {post.is_ai_generated && (
                  <Badge className="bg-purple-500/20 text-purple-600">
                    <Sparkles className="w-3 h-3 mr-1" /> AI Generated
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Hashtags */}
          <Card>
            <CardHeader>
              <CardTitle>Hashtags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={hashtagInput}
                  onChange={(e) => setHashtagInput(e.target.value)}
                  placeholder="Add hashtag"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddHashtag()}
                />
                <Button variant="outline" onClick={handleAddHashtag}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {post.hashtags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="px-3 py-1">
                    {tag}
                    <button onClick={() => handleRemoveHashtag(tag)} className="ml-2 hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Property Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="w-5 h-5 text-amber-500" />
                Link Property
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleRandomProperty}
                disabled={loadingProperty}
              >
                {loadingProperty ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Random from Showcase
              </Button>

              {selectedProperty && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="font-medium text-sm">{selectedProperty.address}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedProperty.city}, {selectedProperty.state}
                  </p>
                  {selectedProperty.price && (
                    <p className="text-sm font-bold text-amber-600 mt-1">
                      ${selectedProperty.price.toLocaleString()}
                    </p>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-red-500"
                    onClick={() => {
                      setSelectedProperty(null);
                      setPost(prev => ({ ...prev, property_id: null }));
                    }}
                  >
                    <X className="w-4 h-4 mr-1" /> Remove
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={post.scheduled_for}
                  onChange={(e) => setPost(prev => ({ ...prev, scheduled_for: e.target.value }))}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Leave empty to save as draft or post immediately
              </p>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <Button
                className="w-full bg-amber-500 hover:bg-amber-600 text-black"
                onClick={() => handleSubmit(true)}
                disabled={posting || post.platforms.length === 0}
              >
                {posting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Post Now
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleSubmit(false)}
                disabled={posting || post.platforms.length === 0 || !post.scheduled_for}
              >
                <Clock className="w-4 h-4 mr-2" />
                Schedule
              </Button>

              <Button
                variant="ghost"
                className="w-full"
                onClick={() => handleSubmit(false)}
                disabled={posting}
              >
                Save as Draft
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ComposePost;
