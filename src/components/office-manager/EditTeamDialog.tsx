import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Users, UserPlus, UserMinus, Shield, Trash2, Loader2 } from 'lucide-react';
import { useOfficeData } from '@/hooks/useOfficeData';
import { InviteTeamMemberDialog } from './InviteTeamMemberDialog';
import { DeleteTeamDialog } from './DeleteTeamDialog';
import { invalidateTeamData } from '@/lib/cacheInvalidation';

interface EditTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  teamName: string;
  officeId: string;
}

interface TeamMember {
  id: string;
  user_id: string;
  access_level: string;
  profiles?: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

export function EditTeamDialog({ open, onOpenChange, teamId, teamName, officeId }: EditTeamDialogProps) {
  const queryClient = useQueryClient();
  const [editedTeamName, setEditedTeamName] = useState(teamName);
  const [showRemoveMemberDialog, setShowRemoveMemberDialog] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showDeleteTeamDialog, setShowDeleteTeamDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  // Fetch team members
  const { data: members, isLoading: isLoadingMembers, refetch: refetchMembers } = useQuery({
    queryKey: ['team-members', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          id,
          user_id,
          access_level,
          profiles:user_id (
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('team_id', teamId);

      if (error) throw error;
      return data as TeamMember[];
    },
    enabled: open,
    refetchOnMount: 'always',
  });

  // Refetch members when dialog opens
  useEffect(() => {
    if (open) {
      refetchMembers();
    }
  }, [open, refetchMembers]);

  // Fetch office data for available members
  const { data: officeData } = useOfficeData(officeId);

  // Get users not already in this team
  const availableUsers = officeData?.members
    ?.filter(m => !members?.some(tm => tm.user_id === m.user_id))
    .map(m => m.user_id) || [];

  // Fetch profiles for available users
  const { data: availableProfiles } = useQuery({
    queryKey: ['available-profiles', officeId, teamId],
    queryFn: async () => {
      if (availableUsers.length === 0) return [];
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', availableUsers);

      if (error) throw error;
      return data;
    },
    enabled: open && availableUsers.length > 0,
  });

  // Update team name mutation
  const updateTeamNameMutation = useMutation({
    mutationFn: async (newName: string) => {
      const { error } = await supabase
        .from('teams')
        .update({ name: newName })
        .eq('id', teamId);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateTeamData(queryClient, { teamId, officeId });
      toast.success('Team name updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update team name: ' + error.message);
    },
  });

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('team_members')
        .insert({
          team_id: teamId,
          user_id: userId,
          access_level: 'view' as const,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateTeamData(queryClient, { teamId, officeId });
      setShowAddMemberDialog(false);
      setSelectedUserId('');
      toast.success('Member added to team');
    },
    onError: (error: Error) => {
      toast.error('Failed to add member: ' + error.message);
    },
  });

  // Change access level mutation
  const changeAccessLevelMutation = useMutation({
    mutationFn: async ({ memberId, accessLevel }: { memberId: string; accessLevel: 'admin' | 'edit' | 'view' }) => {
      const { error } = await supabase
        .from('team_members')
        .update({ access_level: accessLevel })
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateTeamData(queryClient, { teamId, officeId });
      toast.success('Access level updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update access level: ' + error.message);
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateTeamData(queryClient, { teamId, officeId });
      setShowRemoveMemberDialog(false);
      setMemberToRemove(null);
      toast.success('Member removed from team');
    },
    onError: (error: Error) => {
      toast.error('Failed to remove member: ' + error.message);
      setShowRemoveMemberDialog(false);
      setMemberToRemove(null);
    },
  });

  const handleSaveTeamName = () => {
    if (editedTeamName !== teamName && editedTeamName.trim()) {
      updateTeamNameMutation.mutate(editedTeamName.trim());
    }
  };

  const handleAddMember = () => {
    if (selectedUserId) {
      addMemberMutation.mutate(selectedUserId);
    }
  };

  const handleRemoveMember = (member: TeamMember) => {
    setMemberToRemove(member);
    setShowRemoveMemberDialog(true);
  };

  const confirmRemoveMember = () => {
    if (memberToRemove) {
      removeMemberMutation.mutate(memberToRemove.id);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Edit Team</DialogTitle>
                <DialogDescription>
                  Manage team details, members, and access levels
                </DialogDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteTeamDialog(true)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Team
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Team Name */}
            <div className="space-y-2">
              <Label htmlFor="team-name">Team Name</Label>
              <div className="flex gap-2">
                <Input
                  id="team-name"
                  value={editedTeamName}
                  onChange={(e) => setEditedTeamName(e.target.value)}
                  placeholder="Enter team name"
                />
                <Button
                  onClick={handleSaveTeamName}
                  disabled={editedTeamName === teamName || !editedTeamName.trim() || updateTeamNameMutation.isPending}
                >
                  {updateTeamNameMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Save'
                  )}
                </Button>
              </div>
            </div>

            {/* Members List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base">Team Members ({members?.length || 0})</Label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowInviteDialog(true)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite New
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowAddMemberDialog(true)}
                    disabled={!availableProfiles || availableProfiles.length === 0}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Existing
                  </Button>
                </div>
              </div>

              {isLoadingMembers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : members && members.length > 0 ? (
                <div className="space-y-2">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.profiles?.avatar_url || undefined} />
                          <AvatarFallback>
                            {member.profiles?.full_name?.[0] || member.profiles?.email?.[0] || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {member.profiles?.full_name || 'No Name'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {member.profiles?.email}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Select
                          value={member.access_level}
                          onValueChange={(value) => 
                            changeAccessLevelMutation.mutate({ 
                              memberId: member.id, 
                              accessLevel: value as 'admin' | 'edit' | 'view'
                            })
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="view">
                              <div className="flex items-center gap-2">
                                <Users className="h-3 w-3" />
                                Member
                              </div>
                            </SelectItem>
                            <SelectItem value="edit">
                              <div className="flex items-center gap-2">
                                <Users className="h-3 w-3" />
                                Editor
                              </div>
                            </SelectItem>
                            <SelectItem value="admin">
                              <div className="flex items-center gap-2">
                                <Shield className="h-3 w-3" />
                                Admin
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMember(member)}
                          disabled={members.length === 1}
                        >
                          <UserMinus className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No members in this team
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={showAddMemberDialog} onOpenChange={setShowAddMemberDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Select a member from your office to add to this team
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Member</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a member..." />
                </SelectTrigger>
                <SelectContent>
                  {availableProfiles?.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={profile.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {profile.full_name?.[0] || profile.email[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{profile.full_name || profile.email}</div>
                          <div className="text-xs text-muted-foreground">{profile.email}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddMemberDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddMember} 
                disabled={!selectedUserId || addMemberMutation.isPending}
              >
                {addMemberMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-2" />
                )}
                Add Member
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite New Member Dialog */}
      <InviteTeamMemberDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        officeId={officeId}
      />

      {/* Delete Team Dialog */}
      <DeleteTeamDialog
        open={showDeleteTeamDialog}
        onOpenChange={setShowDeleteTeamDialog}
        teamId={teamId}
        teamName={teamName}
        memberCount={members?.length || 0}
      />

      {/* Remove Member Confirmation */}
      <AlertDialog open={showRemoveMemberDialog} onOpenChange={setShowRemoveMemberDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{' '}
              <strong>{memberToRemove?.profiles?.full_name || memberToRemove?.profiles?.email}</strong>{' '}
              from {teamName}? They will lose access to this team's data and activities.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
