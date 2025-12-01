import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { toast } from 'sonner';

interface JoinTeamDialogProps {
  variant?: 'default' | 'outline';
}

export function JoinTeamDialog({ variant = 'default' }: JoinTeamDialogProps) {
  const { user } = useAuth();
  const { refreshTeam } = useTeam();
  const [open, setOpen] = useState(false);
  const [teamCode, setTeamCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoinTeam = async () => {
    if (!teamCode.trim()) {
      toast.error('Please enter a team code');
      return;
    }

    if (!user) {
      toast.error('You must be logged in to join a team');
      return;
    }

    setLoading(true);
    try {
      // Find the team by code
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('id, name')
        .eq('team_code', teamCode.trim().toUpperCase())
        .single();

      if (teamError || !teamData) {
        toast.error('Invalid team code. Please check and try again.');
        return;
      }

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('team_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('team_id', teamData.id)
        .maybeSingle();

      if (existingMember) {
        toast.error("You're already a member of this team");
        return;
      }

      // Add user to team
      const { error: insertError } = await supabase
        .from('team_members')
        .insert({
          user_id: user.id,
          team_id: teamData.id,
          access_level: 'view',
        });

      if (insertError) throw insertError;

      // Update profile to set primary team
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ primary_team_id: teamData.id })
        .eq('id', user.id);

      if (profileError) throw profileError;

      toast.success(`Successfully joined ${teamData.name}!`);
      setTeamCode('');
      setOpen(false);
      
      // Refresh team data
      await refreshTeam();
    } catch (error: any) {
      console.error('Error joining team:', error);
      toast.error(error.message || 'Failed to join team');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant}>
          <Users className="h-4 w-4 mr-2" />
          Join Team
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join a Team</DialogTitle>
          <DialogDescription>
            Enter the team code provided by your team administrator to join.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="teamCode">Team Code *</Label>
            <Input
              id="teamCode"
              placeholder="Enter team code (e.g., ABC12345)"
              value={teamCode}
              onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
              disabled={loading}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Ask your team administrator for the team code
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleJoinTeam} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Join Team
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
