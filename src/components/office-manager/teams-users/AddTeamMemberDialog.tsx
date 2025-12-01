import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Search, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAddTeamMember } from '@/hooks/useAddTeamMember';
import { useOfficeSwitcher } from '@/hooks/useOfficeSwitcher';

interface AddTeamMemberDialogProps {
  team: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddTeamMemberDialog = ({
  team,
  open,
  onOpenChange,
}: AddTeamMemberDialogProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [role, setRole] = useState<'admin' | 'edit' | 'view'>('view');
  const { activeOffice } = useOfficeSwitcher();
  const { mutate: addMember, isPending } = useAddTeamMember();

  // Get users in the office who are NOT in this team
  const { data: availableUsers = [], isLoading } = useQuery({
    queryKey: ['available-team-members', team.id, activeOffice?.id],
    queryFn: async () => {
      if (!activeOffice) return [];

      // Get all current team members
      const { data: currentMembers } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', team.id);

      const currentMemberIds = currentMembers?.map((m) => m.user_id) || [];

      // Get all users in office (through team_members of any team in this office)
      const { data: officeTeams } = await supabase
        .from('teams')
        .select('id')
        .eq('agency_id', activeOffice.id);

      const officeTeamIds = officeTeams?.map((t) => t.id) || [];

      const { data: officeUsers, error } = await supabase
        .from('team_members')
        .select(`
          user_id,
          profiles:user_id (
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .in('team_id', officeTeamIds)
        .not('user_id', 'in', `(${currentMemberIds.join(',') || 'null'})`);

      if (error) throw error;

      // Deduplicate users
      const uniqueUsers = new Map();
      officeUsers?.forEach((u: any) => {
        if (u.profiles && !uniqueUsers.has(u.profiles.id)) {
          uniqueUsers.set(u.profiles.id, u.profiles);
        }
      });

      return Array.from(uniqueUsers.values());
    },
    enabled: open && !!activeOffice,
  });

  const filteredUsers = availableUsers.filter((user: any) =>
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = () => {
    if (!selectedUser) return;
    addMember(
      { userId: selectedUser.id, teamId: team.id, accessLevel: role },
      {
        onSuccess: () => {
          setSelectedUser(null);
          setSearchQuery('');
          setRole('view');
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Member to {team.name}</DialogTitle>
          <DialogDescription>
            Select a user from your office to add to this team
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-2">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {searchQuery ? 'No users found' : 'No available users to add'}
              </div>
            ) : (
              filteredUsers.map((user: any) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg border transition-colors ${
                    selectedUser?.id === user.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback>
                      {user.full_name?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left flex-1">
                    <div className="text-sm font-medium">{user.full_name}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                  </div>
                </button>
              ))
            )}
          </div>

          {selectedUser && (
            <div className="space-y-2">
              <Label>Role</Label>
              <RadioGroup value={role} onValueChange={(v: any) => setRole(v)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="view" id="view" />
                  <Label htmlFor="view" className="font-normal cursor-pointer">
                    Member - Standard team member
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="admin" id="admin" />
                  <Label htmlFor="admin" className="font-normal cursor-pointer">
                    Team Leader - Can manage team members
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={!selectedUser || isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Member
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
