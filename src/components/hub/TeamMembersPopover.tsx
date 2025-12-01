import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, Check, MessageSquare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePresence } from '@/hooks/usePresence';
import { PresenceDot } from '@/components/people/PresenceDot';
import { toast } from 'sonner';

export const TeamMembersPopover = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { members, isLoading } = useTeamMembers();
  const [open, setOpen] = useState(false);
  const [messagingUserId, setMessagingUserId] = useState<string | null>(null);
  const { allPresence } = usePresence();

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

  // Add friend mutation (instant for team members)
  const addFriendMutation = useMutation({
    mutationFn: async (friendId: string) => {
      const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      const { error } = await supabase
        .from('friend_connections')
        .insert({
          user_id: user!.id,
          friend_id: friendId,
          invite_code: inviteCode,
          accepted: true, // Auto-accept for team members
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Friend added!');
    },
  });

  const isFriend = (memberId: string) => {
    return friendConnections.some(
      (fc) =>
        (fc.user_id === user?.id && fc.friend_id === memberId && fc.accepted) ||
        (fc.friend_id === user?.id && fc.user_id === memberId && fc.accepted)
    );
  };

  // Create or get conversation with team member
  const createConversationMutation = useMutation({
    mutationFn: async (recipientId: string) => {
      const { data, error } = await supabase.rpc('get_or_create_direct_conversation', {
        user1_id: user!.id,
        user2_id: recipientId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (conversationId, recipientId) => {
      const member = members.find(m => m.user_id === recipientId);
      setOpen(false);
      navigate(`/messages?conversation=${conversationId}`);
      toast.success(`Starting conversation with ${member?.full_name || 'team member'}`);
    },
    onError: () => {
      toast.error('Failed to start conversation');
    },
  });

  const handleSendMessage = (userId: string) => {
    setMessagingUserId(userId);
    createConversationMutation.mutate(userId);
  };

  const getMemberPresence = (userId: string) => {
    return allPresence[userId] || 'offline';
  };

  const getLastActiveAt = (userId: string) => {
    // Fetch from profiles table if needed
    const member = members.find(m => m.user_id === userId);
    return (member as any)?.last_active_at;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Users className="h-4 w-4" />
          Team
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Team Members</h4>
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
                  const isAlreadyFriend = isFriend(member.user_id);
                  const memberPresence = getMemberPresence(member.user_id);
                  const lastActiveAt = getLastActiveAt(member.user_id);
                  const isMessaging = messagingUserId === member.user_id && createConversationMutation.isPending;

                  return (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback>
                            {member.full_name?.split(' ').map((n) => n[0]).join('') || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1">
                          <PresenceDot 
                            status={memberPresence} 
                            lastActive={lastActiveAt}
                            size="sm"
                          />
                        </div>
                      </div>
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
                      <div className="flex items-center gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSendMessage(member.user_id)}
                                disabled={isMessaging}
                                className="h-8 w-8 p-0"
                              >
                                {isMessaging ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <MessageSquare className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Send message to {member.full_name}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {isAlreadyFriend ? (
                          <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                            <Check className="h-3 w-3" />
                            <span>Friends</span>
                          </div>
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => addFriendMutation.mutate(member.user_id)}
                                  disabled={addFriendMutation.isPending}
                                  className="h-8 w-8 p-0"
                                >
                                  <UserPlus className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Add {member.full_name} as friend</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
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
