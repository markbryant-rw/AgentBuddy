import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  UserPlus,
  Check,
  Phone,
  Home,
  Calendar,
  Users,
  Building,
  MessageSquare,
  Share2,
  Clock,
  Target,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';
import { toast } from 'sonner';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import { SocialFeed } from '@/components/social/SocialFeed';
import { CreatePostForm } from '@/components/social/CreatePostForm';
import { WeeklyReflectionModal } from '@/components/social/WeeklyReflectionModal';

export default function Profile() {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [reflectionModalOpen, setReflectionModalOpen] = useState(false);

  const isOwnProfile = currentUser?.id === userId;

  // Check if it's Friday
  const isFriday = new Date().getDay() === 5;

  // Fetch user profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .eq('id', userId)
        .single();
      if (error) throw error;
      if (!data) throw new Error(`Profile ${userId} not found`);
      return data;
    },
    enabled: !!userId,
  });

  // Fetch user's team
  const { data: teamInfo } = useQuery({
    queryKey: ['user-team', userId],
    queryFn: async () => {
      const { data: teamMember, error } = await supabase
        .from('team_members')
        .select('team_id, teams(name, agency_id, agencies(name))')
        .eq('user_id', userId)
        .single();
      if (error) throw error;
      if (!teamMember) throw new Error(`Team membership for user ${userId} not found`);
      return teamMember;
    },
    enabled: !!userId,
  });

  // Fetch user stats (recent performance)
  const { data: stats } = useQuery({
    queryKey: ['user-stats', userId],
    queryFn: async () => {
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('kpi_entries')
        .select('kpi_type, value')
        .eq('user_id', userId)
        .gte('entry_date', weekAgo.toISOString().split('T')[0])
        .lte('entry_date', today.toISOString().split('T')[0]);

      if (error) throw error;

      // Aggregate stats
      const calls = data.filter((e) => e.kpi_type === 'calls').reduce((sum, e) => sum + e.value, 0);
      const appraisals = data.filter((e) => e.kpi_type === 'appraisals').reduce((sum, e) => sum + e.value, 0);
      const openHomes = data.filter((e) => e.kpi_type === 'open_homes').reduce((sum, e) => sum + e.value, 0);

      return { calls, appraisals, openHomes };
    },
    enabled: !!userId,
  });

  // Check friendship status
  const { data: friendStatus, refetch: refetchFriendship } = useQuery({
    queryKey: ['friendship-status', currentUser?.id, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('friend_connections')
        .select('accepted')
        .or(`and(user_id.eq.${currentUser?.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${currentUser?.id})`)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!currentUser && !!userId && currentUser.id !== userId,
  });

  const handleAddFriend = async () => {
    if (!currentUser || !userId) return;
    setIsAddingFriend(true);

    try {
      const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

      // Check if they're on the same team
      const { data: sameTeam } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', currentUser.id)
        .single();

      const { data: targetTeam } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', userId)
        .single();

      const isTeammate = sameTeam?.team_id === targetTeam?.team_id;

      // Insert friend connection
      const { error } = await supabase.from('friend_connections').insert({
        user_id: currentUser.id,
        friend_id: userId,
        invite_code: inviteCode,
        accepted: isTeammate,
      });

      if (error) throw error;

      // Send notification if not teammate
      if (!isTeammate) {
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'friend_request',
          title: 'New Friend Request',
          message: `${profile?.full_name || 'Someone'} wants to connect with you`,
          metadata: { from_user_id: currentUser.id },
        });
      }

      toast.success(isTeammate ? 'Friend added!' : 'Friend request sent!');
      refetchFriendship();
    } catch (error) {
      console.error('Error adding friend:', error);
      toast.error('Failed to send friend request');
    } finally {
      setIsAddingFriend(false);
    }
  };

  const isFriend = friendStatus?.accepted;
  const isPending = friendStatus && !friendStatus.accepted;

  if (profileLoading) {
    return (
      <div className="container mx-auto p-6">
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto p-6">
        <p>Profile not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8 max-w-5xl">
      {/* Profile Header */}
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar */}
            <Avatar className="h-24 w-24 border-4 border-border">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="text-2xl font-bold">
                {profile.full_name?.split(' ').map((n) => n[0]).join('') || '?'}
              </AvatarFallback>
            </Avatar>

            {/* Profile Info */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">{profile.full_name}</h1>
                {isFriend && (
                  <Badge variant="secondary" className="gap-1">
                    <Check className="h-3 w-3" />
                    Friends
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">{profile.email}</p>

              {teamInfo && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building className="h-4 w-4" />
                  <span>
                    {(teamInfo.teams && typeof teamInfo.teams === 'object' && 'agencies' in teamInfo.teams &&
                      teamInfo.teams.agencies && typeof teamInfo.teams.agencies === 'object' && 'name' in teamInfo.teams.agencies)
                      ? teamInfo.teams.agencies.name || 'Unknown Agency'
                      : 'Unknown Agency'}
                  </span>
                  <span>•</span>
                  <Users className="h-4 w-4" />
                  <span>
                    {(teamInfo.teams && typeof teamInfo.teams === 'object' && 'name' in teamInfo.teams)
                      ? teamInfo.teams.name || 'Unknown Team'
                      : 'Unknown Team'}
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            {isOwnProfile && (
              <Button 
                onClick={() => setReflectionModalOpen(true)}
                className={`gap-2 ${isFriday ? 'animate-pulse' : ''}`}
                variant={isFriday ? 'default' : 'outline'}
              >
                <Sparkles className="h-4 w-4" />
                {isFriday ? "It's Friday! Share Your Week" : "Write Weekly Reflection"}
              </Button>
            )}
            {!isOwnProfile && (
              <div className="flex gap-2">
                {!isFriend && !isPending && (
                  <Button onClick={handleAddFriend} disabled={isAddingFriend}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Friend
                  </Button>
                )}
                {isPending && (
                  <Button variant="outline" disabled>
                    <Clock className="h-4 w-4 mr-2" />
                    Pending
                  </Button>
                )}
                <Button variant="outline" onClick={() => navigate('/messages')}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Message
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-3 gap-4">
        <EnhancedCard category="performance" icon={Phone} title="Calls (7 days)">
          <div className="text-4xl font-bold text-blue-600">{stats?.calls || 0}</div>
        </EnhancedCard>
        <EnhancedCard category="performance" icon={Target} title="Appraisals (7 days)">
          <div className="text-4xl font-bold text-blue-600">{stats?.appraisals || 0}</div>
        </EnhancedCard>
        <EnhancedCard category="performance" icon={Home} title="Open Homes (7 days)">
          <div className="text-4xl font-bold text-blue-600">{stats?.openHomes || 0}</div>
        </EnhancedCard>
      </div>

      {/* Create Post Form - Only on own profile */}
      {isOwnProfile && <CreatePostForm />}

      {/* Social Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            {isOwnProfile ? "Your Posts & Updates" : `${profile?.full_name}'s Posts`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SocialFeed userId={userId} />
        </CardContent>
      </Card>

      {/* Weekly Reflection Modal */}
      <WeeklyReflectionModal 
        open={reflectionModalOpen} 
        onOpenChange={setReflectionModalOpen} 
      />
    </div>
  );
}
