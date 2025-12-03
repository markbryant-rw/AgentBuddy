import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTeamCRUD } from '@/hooks/useTeamCRUD';
import { Loader2, Trash2, UserPlus, X, Crown, User } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTeamMembers } from '@/hooks/usePlatformOfficeDetail';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useRemoveTeamMember } from '@/hooks/useRemoveTeamMember';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { DeleteTeamWizard } from './DeleteTeamWizard';

interface EditTeamDialogPlatformProps {
  team: {
    id: string;
    name: string;
    bio?: string | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditTeamDialogPlatform = ({ team, open, onOpenChange }: EditTeamDialogPlatformProps) => {
  const [name, setName] = useState(team.name);
  const [bio, setBio] = useState(team.bio || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);
  
  const { updateTeam } = useTeamCRUD();
  const { data: members, isLoading: membersLoading } = useTeamMembers(open ? team.id : undefined);
  const removeTeamMember = useRemoveTeamMember();
  const queryClient = useQueryClient();

  // Fetch team's agency to get available users
  const { data: teamData } = useQuery({
    queryKey: ['team-agency', team.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('teams')
        .select('agency_id')
        .eq('id', team.id)
        .single();
      return data;
    },
    enabled: open,
  });

  // Fetch available users from the same agency who aren't already in this team
  const { data: availableUsers } = useQuery({
    queryKey: ['available-users-for-team', team.id, teamData?.agency_id],
    queryFn: async () => {
      if (!teamData?.agency_id) return [];
      
      // Get users in the same agency
      const { data: agencyUsers } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .eq('office_id', teamData.agency_id)
        .eq('status', 'active');
      
      // Get current team member IDs
      const memberIds = members?.map(m => m.id) || [];
      
      // Filter out users already in the team
      return (agencyUsers || []).filter(u => !memberIds.includes(u.id));
    },
    enabled: open && !!teamData?.agency_id && showAddMember,
  });

  // Add member mutation
  const addMember = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await (supabase as any)
        .from('team_members')
        .insert({
          team_id: team.id,
          user_id: userId,
          access_level: 'member',
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-team-members', team.id] });
      queryClient.invalidateQueries({ queryKey: ['platform-office-teams'] });
      toast.success('Member added to team');
      setSelectedUserId('');
      setShowAddMember(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add member');
    },
  });

  useEffect(() => {
    setName(team.name);
    setBio(team.bio || '');
  }, [team]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateTeam.mutateAsync({
      id: team.id,
      name,
      bio,
    });
    onOpenChange(false);
  };


  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    await removeTeamMember.mutateAsync({ userId: memberToRemove.id, teamId: team.id });
    setMemberToRemove(null);
  };

  const handleAddMember = () => {
    if (selectedUserId) {
      addMember.mutate(selectedUserId);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
            <DialogDescription>Manage team details and members</DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="members">
                Members {members?.length ? `(${members.length})` : ''}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="space-y-4 mt-4">
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
                    placeholder="Optional team description"
                  />
                </div>
                <div className="flex justify-between pt-4">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Team
                  </Button>
                  <Button type="submit" disabled={updateTeam.isPending}>
                    {updateTeam.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="members" className="space-y-4 mt-4">
              {/* Add Member Section */}
              {showAddMember ? (
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label>Select User</Label>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a user to add..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsers?.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name || user.email}
                          </SelectItem>
                        ))}
                        {availableUsers?.length === 0 && (
                          <div className="px-2 py-1 text-sm text-muted-foreground">
                            No available users
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={handleAddMember}
                    disabled={!selectedUserId || addMember.isPending}
                  >
                    {addMember.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => setShowAddMember(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowAddMember(true)}
                  className="w-full"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Team Member
                </Button>
              )}
              
              {/* Members List */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {membersLoading ? (
                  <div className="text-center py-4 text-muted-foreground">Loading...</div>
                ) : members && members.length > 0 ? (
                  members.map(member => (
                    <div 
                      key={member.id} 
                      className="flex items-center justify-between p-2 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback>
                            {member.full_name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{member.full_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {member.roles?.includes('team_leader') && (
                          <Badge variant="secondary" className="text-xs">
                            <Crown className="h-3 w-3 mr-1" />
                            Leader
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setMemberToRemove({ 
                            id: member.id, 
                            name: member.full_name || 'this user' 
                          })}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No team members yet</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Delete Team Wizard */}
      <DeleteTeamWizard
        team={team}
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onDeleted={() => onOpenChange(false)}
      />

      {/* Remove Member Confirmation */}
      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove {memberToRemove?.name} from {team.name}? They will become a solo agent in the office.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeTeamMember.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
