import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

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

  const fetchStreakData = useCallback(async () => {
    // Feature not yet implemented - return defaults
    setStreakData({
      currentStreak: 0,
      longestStreak: 0,
      lastLoggedDate: null,
      loading: false,
    });
  }, []);

  const recordLog = async () => {
    // Not implemented
    return 0;
  };

  useEffect(() => {
    if (user) {
      fetchStreakData();
    } else {
      setStreakData({
        currentStreak: 0,
        longestStreak: 0,
        lastLoggedDate: null,
        loading: false,
      });
    }
  }, [user, fetchStreakData]);

  return { streakData, recordLog, refetch: fetchStreakData };
};
