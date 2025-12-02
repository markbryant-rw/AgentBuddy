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

      // Stub: user_preferences and daily_log_tracker tables do not exist
      console.log('useFriendStats: Stubbed - returning default empty stats');
      
      setMyStats({
        user_id: user.id,
        full_name: user.email || '',
        email: user.email || '',
        avatar_url: null,
        invite_code: '',
        today_calls: 0,
        today_appraisals: 0,
        today_open_homes: 0,
        today_cch: 0,
        week_calls: 0,
        week_appraisals: 0,
        week_open_homes: 0,
        week_cch: 0,
        current_streak: 0,
        longest_streak: 0,
        is_friend: true,
        is_starred: false,
      });
      
      setFriendsStats([]);
      setLeaderboard([]);

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
