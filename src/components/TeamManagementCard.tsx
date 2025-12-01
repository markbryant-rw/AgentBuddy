import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, UserPlus, Users, Plus, LogOut, UserMinus } from "lucide-react";
import { useTeam } from "@/hooks/useTeam";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { InviteTeamMemberDialog } from "@/components/team/InviteTeamMemberDialog";
import { JoinTeamDialog } from "@/components/team/JoinTeamDialog";
import { useState } from "react";
import { useLeaveTeam } from "@/hooks/useLeaveTeam";
import { useRemoveTeamMember } from "@/hooks/useRemoveTeamMember";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PresenceDot } from "@/components/people/PresenceDot";
import { usePresence } from "@/hooks/usePresence";
import { toast } from "sonner";

export function TeamManagementCard() {
  const { profile } = useProfile();
  const { team } = useTeam();
  const { members: teamMembers } = useTeamMembers();
  const { user, isPlatformAdmin } = useAuth();
  const navigate = useNavigate();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);
  const [messagingUserId, setMessagingUserId] = useState<string | null>(null);
  const { mutate: leaveTeam, isPending: isLeaving } = useLeaveTeam();
  const { mutate: removeMember, isPending: isRemoving } = useRemoveTeamMember();
  const { allPresence } = usePresence();
  const currentUserIsAdmin = teamMembers?.find(m => m.user_id === user?.id)?.access_level === 'admin';

  // Fetch friend connections
  const { data: friendConnections = [] } = useQuery({
    queryKey: ["friend-connections"],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("friend_connections")
        .select("user_id, friend_id, accepted")
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq("accepted", true);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const isFriend = (userId: string) => {
    return friendConnections.some(
      (fc) =>
        (fc.user_id === user?.id && fc.friend_id === userId) ||
        (fc.friend_id === user?.id && fc.user_id === userId)
    );
  };

  const handleMessage = async (memberId: string) => {
    setMessagingUserId(memberId);
    try {
      const { data: conversation, error } = await supabase
        .rpc('get_or_create_conversation', {
          other_user_id: memberId
        });
      
      if (error) throw error;
      
      if (conversation && conversation.length > 0) {
        navigate(`/messages?conversation=${conversation[0].id}`);
      }
    } catch (error) {
      console.error('Failed to start conversation:', error);
      toast.error('Failed to start conversation');
    } finally {
      setMessagingUserId(null);
    }
  };

  // Solo agent view - no team
  if (!profile?.primary_team_id || !team || !teamMembers) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Management
          </CardTitle>
          <CardDescription>You're currently a solo agent</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            You can create your own team or join an existing one using a team code.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/setup?tab=team')} className="flex-1">
              <Plus className="h-4 w-4 mr-2" />
              Create Team
            </Button>
            <JoinTeamDialog variant="outline" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team Members ({teamMembers.length})
        </CardTitle>
        <CardDescription>View and manage your team</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {teamMembers.map((member) => {
          const isCurrentUser = member.user_id === user?.id;
          const memberIsFriend = !isCurrentUser && isFriend(member.user_id);

          return (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback>
                      {member.full_name?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {!isCurrentUser && (
                    <div className="absolute bottom-0 right-0">
                      <PresenceDot 
                        status={allPresence[member.user_id] || 'offline'}
                        lastActive={member.last_active_at}
                        size="sm"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{member.full_name || member.email}</span>
                    {isCurrentUser && (
                      <Badge variant="outline" className="text-xs">
                        You
                      </Badge>
                    )}
                    {member.access_level === 'admin' && (
                      <Badge variant="default" className="text-xs">
                        Admin
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                  {memberIsFriend && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      ✓ Friends
                    </p>
                  )}
                </div>
              </div>

              {isCurrentUser ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setShowLeaveDialog(true)}
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Leave Team
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleMessage(member.user_id)}
                    disabled={messagingUserId === member.user_id}
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    {messagingUserId === member.user_id ? 'Opening...' : 'Message'}
                  </Button>
                  
                  {!memberIsFriend && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate("/friends")}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Add Friend
                    </Button>
                  )}

                  {currentUserIsAdmin && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setMemberToRemove({ id: member.user_id, name: member.full_name || member.email })}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Leave {team?.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to leave this team? You'll lose access to shared data, conversations, and team features.
                {teamMembers.length === 1 && " You are the only member - the team will remain but you won't have access to it."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => leaveTeam(team?.id || '')}
                disabled={isLeaving}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isLeaving ? 'Leaving...' : 'Leave Team'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove {memberToRemove?.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove this member from {team?.name}? They will lose access to all shared team data and features.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (memberToRemove && team?.id) {
                    removeMember({ userId: memberToRemove.id, teamId: team.id });
                    setMemberToRemove(null);
                  }
                }}
                disabled={isRemoving}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isRemoving ? 'Removing...' : 'Remove Member'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
