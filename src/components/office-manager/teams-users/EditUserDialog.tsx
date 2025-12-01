import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Building2, Users, UserPlus, UserMinus, ArrowRightLeft } from 'lucide-react';
import { useOfficeSwitcher } from '@/hooks/useOfficeSwitcher';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { canChangeRole, getRoleDisplayName, type AppRole } from '@/lib/rbac';
import { Separator } from '@/components/ui/separator';

interface EditUserDialogProps {
  user: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditUserDialog = ({ user, open, onOpenChange }: EditUserDialogProps) => {
  const [fullName, setFullName] = useState(user.full_name);
  const [changeOffice, setChangeOffice] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [teamAction, setTeamAction] = useState<'none' | 'add' | 'change' | 'remove'>('none');
  const queryClient = useQueryClient();
  const { activeOffice } = useOfficeSwitcher();
  const { roles: currentUserRoles } = useAuth();

  // Fetch user's current teams
  const { data: userTeams = [] } = useQuery({
    queryKey: ['user-teams', user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          team_id,
          access_level,
          teams:team_id (
            id,
            name,
            is_personal_team
          )
        `)
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user.id && open,
  });

  // Fetch user's current office details
  const { data: userOffice } = useQuery({
    queryKey: ['user-office', user.office_id],
    queryFn: async () => {
      if (!user.office_id) return null;
      const { data, error } = await supabase
        .from('agencies')
        .select('id, name')
        .eq('id', user.office_id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user.office_id && open,
  });

  // Fetch available teams in active office for team management
  const { data: availableTeams = [] } = useQuery({
    queryKey: ['office-teams-available', activeOffice?.id],
    queryFn: async () => {
      if (!activeOffice?.id) return [];
      
      const { data: teamIds } = await supabase
        .from('team_members')
        .select('team_id, profiles!team_members_user_id_fkey(office_id)')
        .eq('profiles.office_id', activeOffice.id);
      
      const uniqueTeamIds = [...new Set(teamIds?.map(t => t.team_id))];
      if (uniqueTeamIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, is_personal_team')
        .in('id', uniqueTeamIds)
        .eq('is_personal_team', false)
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeOffice?.id && open,
  });

  // Fetch user's current role (if any)
  const { data: userRole } = useQuery({
    queryKey: ['user-role', user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .is('revoked_at', null)
        .maybeSingle();
      
      // Treat "no rows" as no current role
      if (error && (error as any).code !== 'PGRST116') throw error;
      return (data?.role as AppRole) || null;
    },
    enabled: !!user.id && open,
  });

  useEffect(() => {
    setFullName(user.full_name);
    setChangeOffice(false);
    setTeamAction('none');
    setSelectedTeamId(null);
    if (userRole) {
      setSelectedRole(userRole);
    }
  }, [user, userRole]);

  const updateUser = useMutation({
    mutationFn: async () => {
      const updateData: any = { full_name: fullName };
      
      // If changing office, update office_id
      if (changeOffice && activeOffice) {
        updateData.office_id = activeOffice.id;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-teams-users'] });
      queryClient.invalidateQueries({ queryKey: ['data-health'] });
      if (changeOffice) {
        toast.success('User updated and moved to current office');
      } else {
        toast.success('User updated successfully');
      }
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error('Failed to update user: ' + error.message);
    },
  });

  const changeUserRole = useMutation({
    mutationFn: async (newRole: AppRole) => {
      const { data, error } = await supabase.functions.invoke('change-user-role', {
        body: {
          targetUserId: user.id,
          newRole,
          oldRole: userRole,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-role', user.id] });
      queryClient.invalidateQueries({ queryKey: ['office-teams-users'] });
      toast.success('Role changed successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to change role: ' + error.message);
    },
  });

  const handleTeamAction = useMutation({
    mutationFn: async () => {
      if (teamAction === 'none') return;
      
      if (teamAction === 'add' || teamAction === 'change') {
        if (!selectedTeamId) throw new Error('No team selected');
        
        // If changing, remove from current teams first
        if (teamAction === 'change' && userTeams.length > 0) {
          for (const membership of userTeams) {
            await supabase
              .from('team_members')
              .delete()
              .eq('user_id', user.id)
              .eq('team_id', membership.team_id);
          }
        }
        
        // Add to new team
        const accessLevel = selectedRole === 'team_leader' ? 'admin' : 'edit';
        const { error } = await supabase
          .from('team_members')
          .insert({
            user_id: user.id,
            team_id: selectedTeamId,
            access_level: accessLevel,
          });
        
        if (error) throw error;
        
        // Update primary team
        await supabase
          .from('profiles')
          .update({ primary_team_id: selectedTeamId })
          .eq('id', user.id);
        
      } else if (teamAction === 'remove') {
        // Remove from all teams and set to solo agent
        for (const membership of userTeams) {
          await supabase
            .from('team_members')
            .delete()
            .eq('user_id', user.id)
            .eq('team_id', membership.team_id);
        }
        
        // Set primary_team_id to null (solo agent)
        await supabase
          .from('profiles')
          .update({ primary_team_id: null })
          .eq('id', user.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-teams'] });
      queryClient.invalidateQueries({ queryKey: ['office-teams-users'] });
      
      if (teamAction === 'add') toast.success('User added to team');
      if (teamAction === 'change') toast.success('User moved to new team');
      if (teamAction === 'remove') toast.success('User moved to solo agent');
    },
    onError: (error: any) => {
      toast.error('Team action failed: ' + error.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Update profile info
    await updateUser.mutateAsync();
    
    // If role changed or newly assigned, update role
    if (selectedRole && selectedRole !== userRole) {
      await changeUserRole.mutateAsync(selectedRole);
    }
    
    // Handle team actions
    if (teamAction !== 'none') {
      await handleTeamAction.mutateAsync();
    }
    
    onOpenChange(false);
  };

  // Check if current user can change the target user's role
  const currentUserRole = currentUserRoles[0] as AppRole | undefined;
  const canChangeUserRole = !!currentUserRole && !!selectedRole &&
    canChangeRole(currentUserRole, userRole as AppRole | null, selectedRole);

  // Available roles that office manager can assign
  const availableRoles: AppRole[] = ['assistant', 'salesperson', 'team_leader'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>Update user information</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user.email} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          
          {/* Role Selection */}
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select 
              value={selectedRole || undefined} 
              onValueChange={(value) => setSelectedRole(value as AppRole)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role..." />
              </SelectTrigger>
              <SelectContent className="z-[11000] bg-popover" position="popper" sideOffset={5}>
                {availableRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {getRoleDisplayName(role)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Office Information */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Office
            </Label>
            <div className="rounded-md border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="text-muted-foreground">Current Office: </span>
                  <span className="font-medium">
                    {userOffice ? userOffice.name : user.office_id ? 'Loading...' : 'No office assigned'}
                  </span>
                </div>
                {userOffice && userOffice.id !== activeOffice?.id && (
                  <Badge variant="outline" className="text-xs">
                    Different Office
                  </Badge>
                )}
              </div>
              
              {activeOffice && userOffice?.id !== activeOffice.id && (
                <div className="flex items-center gap-2 pt-2 border-t">
                  <input
                    type="checkbox"
                    id="changeOffice"
                    checked={changeOffice}
                    onChange={(e) => setChangeOffice(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="changeOffice" className="text-sm font-normal cursor-pointer">
                    Move to <span className="font-medium">{activeOffice.name}</span>
                  </Label>
                </div>
              )}
              
              {activeOffice && userOffice?.id === activeOffice.id && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="default" className="text-xs">
                    Already in this office
                  </Badge>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Team Management */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Team Management
            </Label>

            {/* Current Teams Display */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Current Teams</Label>
              {userTeams.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {userTeams.map((membership: any) => (
                    <Badge key={membership.team_id} variant="secondary">
                      {membership.teams?.name}
                      {membership.access_level === 'admin' && ' (Leader)'}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Not in any team (Solo Agent)</p>
              )}
            </div>

            {/* Team Action Selection */}
            <div className="space-y-2">
              <Label htmlFor="team-action">Team Action</Label>
              <Select value={teamAction} onValueChange={(value: any) => setTeamAction(value)}>
                <SelectTrigger id="team-action">
                  <SelectValue placeholder="No team changes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No team changes</SelectItem>
                  <SelectItem value="add">
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      Add to Team
                    </div>
                  </SelectItem>
                  <SelectItem value="change">
                    <div className="flex items-center gap-2">
                      <ArrowRightLeft className="h-4 w-4" />
                      Change Team
                    </div>
                  </SelectItem>
                  <SelectItem value="remove">
                    <div className="flex items-center gap-2">
                      <UserMinus className="h-4 w-4" />
                      Remove from Team (Solo Agent)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Team Selection (shown for add/change actions) */}
            {(teamAction === 'add' || teamAction === 'change') && (
              <div className="space-y-2">
                <Label htmlFor="select-team">
                  {teamAction === 'add' ? 'Add to Team' : 'Move to Team'}
                </Label>
                <Select value={selectedTeamId || undefined} onValueChange={setSelectedTeamId}>
                  <SelectTrigger id="select-team">
                    <SelectValue placeholder="Select a team..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTeams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Confirmation message for remove */}
            {teamAction === 'remove' && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  This will remove the user from all teams and set them as a solo agent.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={
                updateUser.isPending || 
                changeUserRole.isPending || 
                handleTeamAction.isPending ||
                ((teamAction === 'add' || teamAction === 'change') && !selectedTeamId)
              }
            >
              {(updateUser.isPending || changeUserRole.isPending || handleTeamAction.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
