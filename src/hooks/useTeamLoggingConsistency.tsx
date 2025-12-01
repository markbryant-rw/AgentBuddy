import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { getBusinessDaysBetween } from '@/lib/cchCalculations';
import { startOfMonth, endOfMonth } from 'date-fns';

export interface LoggingConsistencyEntry {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  daysLogged: number;
  totalBusinessDays: number;
  consistencyPercentage: number;
  currentStreak: number;
  rank: number;
}

export const useTeamLoggingConsistency = () => {
  const { user } = useAuth();
  const { team } = useTeam();

  return useQuery({
    queryKey: ['team-logging-consistency', team?.id, new Date().getMonth()],
    queryFn: async (): Promise<LoggingConsistencyEntry[]> => {
      if (!user || !team) return [];

      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const totalBusinessDays = getBusinessDaysBetween(monthStart, monthEnd);

      // Get all team members
      const { data: teamMembers, error: teamError } = await supabase
        .from('team_members')
        .select('user_id, profiles!inner(full_name, avatar_url)')
        .eq('team_id', team.id);

      if (teamError) throw teamError;
      if (!teamMembers || teamMembers.length === 0) return [];

      const userIds = teamMembers.map(m => m.user_id);

      // Get all logs for team members this month
      const { data: logs, error: logsError } = await supabase
        .from('daily_log_tracker')
        .select('user_id, log_date, is_business_day')
        .in('user_id', userIds)
        .gte('log_date', monthStart.toISOString().split('T')[0])
        .lte('log_date', monthEnd.toISOString().split('T')[0])
        .eq('is_business_day', true);

      if (logsError) throw logsError;

      // Calculate streaks for each user
      const streakMap = new Map<string, number>();
      
      for (const userId of userIds) {
        const userLogs = (logs || [])
          .filter(l => l.user_id === userId)
          .sort((a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime());

        let streak = 0;
        let expectedDate = new Date();
        
        for (const log of userLogs) {
          const logDate = new Date(log.log_date);
          const expectedStr = expectedDate.toISOString().split('T')[0];
          const logStr = logDate.toISOString().split('T')[0];
          
          if (logStr === expectedStr) {
            streak++;
            expectedDate.setDate(expectedDate.getDate() - 1);
            while (expectedDate.getDay() === 0 || expectedDate.getDay() === 6) {
              expectedDate.setDate(expectedDate.getDate() - 1);
            }
          } else {
            break;
          }
        }
        
        streakMap.set(userId, streak);
      }

      // Build consistency entries
      const entries: LoggingConsistencyEntry[] = teamMembers.map(member => {
        const daysLogged = (logs || []).filter(l => l.user_id === member.user_id).length;
        const consistencyPercentage = totalBusinessDays > 0 
          ? Math.round((daysLogged / totalBusinessDays) * 100) 
          : 0;
        const currentStreak = streakMap.get(member.user_id) || 0;

        return {
          userId: member.user_id,
          fullName: (member.profiles as any)?.full_name || 'Unknown',
          avatarUrl: (member.profiles as any)?.avatar_url || null,
          daysLogged,
          totalBusinessDays,
          consistencyPercentage,
          currentStreak,
          rank: 0, // Will be set after sorting
        };
      });

      // Sort by consistency percentage (desc), then by streak (desc)
      entries.sort((a, b) => {
        if (b.consistencyPercentage !== a.consistencyPercentage) {
          return b.consistencyPercentage - a.consistencyPercentage;
        }
        return b.currentStreak - a.currentStreak;
      });

      // Assign ranks
      entries.forEach((entry, index) => {
        entry.rank = index + 1;
      });

      return entries;
    },
    enabled: !!user && !!team,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
