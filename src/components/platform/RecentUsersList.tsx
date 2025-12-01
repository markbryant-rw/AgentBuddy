import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { Eye, Edit, UserCog } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfileDetailDialog } from './UserProfileDetailDialog';
import { EditUserDialog } from './EditUserDialog';
import { useViewAs } from '@/hooks/useViewAs';
import { toast } from 'sonner';

interface RecentUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  teamCount: number;
  roles: string[];
  is_active?: boolean;
}

interface RecentUsersListProps {
  users: RecentUser[] | undefined;
  isLoading: boolean;
}

export const RecentUsersList = ({ users, isLoading }: RecentUsersListProps) => {
  const [selectedUser, setSelectedUser] = useState<RecentUser | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const { startViewingAs } = useViewAs();
  const navigate = useNavigate();

  const handleViewAs = async (userId: string, userName: string) => {
    try {
      await startViewingAs(userId);
      toast.success(`Now viewing as ${userName}`);
      navigate('/dashboard');
    } catch (error) {
      toast.error('Failed to start viewing as user');
      console.error(error);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'platform_admin':
        return 'destructive';
      case 'super_admin':
        return 'default';
      case 'admin':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Users</CardTitle>
          <CardDescription>Latest user signups</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Users</CardTitle>
        <CardDescription>Latest user signups</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {users && users.length > 0 ? (
          users.map((user) => (
            <div key={user.id} className="flex items-center gap-4">
              <Avatar>
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback>
                  {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.full_name || user.email}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{user.teamCount} team{user.teamCount !== 1 ? 's' : ''}</span>
                  <span>•</span>
                  <span>{formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}</span>
                </div>
              </div>
              <div className="flex gap-1">
                {user.roles.length > 0 ? (
                  user.roles.map((role) => (
                    <Badge key={role} variant={getRoleBadgeVariant(role)} className="text-xs">
                      {role.replace('_', ' ')}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline" className="text-xs">member</Badge>
                )}
              </div>
              <div className="flex gap-1">
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => handleViewAs(user.id, user.full_name || user.email)}
                  title="View as this user"
                >
                  <UserCog className="h-4 w-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => {
                    setSelectedUser(user);
                    setShowProfile(true);
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => {
                    setSelectedUser(user);
                    setShowEdit(true);
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">No users yet</p>
        )}
      </CardContent>

      <UserProfileDetailDialog
        open={showProfile}
        onOpenChange={setShowProfile}
        user={selectedUser}
      />

      <EditUserDialog
        open={showEdit}
        onOpenChange={setShowEdit}
        user={selectedUser}
      />
    </Card>
  );
};
