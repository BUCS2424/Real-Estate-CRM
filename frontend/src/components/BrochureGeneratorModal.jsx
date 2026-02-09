import React, { useState } from 'react';
import { FileText, Download, Eye, SkipForward, Loader2, X, Printer, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { toast } from 'sonner';
import api from '../lib/api';

const TEMPLATES = [
  { value: 'flyer', label: 'Full Page Flyer (8.5" x 11")', description: 'Professional single-page brochure' },
  { value: 'postcard', label: 'Postcard (6" x 4")', description: 'Compact mailer design' },
  { value: 'trifold', label: 'Tri-Fold Brochure', description: 'Three-panel foldable layout' },
];

export const BrochureGeneratorModal = ({ 
  isOpen, 
  onClose, 
  leadId,
  leadAddress,
  onComplete
}) => {
  const [template, setTemplate] = useState('flyer');
  const [includeQR, setIncludeQR] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const handlePreview = async () => {
    setGenerating(true);
    setPreviewUrl(null);
    
    try {
      const response = await api.post(`/property-leads/${leadId}/brochure/preview`, {
        template,
        include_qr: includeQR
      }, {
        responseType: 'blob'
      });
      
      // Create object URL for preview
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setShowPreview(true);
      toast.success('Preview generated!');
    } catch (error) {
      toast.error('Failed to generate preview');
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    setGenerating(true);
    
    try {
      const response = await api.post(`/property-leads/${leadId}/brochure/generate`, {
        template,
        include_qr: includeQR
      }, {
        responseType: 'blob'
      });
      
      // Download the file
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `brochure-${leadAddress?.replace(/\s+/g, '-').toLowerCase() || 'property'}-${template}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Brochure downloaded!');
      onComplete?.();
    } catch (error) {
      toast.error('Failed to download brochure');
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const handleSkip = () => {
    setPreviewUrl(null);
    setShowPreview(false);
    setTemplate('flyer');
    onClose();
  };

  const handleCreateAnother = () => {
    setPreviewUrl(null);
    setShowPreview(false);
    // Keep modal open for another generation
    toast.info('Ready to create another brochure');
  };

  const closePreview = () => {
    setShowPreview(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  return (
    <>
      {/* Main Generator Modal */}
      <Dialog open={isOpen && !showPreview} onOpenChange={(open) => { if (!open) handleSkip(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-500" />
              Brochure Generator
            </DialogTitle>
            <DialogDescription>
              Create a professional brochure for {leadAddress || 'this property'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Template Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Select Template</Label>
              <div className="grid gap-3">
                {TEMPLATES.map((t) => (
                  <div
                    key={t.value}
                    onClick={() => setTemplate(t.value)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      template === t.value 
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20' 
                        : 'border-border hover:border-amber-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{t.label}</p>
                        <p className="text-sm text-muted-foreground">{t.description}</p>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        template === t.value 
                          ? 'border-amber-500 bg-amber-500' 
                          : 'border-gray-300'
                      }`}>
                        {template === t.value && (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-1.5 h-1.5 bg-white rounded-full" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Options */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div>
                <Label className="font-medium">Include QR Code</Label>
                <p className="text-sm text-muted-foreground">Links to property landing page</p>
              </div>
              <Switch
                checked={includeQR}
                onCheckedChange={setIncludeQR}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={handleSkip}
                className="flex-1"
                disabled={generating}
              >
                <SkipForward className="w-4 h-4 mr-2" />
                Skip
              </Button>
              
              <Button
                variant="outline"
                onClick={handlePreview}
                className="flex-1"
                disabled={generating}
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Eye className="w-4 h-4 mr-2" />
                )}
                Preview
              </Button>
              
              <Button
                onClick={handleDownload}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-black"
                disabled={generating}
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Download
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={(open) => { if (!open) closePreview(); }}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-amber-500" />
                  Brochure Preview
                </DialogTitle>
                <DialogDescription>
                  {leadAddress || 'Property'} - {TEMPLATES.find(t => t.value === template)?.label}
                </DialogDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCreateAnother}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Create Another
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  disabled={generating}
                >
                  {generating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Download PDF
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closePreview}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-900">
            {previewUrl ? (
              <iframe
                src={previewUrl}
                className="w-full h-full border-0"
                title="Brochure Preview"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              </div>
            )}
          </div>
          
          <div className="p-4 border-t bg-background flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Preview generated • {template === 'flyer' ? '8.5" x 11"' : template === 'postcard' ? '6" x 4"' : 'Tri-fold'}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={closePreview}
              >
                <SkipForward className="w-4 h-4 mr-2" />
                Skip & Close
              </Button>
              <Button
                onClick={handleDownload}
                className="bg-amber-500 hover:bg-amber-600 text-black"
                disabled={generating}
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Download PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BrochureGeneratorModal;
