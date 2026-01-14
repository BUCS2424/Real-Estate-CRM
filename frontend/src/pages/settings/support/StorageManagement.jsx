import React from 'react';
import { HardDrive, File, Image, FileText, Trash2, Download, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { Badge } from '../../components/ui/badge';

export const StorageManagement = () => {
  const storageData = {
    total: 10, // GB
    used: 4.2, // GB
    breakdown: [
      { type: 'Documents', size: 1.8, icon: FileText, color: 'bg-blue-500' },
      { type: 'Images', size: 1.5, icon: Image, color: 'bg-green-500' },
      { type: 'Database', size: 0.6, icon: HardDrive, color: 'bg-purple-500' },
      { type: 'Other', size: 0.3, icon: File, color: 'bg-gray-500' },
    ]
  };

  const recentFiles = [
    { name: 'property_listing_2024.pdf', size: '2.4 MB', type: 'document', date: '2025-01-14' },
    { name: 'downtown_condo.jpg', size: '1.8 MB', type: 'image', date: '2025-01-13' },
    { name: 'client_contracts.zip', size: '5.2 MB', type: 'archive', date: '2025-01-12' },
    { name: 'market_analysis.xlsx', size: '856 KB', type: 'document', date: '2025-01-11' },
  ];

  const usedPercentage = (storageData.used / storageData.total) * 100;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="storage-management-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
            <HardDrive className="w-6 h-6" />
            Storage Management
          </h1>
          <p className="text-muted-foreground mt-1">Monitor and manage storage usage</p>
        </div>
        <Button>
          <Upload className="w-4 h-4 mr-2" />
          Upload Files
        </Button>
      </div>

      {/* Storage Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Storage Usage</CardTitle>
          <CardDescription>{storageData.used} GB of {storageData.total} GB used</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>{storageData.used} GB used</span>
              <span>{storageData.total - storageData.used} GB free</span>
            </div>
            <Progress value={usedPercentage} className="h-3" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {storageData.breakdown.map((item) => (
              <div key={item.type} className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-2 rounded-lg ${item.color}/10`}>
                    <item.icon className={`w-4 h-4`} style={{ color: item.color.replace('bg-', '').replace('-500', '') }} />
                  </div>
                  <span className="text-sm font-medium">{item.type}</span>
                </div>
                <p className="text-2xl font-bold">{item.size} GB</p>
                <p className="text-xs text-muted-foreground">
                  {((item.size / storageData.used) * 100).toFixed(0)}% of used
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Files */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Files</CardTitle>
          <CardDescription>Recently uploaded files</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentFiles.map((file, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    {file.type === 'image' ? <Image className="w-4 h-4 text-primary" /> : <FileText className="w-4 h-4 text-primary" />}
                  </div>
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{file.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{file.size}</Badge>
                  <Button size="icon" variant="ghost">
                    <Download className="w-4 h-4" />
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

      {/* Storage Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Storage Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button variant="outline">
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Cache
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export All Files
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
