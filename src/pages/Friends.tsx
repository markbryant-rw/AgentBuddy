import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Copy, UserPlus, Users as UsersIcon, TrendingUp, Phone, Home, Check, X, UserCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FriendStatsCard } from '@/components/FriendStatsCard';
import { FriendLeaderboard } from '@/components/FriendLeaderboard';
import { useFriendStats } from '@/hooks/useFriendStats';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useTeam } from '@/hooks/useTeam';
interface FriendConnection {
  id: string;
  invite_code: string;
  accepted: boolean;
  direction?: 'sent' | 'received';
  friend: {
    id?: string;
    email: string;
    full_name: string;
    avatar_url?: string | null;
  };
}
const Friends = () => {
  const {
    user
  } = useAuth();
  const { team } = useTeam();
  const [inviteCode, setInviteCode] = useState('');
  const [friendInviteCode, setFriendInviteCode] = useState('');
  const [friendConnections, setFriendConnections] = useState<FriendConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingTeammates, setAddingTeammates] = useState(false);
  const {
    myStats,
    friendsStats,
    leaderboard,
    loading: statsLoading,
    refetch: refetchStats
  } = useFriendStats();
  const [manageOpen, setManageOpen] = useState(false);
  useEffect(() => {
    if (user) {
      fetchUserInviteCode();
      fetchConnections();
    }
  }, [user]);
  const fetchUserInviteCode = async () => {
    if (!user) return;
    try {
      const {
        data,
        error
      } = await supabase.from('profiles').select('invite_code').eq('id', user.id).single();
      if (error) throw error;
      if (!data) throw new Error('Profile not found');
      setInviteCode(data.invite_code || '');
    } catch (error) {
      console.error('Error fetching invite code:', error);
      toast.error('Failed to fetch invite code');
    }
  };
  const fetchConnections = async () => {
    if (!user) return;
    try {
      // Fetch outgoing requests (I sent)
      const {
        data: sentRequests,
        error: sentError
      } = await supabase.from('friend_connections').select(`
          id,
          invite_code,
          accepted,
          friend_id,
          profiles!friend_connections_friend_id_fkey(email, full_name, avatar_url)
        `).eq('user_id', user.id);

      // Fetch incoming requests (sent to me)
      const {
        data: receivedRequests,
        error: receivedError
      } = await supabase.from('friend_connections').select(`
          id,
          invite_code,
          accepted,
          user_id,
          profiles!friend_connections_user_id_fkey(email, full_name, avatar_url)
        `).eq('friend_id', user.id);
      if (sentError) throw sentError;
      if (receivedError) throw receivedError;

      // Track unique friends to prevent duplicates
      const seenFriendIds = new Set<string>();
      const formattedConnections: FriendConnection[] = [];

      // Process sent requests first
      sentRequests?.forEach((conn: any) => {
        if (!seenFriendIds.has(conn.friend_id)) {
          seenFriendIds.add(conn.friend_id);
          formattedConnections.push({
            id: conn.id,
            invite_code: conn.invite_code,
            accepted: conn.accepted,
            direction: 'sent' as const,
            friend: {
              id: conn.friend_id,
              email: conn.profiles?.email || '',
              full_name: conn.profiles?.full_name || conn.profiles?.email || 'Unknown',
              avatar_url: conn.profiles?.avatar_url
            }
          });
        }
      });

      // Process received requests, skipping already-seen friends
      receivedRequests?.forEach((conn: any) => {
        if (!seenFriendIds.has(conn.user_id)) {
          seenFriendIds.add(conn.user_id);
          formattedConnections.push({
            id: conn.id,
            invite_code: conn.invite_code,
            accepted: conn.accepted,
            direction: 'received' as const,
            friend: {
              id: conn.user_id,
              email: conn.profiles?.email || '',
              full_name: conn.profiles?.full_name || conn.profiles?.email || 'Unknown',
              avatar_url: conn.profiles?.avatar_url
            }
          });
        }
      });
      setFriendConnections(formattedConnections);
    } catch (error) {
      console.error('Error fetching connections:', error);
    }
  };
  const copyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode);
    toast.success('Invite code copied to clipboard! 📋');
  };
  const addFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !friendInviteCode.trim()) return;
    setLoading(true);
    try {
      // Look up profile by invite code directly
      const {
        data: friendProfile,
        error: profileError
      } = await supabase
        .from('profiles')
        .select('id, invite_code')
        .eq('invite_code', friendInviteCode.trim().toUpperCase())
        .single();
        
      if (profileError || !friendProfile) {
        toast.error('Invalid invite code');
        return;
      }
      if (friendProfile.id === user.id) {
        toast.error('You cannot add yourself as a friend');
        return;
      }

      // Check if already friends or request pending
      const {
        data: existingConnection
      } = await supabase.from('friend_connections').select('accepted').or(`and(user_id.eq.${user.id},friend_id.eq.${friendProfile.id}),and(user_id.eq.${friendProfile.id},friend_id.eq.${user.id})`).maybeSingle();
      if (existingConnection) {
        if (existingConnection.accepted) {
          toast.error('You are already friends with this person');
        } else {
          toast.error('Friend request already pending');
        }
        return;
      }

      // Create friend request (not auto-accepted)
      const {
        error: insertError
      } = await supabase.from('friend_connections').insert({
        user_id: user.id,
        friend_id: friendProfile.id,
        invite_code: friendInviteCode.trim().toUpperCase(),
        accepted: false
      });
      if (insertError) throw insertError;
      toast.success('Friend request sent! 📤');
      setFriendInviteCode('');
      fetchConnections();
    } catch (error) {
      console.error('Error adding friend:', error);
      toast.error('Failed to send friend request');
    } finally {
      setLoading(false);
    }
  };
  const approveFriendRequest = async (connectionId: string, friendId: string) => {
    if (!user) return;
    try {
      // Update the incoming request to accepted
      const {
        error: updateError
      } = await supabase.from('friend_connections').update({
        accepted: true
      }).eq('id', connectionId);
      if (updateError) throw updateError;

      // Create the reciprocal connection
      const {
        error: insertError
      } = await supabase.from('friend_connections').insert({
        user_id: user.id,
        friend_id: friendId,
        invite_code: inviteCode,
        accepted: true
      });
      if (insertError) throw insertError;
      toast.success('Friend request approved! 🎉');
      fetchConnections();
      refetchStats();
    } catch (error) {
      console.error('Error approving friend request:', error);
      toast.error('Failed to approve friend request');
    }
  };
  const rejectFriendRequest = async (connectionId: string) => {
    try {
      const {
        error
      } = await supabase.from('friend_connections').delete().eq('id', connectionId);
      if (error) throw error;
      toast.success('Friend request rejected');
      fetchConnections();
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      toast.error('Failed to reject friend request');
    }
  };

  const addAllTeammates = async () => {
    if (!user || !team) {
      toast.error('No team found');
      return;
    }

    setAddingTeammates(true);
    try {
      // Get all team members
      const { data: teamMembers, error: teamError } = await supabase
        .from('team_members')
        .select('user_id, profiles!inner(id, invite_code, full_name, email)')
        .eq('team_id', team.id)
        .neq('user_id', user.id);

      if (teamError) throw teamError;

      if (!teamMembers || teamMembers.length === 0) {
        toast.info('No other teammates found');
        return;
      }

      // Check existing connections
      const { data: existingConnections } = await supabase
        .from('friend_connections')
        .select('user_id, friend_id')
        .or(`and(user_id.eq.${user.id}),and(friend_id.eq.${user.id})`);

      const existingFriendIds = new Set(
        existingConnections?.map(conn => 
          conn.user_id === user.id ? conn.friend_id : conn.user_id
        ) || []
      );

      // Filter out teammates who are already friends
      const newTeammates = teamMembers.filter(
        member => !existingFriendIds.has(member.user_id)
      );

      if (newTeammates.length === 0) {
        toast.info('All teammates are already friends!');
        return;
      }

      // Create friend requests for new teammates
      const friendRequests = newTeammates.map(member => ({
        user_id: user.id,
        friend_id: member.user_id,
        invite_code: (member.profiles as any).invite_code,
        accepted: false
      }));

      const { error: insertError } = await supabase
        .from('friend_connections')
        .insert(friendRequests);

      if (insertError) throw insertError;

      toast.success(`Sent ${newTeammates.length} friend request${newTeammates.length > 1 ? 's' : ''} to teammates! 🎉`);
      fetchConnections();
    } catch (error) {
      console.error('Error adding teammates:', error);
      toast.error('Failed to add teammates as friends');
    } finally {
      setAddingTeammates(false);
    }
  };
  return <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
      <div className="bg-gradient-to-br from-blue-50/30 to-white dark:from-blue-900/5 dark:to-background p-6 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
            <UsersIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Friends & Competition</h1>
            <p className="text-muted-foreground">Connect with colleagues and compare performance</p>
          </div>
        </div>
      </div>

      <div className="grid gap-8">
        {/* Your Performance Summary */}
        {myStats && <Card className="group hover:shadow-xl transition-all duration-300 border-l-4 border-l-blue-500">
            <CardHeader className="bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-900/10">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                Your Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{myStats.today_cch.toFixed(1)}</p>
                  <p className="text-sm text-muted-foreground">Today's CCH</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{myStats.today_calls}</p>
                  <p className="text-sm text-muted-foreground">Today's Calls</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{myStats.today_appraisals}</p>
                  <p className="text-sm text-muted-foreground">Today's Appraisals</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                  <p className="text-3xl font-bold">🔥 {myStats.current_streak}</p>
                  <p className="text-sm text-muted-foreground">Day Streak</p>
                </div>
              </div>
              <Separator className="my-4" />
              <div className="flex items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-blue-100 dark:bg-blue-900/30">
                    <Phone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="font-semibold">{myStats.week_calls} calls this week</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-blue-100 dark:bg-blue-900/30">
                    <Home className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="font-semibold">{myStats.week_appraisals} appraisals this week</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-blue-600 dark:text-blue-400 font-bold text-lg">⚡ {myStats.week_cch.toFixed(1)} CCH</span>
                </div>
              </div>
            </CardContent>
          </Card>}

        {/* Friends Comparison */}
        {friendsStats.length > 0 && <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Your Friends &amp; Team-Mates</h2>
              <Badge variant="outline">{friendsStats.length} friends</Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {friendsStats.map(friend => <FriendStatsCard key={friend.user_id} friend={friend} myStats={myStats} />)}
            </div>
          </div>}

        {/* Global Leaderboard */}
        <FriendLeaderboard leaderboard={leaderboard} currentUserId={user?.id || ''} />

        {/* Manage Friends - Collapsible */}
        <Collapsible open={manageOpen} onOpenChange={setManageOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardTitle className="flex items-center justify-between">
                  <span>Manage Friends</span>
                  <Button variant="ghost" size="sm">
                    {manageOpen ? '−' : '+'}
                  </Button>
                </CardTitle>
                <CardDescription>
                  Share your code or add friends
                </CardDescription>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-6">
                {/* Your Invite Code */}
                <div>
                  <h3 className="font-semibold mb-2">Your Invite Code</h3>
                  <div className="flex gap-2">
                    <Input value={inviteCode} readOnly className="font-mono text-lg" />
                    <Button onClick={copyInviteCode} variant="outline">
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Add Friend */}
                <div>
                  <h3 className="font-semibold mb-2">Add a Friend</h3>
                  <form onSubmit={addFriend} className="flex gap-2">
                    <Input placeholder="Enter invite code" value={friendInviteCode} onChange={e => setFriendInviteCode(e.target.value)} className="font-mono" />
                    <Button type="submit" disabled={loading}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </form>
                </div>

                <Separator />

                {/* Add All Teammates */}
                {team && (
                  <div>
                    <h3 className="font-semibold mb-2">Quick Add Teammates</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Send friend requests to all your current teammates at once
                    </p>
                    <Button 
                      onClick={addAllTeammates} 
                      disabled={addingTeammates}
                      variant="outline"
                      className="w-full"
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      {addingTeammates ? 'Adding Teammates...' : 'Add All Teammates as Friends'}
                    </Button>
                  </div>
                )}

                <Separator />

                {/* Friend List */}
                <div>
                  <h3 className="font-semibold mb-2">Connected Friends & Requests</h3>
                  {friendConnections.length === 0 ? <p className="text-center text-muted-foreground py-4">
                      No friends yet. Share your invite code!
                    </p> : <div className="space-y-2">
                      {friendConnections.map(connection => <div key={connection.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={connection.friend.avatar_url || undefined} />
                              <AvatarFallback>{connection.friend.full_name[0]?.toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{connection.friend.full_name}</p>
                              <p className="text-sm text-muted-foreground">{connection.friend.email}</p>
                            </div>
                          </div>
                          
                          {connection.accepted ? <Badge variant="secondary">Connected</Badge> : connection.direction === 'sent' ? <Badge variant="outline">Pending</Badge> : <div className="flex gap-2">
                              <Button size="sm" onClick={() => approveFriendRequest(connection.id, connection.friend.id!)}>
                                <Check className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => rejectFriendRequest(connection.id)}>
                                <X className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>}
                        </div>)}
                    </div>}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    </div>;
};
export default Friends;