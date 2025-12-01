import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useOfficeStats } from '@/hooks/useOfficeStats';
import { Building2, Users, LogOut, Building } from 'lucide-react';
import { useState } from 'react';
import { OfficeTeamMemberGrid } from './OfficeTeamMemberGrid';
import { ConversationSheet } from './ConversationSheet';
import { JoinOfficeDialog } from './JoinOfficeDialog';
import { LeaveOfficeDialog } from './LeaveOfficeDialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function OfficesTab() {
  const { user } = useAuth();
  const { officeData, loading } = useOfficeStats();
  const [sortBy, setSortBy] = useState<'performance' | 'size' | 'activity'>('performance');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationOpen, setConversationOpen] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [joinOfficeOpen, setJoinOfficeOpen] = useState(false);
  const [leaveOfficeOpen, setLeaveOfficeOpen] = useState(false);
  const [friendConnections, setFriendConnections] = useState<any[]>([]);

  // Fetch friend connections
  useState(() => {
    if (user) {
      const fetchFriends = async () => {
        const { data: sent } = await supabase
          .from('friend_connections')
          .select('user_id, friend_id, accepted')
          .eq('user_id', user.id);

        const { data: received } = await supabase
          .from('friend_connections')
          .select('user_id, friend_id, accepted')
          .eq('friend_id', user.id);

        setFriendConnections([...(sent || []), ...(received || [])]);
      };
      fetchFriends();
    }
  });

  const handleMessage = async (memberId: string, memberName: string) => {
    if (!user) return;

    try {
      // Use the RPC function to get or create direct conversation
      const { data: convId, error } = await supabase.rpc(
        'get_or_create_direct_conversation',
        { 
          user1_id: user.id,
          user2_id: memberId 
        }
      );

      if (error) {
        console.error('Conversation error:', error);
        toast.error('Failed to create conversation');
        return;
      }

      setConversationId(convId);
      setRecipientName(memberName);
      setConversationOpen(true);
    } catch (err) {
      console.error('Message error:', err);
      toast.error('Failed to start conversation');
    }
  };

  const handleAddFriend = async (memberId: string) => {
    if (!user) return;

    const existing = friendConnections.find(
      fc => (fc.user_id === user.id && fc.friend_id === memberId) ||
            (fc.friend_id === user.id && fc.user_id === memberId)
    );

    if (existing) {
      if (existing.accepted) {
        toast.error('Already friends');
      } else {
        toast.error('Friend request pending');
      }
      return;
    }

    const inviteCode = Math.random().toString(36).substring(7);
    const { error } = await supabase
      .from('friend_connections')
      .insert({
        user_id: user.id,
        friend_id: memberId,
        invite_code: inviteCode,
        accepted: false,
      });

    if (error) {
      toast.error('Failed to send friend request');
      return;
    }

    toast.success('Friend request sent');

    // Refresh connections
    const { data: sent } = await supabase
      .from('friend_connections')
      .select('user_id, friend_id, accepted')
      .eq('user_id', user.id);

    const { data: received } = await supabase
      .from('friend_connections')
      .select('user_id, friend_id, accepted')
      .eq('friend_id', user.id);

    setFriendConnections([...(sent || []), ...(received || [])]);
  };

  const getFriendStatus = (memberId: string): 'none' | 'friends' | 'pending' => {
    if (!user) return 'none';
    
    const connection = friendConnections.find(
      fc => (fc.user_id === user.id && fc.friend_id === memberId) ||
            (fc.friend_id === user.id && fc.user_id === memberId)
    );

    if (!connection) return 'none';
    return connection.accepted ? 'friends' : 'pending';
  };

  if (loading) {
    return <div className="text-center py-8">Loading office data...</div>;
  }

  if (!officeData) {
    return (
      <>
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Office Found</h3>
            <p className="text-muted-foreground mb-4">
              You're not currently part of any office.
            </p>
            <Button onClick={() => setJoinOfficeOpen(true)}>
              <Building className="h-4 w-4 mr-2" />
              Find an Office
            </Button>
          </CardContent>
        </Card>
        
        {/* Always render dialogs even when no office data */}
        <JoinOfficeDialog open={joinOfficeOpen} onOpenChange={setJoinOfficeOpen} />
      </>
    );
  }

  const { agency, teams } = officeData;

  // Separate solo agents from teams
  const soloAgents = teams.filter(t => t.team_type === 'auto_solo');
  const actualTeams = teams.filter(t => t.team_type === 'standard' || t.team_type === 'department' || !t.team_type);

  // Sort teams based on selected criteria
  const sortedSoloAgents = [...soloAgents].sort((a, b) => {
    if (sortBy === 'performance') return b.avgCCH - a.avgCCH;
    if (sortBy === 'size') return b.memberCount - a.memberCount;
    return b.teamCCH - a.teamCCH; // activity
  });

  const sortedTeams = [...actualTeams].sort((a, b) => {
    if (sortBy === 'performance') return b.avgCCH - a.avgCCH;
    if (sortBy === 'size') return b.memberCount - a.memberCount;
    return b.teamCCH - a.teamCCH; // activity
  });

  return (
    <div className="space-y-6">
      {/* Office Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Building2 className="h-12 w-12 text-primary" />
              <div>
                <CardTitle className="text-2xl">{agency.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {soloAgents.length} Independent Agent{soloAgents.length !== 1 ? 's' : ''} • {actualTeams.length} Team{actualTeams.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setJoinOfficeOpen(true)}>
                <Building className="h-4 w-4 mr-2" />
                Switch Office
              </Button>
              <Button variant="outline" onClick={() => setLeaveOfficeOpen(true)}>
                <LogOut className="h-4 w-4 mr-2" />
                Leave Office
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Sort Filter */}
      <div className="flex items-center justify-end">
        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="performance">Performance</SelectItem>
            <SelectItem value="size">Size</SelectItem>
            <SelectItem value="activity">Activity</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Independent Agents Section */}
      {soloAgents.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            Independent Agents ({soloAgents.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedSoloAgents.map((agent, index) => (
              <Card key={agent.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <h3 className="font-semibold text-lg">{agent.name}</h3>
                        <div className="text-sm text-muted-foreground">
                          Independent Agent
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary">#{index + 1}</Badge>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-1 gap-4 p-3 rounded-lg bg-muted/30">
                    <div>
                      <div className="text-2xl font-bold">{agent.avgCCH.toFixed(1)}</div>
                      <div className="text-xs text-muted-foreground">Weekly CCH</div>
                    </div>
                  </div>

                  {/* Member Card */}
                  {agent.members && agent.members.length > 0 && (
                    <OfficeTeamMemberGrid
                      members={agent.members}
                      currentUserId={user?.id}
                      getFriendStatus={getFriendStatus}
                      onMessage={handleMessage}
                      onAddFriend={handleAddFriend}
                    />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Teams Section */}
      {actualTeams.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            Teams ({actualTeams.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedTeams.map((team, index) => (
              <Card key={team.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {team.logo_url && (
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={team.logo_url} />
                          <AvatarFallback>{team.name?.[0]}</AvatarFallback>
                        </Avatar>
                      )}
                      <div>
                        <h3 className="font-semibold text-lg">{team.name}</h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>{team.memberCount} members</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary">#{index + 1}</Badge>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-muted/30">
                    <div>
                      <div className="text-2xl font-bold">{team.avgCCH.toFixed(1)}</div>
                      <div className="text-xs text-muted-foreground">Avg CCH / Member</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{team.teamCCH.toFixed(1)}</div>
                      <div className="text-xs text-muted-foreground">Team CCH</div>
                    </div>
                  </div>

                  {/* Members Grid */}
                  {team.members && team.members.length > 0 && (
                    <OfficeTeamMemberGrid
                      members={team.members}
                      currentUserId={user?.id}
                      getFriendStatus={getFriendStatus}
                      onMessage={handleMessage}
                      onAddFriend={handleAddFriend}
                    />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {teams.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Teams Found</h3>
            <p className="text-muted-foreground">
              There are currently no teams in your office.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <JoinOfficeDialog open={joinOfficeOpen} onOpenChange={setJoinOfficeOpen} />
      <LeaveOfficeDialog 
        open={leaveOfficeOpen} 
        onOpenChange={setLeaveOfficeOpen}
        officeName={agency.name}
      />
      {conversationOpen && conversationId && (
        <ConversationSheet
          conversationId={conversationId}
          open={conversationOpen}
          onOpenChange={setConversationOpen}
          recipientName={recipientName}
        />
      )}
    </div>
  );
}
