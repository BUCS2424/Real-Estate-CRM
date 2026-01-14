import React, { useState } from 'react';
import { Map, RefreshCw, CheckCircle2, AlertCircle, ExternalLink, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';

export const SitemapSubmit = () => {
  const [autoGenerate, setAutoGenerate] = useState(true);

  const sitemaps = [
    { url: '/sitemap.xml', pages: 156, lastGenerated: '2025-01-14 10:00 AM', status: 'active' },
    { url: '/sitemap-posts.xml', pages: 89, lastGenerated: '2025-01-14 10:00 AM', status: 'active' },
    { url: '/sitemap-pages.xml', pages: 24, lastGenerated: '2025-01-14 10:00 AM', status: 'active' },
  ];

  const searchEngines = [
    { name: 'Google Search Console', submitted: true, lastPing: '2025-01-14' },
    { name: 'Bing Webmaster Tools', submitted: true, lastPing: '2025-01-13' },
    { name: 'Yandex Webmaster', submitted: false, lastPing: null },
  ];

  const handleRegenerateSitemap = () => {
    toast.success('Sitemap regeneration started');
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="sitemap-submit-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
            <Map className="w-6 h-6" />
            Sitemap & Submit
          </h1>
          <p className="text-muted-foreground mt-1">Manage sitemaps and search engine submissions</p>
        </div>
        <Button onClick={handleRegenerateSitemap}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Regenerate All
        </Button>
      </div>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Sitemap Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-generate Sitemap</Label>
              <p className="text-sm text-muted-foreground">Automatically regenerate sitemap when content changes</p>
            </div>
            <Switch checked={autoGenerate} onCheckedChange={setAutoGenerate} />
          </div>
        </CardContent>
      </Card>

      {/* Sitemaps */}
      <Card>
        <CardHeader>
          <CardTitle>Generated Sitemaps</CardTitle>
          <CardDescription>All sitemap files</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sitemaps.map((sitemap, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Map className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium font-mono">{sitemap.url}</p>
                    <p className="text-xs text-muted-foreground">{sitemap.pages} pages • Last generated: {sitemap.lastGenerated}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    {sitemap.status}
                  </Badge>
                  <Button size="sm" variant="outline">
                    <ExternalLink className="w-4 h-4 mr-1" />
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search Engine Submissions */}
      <Card>
        <CardHeader>
          <CardTitle>Search Engine Submissions</CardTitle>
          <CardDescription>Submit your sitemap to search engines</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {searchEngines.map((engine, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="font-medium">{engine.name}</p>
                  {engine.submitted && (
                    <p className="text-xs text-muted-foreground">Last ping: {engine.lastPing}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {engine.submitted ? (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Submitted
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Not submitted
                    </Badge>
                  )}
                  <Button size="sm" variant="outline">
                    <Upload className="w-4 h-4 mr-1" />
                    {engine.submitted ? 'Resubmit' : 'Submit'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
