import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useTeamCRUD } from '@/hooks/useTeamCRUD';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, RefreshCw, UserX, Settings, Users, Trash2, UserPlus, Mail, Clock } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useInvitations } from '@/hooks/useInvitations';
import { formatDistanceToNow } from 'date-fns';

interface ManageTeamDialogProps {
  team: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInviteClick?: () => void;
}

export const ManageTeamDialog = ({ team, open, onOpenChange, onInviteClick }: ManageTeamDialogProps) => {
  const [activeTab, setActiveTab] = useState<string>('details');
  const [name, setName] = useState(team.name);
  const [bio, setBio] = useState(team.bio || '');
  const [removingMember, setRemovingMember] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const { updateTeam, regenerateTeamCode } = useTeamCRUD();
  const { resendInvitation, isResending } = useInvitations();
  const queryClient = useQueryClient();

  useEffect(() => {
    setName(team.name);
    setBio(team.bio || '');
  }, [team]);

  const { data: membersAndPending = { members: [], pending: [] }, isLoading: loadingMembers } = useQuery({
    queryKey: ['team-members-detail', team.id],
    queryFn: async () => {
      // Fetch current members
      const { data: memberships, error: membersError } = await supabase
        .from('team_members')
        .select(`
          user_id,
          access_level,
          profiles:user_id (
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('team_id', team.id);

      if (membersError) throw membersError;
      
      const members = memberships?.map((m: any) => ({
        ...m.profiles,
        access_level: m.access_level,
        status: 'active',
      })) || [];

      // Fetch pending invitations for this team
      const { data: invitations, error: invitationsError } = await supabase
        .from('pending_invitations')
        .select('id, email, full_name, role, created_at')
        .eq('team_id', team.id)
        .eq('status', 'pending');

      if (invitationsError) throw invitationsError;

      const pending = invitations?.map((inv: any) => ({
        id: inv.id,
        email: inv.email,
        full_name: inv.full_name || inv.email,
        invitation_id: inv.id,
        created_at: inv.created_at,
        status: 'pending',
      })) || [];

      return { members, pending };
    },
    enabled: open,
  });

  const members = membersAndPending.members;
  const pendingInvitations = membersAndPending.pending;

  // Fetch available users to add (users in the office but not in this team)
  const { data: availableUsers = [], isLoading: loadingAvailableUsers } = useQuery({
    queryKey: ['available-users-for-team', team.id, team.agency_id, members?.length],
    queryFn: async () => {
      // Get all users in the office
      const { data: officeUsers, error: usersError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .eq('office_id', team.agency_id)
        .neq('status', 'inactive');

      if (usersError) throw usersError;

      // Get current team member IDs
      const memberIds = members?.map((m: any) => m.id) || [];

      // Filter out users already in the team
      return officeUsers?.filter((user) => !memberIds.includes(user.id)) || [];
    },
    enabled: open && addMemberOpen && !loadingMembers,
  });

  const addMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('team_members')
        .insert([{
          team_id: team.id,
          user_id: userId,
          access_level: 'view' as const,
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members-detail'] });
      queryClient.invalidateQueries({ queryKey: ['office-teams-users'] });
      queryClient.invalidateQueries({ queryKey: ['available-users-for-team'] });
      toast.success('Member added successfully');
      setAddMemberOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add member');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateTeam.mutateAsync({
      id: team.id,
      name,
      bio,
    });
  };

  const handleRegenerateCode = async () => {
    if (confirm('Are you sure you want to regenerate the team code? The old code will no longer work.')) {
      await regenerateTeamCode.mutateAsync(team.id);
    }
  };

  const deleteTeamMutation = useMutation({
    mutationFn: async () => {
      // First, remove all team members
      const { error: membersError } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', team.id);
      
      if (membersError) throw membersError;

      // Then delete the team
      const { error: teamError } = await supabase
        .from('teams')
        .delete()
        .eq('id', team.id);
      
      if (teamError) throw teamError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-hierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['office-data'] });
      queryClient.invalidateQueries({ queryKey: ['teams-for-invite'] });
      queryClient.invalidateQueries({ queryKey: ['office-teams-users'] });
      toast.success(`Team "${team.name}" has been deleted`);
      setShowDeleteConfirm(false);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error('Failed to delete team: ' + error.message);
    },
  });

  const handleDeleteTeam = () => {
    deleteTeamMutation.mutate();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col z-[9999]">
          <DialogHeader>
            <DialogTitle>Manage Team</DialogTitle>
            <DialogDescription>{team.name}</DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details" className="gap-2">
                <Settings className="h-4 w-4" />
                Team Details
              </TabsTrigger>
              <TabsTrigger value="members" className="gap-2">
                <Users className="h-4 w-4" />
                Members ({members.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="flex-1 overflow-y-auto space-y-4 mt-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Team Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Description</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Team Code</Label>
                  <div className="flex gap-2">
                    <Input
                      value={team.team_code}
                      readOnly
                      className="font-mono"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleRegenerateCode}
                      disabled={regenerateTeamCode.isPending}
                      title="Regenerate team code"
                    >
                      {regenerateTeamCode.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Team members use this code to join the team
                  </p>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateTeam.isPending}>
                    {updateTeam.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </form>

              <Separator className="my-6" />

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-destructive mb-1">Danger Zone</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Deleting a team is permanent and cannot be undone. All team data will be removed.
                  </p>
                  {members.length > 0 && (
                    <p className="text-xs text-destructive font-medium">
                      ⚠️ This team has {members.length} member{members.length !== 1 ? 's' : ''}. All members will be removed from the team.
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Team
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="members" className="flex-1 overflow-y-auto mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">
                    {members.length} {members.length === 1 ? 'member' : 'members'}
                  </p>
                  <div className="flex items-center gap-2">
                    <Popover open={addMemberOpen} onOpenChange={setAddMemberOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm">
                          <UserPlus className="h-4 w-4 mr-2" />
                          Add Existing
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0" align="end">
                        <Command>
                          <CommandInput placeholder="Search users..." />
                          <CommandList>
                            {loadingAvailableUsers ? (
                              <div className="p-4 text-center text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                              </div>
                            ) : availableUsers.length === 0 ? (
                              <CommandEmpty>No available users in this office.</CommandEmpty>
                            ) : (
                              <CommandGroup>
                                {availableUsers.map((user: any) => (
                                  <CommandItem
                                    key={user.id}
                                    onSelect={() => addMemberMutation.mutate(user.id)}
                                    disabled={addMemberMutation.isPending}
                                  >
                                    <div className="flex items-center gap-2 w-full">
                                      <Avatar className="h-6 w-6">
                                        <AvatarImage src={user.avatar_url || undefined} />
                                        <AvatarFallback className="text-xs">
                                          {user.full_name?.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium truncate">
                                          {user.full_name}
                                        </div>
                                        <div className="text-xs text-muted-foreground truncate">
                                          {user.email}
                                        </div>
                                      </div>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => {
                        onOpenChange(false);
                        onInviteClick?.();
                      }}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite New
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  {loadingMembers ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                      ))}
                    </div>
                  ) : members.length === 0 && pendingInvitations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No members in this team
                    </div>
                  ) : (
                    <>
                      {members.map((member: any) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={member.avatar_url || undefined} />
                              <AvatarFallback>
                                {member.full_name?.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{member.full_name}</div>
                              <div className="text-sm text-muted-foreground">{member.email}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {member.access_level === 'admin' && (
                              <Badge variant="default">Leader</Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setRemovingMember(member)}
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      
                      {pendingInvitations.map((invitation: any) => (
                        <div
                          key={invitation.id}
                          className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="opacity-50">
                              <AvatarFallback>
                                <Clock className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                {invitation.full_name}
                                <Badge variant="outline" className="text-xs">Pending</Badge>
                              </div>
                              <div className="text-sm text-muted-foreground">{invitation.email}</div>
                              <div className="text-xs text-muted-foreground">
                                Invited {formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resendInvitation(invitation.invitation_id)}
                            disabled={isResending}
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            Send Reminder
                          </Button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removingMember} onOpenChange={(open) => !open && setRemovingMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {removingMember?.full_name} from {team.name}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                // This will be handled by the parent component's removal logic
                setRemovingMember(null);
              }}
              className="bg-destructive text-destructive-foreground"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{team.name}</strong>? This action cannot be undone.
              All team data, including members and associated records, will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteTeamMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteTeam();
              }}
              disabled={deleteTeamMutation.isPending}
              className="bg-destructive text-destructive-foreground"
            >
              {deleteTeamMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Team'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
