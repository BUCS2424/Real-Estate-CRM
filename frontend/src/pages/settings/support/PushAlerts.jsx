import React, { useState } from 'react';
import { Bell, Plus, Edit, Trash2, Send, Clock, Users, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';

export const PushAlerts = () => {
  const [alerts, setAlerts] = useState([
    { id: 1, title: 'System Maintenance', message: 'Scheduled maintenance on Jan 20, 2025', audience: 'all', scheduled: '2025-01-19', status: 'scheduled' },
    { id: 2, title: 'New Feature Released', message: 'Check out the new AI Writer!', audience: 'all', scheduled: null, status: 'sent' },
    { id: 3, title: 'Security Update', message: 'Please update your password', audience: 'admins', scheduled: null, status: 'sent' },
  ]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newAlert, setNewAlert] = useState({ title: '', message: '', audience: 'all', scheduled: '' });

  const handleSendAlert = () => {
    if (!newAlert.title || !newAlert.message) {
      toast.error('Please fill in all fields');
      return;
    }
    setAlerts(prev => [...prev, { 
      id: Date.now(), 
      ...newAlert, 
      status: newAlert.scheduled ? 'scheduled' : 'sent' 
    }]);
    setNewAlert({ title: '', message: '', audience: 'all', scheduled: '' });
    setIsDialogOpen(false);
    toast.success(newAlert.scheduled ? 'Alert scheduled' : 'Alert sent');
  };

  const statusColors = {
    sent: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  };

  const audienceIcons = {
    all: Globe,
    admins: Users,
    clients: Users,
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="push-alerts-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
            <Bell className="w-6 h-6" />
            Push Alerts
          </h1>
          <p className="text-muted-foreground mt-1">Send notifications to users</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Alert
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Push Alert</DialogTitle>
              <DialogDescription>Send a notification to users</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input 
                  value={newAlert.title}
                  onChange={(e) => setNewAlert({ ...newAlert, title: e.target.value })}
                  placeholder="Alert title" 
                />
              </div>
              <div>
                <Label>Message</Label>
                <Textarea 
                  value={newAlert.message}
                  onChange={(e) => setNewAlert({ ...newAlert, message: e.target.value })}
                  placeholder="Alert message" 
                  rows={3}
                />
              </div>
              <div>
                <Label>Audience</Label>
                <Select value={newAlert.audience} onValueChange={(v) => setNewAlert({ ...newAlert, audience: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="admins">Admins Only</SelectItem>
                    <SelectItem value="clients">Clients Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Schedule (Optional)</Label>
                <Input 
                  type="datetime-local"
                  value={newAlert.scheduled}
                  onChange={(e) => setNewAlert({ ...newAlert, scheduled: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSendAlert}>
                <Send className="w-4 h-4 mr-2" />
                {newAlert.scheduled ? 'Schedule' : 'Send Now'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg dark:bg-green-900">
              <Send className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{alerts.filter(a => a.status === 'sent').length}</p>
              <p className="text-xs text-muted-foreground">Sent</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-900">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{alerts.filter(a => a.status === 'scheduled').length}</p>
              <p className="text-xs text-muted-foreground">Scheduled</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <Bell className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{alerts.length}</p>
              <p className="text-xs text-muted-foreground">Total Alerts</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle>Alert History</CardTitle>
          <CardDescription>All push notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {alerts.map(alert => {
              const AudienceIcon = audienceIcons[alert.audience];
              return (
                <div key={alert.id} className="flex items-start justify-between p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Bell className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{alert.title}</p>
                      <p className="text-sm text-muted-foreground">{alert.message}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          <AudienceIcon className="w-3 h-3 mr-1" />
                          {alert.audience}
                        </Badge>
                        {alert.scheduled && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {alert.scheduled}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge className={statusColors[alert.status]}>{alert.status}</Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
