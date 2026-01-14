import React, { useState, useEffect } from 'react';
import { usersAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { 
  Users, 
  Shield,
  UserCog,
  Crown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { toast } from 'sonner';

const roleIcons = {
  superuser: Crown,
  admin: Shield,
  client: Users
};

const roleColors = {
  superuser: 'bg-amber-500 text-white',
  admin: 'bg-blue-500 text-white',
  client: 'bg-gray-500 text-white'
};

export const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser, isSuperUser } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await usersAPI.list();
      setUsers(response.data);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    if (userId === currentUser.id) {
      toast.error("You can't change your own role");
      return;
    }
    try {
      await usersAPI.updateRole(userId, newRole);
      toast.success('User role updated');
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update role');
    }
  };

  if (!isSuperUser()) {
    return <Navigate to="/dashboard" replace />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="admin-users-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-bold flex items-center gap-3">
          <UserCog className="w-8 h-8" />
          User Management
        </h1>
        <p className="text-muted-foreground mt-1">Manage user roles and permissions (Super Admin only)</p>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif">All Users</CardTitle>
          <CardDescription>View and manage user accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Current Role</TableHead>
                <TableHead>Change Role</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const RoleIcon = roleIcons[user.role];
                return (
                  <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {user.name?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.name}</span>
                        {user.id === currentUser.id && (
                          <Badge variant="outline" className="text-xs">You</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge className={`${roleColors[user.role]} capitalize`}>
                        <RoleIcon className="w-3 h-3 mr-1" />
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.id === currentUser.id ? (
                        <span className="text-sm text-muted-foreground">-</span>
                      ) : (
                        <Select
                          value={user.role}
                          onValueChange={(value) => handleRoleChange(user.id, value)}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="superuser">Super Admin</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="client">Client</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Role Permissions Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Crown className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold">Super Admin</h3>
                <p className="text-xs text-muted-foreground">Full access</p>
              </div>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• All admin permissions</li>
              <li>• Manage user roles</li>
              <li>• System settings</li>
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">Admin</h3>
                <p className="text-xs text-muted-foreground">Management access</p>
              </div>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Create/edit/delete contacts</li>
              <li>• Manage deals & tasks</li>
              <li>• Use AI writer</li>
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <h3 className="font-semibold">Client</h3>
                <p className="text-xs text-muted-foreground">Basic access</p>
              </div>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• View dashboard</li>
              <li>• View contacts & deals</li>
              <li>• Manage own tasks</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
