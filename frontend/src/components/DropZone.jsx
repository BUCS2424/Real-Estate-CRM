import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, FileImage, FileVideo, FileText, File, Loader2, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

const FILE_TYPE_ICONS = {
  image: FileImage,
  video: FileVideo,
  document: FileText,
  other: File
};

const getFileType = (filename) => {
  const ext = filename.toLowerCase().split('.').pop();
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'heic'];
  const videoExts = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv', 'flv', 'm4v'];
  const docExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'];
  
  if (imageExts.includes(ext)) return 'image';
  if (videoExts.includes(ext)) return 'video';
  if (docExts.includes(ext)) return 'document';
  return 'other';
};

const formatSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const DropZone = ({
  onUpload,
  accept = '*/*',
  multiple = true,
  maxSize = 100 * 1024 * 1024, // 100MB default
  disabled = false,
  className = '',
  compact = false,
  showPreview = true,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
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

  const validateFile = (file) => {
    if (file.size > maxSize) {
      toast.error(`${file.name} is too large. Max size is ${formatSize(maxSize)}`);
      return false;
    }
    return true;
  };

  const processFiles = useCallback((fileList) => {
    const validFiles = Array.from(fileList).filter(validateFile);
    
    if (validFiles.length === 0) return;
    
    const newFiles = validFiles.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      name: file.name,
      size: file.size,
      type: getFileType(file.name),
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      status: 'pending'
    }));
    
    if (showPreview) {
      setFiles(prev => multiple ? [...prev, ...newFiles] : newFiles);
    } else {
      // Direct upload without preview
      handleUpload(newFiles);
    }
  }, [maxSize, multiple, showPreview]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    
    if (disabled) return;
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      processFiles(droppedFiles);
    }
  }, [disabled, processFiles]);

  const handleFileSelect = (e) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      processFiles(selectedFiles);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const removeFile = (fileId) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === fileId);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });
  };

  const handleUpload = async (filesToUpload = files) => {
    if (!onUpload || filesToUpload.length === 0) return;
    
    setUploading(true);
    
    try {
      // Update status to uploading
      setFiles(prev => prev.map(f => ({ ...f, status: 'uploading' })));
      
      // Upload files
      for (const fileItem of filesToUpload) {
        setUploadProgress(prev => ({ ...prev, [fileItem.id]: 0 }));
        
        try {
          await onUpload(fileItem.file);
          setFiles(prev => prev.map(f => 
            f.id === fileItem.id ? { ...f, status: 'complete' } : f
          ));
          setUploadProgress(prev => ({ ...prev, [fileItem.id]: 100 }));
        } catch (error) {
          setFiles(prev => prev.map(f => 
            f.id === fileItem.id ? { ...f, status: 'error' } : f
          ));
          toast.error(`Failed to upload ${fileItem.name}`);
        }
      }
      
      // Clear completed files after a delay
      setTimeout(() => {
        setFiles(prev => {
          prev.forEach(f => {
            if (f.preview) URL.revokeObjectURL(f.preview);
          });
          return [];
        });
        setUploadProgress({});
      }, 1500);
      
    } finally {
      setUploading(false);
    }
  };

  const clearAll = () => {
    files.forEach(f => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
    setFiles([]);
    setUploadProgress({});
  };

  const FileIcon = ({ type }) => {
    const Icon = FILE_TYPE_ICONS[type] || File;
    return <Icon className="w-8 h-8 text-muted-foreground" />;
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={cn(
          "relative border-2 border-dashed rounded-xl transition-all cursor-pointer",
          compact ? "p-4" : "p-8",
          isDragging 
            ? "border-primary bg-primary/5 scale-[1.02]" 
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />
        
        <div className={cn(
          "flex flex-col items-center justify-center text-center",
          compact ? "gap-2" : "gap-4"
        )}>
          <div className={cn(
            "rounded-full bg-primary/10 flex items-center justify-center",
            compact ? "w-10 h-10" : "w-16 h-16"
          )}>
            <Upload className={cn(
              "text-primary",
              compact ? "w-5 h-5" : "w-8 h-8",
              isDragging && "animate-bounce"
            )} />
          </div>
          
          <div>
            <p className={cn(
              "font-medium",
              compact ? "text-sm" : "text-lg"
            )}>
              {isDragging ? "Drop files here" : "Drag & drop files here"}
            </p>
            <p className={cn(
              "text-muted-foreground",
              compact ? "text-xs" : "text-sm"
            )}>
              or <span className="text-primary underline">browse from device</span>
            </p>
          </div>
          
          {!compact && (
            <p className="text-xs text-muted-foreground">
              Max file size: {formatSize(maxSize)}
            </p>
          )}
        </div>
        
        {/* Drag Overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-primary/10 rounded-xl flex items-center justify-center">
            <div className="bg-background rounded-lg px-6 py-3 shadow-lg border">
              <p className="font-medium text-primary">Release to upload</p>
            </div>
          </div>
        )}
      </div>

      {/* File Preview List */}
      {showPreview && files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{files.length} file{files.length > 1 ? 's' : ''} selected</p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={clearAll} disabled={uploading}>
                Clear All
              </Button>
              <Button size="sm" onClick={() => handleUpload()} disabled={uploading || files.every(f => f.status === 'complete')}>
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload All
                  </>
                )}
              </Button>
            </div>
          </div>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {files.map(fileItem => (
              <div
                key={fileItem.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border bg-card transition-colors",
                  fileItem.status === 'complete' && "bg-green-50 dark:bg-green-950/20 border-green-200",
                  fileItem.status === 'error' && "bg-red-50 dark:bg-red-950/20 border-red-200"
                )}
              >
                {/* Preview/Icon */}
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                  {fileItem.preview ? (
                    <img src={fileItem.preview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <FileIcon type={fileItem.type} />
                  )}
                </div>
                
                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{fileItem.name}</p>
                  <p className="text-xs text-muted-foreground">{formatSize(fileItem.size)}</p>
                  
                  {/* Progress Bar */}
                  {fileItem.status === 'uploading' && (
                    <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${uploadProgress[fileItem.id] || 0}%` }}
                      />
                    </div>
                  )}
                </div>
                
                {/* Status/Actions */}
                <div className="flex-shrink-0">
                  {fileItem.status === 'complete' ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : fileItem.status === 'uploading' ? (
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); removeFile(fileItem.id); }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DropZone;
