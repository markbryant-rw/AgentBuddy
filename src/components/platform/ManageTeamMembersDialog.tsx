import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { UserMinus } from 'lucide-react';
import { usePlatformTeamManagement } from '@/hooks/usePlatformTeamManagement';
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
import { useState } from 'react';

interface TeamMember {
  id: string;
  user_id: string;
  profiles: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

interface ManageTeamMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  teamName: string;
  members: TeamMember[];
}

export const ManageTeamMembersDialog = ({
  open,
  onOpenChange,
  teamId,
  teamName,
  members,
}: ManageTeamMembersDialogProps) => {
  const { removeUserFromTeam } = usePlatformTeamManagement();
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);

  const handleRemove = async () => {
    if (!memberToRemove) return;

    await removeUserFromTeam({
      userId: memberToRemove.user_id,
      teamId,
    });

    setMemberToRemove(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Manage Team Members</DialogTitle>
            <DialogDescription>
              {teamName} - {members.length} members
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {members.map((member) => (
              <Card key={member.id}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.profiles.avatar_url || undefined} />
                        <AvatarFallback>
                          {member.profiles.full_name?.[0] || member.profiles.email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {member.profiles.full_name || 'No name'}
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {member.profiles.email}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setMemberToRemove(member)}
                    >
                      <UserMinus className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {memberToRemove?.profiles.full_name || memberToRemove?.profiles.email} from {teamName}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
