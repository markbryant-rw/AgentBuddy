import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wrench, UserCog, Clock, RefreshCw } from 'lucide-react';
import { UserCardData } from '@/hooks/usePlatformOfficeDetail';
import { getRoleBadgeVariant } from '@/lib/rbac';
import { useState } from 'react';
import { ManageUserDialog } from './ManageUserDialog';
import { ViewAsReasonDialog } from './ViewAsReasonDialog';
import { PendingUserActionsDialog } from './PendingUserActionsDialog';
import { useViewAs } from '@/hooks/useViewAs';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface UserCardProps {
  user: UserCardData;
}

export const UserCard = ({ user }: UserCardProps) => {
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [isViewAsReasonDialogOpen, setIsViewAsReasonDialogOpen] = useState(false);
  const [isPendingDialogOpen, setIsPendingDialogOpen] = useState(false);
  const [isViewingAs, setIsViewingAs] = useState(false);
  const { startViewingAs } = useViewAs();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleViewAsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsViewAsReasonDialogOpen(true);
  };

  const handleViewAsConfirm = async (reason: string) => {
    try {
      setIsViewingAs(true);
      await startViewingAs(user.id, reason);
      toast({
        title: 'Success',
        description: `Now viewing as ${user.full_name}`,
      });
      setIsViewAsReasonDialogOpen(false);
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to start viewing as user',
        variant: 'destructive',
      });
    } finally {
      setIsViewingAs(false);
    }
  };

  const handleCardClick = () => {
    if (user.isPending) {
      setIsPendingDialogOpen(true);
    } else {
      setIsManageDialogOpen(true);
    }
  };

  // Pending user card
  if (user.isPending) {
    return (
      <>
        <Card 
          className="relative group hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer border-warning/50 bg-warning/5"
          onClick={handleCardClick}
        >
          <div className="absolute top-2 right-2">
            <Badge variant="outline" className="bg-warning/20 text-warning border-warning text-xs">
              <Clock className="h-3 w-3 mr-1" />
              Pending
            </Badge>
          </div>
          
          <CardContent className="p-4 pt-10">
            <div className="flex flex-col items-center text-center gap-3">
              {/* Pending avatar placeholder */}
              <div className="h-16 w-16 rounded-full bg-warning/20 border-2 border-dashed border-warning flex items-center justify-center">
                <RefreshCw className="h-6 w-6 text-warning" />
              </div>
              
              <div className="flex-1 min-w-0 w-full">
                <h4 className="font-semibold truncate">{user.full_name}</h4>
                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                {user.invitedAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Invited {formatDistanceToNow(new Date(user.invitedAt), { addSuffix: true })}
                  </p>
                )}
              </div>
              
              <div className="flex flex-wrap gap-1 justify-center">
                {user.roles.map((role) => (
                  <Badge 
                    key={role} 
                    variant={getRoleBadgeVariant(role)}
                    className="text-xs"
                  >
                    {role.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <PendingUserActionsDialog
          open={isPendingDialogOpen}
          onOpenChange={setIsPendingDialogOpen}
          user={user}
        />
      </>
    );
  }

  // Active user card
  return (
    <>
      <Card 
        className="relative group hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer"
        onClick={handleCardClick}
      >
        {user.is_orphaned && (
          <div className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1.5">
            <Wrench className="h-3 w-3" />
          </div>
        )}
        
        <Button
          size="sm"
          variant="ghost"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          onClick={handleViewAsClick}
          disabled={isViewingAs}
          title="View as this user"
        >
          <UserCog className="h-4 w-4" />
        </Button>
        
        <CardContent className="p-4">
          <div className="flex flex-col items-center text-center gap-3">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.avatar_url || ''} alt={user.full_name} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg">
                {user.full_name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0 w-full">
              <h4 className="font-semibold truncate">{user.full_name}</h4>
              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            </div>
            
            <div className="flex flex-wrap gap-1 justify-center">
              {user.roles.map((role) => (
                <Badge 
                  key={role} 
                  variant={getRoleBadgeVariant(role)}
                  className="text-xs"
                >
                  {role.replace('_', ' ')}
                </Badge>
              ))}
              {user.status === 'inactive' && (
                <Badge variant="outline" className="text-xs">
                  Inactive
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <ManageUserDialog
        open={isManageDialogOpen}
        onOpenChange={setIsManageDialogOpen}
        userId={user.id}
      />

      <ViewAsReasonDialog
        open={isViewAsReasonDialogOpen}
        onOpenChange={setIsViewAsReasonDialogOpen}
        onConfirm={handleViewAsConfirm}
        userName={user.full_name}
      />
    </>
  );
};
