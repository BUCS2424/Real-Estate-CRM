import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Badge } from '../../../components/ui/badge';
import { 
  Mail, 
  Loader2, 
  Eye,
  Send,
  Users,
  Calendar,
  Bell,
  Newspaper,
  FileText,
  UserPlus,
  Settings,
  Maximize2,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../../lib/api';

const CATEGORY_CONFIG = {
  contacts: { label: 'Contacts', color: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30', icon: Users },
  system: { label: 'System', color: 'bg-gray-500/20 text-gray-600 border-gray-500/30', icon: Settings },
  marketing: { label: 'Marketing', color: 'bg-purple-500/20 text-purple-600 border-purple-500/30', icon: FileText },
  automation: { label: 'Automation', color: 'bg-blue-500/20 text-blue-600 border-blue-500/30', icon: Bell },
  bookings: { label: 'Bookings', color: 'bg-amber-500/20 text-amber-600 border-amber-500/30', icon: Calendar },
};

export const SamplesSettings = () => {
  const [loading, setLoading] = useState(true);
  const [samples, setSamples] = useState([]);
  const [previewSample, setPreviewSample] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    fetchSamples();
  }, []);

  const fetchSamples = async () => {
    setLoading(true);
    try {
      const response = await api.get('/email/samples');
      setSamples(response.data.samples || []);
    } catch (error) {
      toast.error('Failed to load email samples');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryConfig = (category) => {
    return CATEGORY_CONFIG[category] || CATEGORY_CONFIG.system;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif text-foreground mb-2">Email & Template Samples</h1>
        <p className="text-muted-foreground">Preview all outgoing emails and templates used throughout the system</p>
      </div>

      {/* Category Legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
          const Icon = config.icon;
          return (
            <Badge key={key} variant="outline" className={`${config.color} border`}>
              <Icon className="w-3 h-3 mr-1" />
              {config.label}
            </Badge>
          );
        })}
      </div>

      {/* Samples Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {samples.map((sample) => {
          const categoryConfig = getCategoryConfig(sample.category);
          const CategoryIcon = categoryConfig.icon;
          
          return (
            <Card 
              key={sample.id} 
              className="group hover:shadow-lg transition-all cursor-pointer border-l-4"
              style={{ borderLeftColor: sample.category === 'contacts' ? '#10b981' : 
                       sample.category === 'marketing' ? '#a855f7' :
                       sample.category === 'automation' ? '#3b82f6' :
                       sample.category === 'bookings' ? '#f59e0b' : '#6b7280' }}
              onClick={() => setPreviewSample(sample)}
              data-testid={`sample-${sample.id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${categoryConfig.color}`}>
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{sample.name}</CardTitle>
                      <Badge variant="outline" className={`${categoryConfig.color} border text-xs mt-1`}>
                        <CategoryIcon className="w-3 h-3 mr-1" />
                        {categoryConfig.label}
                      </Badge>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); setPreviewSample(sample); }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">{sample.description}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                  <Send className="w-3 h-3" />
                  <span className="truncate font-mono">{sample.subject}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {samples.length === 0 && (
        <Card className="p-12 text-center">
          <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No email samples available</p>
        </Card>
      )}

      {/* Preview Modal */}
      <Dialog open={!!previewSample} onOpenChange={() => { setPreviewSample(null); setFullscreen(false); }}>
        <DialogContent className={`${fullscreen ? 'max-w-[95vw] h-[95vh]' : 'max-w-4xl max-h-[85vh]'} overflow-hidden flex flex-col`}>
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-amber-500" />
                  {previewSample?.name}
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">{previewSample?.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setFullscreen(!fullscreen)}
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {/* Subject Line */}
            {previewSample && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Subject Line:</p>
                <p className="font-medium">{previewSample.subject}</p>
              </div>
            )}
          </DialogHeader>
          
          {/* Email Preview */}
          <div className="flex-1 overflow-auto mt-4 border rounded-lg bg-white">
            {previewSample && (
              <iframe
                srcDoc={previewSample.html}
                title={`Preview: ${previewSample.name}`}
                className="w-full h-full min-h-[500px] border-0"
                sandbox="allow-same-origin"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SamplesSettings;
