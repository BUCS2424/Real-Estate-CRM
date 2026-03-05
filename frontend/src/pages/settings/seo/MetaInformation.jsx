import React, { useState } from 'react';
import { FileCode, Save, Globe, Search, Image } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { toast } from 'sonner';

export const MetaInformation = () => {
  const [meta, setMeta] = useState({
    global: {
      title: 'Hidden Haven Realty | Real Estate CRM Platform',
      description: 'Powerful all-in-one CRM for real estate professionals. Manage contacts, deals, tasks, and AI-powered content generation.',
      keywords: 'real estate, CRM, property management, lead management, AI content',
      ogImage: 'https://example.com/og-image.jpg',
    },
    pages: [
      { path: '/dashboard', title: 'Dashboard | Hidden Haven Realty', description: 'Overview of your real estate business' },
      { path: '/contacts', title: 'Contacts | Hidden Haven Realty', description: 'Manage your leads and contacts' },
      { path: '/deals', title: 'Deal Pipeline | Hidden Haven Realty', description: 'Track deals through your sales pipeline' },
    ]
  });

  const handleSave = () => {
    toast.success('Meta information saved');
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="meta-information-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
            <FileCode className="w-6 h-6" />
            Meta Information
          </h1>
          <p className="text-muted-foreground mt-1">Manage SEO meta tags and social sharing</p>
        </div>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="global">
        <TabsList>
          <TabsTrigger value="global">Global Settings</TabsTrigger>
          <TabsTrigger value="pages">Page-Specific</TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Global Meta Tags</CardTitle>
              <CardDescription>Default meta tags applied across the site</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Site Title</Label>
                <Input 
                  value={meta.global.title}
                  onChange={(e) => setMeta({ ...meta, global: { ...meta.global, title: e.target.value } })}
                />
              </div>
              <div>
                <Label>Meta Description</Label>
                <Textarea 
                  value={meta.global.description}
                  onChange={(e) => setMeta({ ...meta, global: { ...meta.global, description: e.target.value } })}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">{meta.global.description.length}/160 characters</p>
              </div>
              <div>
                <Label>Keywords</Label>
                <Input 
                  value={meta.global.keywords}
                  onChange={(e) => setMeta({ ...meta, global: { ...meta.global, keywords: e.target.value } })}
                  placeholder="keyword1, keyword2, keyword3"
                />
              </div>
              <div>
                <Label>OG Image URL</Label>
                <Input 
                  value={meta.global.ogImage}
                  onChange={(e) => setMeta({ ...meta, global: { ...meta.global, ogImage: e.target.value } })}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Search Preview</CardTitle>
              <CardDescription>How your site appears in search results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Globe className="w-4 h-4" />
                  hiddenhavenrealty.com
                </div>
                <h3 className="text-lg text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                  {meta.global.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {meta.global.description}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pages">
          <Card>
            <CardHeader>
              <CardTitle>Page-Specific Meta Tags</CardTitle>
              <CardDescription>Override global settings for specific pages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {meta.pages.map((page, i) => (
                  <div key={i} className="p-4 bg-muted/30 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <code className="text-sm bg-muted px-2 py-1 rounded">{page.path}</code>
                      <Button size="sm" variant="outline">Edit</Button>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{page.title}</p>
                      <p className="text-xs text-muted-foreground">{page.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
