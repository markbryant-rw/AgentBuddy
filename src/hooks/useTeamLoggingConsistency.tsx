import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { toast } from 'sonner';

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

// Stubbed hook - daily_log_tracker table not yet implemented
export const useTeamLoggingConsistency = () => {
  const { user } = useAuth();
  const { team } = useTeam();

  return useQuery({
    queryKey: ['team-logging-consistency', team?.id],
    queryFn: async (): Promise<LoggingConsistencyEntry[]> => {
      // Table not implemented - return empty array
      toast.info('Logging consistency tracking coming soon');
      return [];
    },
    enabled: !!user && !!team,
    staleTime: 5 * 60 * 1000,
  });
};