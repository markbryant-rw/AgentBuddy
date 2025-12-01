import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, UserPlus, Check, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useOfficeMembers } from '@/hooks/useOfficeMembers';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';

export const OfficeMembersPopover = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { members, isLoading } = useOfficeMembers();
  const [open, setOpen] = useState(false);

  // Fetch friend connections
  const { data: friendConnections = [] } = useQuery({
    queryKey: ['friend-connections', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('friend_connections')
        .select('user_id, friend_id, accepted')
        .or(`user_id.eq.${user?.id},friend_id.eq.${user?.id}`);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Add friend mutation (pending approval for office members)
  const addFriendMutation = useMutation({
    mutationFn: async (friendId: string) => {
      const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      // Insert with accepted = false (requires approval)
      const { error } = await supabase
        .from('friend_connections')
        .insert({
          user_id: user!.id,
          friend_id: friendId,
          invite_code: inviteCode,
          accepted: false,
        });
      if (error) throw error;

      // Create notification for the recipient
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: friendId,
          type: 'friend_request',
          title: 'New Friend Request',
          message: `${profile?.full_name || 'Someone'} wants to connect with you`,
          metadata: { from_user_id: user!.id },
        });
      if (notifError) console.error('Notification error:', notifError);
    },
    onSuccess: () => {
      toast.success('Friend request sent!');
    },
  });

  const getFriendStatus = (memberId: string) => {
    const connection = friendConnections.find(
      (fc) =>
        (fc.user_id === user?.id && fc.friend_id === memberId) ||
        (fc.friend_id === user?.id && fc.user_id === memberId)
    );

    if (!connection) return 'none';
    return connection.accepted ? 'friends' : 'pending';
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Building className="h-4 w-4" />
          Office
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Office Members</h4>
            <span className="text-sm text-muted-foreground">
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </span>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (
              members
                .filter((m) => m.user_id !== user?.id)
                .map((member) => {
                  const friendStatus = getFriendStatus(member.user_id);
                  return (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback>
                          {member.full_name?.split(' ').map((n) => n[0]).join('') || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => {
                            setOpen(false);
                            navigate(`/profile/${member.user_id}`);
                          }}
                          className="text-sm font-medium hover:underline text-left"
                        >
                          {member.full_name || 'Unknown'}
                        </button>
                        <p className="text-xs text-muted-foreground truncate">
                          {member.email}
                        </p>
                      </div>
                      {friendStatus === 'friends' ? (
                        <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          <Check className="h-3 w-3" />
                          <span>Friends</span>
                        </div>
                      ) : friendStatus === 'pending' ? (
                        <div className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
                          <Clock className="h-3 w-3" />
                          <span>Pending</span>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => addFriendMutation.mutate(member.user_id)}
                          disabled={addFriendMutation.isPending}
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
