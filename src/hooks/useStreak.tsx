import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { isBusinessDay, getPreviousBusinessDay } from '@/lib/cchCalculations';
import { format, parseISO } from 'date-fns';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastLoggedDate: string | null;
  loading: boolean;
}

export const useStreak = () => {
  const { user } = useAuth();
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    lastLoggedDate: null,
    loading: true,
  });

  const calculateStreak = (logs: Array<{ log_date: string }>) => {
    if (logs.length === 0) return { current: 0, longest: 0 };

    // Sort by date descending
    const sortedLogs = [...logs].sort((a, b) => 
      new Date(b.log_date).getTime() - new Date(a.log_date).getTime()
    );

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let expectedDate = new Date();

    // Calculate current streak
    for (let i = 0; i < sortedLogs.length; i++) {
      const logDate = parseISO(sortedLogs[i].log_date);
      const expectedDateStr = format(expectedDate, 'yyyy-MM-dd');
      const logDateStr = format(logDate, 'yyyy-MM-dd');

      if (logDateStr === expectedDateStr) {
        if (i === 0 || currentStreak > 0) {
          currentStreak++;
        }
        expectedDate = getPreviousBusinessDay(expectedDate);
      } else {
        break;
      }
    }

    // Calculate longest streak
    let prevDate: Date | null = null;
    for (const log of sortedLogs) {
      const logDate = parseISO(log.log_date);
      
      if (prevDate === null) {
        tempStreak = 1;
      } else {
        const expectedPrevious = getPreviousBusinessDay(prevDate);
        const expectedStr = format(expectedPrevious, 'yyyy-MM-dd');
        const logStr = format(logDate, 'yyyy-MM-dd');
        
        if (logStr === expectedStr) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
      
      prevDate = logDate;
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    return { current: currentStreak, longest: longestStreak };
  };

  const fetchStreakData = useCallback(async () => {
    if (!user) {
      setStreakData({
        currentStreak: 0,
        longestStreak: 0,
        lastLoggedDate: null,
        loading: false,
      });
      return;
    }

    try {
      const { data: logs } = await supabase
        .from('daily_log_tracker')
        .select('log_date')
        .eq('user_id', user.id)
        .eq('is_business_day', true)
        .order('log_date', { ascending: false });

      const streaks = calculateStreak(logs || []);
      const lastLogged = logs && logs.length > 0 ? logs[0].log_date : null;

      setStreakData({
        currentStreak: streaks.current,
        longestStreak: streaks.longest,
        lastLoggedDate: lastLogged,
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching streak data:', error);
      setStreakData({
        currentStreak: 0,
        longestStreak: 0,
        lastLoggedDate: null,
        loading: false,
      });
    }
  }, [user]);

  const recordLog = async () => {
    if (!user) return;

    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const isBusDay = isBusinessDay(today);

    try {
      await supabase.from('daily_log_tracker').upsert({
        user_id: user.id,
        log_date: todayStr,
        is_business_day: isBusDay,
        logged_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,log_date'
      });

      await fetchStreakData();
      return streakData.currentStreak;
    } catch (error) {
      console.error('Error recording log:', error);
      return 0;
    }
  };

  useEffect(() => {
    fetchStreakData();
  }, [user, fetchStreakData]);

  return { streakData, recordLog, refetch: fetchStreakData };
};
