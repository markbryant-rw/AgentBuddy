import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useTeamStats } from '@/hooks/useTeamStats';
import { usePresence } from '@/hooks/usePresence';
import { PresenceDot } from './PresenceDot';
import { Users, Target, Crown, UserPlus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useState, useMemo, useCallback } from 'react';
import { MessageCircle } from 'lucide-react';
import { ConversationSheet } from './ConversationSheet';

export default function TeamsTab() {
  const { user } = useAuth();
  const { teamData, loading } = useTeamStats();
  const { allPresence } = usePresence();
  const { members: teamMembers } = useTeamMembers();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationOpen, setConversationOpen] = useState(false);
  const [recipientName, setRecipientName] = useState<string>('');

  const handleQuickAddTeammates = useCallback(async () => {
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
  }, [user, teamMembers]);

  const handleMessage = useCallback(async (memberId: string, memberName: string) => {
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
  }, [user]);

  if (loading) {
    return <div className="text-center py-8">Loading team data...</div>;
  }

  if (!teamData) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Team Found</h3>
          <p className="text-muted-foreground">
            You're not currently part of any team. Ask your office admin to add you to a team.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { team, members, teamCCH, goal, activeCount, totalCount } = teamData;
  const progressPercentage = goal ? Math.min((teamCCH / goal) * 100, 100) : 0;

  const sortedMembers = useMemo(() => {
    return [...(members || [])].sort((a, b) => b.week_cch - a.week_cch);
  }, [members]);
  const teamLeader = sortedMembers.find(m => m.access_level === 'admin');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {team.logo_url && (
                <Avatar className="h-16 w-16">
                  <AvatarImage src={team.logo_url} />
                  <AvatarFallback>{team.name?.[0]}</AvatarFallback>
                </Avatar>
              )}
              <div>
                <CardTitle className="text-2xl">{team.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {team.agency_name}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant="secondary" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Active {activeCount} of {totalCount}
              </Badge>
              {/* Quick Add Teammates Button */}
              {teamMembers && teamMembers.length > 1 && (
                <Button 
                  onClick={handleQuickAddTeammates} 
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  <UserPlus className="h-3 w-3 mr-1" />
                  Add All as Friends
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Team Leader */}
          {teamLeader && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
              <Crown className="h-5 w-5 text-yellow-500" />
              <Avatar className="h-10 w-10 relative">
                <AvatarImage src={teamLeader.avatar_url || ''} />
                <AvatarFallback>{teamLeader.full_name?.[0]}</AvatarFallback>
                <div className="absolute -bottom-1 -right-1">
                  <PresenceDot 
                    status={allPresence[teamLeader.id] as any || 'offline'} 
                    size="sm"
                  />
                </div>
              </Avatar>
              <div>
                <div className="font-semibold">{teamLeader.full_name}</div>
                <div className="text-xs text-muted-foreground">Team Leader</div>
              </div>
            </div>
          )}

          {/* Team Goal Progress */}
          {goal && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Weekly Goal</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {teamCCH.toFixed(1)} / {goal.toFixed(1)} CCH
                </span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
              <p className="text-xs text-muted-foreground text-center">
                {progressPercentage >= 100 
                  ? '🎉 Goal achieved!' 
                  : `${(goal - teamCCH).toFixed(1)} CCH to go`}
              </p>
            </div>
          )}

          {/* Team Stats Summary */}
          <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-muted/50">
            <div className="text-center">
              <div className="text-2xl font-bold">{teamCCH.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">Team CCH</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{(teamCCH / totalCount).toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">Avg per Member</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{totalCount}</div>
              <div className="text-xs text-muted-foreground">Team Members</div>
            </div>
          </div>

          {/* Team Members List - Always Visible */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg mb-3">Team Members</h3>
            {sortedMembers.map((member, index) => (
              <div 
                key={member.id} 
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
              >
                <div className="font-semibold text-muted-foreground min-w-[2rem]">
                  #{index + 1}
                </div>
                <Avatar className="h-10 w-10 relative">
                  <AvatarImage src={member.avatar_url || ''} />
                  <AvatarFallback>{member.full_name?.[0]}</AvatarFallback>
                  <div className="absolute -bottom-1 -right-1">
                    <PresenceDot 
                      status={allPresence[member.id] as any || 'offline'}
                      size="sm"
                    />
                  </div>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate flex items-center gap-2">
                    {member.full_name}
                    {member.access_level === 'admin' && (
                      <Crown className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {member.is_active_today ? (
                      <Badge variant="secondary" className="text-xs">Active Today</Badge>
                    ) : (
                      <span>Inactive today</span>
                    )}
                  </div>
                </div>
                <div className="text-right mr-3">
                  <div className="font-semibold">{member.week_cch.toFixed(1)} CCH</div>
                  <div className="text-xs text-muted-foreground">This Week</div>
                </div>
                {/* Message Button */}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleMessage(member.id, member.full_name)}
                  disabled={member.id === user?.id}
                  className="shrink-0"
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
