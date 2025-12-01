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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface DeleteTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  teamName: string;
  memberCount: number;
}

export function DeleteTeamDialog({ open, onOpenChange, teamId, teamName, memberCount }: DeleteTeamDialogProps) {
  const queryClient = useQueryClient();

  const deleteTeamMutation = useMutation({
    mutationFn: async () => {
      // First, remove all team members
      const { error: membersError } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId);
      
      if (membersError) throw membersError;

      // Then delete the team
      const { error: teamError } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);
      
      if (teamError) throw teamError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-hierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['office-data'] });
      queryClient.invalidateQueries({ queryKey: ['teams-for-invite'] });
      toast.success(`Team "${teamName}" has been deleted`);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error('Failed to delete team: ' + error.message);
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Team?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Are you sure you want to delete <strong>{teamName}</strong>?
            </p>
            {memberCount > 0 && (
              <p className="text-destructive font-medium">
                ⚠️ This team has {memberCount} member{memberCount !== 1 ? 's' : ''}. All members will be removed from the team.
              </p>
            )}
            <p>This action cannot be undone.</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteTeamMutation.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              deleteTeamMutation.mutate();
            }}
            disabled={deleteTeamMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteTeamMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Team'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
