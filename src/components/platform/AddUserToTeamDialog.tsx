import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserSearchCombobox } from '@/components/team/UserSearchCombobox';
import { usePlatformTeamManagement } from '@/hooks/usePlatformTeamManagement';

interface AddUserToTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddUserToTeamDialog = ({
  open,
  onOpenChange,
}: AddUserToTeamDialogProps) => {
  const [selectedUser, setSelectedUser] = useState<{ id: string; email: string; full_name: string | null; avatar_url: string | null } | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  
  const { officesWithTeams, addUserToTeam } = usePlatformTeamManagement();

  const handleAddUser = async () => {
    if (!selectedUser || !selectedTeamId) return;

    await addUserToTeam({
      userId: selectedUser.id,
      teamId: selectedTeamId,
    });

    // Reset and close
    setSelectedUser(null);
    setSelectedTeamId('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add User to Team</DialogTitle>
          <DialogDescription>
            Search for a user and add them to any team (Platform Admin)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Search User</Label>
            <UserSearchCombobox
              onSelect={setSelectedUser}
              selectedUser={selectedUser}
            />
          </div>

          <div className="space-y-2">
            <Label>Select Team</Label>
            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a team" />
              </SelectTrigger>
              <SelectContent>
                {officesWithTeams.map((office) => (
                  <optgroup key={office.id} label={office.name}>
                    {office.teams.map((team: any) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </optgroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddUser}
              disabled={!selectedUser || !selectedTeamId}
            >
              Add User
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
