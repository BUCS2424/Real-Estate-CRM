import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Trash2, Loader2, CheckCircle, Image as ImageIcon, GripVertical, ZoomIn, Download } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { propertyLeadsAPI } from '../lib/api';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const formatSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const PropertyImagesGallery = ({ leadId, images = [], onImagesChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const fileInputRef = useRef(null);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      await uploadFiles(droppedFiles);
    }
  }, [leadId]);

  const handleFileSelect = async (e) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      await uploadFiles(selectedFiles);
    }
    e.target.value = '';
  };

  const uploadFiles = async (fileList) => {
    const files = Array.from(fileList);
    const validFiles = files.filter(file => {
      // Support all common image formats including iOS HEIC
      const validTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'image/heic', 'image/heif', 'image/bmp', 'image/tiff'
      ];
      const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'bmp', 'tiff'];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      
      if (!validTypes.includes(file.type) && !validExtensions.includes(ext)) {
        toast.error(`${file.name} is not a valid image type`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setUploading(true);
    
    try {
      if (validFiles.length === 1) {
        const formData = new FormData();
        formData.append('file', validFiles[0]);
        const response = await propertyLeadsAPI.uploadImage(leadId, formData);
        toast.success('Image uploaded');
      } else {
        const formData = new FormData();
        validFiles.forEach(file => formData.append('files', file));
        const response = await propertyLeadsAPI.uploadMultipleImages(leadId, formData);
        
        // Show specific feedback about what was uploaded
        const uploaded = response.data?.uploaded?.length || 0;
        const errors = response.data?.errors || [];
        
        if (errors.length > 0) {
          toast.warning(`${uploaded} images uploaded, ${errors.length} failed`);
          errors.forEach(err => console.error('Upload error:', err));
        } else {
          toast.success(`${uploaded} images uploaded`);
        }
      }
      
      onImagesChange?.();
    } catch (error) {
      console.error('Upload error:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to upload images';
      toast.error(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (imageId) => {
    if (!window.confirm('Delete this image?')) return;
    
    setDeleting(imageId);
    try {
      await propertyLeadsAPI.deleteImage(leadId, imageId);
      toast.success('Image deleted');
      onImagesChange?.();
    } catch (error) {
      toast.error('Failed to delete image');
    } finally {
      setDeleting(null);
    }
  };

  const getImageUrl = (image) => {
    if (image.url?.startsWith('http')) {
      return image.url;
    }
    return `${API_URL}${image.url}`;
  };

  return (
    <Card data-testid="property-images-gallery">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-amber-500" />
          Property Images
        </CardTitle>
        <CardDescription>
          Upload and manage property photos. These stay with the property forever.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drop Zone */}
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={cn(
            "relative border-2 border-dashed rounded-xl p-6 transition-all cursor-pointer",
            isDragging 
              ? "border-amber-500 bg-amber-500/10 scale-[1.02]" 
              : "border-muted-foreground/25 hover:border-amber-500/50 hover:bg-muted/30",
            uploading && "opacity-50 cursor-not-allowed"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
          
          <div className="flex flex-col items-center justify-center text-center gap-2">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
              {uploading ? (
                <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
              ) : (
                <Upload className={cn(
                  "w-6 h-6 text-amber-500",
                  isDragging && "animate-bounce"
                )} />
              )}
            </div>
            
            <div>
              <p className="font-medium text-sm">
                {uploading ? "Uploading..." : isDragging ? "Drop images here" : "Drag & drop images here"}
              </p>
              <p className="text-xs text-muted-foreground">
                or <span className="text-amber-500 underline">browse from device</span>
              </p>
            </div>
            
            <p className="text-xs text-muted-foreground">
              JPEG, PNG, GIF, WEBP • Max 10MB each
            </p>
          </div>
          
          {isDragging && (
            <div className="absolute inset-0 bg-amber-500/10 rounded-xl flex items-center justify-center">
              <div className="bg-background rounded-lg px-4 py-2 shadow-lg border border-amber-500/50">
                <p className="font-medium text-amber-500">Release to upload</p>
              </div>
            </div>
          )}
        </div>

        {/* Image Gallery */}
        {images.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{images.length} image{images.length !== 1 ? 's' : ''}</p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {images.map((image, index) => (
                <div
                  key={image.id}
                  className="group relative aspect-square rounded-lg overflow-hidden bg-muted border hover:border-amber-500/50 transition-colors"
                >
                  <img
                    src={getImageUrl(image)}
                    alt={image.original_name || `Property image ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
                    }}
                  />
                  
                  {/* Overlay with actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewImage(image);
                      }}
                    >
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(image.id);
                      }}
                      disabled={deleting === image.id}
                    >
                      {deleting === image.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  
                  {/* Image number badge */}
                  <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {images.length === 0 && !uploading && (
          <div className="text-center py-6 text-muted-foreground">
            <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No images yet</p>
            <p className="text-xs mt-1">Upload property photos to use in brochures and landing pages</p>
          </div>
        )}

        {/* Image Preview Modal */}
        <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{previewImage?.original_name || 'Image Preview'}</DialogTitle>
            </DialogHeader>
            {previewImage && (
              <div className="space-y-4">
                <div className="relative max-h-[60vh] overflow-hidden rounded-lg">
                  <img
                    src={getImageUrl(previewImage)}
                    alt={previewImage.original_name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{formatSize(previewImage.size || 0)}</span>
                  <span>Uploaded by {previewImage.uploaded_by}</span>
                </div>
                <div className="flex gap-2">
                  <a
                    href={getImageUrl(previewImage)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1"
                  >
                    <Button variant="outline" className="w-full">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </a>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      handleDelete(previewImage.id);
                      setPreviewImage(null);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default PropertyImagesGallery;
