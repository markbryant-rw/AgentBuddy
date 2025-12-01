import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePlatformTeamManagement } from '@/hooks/usePlatformTeamManagement';
import { useOfficeTeamsUsers } from '@/hooks/useOfficeTeamsUsers';
import { Loader2 } from 'lucide-react';

interface AssignToTeamDialogProps {
  user: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AssignToTeamDialog = ({
  user,
  open,
  onOpenChange,
}: AssignToTeamDialogProps) => {
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const { teams } = useOfficeTeamsUsers();
  const { addUserToTeam } = usePlatformTeamManagement();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId) return;

    await addUserToTeam({ userId: user.id, teamId: selectedTeamId });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign to Team</DialogTitle>
          <DialogDescription>
            Assign {user.full_name} to a team
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team">Select Team *</Label>
            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name} ({team.memberCount} members)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!selectedTeamId}>
              Assign
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
