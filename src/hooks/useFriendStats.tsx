import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { calculateCCH } from '@/lib/cchCalculations';

interface FriendStats {
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  invite_code: string;
  today_calls: number;
  today_appraisals: number;
  today_open_homes: number;
  today_cch: number;
  week_calls: number;
  week_appraisals: number;
  week_open_homes: number;
  week_cch: number;
  current_streak: number;
  longest_streak: number;
  is_friend: boolean;
  is_starred?: boolean;
}

interface LeaderboardEntry extends FriendStats {
  rank: number;
  display_name: string;
}

export const useFriendStats = () => {
  const { user } = useAuth();
  const [myStats, setMyStats] = useState<FriendStats | null>(null);
  const [friendsStats, setFriendsStats] = useState<FriendStats[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const calculateStats = (kpiEntries: any[]): Partial<FriendStats> => {
    const today = new Date().toISOString().split('T')[0];
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const todayEntries = kpiEntries.filter(e => e.entry_date === today);
    const weekEntries = kpiEntries.filter(e => e.entry_date >= weekStartStr);

    const today_calls = todayEntries.find(e => e.kpi_type === 'calls')?.value || 0;
    const today_appraisals = todayEntries.find(e => e.kpi_type === 'appraisals')?.value || 0;
    const today_open_homes = todayEntries.find(e => e.kpi_type === 'open_homes')?.value || 0;

    const week_calls = weekEntries.filter(e => e.kpi_type === 'calls').reduce((sum, e) => sum + e.value, 0);
    const week_appraisals = weekEntries.filter(e => e.kpi_type === 'appraisals').reduce((sum, e) => sum + e.value, 0);
    const week_open_homes = weekEntries.filter(e => e.kpi_type === 'open_homes').reduce((sum, e) => sum + e.value, 0);

    const today_cch = calculateCCH(today_calls, today_appraisals, today_open_homes).total;
    const week_cch = calculateCCH(week_calls, week_appraisals, week_open_homes).total;

    return {
      today_calls,
      today_appraisals,
      today_open_homes,
      today_cch,
      week_calls,
      week_appraisals,
      week_open_homes,
      week_cch,
    };
  };

  const getStreakStats = (logEntries: any[]): { current_streak: number; longest_streak: number } => {
    if (!logEntries || logEntries.length === 0) {
      return { current_streak: 0, longest_streak: 0 };
    }

    const sortedLogs = [...logEntries].sort(
      (a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime()
    );

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let expectedDate = new Date();
    expectedDate.setHours(0, 0, 0, 0);

    for (const log of sortedLogs) {
      const logDate = new Date(log.log_date);
      logDate.setHours(0, 0, 0, 0);

      if (logDate.getTime() === expectedDate.getTime()) {
        tempStreak++;
        if (currentStreak === 0 || logDate.getTime() === new Date().setHours(0, 0, 0, 0)) {
          currentStreak = tempStreak;
        }
        expectedDate.setDate(expectedDate.getDate() - 1);
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 0;
        break;
      }
    }

    longestStreak = Math.max(longestStreak, tempStreak, currentStreak);
    return { current_streak: currentStreak, longest_streak: longestStreak };
  };

  const obfuscateName = (fullName: string): string => {
    const parts = fullName.trim().split(' ');
    if (parts.length < 2) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  };

  const fetchStats = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get friend IDs
      const { data: friendConnections } = await supabase
        .from('friend_connections')
        .select('user_id, friend_id, is_starred')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq('accepted', true);

      const friendIds = Array.from(
        new Set(
          friendConnections?.map(fc =>
            fc.user_id === user.id ? fc.friend_id : fc.user_id
          ) || []
        )
      );

      // Create a starred map for quick lookup
      const starredMap = new Map<string, boolean>();
      friendConnections?.forEach(fc => {
        const friendId = fc.user_id === user.id ? fc.friend_id : fc.user_id;
        starredMap.set(friendId, fc.is_starred || false);
      });

      // Fetch all user profiles (for leaderboard)
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, invite_code');

      // Fetch user preferences to respect privacy settings
      const { data: userPreferences } = await supabase
        .from('user_preferences')
        .select('user_id, leaderboard_participation');

      // Fetch KPI entries for user, friends, and all users (for leaderboard)
      const relevantUserIds = [user.id, ...friendIds];
      const { data: kpiEntries } = await supabase
        .from('kpi_entries')
        .select('user_id, kpi_type, value, entry_date')
        .gte('entry_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      // Fetch streak data for all users
      const { data: logEntries } = await supabase
        .from('daily_log_tracker')
        .select('user_id, log_date');

      // Create a map of privacy preferences
      const privacyMap = new Map<string, boolean>();
      userPreferences?.forEach(pref => {
        privacyMap.set(pref.user_id, pref.leaderboard_participation ?? true);
      });

      // Calculate stats for each user
      const userStatsMap = new Map<string, FriendStats>();

      allProfiles?.forEach(profile => {
        const userKpis = kpiEntries?.filter(e => e.user_id === profile.id) || [];
        const userLogs = logEntries?.filter(e => e.user_id === profile.id) || [];
        const stats = calculateStats(userKpis);
        const streakStats = getStreakStats(userLogs);

        userStatsMap.set(profile.id, {
          user_id: profile.id,
          full_name: profile.full_name || profile.email,
          email: profile.email,
          avatar_url: profile.avatar_url,
          invite_code: profile.invite_code || '',
          ...stats,
          ...streakStats,
          is_friend: friendIds.includes(profile.id) || profile.id === user.id,
          is_starred: starredMap.get(profile.id) || false,
        } as FriendStats);
      });

      // Set my stats
      const myUserStats = userStatsMap.get(user.id);
      if (myUserStats) {
        setMyStats(myUserStats);
      }

      // Set friends stats with additional deduplication by user_id
      const uniqueFriendIds = Array.from(new Set(friendIds));
      const friendsStatsData = uniqueFriendIds
        .map(id => userStatsMap.get(id))
        .filter((s): s is FriendStats => s !== undefined)
        .sort((a, b) => b.week_cch - a.week_cch);
      setFriendsStats(friendsStatsData);

      // Create leaderboard with all users, respecting privacy settings
      const leaderboardData = Array.from(userStatsMap.values())
        .filter(stats => {
          // Always include current user and friends
          if (stats.user_id === user.id || stats.is_friend) return true;
          // For others, check leaderboard participation (default true)
          return privacyMap.get(stats.user_id) !== false;
        })
        .sort((a, b) => b.week_cch - a.week_cch)
        .slice(0, 50)
        .map((stats, index) => ({
          ...stats,
          rank: index + 1,
          display_name: stats.is_friend ? stats.full_name : obfuscateName(stats.full_name),
        }));
      setLeaderboard(leaderboardData);

    } catch (error) {
      console.error('Error fetching friend stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  return {
    myStats,
    friendsStats,
    leaderboard,
    loading,
    refetch: fetchStats,
  };
};
