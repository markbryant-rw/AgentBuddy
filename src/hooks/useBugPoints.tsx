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
  const { data: userPoints = [], isLoading: isLoadingPoints } = useQuery({
    queryKey: ['bug-points', userId],
    queryFn: async () => [],
    enabled: !!userId,
  });

  // Fetch leaderboard - calculate from actual bug reports data
  const { data: leaderboard = [], isLoading: isLoadingLeaderboard } = useQuery({
    queryKey: ['bug-points-leaderboard'],
    queryFn: async () => {
      // First, fetch all bug reports with user_id
      const { data: bugReports, error: bugError } = await supabase
        .from('bug_reports')
        .select('user_id, status');

      if (bugError) throw bugError;

      if (!bugReports || bugReports.length === 0) {
        return [];
      }

      // Aggregate by user
      const userStats: Record<string, { bugs_reported: number; bugs_fixed: number }> = {};
      
      bugReports.forEach((bug) => {
        if (!userStats[bug.user_id]) {
          userStats[bug.user_id] = { bugs_reported: 0, bugs_fixed: 0 };
        }
        userStats[bug.user_id].bugs_reported += 1;
        if (bug.status === 'fixed') {
          userStats[bug.user_id].bugs_fixed += 1;
        }
      });

      // Get user IDs with bugs
      const userIds = Object.keys(userStats);
      
      if (userIds.length === 0) {
        return [];
      }

      // Fetch profiles for these users
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      if (profileError) throw profileError;

      // Combine stats with profiles and calculate points
      const leaderboardEntries: LeaderboardEntry[] = (profiles || [])
        .map((profile) => ({
          id: profile.id,
          full_name: profile.full_name || 'Anonymous',
          avatar_url: profile.avatar_url,
          bugs_reported: userStats[profile.id]?.bugs_reported || 0,
          bugs_fixed: userStats[profile.id]?.bugs_fixed || 0,
          // 10 points per bug reported
          total_bug_points: (userStats[profile.id]?.bugs_reported || 0) * 10,
        }))
        .filter((entry) => entry.bugs_reported > 0)
        .sort((a, b) => b.total_bug_points - a.total_bug_points)
        .slice(0, 10);

      return leaderboardEntries;
    },
  });

  // Manual award bonus points (admin only)
  const awardBonusPoints = useMutation({
    mutationFn: async (params: any) => {
      throw new Error('Bug points system not yet implemented');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bug-points'] });
      toast.success('Bonus points awarded');
    },
    onError: () => toast.error('Failed to award points'),
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
