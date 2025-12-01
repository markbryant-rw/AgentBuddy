import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useProfile } from '@/hooks/useProfile';
import { useOfficeSwitcher } from '@/hooks/useOfficeSwitcher';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTeamDialog({ open, onOpenChange }: CreateTeamDialogProps) {
  const [teamName, setTeamName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { profile, loading: isLoadingProfile } = useProfile();
  const { activeOffice, isLoading: isLoadingOffice } = useOfficeSwitcher();
  const queryClient = useQueryClient();

  const handleCreate = async () => {
    if (!teamName.trim()) {
      toast.error('Please enter a team name');
      return;
    }

    if (!activeOffice) {
      toast.error('Please select an office first');
      return;
    }

    if (!profile?.id) {
      toast.error('Profile not loaded. Please try again.');
      return;
    }

    setIsCreating(true);

    try {
      // Generate 8-character alphanumeric team code
      const teamCode = Math.random().toString(36).substring(2, 10).toUpperCase();

      const { error } = await supabase
        .from('teams')
        .insert({
          name: teamName,
          bio: description || null,
          team_code: teamCode,
          agency_id: activeOffice.id,
          created_by: profile.id,
        });

      if (error) throw error;

      toast.success('Team created successfully!');
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['team-hierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['office-teams-users'] });
      queryClient.invalidateQueries({ queryKey: ['office-stats'] });
      
      // Reset and close
      setTeamName('');
      setDescription('');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating team:', error);
      toast.error(error.message || 'Failed to create team');
    } finally {
      setIsCreating(false);
    }
  };

  const isLoading = isLoadingProfile || isLoadingOffice;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Team</DialogTitle>
          <DialogDescription>
            {activeOffice ? (
              `Create a new team within ${activeOffice.name}`
            ) : (
              'Create a new team within your office'
            )}
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !activeOffice ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Please select an office first
          </div>
        ) : (
          <>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="team-name">Team Name *</Label>
                <Input
                  id="team-name"
                  placeholder="e.g., Todd & Josh"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  disabled={isCreating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the team's focus or goals..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isCreating}
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={isCreating || !teamName.trim() || !activeOffice}
              >
                {isCreating ? 'Creating...' : 'Create Team'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
