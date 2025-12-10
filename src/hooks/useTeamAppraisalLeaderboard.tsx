import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { startOfQuarter, endOfQuarter } from 'date-fns';

interface LeaderboardEntry {
  userId: string;
  name: string;
  avatar: string | null;
  appraisalCount: number;
  rank: number;
}

interface LeaderboardData {
  entries: LeaderboardEntry[];
  maxCount: number;
  currentUserRank: number | null;
  isLoading: boolean;
  shouldShow: boolean;
}

export const useTeamAppraisalLeaderboard = () => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['team-appraisal-leaderboard', user?.id],
    queryFn: async (): Promise<{ entries: LeaderboardEntry[]; maxCount: number; shouldShow: boolean }> => {
      if (!user?.id) return { entries: [], maxCount: 0, shouldShow: false };

      // Get user's team
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!teamMember?.team_id) return { entries: [], maxCount: 0, shouldShow: false };

      // Get all team members
      const { data: teamMembers } = await supabase
        .from('team_members')
        .select(`
          user_id,
          profiles!team_members_user_id_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('team_id', teamMember.team_id);

      if (!teamMembers?.length) return { entries: [], maxCount: 0, shouldShow: false };

      // Get user roles for team members - filter to salesperson and team_leader only
      const userIds = teamMembers.map((tm) => tm.user_id);
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds)
        .in('role', ['salesperson', 'team_leader']);

      // Get unique user IDs that have salesperson or team_leader roles
      const qualifiedUserIds = new Set(userRoles?.map((ur) => ur.user_id) || []);

      // Filter team members to only those with qualifying roles
      const qualifiedMembers = teamMembers.filter((tm) => qualifiedUserIds.has(tm.user_id));

      // Don't show leaderboard if only 1 qualifying member
      if (qualifiedMembers.length <= 1) {
        return { entries: [], maxCount: 0, shouldShow: false };
      }

      // Get current quarter dates
      const now = new Date();
      const quarterStart = startOfQuarter(now);
      const quarterEnd = endOfQuarter(now);

      // Get appraisal counts for each team member
      const { data: appraisals } = await supabase
        .from('logged_appraisals')
        .select('agent_id')
        .eq('team_id', teamMember.team_id)
        .in('stage', ['MAP', 'LAP'])
        .gte('appraisal_date', quarterStart.toISOString().split('T')[0])
        .lte('appraisal_date', quarterEnd.toISOString().split('T')[0]);

      // Count appraisals per agent
      const countsByAgent: Record<string, number> = {};
      appraisals?.forEach((a) => {
        if (a.agent_id) {
          countsByAgent[a.agent_id] = (countsByAgent[a.agent_id] || 0) + 1;
        }
      });

      // Build leaderboard entries from qualified members only
      const entries: LeaderboardEntry[] = qualifiedMembers
        .map((tm) => {
          const profile = tm.profiles as any;
          return {
            userId: tm.user_id,
            name: profile?.full_name || 'Unknown',
            avatar: profile?.avatar_url || null,
            appraisalCount: countsByAgent[tm.user_id] || 0,
            rank: 0,
          };
        })
        .sort((a, b) => b.appraisalCount - a.appraisalCount);

      // Assign ranks
      entries.forEach((entry, index) => {
        entry.rank = index + 1;
      });

      const maxCount = entries.length > 0 ? entries[0].appraisalCount : 0;

      return { entries, maxCount, shouldShow: true };
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const currentUserRank = data?.entries.find((e) => e.userId === user?.id)?.rank || null;

  return {
    entries: data?.entries || [],
    maxCount: data?.maxCount || 0,
    currentUserRank,
    isLoading,
    shouldShow: data?.shouldShow ?? false,
  } as LeaderboardData;
};
