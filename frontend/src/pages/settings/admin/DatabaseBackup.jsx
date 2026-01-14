import React, { useState } from 'react';
import { Database, Download, Upload, Clock, HardDrive, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Progress } from '../../../components/ui/progress';
import { Badge } from '../../../components/ui/badge';
import { Switch } from '../../../components/ui/switch';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { toast } from 'sonner';

export const DatabaseBackup = () => {
  const [autoBackup, setAutoBackup] = useState(true);
  const [frequency, setFrequency] = useState('daily');
  const [isBackingUp, setIsBackingUp] = useState(false);

  const backups = [
    { id: 1, name: 'backup_2025-01-14_12-00.sql', date: '2025-01-14 12:00 PM', size: '245 MB', status: 'completed' },
    { id: 2, name: 'backup_2025-01-13_12-00.sql', date: '2025-01-13 12:00 PM', size: '242 MB', status: 'completed' },
    { id: 3, name: 'backup_2025-01-12_12-00.sql', date: '2025-01-12 12:00 PM', size: '238 MB', status: 'completed' },
    { id: 4, name: 'backup_2025-01-11_12-00.sql', date: '2025-01-11 12:00 PM', size: '235 MB', status: 'completed' },
  ];

  const handleBackupNow = () => {
    setIsBackingUp(true);
    setTimeout(() => {
      setIsBackingUp(false);
      toast.success('Backup created successfully');
    }, 3000);
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="database-backup-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
            <Database className="w-6 h-6" />
            Database Backup
          </h1>
          <p className="text-muted-foreground mt-1">Manage database backups and restoration</p>
        </div>
        <Button onClick={handleBackupNow} disabled={isBackingUp}>
          {isBackingUp ? (
            <>Creating Backup...</>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
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
                <p className="text-2xl font-bold">2.4 GB</p>
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
                <p className="text-2xl font-bold">4</p>
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
                <p className="text-2xl font-bold">Healthy</p>
                <p className="text-xs text-muted-foreground">Backup Status</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Backup Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Backup Settings</CardTitle>
          <CardDescription>Configure automatic backup preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Automatic Backup</Label>
              <p className="text-sm text-muted-foreground">Automatically backup your database</p>
            </div>
            <Switch checked={autoBackup} onCheckedChange={setAutoBackup} />
          </div>
          
          {autoBackup && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Backup Frequency</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Retention Period</Label>
                <Select defaultValue="30">
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Backup List */}
      <Card>
        <CardHeader>
          <CardTitle>Backup History</CardTitle>
          <CardDescription>Recent database backups</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {backups.map(backup => (
              <div key={backup.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{backup.name}</p>
                    <p className="text-xs text-muted-foreground">{backup.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">{backup.size}</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    {backup.status}
                  </Badge>
                  <Button size="sm" variant="outline">
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                  <Button size="sm" variant="outline">
                    <Upload className="w-4 h-4 mr-1" />
                    Restore
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
