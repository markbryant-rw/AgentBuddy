import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BugPoint {
  id: string;
  user_id: string;
  bug_report_id: string | null;
  points_awarded: number;
  points_reason: string;
  awarded_at: string;
  awarded_by: string | null;
}

interface LeaderboardEntry {
  id: string;
  full_name: string;
  avatar_url: string | null;
  total_bug_points: number;
  bugs_reported: number;
  bugs_fixed: number;
}

export const useBugPoints = (userId?: string) => {
  const queryClient = useQueryClient();

  // Fetch user's bug points history
  const { data: userPoints, isLoading: isLoadingPoints } = useQuery({
    queryKey: ['bug-points', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('user_bug_points')
        .select('*')
        .eq('user_id', userId)
        .order('awarded_at', { ascending: false });

      if (error) throw error;
      return data as BugPoint[];
    },
    enabled: !!userId,
  });

  // Fetch leaderboard (top 10 users)
  const { data: leaderboard, isLoading: isLoadingLeaderboard } = useQuery({
    queryKey: ['bug-points-leaderboard'],
    queryFn: async () => {
      // Get profiles with their total points
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, total_bug_points')
        .gt('total_bug_points', 0)
        .order('total_bug_points', { ascending: false })
        .limit(10);

      if (profilesError) throw profilesError;

      // Get bug counts for each user
      const leaderboardData = await Promise.all(
        profiles.map(async (profile) => {
          const { count: bugsReported } = await supabase
            .from('bug_reports')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id);

          const { count: bugsFixed } = await supabase
            .from('user_bug_points')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id)
            .eq('points_reason', 'bug_fixed');

          return {
            ...profile,
            bugs_reported: bugsReported || 0,
            bugs_fixed: bugsFixed || 0,
          };
        })
      );

      return leaderboardData as LeaderboardEntry[];
    },
  });

  // Manual award bonus points (admin only)
  const awardBonusPoints = useMutation({
    mutationFn: async ({
      userId,
      bugReportId,
      points,
      reason,
    }: {
      userId: string;
      bugReportId: string;
      points: number;
      reason: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('award_bug_points', {
        p_user_id: userId,
        p_bug_report_id: bugReportId,
        p_points: points,
        p_reason: reason,
        p_awarded_by: user.id,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bug-points'] });
      queryClient.invalidateQueries({ queryKey: ['bug-points-leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      
      toast.success(`🎉 Awarded ${variables.points} bonus points!`);
    },
    onError: (error) => {
      console.error('Error awarding bonus points:', error);
      toast.error('Failed to award bonus points');
    },
  });

  return {
    userPoints,
    isLoadingPoints,
    leaderboard,
    isLoadingLeaderboard,
    awardBonusPoints: awardBonusPoints.mutate,
    isAwardingPoints: awardBonusPoints.isPending,
  };
};

// Achievement definitions
export const ACHIEVEMENTS = [
  { id: 'first_bug', name: 'First Bug', icon: '🐛', points: 10, description: 'Report your first bug' },
  { id: 'bug_hunter', name: 'Bug Hunter', icon: '🔍', points: 100, description: 'Report 10 bugs' },
  { id: 'quick_reporter', name: 'Quick Reporter', icon: '⚡', points: 25, description: 'Report a bug within 1 hour of discovery' },
  { id: 'accuracy_master', name: 'Accuracy Master', icon: '🎯', points: 150, description: '5 bugs verified in a row' },
  { id: 'bug_slayer', name: 'Bug Slayer', icon: '🏆', points: 500, description: 'Report 50 bugs' },
  { id: 'legendary', name: 'Legendary', icon: '💎', points: 1000, description: 'Report 100 bugs' },
];
