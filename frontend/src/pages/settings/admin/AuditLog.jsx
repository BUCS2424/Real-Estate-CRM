import React, { useState } from 'react';
import { Activity, Search, Filter, User, Clock, FileText, Settings, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';

export const AuditLog = () => {
  const [filter, setFilter] = useState('all');

  const logs = [
    { id: 1, user: 'Mel (Super Admin)', action: 'Updated user role', target: 'John Smith', type: 'user', time: '2 minutes ago', ip: '192.168.1.1' },
    { id: 2, user: 'Admin User', action: 'Created new contact', target: 'Sarah Johnson', type: 'contact', time: '15 minutes ago', ip: '192.168.1.2' },
    { id: 3, user: 'Mel (Super Admin)', action: 'Modified system settings', target: 'Email SMTP', type: 'settings', time: '1 hour ago', ip: '192.168.1.1' },
    { id: 4, user: 'Admin User', action: 'Deleted deal', target: 'Old Property Listing', type: 'delete', time: '2 hours ago', ip: '192.168.1.2' },
    { id: 5, user: 'Mel (Super Admin)', action: 'Exported report', target: 'Monthly Sales', type: 'export', time: '3 hours ago', ip: '192.168.1.1' },
    { id: 6, user: 'Client User', action: 'Logged in', target: 'System', type: 'auth', time: '4 hours ago', ip: '192.168.1.5' },
    { id: 7, user: 'Admin User', action: 'Updated contact', target: 'Mike Williams', type: 'contact', time: '5 hours ago', ip: '192.168.1.2' },
    { id: 8, user: 'Mel (Super Admin)', action: 'Changed permissions', target: 'Admin Role', type: 'settings', time: '1 day ago', ip: '192.168.1.1' },
  ];

  const typeColors = {
    user: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    contact: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    settings: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    delete: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    export: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
    auth: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  };

  const typeIcons = {
    user: User,
    contact: FileText,
    settings: Settings,
    delete: Trash2,
    export: FileText,
    auth: User,
  };

  const filteredLogs = filter === 'all' ? logs : logs.filter(l => l.type === filter);

  return (
    <div className="space-y-6 animate-fade-in" data-testid="audit-log-page">
      <div>
        <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
          <Activity className="w-6 h-6" />
          Audit Log
        </h1>
        <p className="text-muted-foreground mt-1">Track all system activities and changes</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search audit logs..." className="pl-10" />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activities</SelectItem>
                <SelectItem value="user">User Changes</SelectItem>
                <SelectItem value="contact">Contact Changes</SelectItem>
                <SelectItem value="settings">Settings</SelectItem>
                <SelectItem value="delete">Deletions</SelectItem>
                <SelectItem value="auth">Authentication</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">Export Log</Button>
          </div>
        </CardContent>
      </Card>

      {/* Log Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>Showing {filteredLogs.length} entries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredLogs.map((log) => {
              const TypeIcon = typeIcons[log.type];
              return (
                <div key={log.id} className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className={`p-2 rounded-lg ${typeColors[log.type]}`}>
                    <TypeIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{log.user}</span>
                      <span className="text-muted-foreground">{log.action}</span>
                      <span className="font-medium text-primary">{log.target}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {log.time}
                      </span>
                      <span>IP: {log.ip}</span>
                    </div>
                  </div>
                  <Badge variant="secondary" className={typeColors[log.type]}>
                    {log.type}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
