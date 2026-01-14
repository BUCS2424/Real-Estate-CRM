import React, { useState, useEffect } from 'react';
import { aiAPI, contactsAPI, articlesAPI, tasksAPI } from '../lib/api';
import { 
  Sparkles, 
  User, 
  FileText, 
  Save,
  Wand2,
  Mail,
  FileEdit,
  Briefcase,
  Loader2,
  Copy,
  Check,
  Plus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from 'sonner';

const ARTICLE_TYPES = [
  { id: 'email', label: 'Email', icon: Mail, description: 'Professional email outreach' },
  { id: 'listing', label: 'Property Listing', icon: Briefcase, description: 'Compelling property descriptions' },
  { id: 'blog', label: 'Blog Post', icon: FileEdit, description: 'Engaging real estate content' },
  { id: 'newsletter', label: 'Newsletter', icon: FileText, description: 'Client newsletter content' },
];

const PROMPT_TEMPLATES = [
  { label: 'Follow-up Email', prompt: 'Write a professional follow-up email for a real estate client who showed interest in properties but hasn\'t responded in a week.' },
  { label: 'Property Introduction', prompt: 'Write an engaging introduction email for a new property listing that highlights key features and creates urgency.' },
  { label: 'Market Update', prompt: 'Write a brief market update for clients about current real estate trends and opportunities.' },
  { label: 'Thank You Note', prompt: 'Write a warm thank you message after a successful property showing or meeting.' },
];

export const AIWriterPage = () => {
  const [contacts, setContacts] = useState([]);
  const [articles, setArticles] = useState([]);
  const [selectedContact, setSelectedContact] = useState('');
  const [articleType, setArticleType] = useState('email');
  const [prompt, setPrompt] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [title, setTitle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [contactsRes, articlesRes] = await Promise.all([
        contactsAPI.list(),
        articlesAPI.list()
      ]);
      setContacts(contactsRes.data);
      setArticles(articlesRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await aiAPI.generate({
        prompt,
        contact_id: selectedContact === 'none' ? null : selectedContact || null,
        article_type: articleType
      });
      setGeneratedContent(response.data.content);
      toast.success('Content generated successfully!');
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error.response?.data?.detail || 'Failed to generate content');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    if (!generatedContent.trim()) {
      toast.error('No content to save');
      return;
    }

    setIsSaving(true);
    try {
      await articlesAPI.create({
        title,
        content: generatedContent,
        contact_id: selectedContact === 'none' ? null : selectedContact || null,
        article_type: articleType,
        status: 'draft'
      });
      toast.success('Article saved!');
      fetchData();
      // Reset form
      setTitle('');
      setGeneratedContent('');
      setPrompt('');
    } catch (error) {
      toast.error('Failed to save article');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateTask = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title first');
      return;
    }
    try {
      await tasksAPI.create({
        title: `Review: ${title}`,
        description: `Review and approve the generated ${articleType}: ${title}`,
        status: 'todo',
        priority: 'medium'
      });
      toast.success('Task created for review');
    } catch (error) {
      toast.error('Failed to create task');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard');
  };

  const handleUseTemplate = (template) => {
    setPrompt(template.prompt);
  };

  const selectedContactData = selectedContact ? contacts.find(c => c.id === selectedContact) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="ai-writer-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-bold flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-accent" />
          AI Article Writer
        </h1>
        <p className="text-muted-foreground mt-1">Generate personalized content for your real estate business</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel - Context & Controls */}
        <div className="lg:col-span-4 space-y-6">
          {/* Context Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-serif">Context</CardTitle>
              <CardDescription>Select contact for personalized content</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="contact">Contact (Optional)</Label>
                <Select value={selectedContact} onValueChange={setSelectedContact}>
                  <SelectTrigger data-testid="contact-select">
                    <SelectValue placeholder="Select a contact" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific contact</SelectItem>
                    {contacts.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          {c.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedContactData && (
                <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
                  <p className="font-medium">{selectedContactData.name}</p>
                  {selectedContactData.company && <p className="text-muted-foreground">{selectedContactData.company}</p>}
                  {selectedContactData.property_interest && (
                    <p className="text-muted-foreground">Interest: {selectedContactData.property_interest}</p>
                  )}
                  {selectedContactData.budget && (
                    <p className="text-muted-foreground">Budget: {selectedContactData.budget}</p>
                  )}
                </div>
              )}

              <div>
                <Label>Content Type</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {ARTICLE_TYPES.map(type => (
                    <Button
                      key={type.id}
                      variant={articleType === type.id ? 'default' : 'outline'}
                      className="h-auto py-3 flex flex-col items-center gap-1"
                      onClick={() => setArticleType(type.id)}
                      data-testid={`type-${type.id}`}
                    >
                      <type.icon className="w-5 h-5" />
                      <span className="text-xs">{type.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Templates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-serif">Quick Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {PROMPT_TEMPLATES.map((template, i) => (
                  <Button
                    key={i}
                    variant="ghost"
                    className="w-full justify-start text-left h-auto py-2 px-3"
                    onClick={() => handleUseTemplate(template)}
                  >
                    <Wand2 className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="text-sm">{template.label}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Articles */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-serif">Recent Drafts</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                {articles.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No saved articles yet</p>
                ) : (
                  <div className="space-y-2">
                    {articles.slice(0, 5).map(article => (
                      <div 
                        key={article.id} 
                        className="p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => {
                          setTitle(article.title);
                          setGeneratedContent(article.content);
                          setArticleType(article.article_type);
                        }}
                      >
                        <p className="font-medium text-sm truncate">{article.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs capitalize">{article.article_type}</Badge>
                          <Badge variant="outline" className="text-xs capitalize">{article.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Editor */}
        <div className="lg:col-span-8 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-serif">AI Content Generator</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Prompt Input */}
              <div>
                <Label htmlFor="prompt">What would you like to write?</Label>
                <Textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe what you want to create... e.g., 'Write a follow-up email for a client interested in luxury condos downtown'"
                  rows={3}
                  className="mt-2"
                  data-testid="ai-prompt-input"
                />
              </div>

              <Button 
                onClick={handleGenerate} 
                disabled={isGenerating || !prompt.trim()}
                className="w-full"
                data-testid="generate-btn"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Content
                  </>
                )}
              </Button>

              {/* Generated Content */}
              {generatedContent && (
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter a title for this content"
                      className="mt-2"
                      data-testid="content-title-input"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Generated Content</Label>
                      <Button variant="ghost" size="sm" onClick={handleCopy}>
                        {copied ? (
                          <><Check className="w-4 h-4 mr-1" /> Copied</>
                        ) : (
                          <><Copy className="w-4 h-4 mr-1" /> Copy</>
                        )}
                      </Button>
                    </div>
                    <Textarea
                      value={generatedContent}
                      onChange={(e) => setGeneratedContent(e.target.value)}
                      rows={12}
                      className="font-mono text-sm"
                      data-testid="generated-content"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={handleSave} disabled={isSaving} className="flex-1" data-testid="save-article-btn">
                      {isSaving ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                      ) : (
                        <><Save className="w-4 h-4 mr-2" /> Save as Draft</>
                      )}
                    </Button>
                    <Button variant="outline" onClick={handleCreateTask}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Review Task
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
