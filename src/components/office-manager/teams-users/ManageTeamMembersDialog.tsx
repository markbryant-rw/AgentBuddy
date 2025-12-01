import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { UserX, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRemoveTeamMember } from '@/hooks/useRemoveTeamMember';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ManageTeamMembersDialogProps {
  team: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ManageTeamMembersDialog = ({
  team,
  open,
  onOpenChange,
}: ManageTeamMembersDialogProps) => {
  const [removingMember, setRemovingMember] = useState<any>(null);
  const { mutateAsync: removeMember, isPending: isRemoving } = useRemoveTeamMember();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['team-members-detail', team.id],
    queryFn: async () => {
      const { data: memberships, error } = await supabase
        .from('team_members')
        .select(`
          user_id,
          access_level,
          profiles:user_id (
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('team_id', team.id);

      if (error) throw error;
      return memberships?.map((m: any) => ({
        ...m.profiles,
        access_level: m.access_level,
      })) || [];
    },
    enabled: open,
  });

  const handleRemoveMember = async (member: any) => {
    await removeMember({ userId: member.id, teamId: team.id });
    setRemovingMember(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Team Members - {team.name}</DialogTitle>
            <DialogDescription>
              Add or remove members from this team
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No members in this team
              </div>
            ) : (
              members.map((member: any) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback>
                        {member.full_name?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{member.full_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {member.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={member.access_level === 'admin' ? 'default' : 'secondary'}>
                      {member.access_level === 'admin' ? 'Team Leader' : 'Member'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setRemovingMember(member)}
                    >
                      <UserX className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removingMember} onOpenChange={() => setRemovingMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {removingMember?.full_name} from {team.name}?
              They will become a solo agent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleRemoveMember(removingMember)}
              disabled={isRemoving}
            >
              {isRemoving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
