import React, { useState, useEffect, useCallback } from 'react';
import { mediaAPI } from '../lib/api';
import { 
  FolderOpen,
  Folder,
  Image,
  Video,
  FileText,
  File,
  Upload,
  Search,
  MoreVertical,
  Eye,
  Download,
  Trash2,
  Edit2,
  Plus,
  Grid,
  List,
  ChevronRight,
  ChevronDown,
  X,
  Loader2,
  Home,
  Play,
  RefreshCw,
  Copy
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { DropZone } from '../components/DropZone';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const FILE_TYPE_ICONS = {
  image: Image,
  video: Video,
  document: FileText,
  other: File
};

const FILE_TYPE_COLORS = {
  image: 'text-green-500',
  video: 'text-purple-500',
  document: 'text-blue-500',
  other: 'text-gray-500'
};

export const MediaLibraryPage = () => {
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [subfolders, setSubfolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedSubfolder, setSelectedSubfolder] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Site Images state
  const [showSiteImages, setShowSiteImages] = useState(false);
  const [siteImages, setSiteImages] = useState([]);
  const [loadingSiteImages, setLoadingSiteImages] = useState(false);
  const [showSiteUploadModal, setShowSiteUploadModal] = useState(false);
  
  // Modals
  const [showPreview, setShowPreview] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameFile, setRenameFile] = useState(null);
  const [newFileName, setNewFileName] = useState('');
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    fetchFolders();
  }, []);

  useEffect(() => {
    if (showSiteImages) {
      fetchSiteImages();
    } else if (selectedProperty) {
      fetchFolderContents();
    }
  }, [selectedProperty, selectedSubfolder, showSiteImages]);

  const fetchFolders = async () => {
    try {
      const res = await mediaAPI.getFolders();
      setFolders(res.data);
      
      if (res.data.length > 0 && !selectedProperty) {
        setSelectedProperty(res.data[0]);
      }
    } catch (error) {
      toast.error('Failed to load folders');
    } finally {
      setLoading(false);
    }
  };

  const fetchSiteImages = async () => {
    setLoadingSiteImages(true);
    try {
      const res = await mediaAPI.getSiteImages();
      setSiteImages(res.data.images || []);
    } catch (error) {
      toast.error('Failed to load site images');
      setSiteImages([]);
    } finally {
      setLoadingSiteImages(false);
    }
  };

  const fetchFolderContents = async () => {
    if (!selectedProperty) return;
    
    setLoadingFiles(true);
    try {
      const res = await mediaAPI.getFolderContents(selectedProperty.id, selectedSubfolder);
      setFiles(res.data.files || []);
      setSubfolders(res.data.subfolders || []);
    } catch (error) {
      toast.error('Failed to load folder contents');
      setFiles([]);
      setSubfolders([]);
    } finally {
      setLoadingFiles(false);
    }
  };

  // Handle site image upload
  const handleSiteImageUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    await mediaAPI.uploadSiteImage(formData);
    fetchSiteImages();
  };

  const handleDeleteSiteImage = async (filename) => {
    if (!window.confirm(`Delete "${filename}"?`)) return;
    try {
      await mediaAPI.deleteSiteImage(filename);
      toast.success('Image deleted');
      fetchSiteImages();
    } catch (error) {
      toast.error('Failed to delete image');
    }
  };

  const copyToClipboard = (url) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copied to clipboard!');
  };

  // Handle file upload (called by DropZone)
  const handleFileUpload = useCallback(async (file) => {
    if (!selectedProperty) {
      toast.error('Please select a property folder first');
      throw new Error('No property selected');
    }
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('subfolder', selectedSubfolder || 'gallery');
    
    await mediaAPI.uploadFile(selectedProperty.id, formData);
  }, [selectedProperty, selectedSubfolder]);

  // Callback after successful uploads
  const handleUploadComplete = useCallback(() => {
    fetchFolderContents();
    setShowUploadModal(false);
  }, [selectedProperty, selectedSubfolder]);

  const handleDelete = async (file) => {
    if (!window.confirm(`Are you sure you want to delete "${file.name}"?`)) return;
    
    try {
      await mediaAPI.deleteFile(file.path);
      toast.success('File deleted');
      fetchFolderContents();
    } catch (error) {
      toast.error('Failed to delete file');
    }
  };

  const handleRename = async () => {
    if (!renameFile || !newFileName.trim()) return;
    
    try {
      await mediaAPI.renameFile(renameFile.path, newFileName);
      toast.success('File renamed');
      setShowRenameModal(false);
      setRenameFile(null);
      setNewFileName('');
      fetchFolderContents();
    } catch (error) {
      toast.error('Failed to rename file');
    }
  };

  const handleCreateFolder = async () => {
    if (!selectedProperty || !newFolderName.trim()) return;
    
    try {
      await mediaAPI.createFolder(selectedProperty.id, newFolderName, selectedSubfolder);
      toast.success('Folder created');
      setShowNewFolderModal(false);
      setNewFolderName('');
      fetchFolderContents();
      fetchFolders();
    } catch (error) {
      toast.error('Failed to create folder');
    }
  };

  const handleDownload = (file) => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openRenameModal = (file) => {
    setRenameFile(file);
    setNewFileName(file.name);
    setShowRenameModal(true);
  };

  const openPreview = (file) => {
    setPreviewFile(file);
    setShowPreview(true);
  };

  const toggleFolder = (folderId) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  const selectPropertyFolder = (property, subfolder = null) => {
    setShowSiteImages(false);
    setSelectedProperty(property);
    setSelectedSubfolder(subfolder);
  };

  const selectSiteImages = () => {
    setShowSiteImages(true);
    setSelectedProperty(null);
    setSelectedSubfolder(null);
  };

  const filteredFiles = files.filter(file => {
    if (!searchQuery) return true;
    return file.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const renderFileIcon = (file) => {
    const IconComponent = FILE_TYPE_ICONS[file.type] || File;
    return <IconComponent className={cn("w-5 h-5", FILE_TYPE_COLORS[file.type])} />;
  };

  const getBreadcrumbs = () => {
    const crumbs = [];
    if (selectedProperty) {
      crumbs.push({ label: selectedProperty.name, onClick: () => setSelectedSubfolder(null) });
    }
    if (selectedSubfolder) {
      crumbs.push({ label: selectedSubfolder, onClick: null });
    }
    return crumbs;
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden" data-testid="media-library-page">
      {/* Sidebar - Folder Tree */}
      <div className="w-72 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-semibold flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-amber-500" />
            Media Library
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {/* Site Images - Always at top */}
          <div
            className={cn(
              "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors mb-2",
              showSiteImages
                ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/50"
                : "hover:bg-muted"
            )}
            onClick={selectSiteImages}
            data-testid="site-images-folder"
          >
            <Image className="w-4 h-4 text-amber-500" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Site Images</p>
              <p className="text-xs text-muted-foreground">Logos, branding, icons</p>
            </div>
          </div>
          
          <div className="border-t my-2 pt-2">
            <p className="text-xs text-muted-foreground px-2 mb-2">Property Folders</p>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : folders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Folder className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No property folders yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {folders.map(folder => (
                <div key={folder.id}>
                  {/* Property Folder */}
                  <div
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors",
                      selectedProperty?.id === folder.id && !selectedSubfolder && !showSiteImages
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted"
                    )}
                    onClick={() => selectPropertyFolder(folder)}
                    data-testid={`folder-${folder.id}`}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFolder(folder.id); }}
                      className="p-0.5 hover:bg-muted rounded"
                    >
                      {expandedFolders[folder.id] ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    <Home className="w-4 h-4 text-amber-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{folder.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{folder.location}</p>
                    </div>
                  </div>
                  
                  {/* Subfolders */}
                  {expandedFolders[folder.id] && (
                    <div className="ml-6 mt-1 space-y-1">
                      {folder.subfolders.map(subfolder => (
                        <div
                          key={subfolder}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors text-sm",
                            selectedProperty?.id === folder.id && selectedSubfolder === subfolder
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-muted"
                          )}
                          onClick={() => selectPropertyFolder(folder, subfolder)}
                          data-testid={`subfolder-${folder.id}-${subfolder}`}
                        >
                          <Folder className="w-4 h-4 text-amber-400" />
                          <span className="capitalize">{subfolder}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b flex items-center gap-4 flex-wrap">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm">
            {showSiteImages ? (
              <span className="font-medium flex items-center gap-2">
                <Image className="w-4 h-4 text-amber-500" />
                Site Images
              </span>
            ) : (
              getBreadcrumbs().map((crumb, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  <button
                    onClick={crumb.onClick}
                    className={cn(
                      "hover:text-primary transition-colors",
                      !crumb.onClick && "cursor-default font-medium"
                    )}
                    disabled={!crumb.onClick}
                  >
                    {crumb.label}
                  </button>
                </React.Fragment>
              ))
            )}
          </div>
          
          <div className="flex-1" />
          
          {/* Search */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="search-files-input"
            />
          </div>
          
          {/* View Toggle */}
          <div className="flex border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-2 transition-colors",
                viewMode === 'grid' ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
              data-testid="view-grid-btn"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "p-2 transition-colors",
                viewMode === 'list' ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
              data-testid="view-list-btn"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          
          {/* New Folder - only for property folders */}
          {!showSiteImages && (
            <Button 
              variant="outline" 
              onClick={() => setShowNewFolderModal(true)} 
              disabled={!selectedProperty}
              data-testid="new-folder-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Folder
            </Button>
          )}
          
          {/* Upload Button */}
          <Button 
            onClick={() => showSiteImages ? setShowSiteUploadModal(true) : setShowUploadModal(true)} 
            disabled={!showSiteImages && !selectedProperty}
            data-testid="upload-files-btn"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
          
          {/* Refresh */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={showSiteImages ? fetchSiteImages : fetchFolderContents} 
            disabled={loadingFiles || loadingSiteImages}
            data-testid="refresh-btn"
          >
            <RefreshCw className={cn("w-4 h-4", (loadingFiles || loadingSiteImages) && "animate-spin")} />
          </Button>
        </div>

        {/* File Display Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* SITE IMAGES VIEW */}
          {showSiteImages ? (
            loadingSiteImages ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : siteImages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Image className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg mb-2">No site images yet</p>
                <p className="text-sm mb-4">Upload logos, icons, and branding images here</p>
                <Button onClick={() => setShowSiteUploadModal(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Image
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {siteImages.map(img => (
                  <div
                    key={img.filename}
                    className="group relative rounded-lg border bg-card overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <div className="aspect-square bg-muted flex items-center justify-center">
                      <img src={img.url} alt={img.filename} className="w-full h-full object-contain p-2" />
                    </div>
                    <div className="p-2">
                      <p className="text-sm font-medium truncate" title={img.filename}>{img.filename}</p>
                      <p className="text-xs text-muted-foreground">{(img.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <Button 
                        variant="secondary" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => copyToClipboard(img.url)}
                        title="Copy URL"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handleDeleteSiteImage(img.filename)}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : !selectedProperty ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <FolderOpen className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg">Select a property folder to view files</p>
            </div>
          ) : loadingFiles ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Subfolders (if at property root) */}
              {!selectedSubfolder && subfolders.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Folders</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {subfolders.map(subfolder => (
                      <div
                        key={subfolder}
                        onClick={() => setSelectedSubfolder(subfolder)}
                        className="flex flex-col items-center gap-2 p-4 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                        data-testid={`folder-item-${subfolder}`}
                      >
                        <Folder className="w-10 h-10 text-amber-400" />
                        <span className="text-sm font-medium capitalize">{subfolder}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Files Section */}
              <div className="mb-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  Files {filteredFiles.length > 0 && `(${filteredFiles.length})`}
                </h3>
              </div>

              {filteredFiles.length === 0 ? (
                /* Empty State with DropZone */
                <div className="flex flex-col items-center justify-center py-8">
                  <DropZone
                    onUpload={async (file) => {
                      await handleFileUpload(file);
                      fetchFolderContents();
                    }}
                    accept="*/*"
                    multiple={true}
                    maxSize={100 * 1024 * 1024}
                    className="w-full max-w-xl"
                    data-testid="empty-state-dropzone"
                  />
                </div>
              ) : viewMode === 'grid' ? (
                /* Grid View */
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {filteredFiles.map(file => (
                    <div
                      key={file.id}
                      className="group relative rounded-lg border bg-card overflow-hidden hover:shadow-lg transition-shadow"
                      data-testid={`file-item-${file.id}`}
                    >
                      {/* Thumbnail/Preview */}
                      <div 
                        className="aspect-square bg-muted flex items-center justify-center cursor-pointer"
                        onClick={() => openPreview(file)}
                      >
                        {file.type === 'image' ? (
                          <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                        ) : file.type === 'video' ? (
                          <div className="relative w-full h-full bg-black flex items-center justify-center">
                            <Play className="w-12 h-12 text-white opacity-70" />
                          </div>
                        ) : (
                          renderFileIcon(file)
                        )}
                      </div>
                      
                      {/* File Info */}
                      <div className="p-2">
                        <p className="text-sm font-medium truncate" title={file.name}>
                          {file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{file.size_formatted}</p>
                      </div>
                      
                      {/* Actions */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="secondary" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openPreview(file)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownload(file)}>
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openRenameModal(file)}>
                              <Edit2 className="w-4 h-4 mr-2" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDelete(file)} className="text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* List View */
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-medium text-sm">Name</th>
                        <th className="text-left p-3 font-medium text-sm w-24">Type</th>
                        <th className="text-left p-3 font-medium text-sm w-24">Size</th>
                        <th className="text-left p-3 font-medium text-sm w-40">Modified</th>
                        <th className="w-16"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFiles.map(file => (
                        <tr key={file.id} className="border-t hover:bg-muted/30 transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              {renderFileIcon(file)}
                              <span 
                                className="truncate max-w-md cursor-pointer hover:text-primary"
                                onClick={() => openPreview(file)}
                              >
                                {file.name}
                              </span>
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="capitalize">
                              {file.type}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {file.size_formatted}
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {file.last_modified ? new Date(file.last_modified).toLocaleDateString() : '-'}
                          </td>
                          <td className="p-3">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openPreview(file)}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Preview
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownload(file)}>
                                  <Download className="w-4 h-4 mr-2" />
                                  Download
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openRenameModal(file)}>
                                  <Edit2 className="w-4 h-4 mr-2" />
                                  Rename
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleDelete(file)} className="text-destructive">
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Upload Modal with DropZone */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Upload Files
            </DialogTitle>
            <DialogDescription>
              Upload files to {selectedProperty?.name} 
              {selectedSubfolder ? ` / ${selectedSubfolder}` : ' / gallery'}
            </DialogDescription>
          </DialogHeader>
          
          <DropZone
            onUpload={async (file) => {
              await handleFileUpload(file);
              fetchFolderContents();
            }}
            accept="*/*"
            multiple={true}
            maxSize={100 * 1024 * 1024}
            showPreview={true}
            data-testid="upload-modal-dropzone"
          />
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="truncate">{previewFile?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center min-h-[300px] bg-muted rounded-lg overflow-hidden">
            {previewFile?.type === 'image' && (
              <img src={previewFile.url} alt={previewFile.name} className="max-w-full max-h-[60vh] object-contain" />
            )}
            {previewFile?.type === 'video' && (
              <video src={previewFile.url} controls className="max-w-full max-h-[60vh]" />
            )}
            {previewFile?.type === 'document' && (
              <div className="text-center p-8">
                <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">Preview not available for documents</p>
                <Button onClick={() => handleDownload(previewFile)}>
                  <Download className="w-4 h-4 mr-2" />
                  Download to View
                </Button>
              </div>
            )}
            {previewFile?.type === 'other' && (
              <div className="text-center p-8">
                <File className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">Preview not available</p>
                <Button onClick={() => handleDownload(previewFile)}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            )}
          </div>
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>{previewFile?.size_formatted}</span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleDownload(previewFile)}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button variant="destructive" onClick={() => { handleDelete(previewFile); setShowPreview(false); }}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Modal */}
      <Dialog open={showRenameModal} onOpenChange={setShowRenameModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename File</DialogTitle>
            <DialogDescription>Enter a new name for &quot;{renameFile?.name}&quot;</DialogDescription>
          </DialogHeader>
          <div>
            <Label>New Name</Label>
            <Input
              value={newFileName}
              onChange={e => setNewFileName(e.target.value)}
              placeholder="filename.ext"
              data-testid="rename-file-input"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameModal(false)}>Cancel</Button>
            <Button onClick={handleRename} data-testid="rename-file-submit">Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Folder Modal */}
      <Dialog open={showNewFolderModal} onOpenChange={setShowNewFolderModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Create a folder in {selectedProperty?.name} {selectedSubfolder ? `/ ${selectedSubfolder}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Folder Name</Label>
            <Input
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              placeholder="My Folder"
              data-testid="new-folder-input"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFolderModal(false)}>Cancel</Button>
            <Button onClick={handleCreateFolder} data-testid="create-folder-submit">Create Folder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Site Images Upload Modal */}
      <Dialog open={showSiteUploadModal} onOpenChange={setShowSiteUploadModal}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Image className="w-5 h-5 text-amber-500" />
              Upload Site Image
            </DialogTitle>
            <DialogDescription>
              Upload logos, icons, and branding images for your site. These files are stored locally and can be used for site branding.
            </DialogDescription>
          </DialogHeader>
          
          <DropZone
            onUpload={async (file) => {
              await handleSiteImageUpload(file);
            }}
            accept="image/*"
            multiple={true}
            maxSize={10 * 1024 * 1024}
            showPreview={true}
            data-testid="site-images-dropzone"
          />
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSiteUploadModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MediaLibraryPage;
