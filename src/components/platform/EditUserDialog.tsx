import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { useUserManagement } from '@/hooks/useUserManagement'; // Deprecated - using new RBAC system
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    roles?: string[];
    is_active?: boolean;
  } | null;
}

export const EditUserDialog = ({ open, onOpenChange, user }: EditUserDialogProps) => {
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [role, setRole] = useState<string>('member');
  
  // const { updateUser, deactivateUser, reactivateUser } = useUserManagement(); // Deprecated

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setAvatarUrl(user.avatar_url || '');
      setRole(user.roles?.[0] || 'member');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Deprecated - use new admin dashboard
    console.warn('EditUserDialog is deprecated - use AdminDashboard instead');
  };

  const handleDeactivate = async () => {
    // Deprecated - use new admin dashboard
    console.warn('EditUserDialog is deprecated - use AdminDashboard instead');
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit User: {user.email}</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback>{fullName?.[0] || user.email[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Label htmlFor="avatarUrl">Avatar URL</Label>
                  <Input
                    id="avatarUrl"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user.email}
                  disabled
                  className="opacity-50"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
              <Button type="submit">
                Save Changes
              </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4">
            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="platform_admin">Platform Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={() => console.warn('Deprecated')}>
              Update Role
            </Button>
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">User Status</h3>
              <p className="text-sm text-muted-foreground">
                Current status: <span className="font-medium">{user.is_active ? 'Active' : 'Inactive'}</span>
              </p>
              <Button 
                variant={user.is_active ? 'destructive' : 'default'}
                onClick={handleDeactivate}
                disabled={false}
              >
                {user.is_active ? 'Deactivate User' : 'Reactivate User'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
