import React, { useState } from 'react';
import { Code, Save, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Textarea } from '../../../components/ui/textarea';
import { Label } from '../../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '../../../components/ui/alert';
import { toast } from 'sonner';

export const CustomCode = () => {
  const [code, setCode] = useState({
    headerJs: '// Add your custom JavaScript here\nconsole.log("Fusion Builder CRM loaded");',
    footerJs: '// Footer scripts',
    css: '/* Custom CSS styles */\n.custom-class {\n  /* your styles */\n}',
    headerHtml: '<!-- Custom header HTML -->\n<!-- e.g., Google Analytics, Meta Pixel -->',
  });

  const handleSave = () => {
    toast.success('Custom code saved');
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="custom-code-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
            <Code className="w-6 h-6" />
            Custom Code
          </h1>
          <p className="text-muted-foreground mt-1">Add custom scripts and styles</p>
        </div>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <Alert variant="warning">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Caution</AlertTitle>
        <AlertDescription>
          Custom code is executed on every page load. Incorrect code may break your site functionality.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="headerJs">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="headerJs">Header JS</TabsTrigger>
          <TabsTrigger value="footerJs">Footer JS</TabsTrigger>
          <TabsTrigger value="css">Custom CSS</TabsTrigger>
          <TabsTrigger value="headerHtml">Header HTML</TabsTrigger>
        </TabsList>

        <TabsContent value="headerJs">
          <Card>
            <CardHeader>
              <CardTitle>Header JavaScript</CardTitle>
              <CardDescription>Scripts loaded in the &lt;head&gt; section</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea 
                value={code.headerJs}
                onChange={(e) => setCode({ ...code, headerJs: e.target.value })}
                rows={15}
                className="font-mono text-sm"
                placeholder="// Your JavaScript code here"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="footerJs">
          <Card>
            <CardHeader>
              <CardTitle>Footer JavaScript</CardTitle>
              <CardDescription>Scripts loaded before &lt;/body&gt;</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea 
                value={code.footerJs}
                onChange={(e) => setCode({ ...code, footerJs: e.target.value })}
                rows={15}
                className="font-mono text-sm"
                placeholder="// Your JavaScript code here"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="css">
          <Card>
            <CardHeader>
              <CardTitle>Custom CSS</CardTitle>
              <CardDescription>Additional stylesheets</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea 
                value={code.css}
                onChange={(e) => setCode({ ...code, css: e.target.value })}
                rows={15}
                className="font-mono text-sm"
                placeholder="/* Your CSS here */"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="headerHtml">
          <Card>
            <CardHeader>
              <CardTitle>Header HTML</CardTitle>
              <CardDescription>Custom HTML in the &lt;head&gt; section (meta tags, tracking pixels, etc.)</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea 
                value={code.headerHtml}
                onChange={(e) => setCode({ ...code, headerHtml: e.target.value })}
                rows={15}
                className="font-mono text-sm"
                placeholder="<!-- Your HTML here -->"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
