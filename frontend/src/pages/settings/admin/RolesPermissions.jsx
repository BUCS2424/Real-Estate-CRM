import React, { useState } from 'react';
import { Shield, Plus, Edit, Trash2, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Badge } from '../../../components/ui/badge';
import { Switch } from '../../../components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { toast } from 'sonner';

export const RolesPermissions = () => {
  const [roles, setRoles] = useState([
    { 
      id: 1, 
      name: 'Super Admin', 
      description: 'Full system access',
      color: 'bg-amber-500',
      users: 1,
      permissions: {
        contacts: { view: true, create: true, edit: true, delete: true },
        deals: { view: true, create: true, edit: true, delete: true },
        tasks: { view: true, create: true, edit: true, delete: true },
        reports: { view: true, create: true, edit: true, delete: true },
        settings: { view: true, create: true, edit: true, delete: true },
        users: { view: true, create: true, edit: true, delete: true },
      }
    },
    { 
      id: 2, 
      name: 'Admin', 
      description: 'Administrative access',
      color: 'bg-blue-500',
      users: 3,
      permissions: {
        contacts: { view: true, create: true, edit: true, delete: true },
        deals: { view: true, create: true, edit: true, delete: true },
        tasks: { view: true, create: true, edit: true, delete: true },
        reports: { view: true, create: true, edit: false, delete: false },
        settings: { view: true, create: false, edit: false, delete: false },
        users: { view: true, create: false, edit: false, delete: false },
      }
    },
    { 
      id: 3, 
      name: 'Client', 
      description: 'Basic access',
      color: 'bg-gray-500',
      users: 12,
      permissions: {
        contacts: { view: true, create: false, edit: false, delete: false },
        deals: { view: true, create: false, edit: false, delete: false },
        tasks: { view: true, create: true, edit: true, delete: false },
        reports: { view: false, create: false, edit: false, delete: false },
        settings: { view: false, create: false, edit: false, delete: false },
        users: { view: false, create: false, edit: false, delete: false },
      }
    },
  ]);

  const [selectedRole, setSelectedRole] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const modules = ['contacts', 'deals', 'tasks', 'reports', 'settings', 'users'];
  const actions = ['view', 'create', 'edit', 'delete'];

  const handlePermissionChange = (roleId, module, action, value) => {
    setRoles(prev => prev.map(role => {
      if (role.id === roleId) {
        return {
          ...role,
          permissions: {
            ...role.permissions,
            [module]: {
              ...role.permissions[module],
              [action]: value
            }
          }
        };
      }
      return role;
    }));
    toast.success('Permission updated');
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="roles-permissions-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Roles & Permissions
          </h1>
          <p className="text-muted-foreground mt-1">Manage user roles and access levels</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Role
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Role</DialogTitle>
              <DialogDescription>Define a new user role with custom permissions</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Role Name</Label>
                <Input placeholder="e.g., Manager" />
              </div>
              <div>
                <Label>Description</Label>
                <Input placeholder="Brief description of this role" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => { setIsDialogOpen(false); toast.success('Role created'); }}>Create Role</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Roles Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {roles.map(role => (
          <Card key={role.id} className={`cursor-pointer transition-all ${selectedRole?.id === role.id ? 'ring-2 ring-primary' : ''}`} onClick={() => setSelectedRole(role)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${role.color} flex items-center justify-center`}>
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{role.name}</h3>
                    <p className="text-xs text-muted-foreground">{role.description}</p>
                  </div>
                </div>
                <Badge variant="secondary">{role.users} users</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Permissions Matrix */}
      {selectedRole && (
        <Card>
          <CardHeader>
            <CardTitle>Permissions for {selectedRole.name}</CardTitle>
            <CardDescription>Toggle permissions for each module</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Module</th>
                    {actions.map(action => (
                      <th key={action} className="text-center py-3 px-4 font-medium capitalize">{action}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {modules.map(module => (
                    <tr key={module} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium capitalize">{module}</td>
                      {actions.map(action => (
                        <td key={action} className="text-center py-3 px-4">
                          <Switch
                            checked={selectedRole.permissions[module][action]}
                            onCheckedChange={(value) => handlePermissionChange(selectedRole.id, module, action, value)}
                            disabled={selectedRole.name === 'Super Admin'}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
