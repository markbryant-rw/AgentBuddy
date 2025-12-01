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
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface LeaveOfficeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  officeName: string;
}

export function LeaveOfficeDialog({ open, onOpenChange, officeName }: LeaveOfficeDialogProps) {
  const { user } = useAuth();
  const { team } = useTeam();
  const navigate = useNavigate();

  const handleLeave = async () => {
    if (!user || !team) return;

    try {
      // Delete team membership
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', team.id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update primary team if this was their primary team
      const { data: profile } = await supabase
        .from('profiles')
        .select('primary_team_id')
        .eq('id', user.id)
        .single();

      if (profile?.primary_team_id === team.id) {
        await supabase
          .from('profiles')
          .update({ primary_team_id: null })
          .eq('id', user.id);
      }

      toast.success(`You have left ${officeName}`);
      onOpenChange(false);
      navigate('/');
      window.location.reload();
    } catch (error) {
      console.error('Error leaving office:', error);
      toast.error('Failed to leave office');
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave {officeName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This action will remove you from your current team and office. You will lose access to:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Team conversations and messages</li>
              <li>Shared listings and pipeline data</li>
              <li>Team goals and performance tracking</li>
              <li>Office-wide statistics and leaderboards</li>
            </ul>
            <p className="mt-4 font-semibold">You can rejoin by searching for the office and requesting to join a team.</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleLeave} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Leave Office
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
