import React, { useState } from 'react';
import { AlertCircle, Search, Filter, Clock, CheckCircle2, XCircle, AlertTriangle, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';

export const ErrorReports = () => {
  const [filter, setFilter] = useState('all');

  const errors = [
    { id: 1, type: 'error', message: 'Failed to connect to database', page: '/api/contacts', time: '2 min ago', status: 'new', stackTrace: 'MongoError: connection timed out...' },
    { id: 2, type: 'warning', message: 'Slow API response detected', page: '/api/deals', time: '15 min ago', status: 'investigating', stackTrace: 'Response time: 3500ms...' },
    { id: 3, type: 'error', message: 'Authentication token expired', page: '/api/auth/me', time: '1 hour ago', status: 'resolved', stackTrace: 'JWT TokenExpiredError...' },
    { id: 4, type: 'warning', message: 'Memory usage high', page: 'System', time: '2 hours ago', status: 'resolved', stackTrace: 'Memory: 85% used...' },
    { id: 5, type: 'error', message: 'Email delivery failed', page: '/api/send-email', time: '3 hours ago', status: 'new', stackTrace: 'SMTP connection refused...' },
  ];

  const statusColors = {
    new: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    investigating: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
    resolved: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  };

  const typeIcons = {
    error: XCircle,
    warning: AlertTriangle,
  };

  const filteredErrors = filter === 'all' ? errors : errors.filter(e => e.status === filter);

  return (
    <div className="space-y-6 animate-fade-in" data-testid="error-reports-page">
      <div>
        <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
          <AlertCircle className="w-6 h-6" />
          Error Reports
        </h1>
        <p className="text-muted-foreground mt-1">Monitor and resolve system errors</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg dark:bg-red-900">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{errors.filter(e => e.status === 'new').length}</p>
              <p className="text-xs text-muted-foreground">New Errors</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg dark:bg-yellow-900">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{errors.filter(e => e.status === 'investigating').length}</p>
              <p className="text-xs text-muted-foreground">Investigating</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg dark:bg-green-900">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{errors.filter(e => e.status === 'resolved').length}</p>
              <p className="text-xs text-muted-foreground">Resolved</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <Clock className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{errors.length}</p>
              <p className="text-xs text-muted-foreground">Total Reports</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search errors..." className="pl-10" />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="investigating">Investigating</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Error List */}
      <Card>
        <CardHeader>
          <CardTitle>Error Log</CardTitle>
          <CardDescription>Recent system errors and warnings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredErrors.map(error => {
              const TypeIcon = typeIcons[error.type];
              return (
                <div key={error.id} className="flex items-start justify-between p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${error.type === 'error' ? 'bg-red-100 dark:bg-red-900' : 'bg-yellow-100 dark:bg-yellow-900'}`}>
                      <TypeIcon className={`w-4 h-4 ${error.type === 'error' ? 'text-red-600' : 'text-yellow-600'}`} />
                    </div>
                    <div>
                      <p className="font-medium">{error.message}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{error.page}</span>
                        <span>•</span>
                        <Clock className="w-3 h-3" />
                        <span>{error.time}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusColors[error.status]}>{error.status}</Badge>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4 mr-1" />
                          Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Error Details</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Message</p>
                            <p className="font-medium">{error.message}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Page/Endpoint</p>
                            <p className="font-mono text-sm">{error.page}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Stack Trace</p>
                            <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">{error.stackTrace}</pre>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
