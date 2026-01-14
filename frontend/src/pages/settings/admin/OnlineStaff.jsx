import React from 'react';
import { Users, Circle, Clock, Monitor, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';

export const OnlineStaff = () => {
  const onlineUsers = [
    { id: 1, name: 'Mel (Super Admin)', role: 'superuser', status: 'active', lastActivity: 'Now', device: 'Desktop', location: 'New York, US' },
    { id: 2, name: 'Admin User', role: 'admin', status: 'active', lastActivity: '2 min ago', device: 'Desktop', location: 'Los Angeles, US' },
    { id: 3, name: 'Sarah Agent', role: 'client', status: 'idle', lastActivity: '15 min ago', device: 'Mobile', location: 'Chicago, US' },
  ];

  const offlineUsers = [
    { id: 4, name: 'John Broker', role: 'admin', lastSeen: '2 hours ago', device: 'Desktop' },
    { id: 5, name: 'Mike Agent', role: 'client', lastSeen: '1 day ago', device: 'Mobile' },
  ];

  const statusColors = {
    active: 'bg-green-500',
    idle: 'bg-yellow-500',
    offline: 'bg-gray-400'
  };

  const roleColors = {
    superuser: 'bg-amber-500 text-white',
    admin: 'bg-blue-500 text-white',
    client: 'bg-gray-500 text-white'
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="online-staff-page">
      <div>
        <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
          <Users className="w-6 h-6" />
          Online Staff
        </h1>
        <p className="text-muted-foreground mt-1">Monitor staff activity and online status</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-full dark:bg-green-900">
              <Circle className="w-5 h-5 text-green-500 fill-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{onlineUsers.filter(u => u.status === 'active').length}</p>
              <p className="text-xs text-muted-foreground">Active Now</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-full dark:bg-yellow-900">
              <Circle className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{onlineUsers.filter(u => u.status === 'idle').length}</p>
              <p className="text-xs text-muted-foreground">Idle</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-full dark:bg-gray-800">
              <Circle className="w-5 h-5 text-gray-400 fill-gray-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{offlineUsers.length}</p>
              <p className="text-xs text-muted-foreground">Offline</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Online Users */}
      <Card>
        <CardHeader>
          <CardTitle>Online Staff</CardTitle>
          <CardDescription>Currently active team members</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {onlineUsers.map(user => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {user.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${statusColors[user.status]}`} />
                  </div>
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {user.lastActivity}
                      <span>•</span>
                      <Monitor className="w-3 h-3" />
                      {user.device}
                      <span>•</span>
                      <MapPin className="w-3 h-3" />
                      {user.location}
                    </div>
                  </div>
                </div>
                <Badge className={roleColors[user.role]}>{user.role}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Offline Users */}
      <Card>
        <CardHeader>
          <CardTitle>Recently Offline</CardTitle>
          <CardDescription>Team members who were recently online</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {offlineUsers.map(user => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg opacity-60">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar>
                      <AvatarFallback className="bg-muted text-muted-foreground">
                        {user.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">Last seen: {user.lastSeen}</p>
                  </div>
                </div>
                <Badge variant="secondary">{user.role}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
