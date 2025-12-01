import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useFriendStats } from '@/hooks/useFriendStats';
import { usePresence } from '@/hooks/usePresence';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { PresenceDot } from './PresenceDot';
import { ConversationSheet } from './ConversationSheet';
import { MessageCircle, TrendingUp, TrendingDown, Minus, Flame, Copy, UserPlus, Users, Check, X, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function FriendsTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { myStats, friendsStats, loading, refetch } = useFriendStats();
  const { allPresence } = usePresence();
  const { members: teamMembers } = useTeamMembers();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationOpen, setConversationOpen] = useState(false);
  const [recipientName, setRecipientName] = useState<string>('');
  const [inviteCode, setInviteCode] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'connected'>('all');

  const handleMessage = async (friendId: string, friendName: string) => {
    if (!user) return;

    // Check if conversation exists
    const { data: existing } = await supabase
      .from('conversations')
      .select('id, conversation_participants!inner(user_id)')
      .eq('type', 'direct');

    let convId = existing?.find(c => {
      const participants = c.conversation_participants as any[];
      return participants.some(p => p.user_id === friendId) && 
             participants.some(p => p.user_id === user.id);
    })?.id;

    // Create if doesn't exist
    if (!convId) {
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({ type: 'direct', created_by: user.id })
        .select()
        .single();

      if (error) {
        toast.error('Failed to create conversation');
        return;
      }

      await supabase.from('conversation_participants').insert([
        { conversation_id: newConv.id, user_id: user.id },
        { conversation_id: newConv.id, user_id: friendId },
      ]);

      convId = newConv.id;
    }

    setConversationId(convId);
    setRecipientName(friendName);
    setConversationOpen(true);
  };

  const getComparisonText = (friendCCH: number, myCCH: number) => {
    const diff = Math.abs(friendCCH - myCCH);
    if (friendCCH > myCCH) {
      return { text: `They're ahead by ${diff.toFixed(1)} CCH`, icon: TrendingUp, color: 'text-red-500' };
    } else if (myCCH > friendCCH) {
      return { text: `You're ahead by ${diff.toFixed(1)} CCH`, icon: TrendingDown, color: 'text-green-500' };
    }
    return { text: "You're tied!", icon: Minus, color: 'text-muted-foreground' };
  };

  const isTeammate = (userId: string) => {
    return teamMembers?.some(m => m.user_id === userId);
  };

  // Fetch user's invite code
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('invite_code, full_name')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  // Fetch friend connections
  const { data: connections, refetch: refetchConnections } = useQuery({
    queryKey: ['friend-connections', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data } = await supabase
        .from('friend_connections')
        .select(`
          id,
          user_id,
          friend_id,
          accepted,
          created_at,
          user:profiles!friend_connections_user_id_fkey(id, full_name, email, avatar_url),
          friend:profiles!friend_connections_friend_id_fkey(id, full_name, email, avatar_url)
        `)
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      return data || [];
    },
    enabled: !!user,
  });

  const handleCopyCode = () => {
    if (profile?.invite_code) {
      navigator.clipboard.writeText(profile.invite_code);
      toast.success('Invite code copied!');
    }
  };

  const handleAddFriend = async () => {
    if (!user || !inviteCode.trim()) return;

    // Find user by invite code
    const { data: friendProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('invite_code', inviteCode.trim())
      .single();

    if (!friendProfile) {
      toast.error('Invalid invite code');
      return;
    }

    if (friendProfile.id === user.id) {
      toast.error("You can't add yourself!");
      return;
    }

    // Check if connection already exists
    const { data: existing } = await supabase
      .from('friend_connections')
      .select('id')
      .or(`and(user_id.eq.${user.id},friend_id.eq.${friendProfile.id}),and(user_id.eq.${friendProfile.id},friend_id.eq.${user.id})`)
      .maybeSingle();

    if (existing) {
      toast.error('Connection already exists');
      return;
    }

    // Create connection
    const { error } = await supabase
      .from('friend_connections')
      .insert({
        user_id: user.id,
        friend_id: friendProfile.id,
        accepted: false,
        invite_code: inviteCode.trim(),
      });

    if (error) {
      toast.error('Failed to send request');
    } else {
      toast.success('Friend request sent!');
      setInviteCode('');
      refetchConnections();
    }
  };

  const handleAcceptRequest = async (connectionId: string) => {
    const { error } = await supabase
      .from('friend_connections')
      .update({ accepted: true })
      .eq('id', connectionId);

    if (error) {
      toast.error('Failed to accept request');
    } else {
      toast.success('Friend request accepted!');
      refetchConnections();
    }
  };

  const handleRejectRequest = async (connectionId: string) => {
    const { error } = await supabase
      .from('friend_connections')
      .delete()
      .eq('id', connectionId);

    if (error) {
      toast.error('Failed to reject request');
    } else {
      toast.success('Friend request rejected');
      refetchConnections();
    }
  };

  const handleQuickAddTeammates = async () => {
    if (!user || !teamMembers) return;

    const promises = teamMembers
      .filter(m => m.user_id !== user.id)
      .map(async (member) => {
        // Check if connection exists
        const { data: existing } = await supabase
          .from('friend_connections')
          .select('id')
          .or(`and(user_id.eq.${user.id},friend_id.eq.${member.user_id}),and(user_id.eq.${member.user_id},friend_id.eq.${user.id})`)
          .maybeSingle();
        
        // Get member profile for invite_code
        const { data: memberProfile } = await supabase
          .from('profiles')
          .select('invite_code')
          .eq('id', member.user_id)
          .single();

        if (!existing && memberProfile?.invite_code) {
          return supabase.from('friend_connections').insert({
            user_id: user.id,
            friend_id: member.user_id,
            accepted: false,
            invite_code: memberProfile.invite_code,
          });
        }
      });

    await Promise.all(promises);
    toast.success('Friend requests sent to all teammates!');
    refetchConnections();
  };

  const handleToggleStarred = async (friendId: string, currentStarred: boolean) => {
    if (!user) return;
    
    // Find the connection
    const { data: connection } = await supabase
      .from('friend_connections')
      .select('id')
      .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`)
      .single();
    
    if (!connection) return;
    
    const { error } = await supabase
      .from('friend_connections')
      .update({ is_starred: !currentStarred })
      .eq('id', connection.id);
    
    if (error) {
      toast.error('Failed to update favorite');
    } else {
      toast.success(currentStarred ? 'Removed from favorites' : 'Added to favorites');
      
      // Invalidate and refetch friend stats and connections
      queryClient.invalidateQueries({ queryKey: ['friend-connections', user.id] });
      refetchConnections();
      refetch();
    }
  };

  const filteredConnections = connections?.filter(conn => {
    if (filter === 'pending') return !conn.accepted;
    if (filter === 'connected') return conn.accepted;
    return true;
  });

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Friends & Teammates Grid - MOVED TO TOP */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Friends & Teammates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from(new Map(friendsStats.filter(f => f.is_starred).map(f => [f.user_id, f])).values()).length === 0 && (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center">
                <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Favorite Friends</h3>
                <p className="text-muted-foreground">
                  Star your friends below to see their performance here
                </p>
              </CardContent>
            </Card>
          )}
          {Array.from(new Map(friendsStats.filter(f => f.is_starred).map(f => [f.user_id, f])).values()).map((friend) => {
            const comparison = getComparisonText(friend.week_cch, myStats?.week_cch || 0);
            const ComparisonIcon = comparison.icon;
            const presence = allPresence[friend.user_id] as any || 'offline';

            return (
              <Card key={friend.user_id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12 relative">
                      <AvatarImage src={friend.avatar_url || ''} />
                      <AvatarFallback>{friend.full_name?.[0]}</AvatarFallback>
                      <div className="absolute -bottom-1 -right-1">
                        <PresenceDot status={presence} size="md" />
                      </div>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{friend.full_name}</h3>
                      {isTeammate(friend.user_id) && (
                        <Badge variant="secondary" className="text-xs">Teammate</Badge>
                      )}
                      {friend.current_streak > 0 && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Flame className="h-3 w-3 text-orange-500" />
                          {friend.current_streak} day streak
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stats - Desktop: Today + This Week, Mobile: This Week only */}
                  <div className="space-y-2 text-sm">
                    {!isMobile && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Today</div>
                        <div className="flex justify-between">
                          <span>{friend.today_calls} calls</span>
                          <span>{friend.today_appraisals} apps</span>
                          <span className="font-semibold">{friend.today_cch.toFixed(1)} CCH</span>
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">This Week</div>
                      <div className="flex justify-between">
                        <span>{friend.week_calls} calls</span>
                        <span>{friend.week_appraisals} apps</span>
                        <span className="font-semibold">{friend.week_cch.toFixed(1)} CCH</span>
                      </div>
                    </div>
                  </div>

                  {/* Comparison */}
                  <div className={`flex items-center gap-2 text-sm ${comparison.color}`}>
                    <ComparisonIcon className="h-4 w-4" />
                    <span>{comparison.text}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleMessage(friend.user_id, friend.full_name)}
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Message
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Your Invite Code & Add Friend - Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Your Invite Code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input 
                value={profile?.invite_code || ''} 
                readOnly 
                className="font-mono text-lg"
              />
              <Button onClick={handleCopyCode}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Share this code with friends to connect with them
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add Friend</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input 
                placeholder="Enter invite code..." 
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddFriend()}
              />
              <Button onClick={handleAddFriend}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(['all', 'pending', 'connected'] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      {/* Connections List */}
      <div className="space-y-2">
        {filteredConnections?.map((conn) => {
          const isReceiver = conn.friend_id === user?.id;
          const otherUser = isReceiver ? conn.user : conn.friend;
          const isPending = !conn.accepted;

          return (
            <Card key={conn.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <Avatar className="h-12 w-12 relative">
                  <AvatarImage src={otherUser?.avatar_url || ''} />
                  <AvatarFallback>{otherUser?.full_name?.[0]}</AvatarFallback>
                  <div className="absolute -bottom-1 -right-1">
                    <PresenceDot 
                      status={allPresence[otherUser?.id || ''] as any || 'offline'}
                      size="sm"
                    />
                  </div>
                </Avatar>
                <div className="flex-1">
                  <div className="font-semibold">{otherUser?.full_name}</div>
                  <div className="text-sm text-muted-foreground">{otherUser?.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  {!isPending && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const friendStats = friendsStats.find(f => f.user_id === otherUser?.id);
                        handleToggleStarred(otherUser?.id || '', friendStats?.is_starred || false);
                      }}
                    >
                      <Star 
                        className={`h-4 w-4 ${
                          friendsStats.find(f => f.user_id === otherUser?.id)?.is_starred 
                            ? 'fill-yellow-400 text-yellow-400' 
                            : 'text-muted-foreground'
                        }`} 
                      />
                    </Button>
                  )}
                  {isPending && isReceiver && (
                    <>
                      <Badge variant="secondary">Pending</Badge>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleAcceptRequest(conn.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleRejectRequest(conn.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {isPending && !isReceiver && (
                    <Badge variant="outline">Request Sent</Badge>
                  )}
                  {!isPending && (
                    <Badge variant="default">Connected</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(!filteredConnections || filteredConnections.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Connections</h3>
            <p className="text-muted-foreground">
              {filter === 'pending' && 'No pending requests'}
              {filter === 'connected' && 'No friends yet'}
              {filter === 'all' && 'Start by adding friends with their invite code'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Conversation Sheet */}
      <ConversationSheet
        open={conversationOpen}
        onOpenChange={setConversationOpen}
        conversationId={conversationId}
        recipientName={recipientName}
      />
    </div>
  );
}
