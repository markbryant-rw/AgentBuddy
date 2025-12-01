import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { useOfficeData } from '@/hooks/useOfficeData';
import { Loader2, Users, Mail, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useState } from 'react';

interface OfficeMembersListProps {
  officeId: string;
}

export function OfficeMembersList({ officeId }: OfficeMembersListProps) {
  const queryClient = useQueryClient();
  const { data: officeData, isLoading: isLoadingOffice } = useOfficeData(officeId);
  const [memberToDelete, setMemberToDelete] = useState<{ id: string; name: string; email: string } | null>(null);

  const deleteMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Remove from all team memberships
      const { error: teamError } = await supabase
        .from('team_members')
        .delete()
        .eq('user_id', userId);
      
      if (teamError) throw teamError;

      // Remove all user roles
      const { error: rolesError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);
      
      if (rolesError) throw rolesError;

      // Delete the user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);
      
      if (profileError) throw profileError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-data'] });
      queryClient.invalidateQueries({ queryKey: ['team-hierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['office-member-profiles'] });
      toast.success(`User "${memberToDelete?.name}" has been deleted`);
      setMemberToDelete(null);
    },
    onError: (error: Error) => {
      toast.error('Failed to delete user: ' + error.message);
    },
  });

  // Fetch pending invitations for this office
  const { data: pendingInvites, isLoading: isLoadingInvites } = useQuery({
    queryKey: ['pending-invitations', officeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pending_invitations')
        .select('id, full_name, email, created_at, expires_at')
        .eq('office_id', officeId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!officeId,
  });

  // Fetch full profile details for all members
  const { data: memberProfiles, isLoading: isLoadingProfiles } = useQuery({
    queryKey: ['office-member-profiles', officeId, officeData?.members],
    queryFn: async () => {
      if (!officeData?.members || officeData.members.length === 0) return [];

      const userIds = Array.from(new Set(officeData.members.map(m => m.user_id)));
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, status, onboarding_completed, password_set')
        .in('id', userIds);

      if (error) throw error;
      
      // Map members to their teams
      return data?.map(profile => {
        const memberTeams = officeData.members
          .filter(m => m.user_id === profile.id)
          .map(m => {
            const team = officeData.teams.find(t => t.id === m.team_id);
            return {
              teamId: m.team_id,
              teamName: team?.name || 'Unknown Team',
              accessLevel: m.access_level
            };
          });

        return {
          ...profile,
          teams: memberTeams,
          isPending: !profile.onboarding_completed || !profile.password_set
        };
      }) || [];
    },
    enabled: !!officeData?.members && officeData.members.length > 0,
  });

  const resendInviteMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase.functions.invoke('resend-invitation', {
        body: { invitationId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Invitation resent successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to resend invitation: ' + error.message);
    },
  });

  if (isLoadingOffice || isLoadingProfiles || isLoadingInvites) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const totalCount = (memberProfiles?.length || 0) + (pendingInvites?.length || 0);

  if (totalCount === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Members Found</h3>
          <p className="text-sm text-muted-foreground text-center">
            This office has no members yet. Invite members to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {/* Active Members */}
      {memberProfiles?.map((member) => (
        <Card key={member.id}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={member.avatar_url || undefined} />
                <AvatarFallback>
                  {member.full_name?.[0] || member.email?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-base">
                      {member.full_name || 'No Name'}
                    </h3>
                    {member.isPending && (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-300">
                        Pending Setup
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMemberToDelete({
                      id: member.id,
                      name: member.full_name || member.email,
                      email: member.email,
                    })}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{member.email}</span>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {member.teams.map((team) => (
                    <Badge key={team.teamId} variant="secondary" className="text-xs">
                      {team.teamName}
                      {team.accessLevel === 'admin' && (
                        <span className="ml-1 text-primary">•</span>
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Pending Invitations */}
      {pendingInvites?.map((invite) => (
        <Card key={invite.id} className="border-dashed">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <Avatar className="h-12 w-12 opacity-60">
                <AvatarFallback>
                  {invite.full_name?.[0] || invite.email?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-base text-muted-foreground">
                      {invite.full_name || invite.email}
                    </h3>
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-300">
                      Invitation Pending
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => resendInviteMutation.mutate(invite.id)}
                    disabled={resendInviteMutation.isPending}
                  >
                    <Mail className="h-4 w-4 mr-1" />
                    Resend
                  </Button>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{invite.email}</span>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  Invited {new Date(invite.created_at).toLocaleDateString()} • Expires {new Date(invite.expires_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Delete User Confirmation */}
      <AlertDialog open={!!memberToDelete} onOpenChange={(open) => !open && setMemberToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to delete <strong>{memberToDelete?.name}</strong> ({memberToDelete?.email})?
              </p>
              <p className="text-destructive font-medium">
                ⚠️ This will permanently delete the user's account and remove them from all teams.
              </p>
              <p>This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMemberMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (memberToDelete) {
                  deleteMemberMutation.mutate(memberToDelete.id);
                }
              }}
              disabled={deleteMemberMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMemberMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete User'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
