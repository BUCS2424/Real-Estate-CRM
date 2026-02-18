import React, { useState } from 'react';
import { Code, Plus, Edit, Trash2, CheckCircle2, AlertCircle, Copy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Badge } from '../../../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { toast } from 'sonner';

export const StructuredData = () => {
  const [schemas, setSchemas] = useState([
    { id: 1, type: 'Organization', status: 'valid', pages: 'All' },
    { id: 2, type: 'LocalBusiness', status: 'valid', pages: 'Home' },
    { id: 3, type: 'RealEstateAgent', status: 'valid', pages: 'About' },
  ]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const schemaExample = `{
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  "name": "Fusion Builder CRM",
  "url": "https://fusionbuilder.com",
  "telephone": "+1-813-629-7355",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "123 Main St",
    "addressLocality": "New York",
    "addressRegion": "NY",
    "postalCode": "10001"
  }
}`;

  const handleCopySchema = () => {
    navigator.clipboard.writeText(schemaExample);
    toast.success('Schema copied to clipboard');
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="structured-data-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
            <Code className="w-6 h-6" />
            Structured Data
          </h1>
          <p className="text-muted-foreground mt-1">Manage JSON-LD schema markup</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Schema
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Structured Data</DialogTitle>
              <DialogDescription>Add JSON-LD schema markup</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Schema Type</Label>
                <Select defaultValue="Organization">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Organization">Organization</SelectItem>
                    <SelectItem value="LocalBusiness">Local Business</SelectItem>
                    <SelectItem value="RealEstateAgent">Real Estate Agent</SelectItem>
                    <SelectItem value="Product">Product</SelectItem>
                    <SelectItem value="Article">Article</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Apply To</Label>
                <Select defaultValue="all">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Pages</SelectItem>
                    <SelectItem value="home">Home Page Only</SelectItem>
                    <SelectItem value="specific">Specific Pages</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>JSON-LD Schema</Label>
                <Textarea 
                  defaultValue={schemaExample}
                  rows={12}
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => { setIsDialogOpen(false); toast.success('Schema added'); }}>Add Schema</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Schemas */}
      <Card>
        <CardHeader>
          <CardTitle>Active Schemas</CardTitle>
          <CardDescription>Currently implemented structured data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {schemas.map(schema => (
              <div key={schema.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Code className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{schema.type}</p>
                    <p className="text-xs text-muted-foreground">Applied to: {schema.pages}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    {schema.status}
                  </Badge>
                  <Button size="icon" variant="ghost">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Schema Validator */}
      <Card>
        <CardHeader>
          <CardTitle>Schema Validator</CardTitle>
          <CardDescription>Test your structured data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea 
            placeholder="Paste your JSON-LD schema here to validate..."
            rows={6}
            className="font-mono text-sm"
          />
          <div className="flex gap-2">
            <Button variant="outline">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Validate
            </Button>
            <Button variant="outline" onClick={handleCopySchema}>
              <Copy className="w-4 h-4 mr-2" />
              Copy Example
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
