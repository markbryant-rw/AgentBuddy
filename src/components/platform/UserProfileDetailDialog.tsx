import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserActivity } from '@/hooks/useUserActivity';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Edit, UserX, UserCheck } from 'lucide-react';
import { useState } from 'react';
import { EditUserDialog } from './EditUserDialog';
import { DirectMessageDialog } from './DirectMessageDialog';
// import { useUserManagement } from '@/hooks/useUserManagement'; // Deprecated - using new RBAC system

interface UserProfileDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    created_at: string;
    teamCount?: number;
    roles?: string[];
    is_active?: boolean;
  } | null;
}

export const UserProfileDetailDialog = ({ open, onOpenChange, user }: UserProfileDetailDialogProps) => {
  const { data: activity = [] } = useUserActivity(user?.id || '');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  // const { deactivateUser, reactivateUser } = useUserManagement(); // Deprecated

  if (!user) return null;

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'platform_admin': return 'destructive';
      case 'super_admin': return 'default';
      case 'admin': return 'secondary';
      default: return 'outline';
    }
  };

  const handleToggleActive = async () => {
    // Deprecated - use new admin dashboard
    console.warn('UserProfileDetailDialog is deprecated - use AdminDashboard instead');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Profile</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-4 pb-4 border-b">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback>{user.full_name?.[0] || user.email[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-2xl font-bold">{user.full_name || user.email}</h2>
                <p className="text-muted-foreground">{user.email}</p>
                <div className="flex gap-2 mt-2">
                  {user.roles?.map((role) => (
                    <Badge key={role} variant={getRoleBadgeVariant(role)}>
                      {role.replace('_', ' ')}
                    </Badge>
                  ))}
                  <Badge variant={user.is_active ? 'default' : 'secondary'}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setShowMessageDialog(true)}>
                  <MessageSquare className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowEditDialog(true)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant={user.is_active ? 'destructive' : 'default'}
                  onClick={handleToggleActive}
                >
                  {user.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="teams">Teams</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Joined</p>
                    <p className="font-medium">
                      {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Teams</p>
                    <p className="font-medium">{user.teamCount || 0}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="activity" className="space-y-2">
                {activity.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No activity recorded</p>
                ) : (
                  <div className="space-y-2">
                    {activity.map((item) => (
                      <div key={item.id} className="flex items-start gap-2 p-2 rounded-lg border">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{item.activity_type}</p>
                          {item.module_name && (
                            <p className="text-xs text-muted-foreground">{item.module_name}</p>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="teams" className="space-y-2">
                <p className="text-sm text-muted-foreground">Member of {user.teamCount || 0} teams</p>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      <EditUserDialog 
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        user={user}
      />

      <DirectMessageDialog
        open={showMessageDialog}
        onOpenChange={setShowMessageDialog}
        userId={user.id}
        userName={user.full_name || user.email}
      />
    </>
  );
};
