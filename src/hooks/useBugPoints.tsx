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

  // Fetch leaderboard (top 10 users)
  const { data: leaderboard = [], isLoading: isLoadingLeaderboard } = useQuery({
    queryKey: ['bug-points-leaderboard'],
    queryFn: async () => {
      const { data: profiles, error } = await (supabase as any)
        .from('profiles')
        .select('id, full_name, avatar_url, total_bug_points')
        .gt('total_bug_points', 0)
        .order('total_bug_points', { ascending: false })
        .limit(10);

      if (error) throw error;

      return (profiles || []).map((profile: any) => ({
        ...profile,
        bugs_reported: 0,
        bugs_fixed: 0,
      }));
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
