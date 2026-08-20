import React, { useState, useEffect } from 'react';
import { Database, Download, Clock, HardDrive, CheckCircle2, Trash2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import api from '../../../lib/api';
import { toast } from 'sonner';

const formatSize = (bytes) => {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const DatabaseBackup = () => {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchBackups = async () => {
    try {
      const res = await api.get('/admin/backup/list');
      setBackups(res.data || []);
    } catch (error) {
      toast.error('Failed to load backup history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBackups(); }, []);

  const handleBackupNow = async () => {
    setIsBackingUp(true);
    try {
      await api.post('/admin/backup/create');
      toast.success('Backup created successfully');
      fetchBackups();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create backup');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleDownload = async (backup) => {
    setDownloadingId(backup.id);
    try {
      const res = await api.get(`/admin/backup/${backup.id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', backup.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Failed to download backup');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (backup) => {
    setDeletingId(backup.id);
    try {
      await api.delete(`/admin/backup/${backup.id}`);
      toast.success('Backup deleted');
      fetchBackups();
    } catch (error) {
      toast.error('Failed to delete backup');
    } finally {
      setDeletingId(null);
    }
  };

  const totalSize = backups.reduce((sum, b) => sum + (b.size_bytes || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in" data-testid="database-backup-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
            <Database className="w-6 h-6" />
            Database Backup
          </h1>
          <p className="text-muted-foreground mt-1">Create and download full backups of the entire database</p>
        </div>
        <Button onClick={handleBackupNow} disabled={isBackingUp} data-testid="backup-now-btn">
          {isBackingUp ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating Backup...</>
          ) : (
            <>
              <Database className="w-4 h-4 mr-2" />
              Backup Now
            </>
          )}
        </Button>
      </div>

      {/* Storage Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-chart-1/10 rounded-lg">
                <HardDrive className="w-5 h-5 text-chart-1" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="total-backup-size">{formatSize(totalSize)}</p>
                <p className="text-xs text-muted-foreground">Total Backup Size</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-chart-2/10 rounded-lg">
                <Clock className="w-5 h-5 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="backups-stored-count">{backups.length}</p>
                <p className="text-xs text-muted-foreground">Backups Stored</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg dark:bg-green-900">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{backups.length > 0 ? 'Healthy' : 'No Backups Yet'}</p>
                <p className="text-xs text-muted-foreground">Backup Status</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Backup List */}
      <Card>
        <CardHeader>
          <CardTitle>Backup History</CardTitle>
          <CardDescription>Each backup is a full export of every collection in the database (mongodump), zipped for download</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Loading backups...</p>
          ) : backups.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center" data-testid="no-backups-message">No backups yet — click "Backup Now" to create one.</p>
          ) : (
            <div className="space-y-3" data-testid="backup-history-list">
              {backups.map(backup => (
                <div key={backup.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg" data-testid={`backup-row-${backup.id}`}>
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{backup.filename}</p>
                      <p className="text-xs text-muted-foreground">{new Date(backup.created_at).toLocaleString()} &middot; {backup.collection_count} collections</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">{formatSize(backup.size_bytes)}</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      {backup.status}
                    </Badge>
                    <Button size="sm" variant="outline" disabled={downloadingId === backup.id} onClick={() => handleDownload(backup)} data-testid={`download-backup-btn-${backup.id}`}>
                      {downloadingId === backup.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
                      Download
                    </Button>
                    <Button size="sm" variant="ghost" disabled={deletingId === backup.id} onClick={() => handleDelete(backup)} data-testid={`delete-backup-btn-${backup.id}`}>
                      {deletingId === backup.id ? <Loader2 className="w-4 h-4 text-destructive animate-spin" /> : <Trash2 className="w-4 h-4 text-destructive" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
