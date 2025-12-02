import { useQuery } from '@tanstack/react-query';

export interface CommunityAnalytics {
  reflectionCompletionRate: number;
  totalPosts: number;
  totalReactions: number;
  totalComments: number;
  moodDistribution: { mood: string; count: number }[];
  weeklyReflectionTrend: { week: string; count: number; rate: number }[];
  engagementByUser: { userId: string; userName: string; postCount: number; reactionCount: number }[];
  postTypeDistribution: { type: string; count: number }[];
  moodTrend: { date: string; mood: string; count: number }[];
}

export function useCommunityAnalytics(teamId: string | null, weeksBack: number = 8) {
  return useQuery({
    queryKey: ['community-analytics', teamId, weeksBack],
    queryFn: async (): Promise<CommunityAnalytics> => {
      // Stub: social_posts features not fully implemented yet
      return {
        reflectionCompletionRate: 0,
        totalPosts: 0,
        totalReactions: 0,
        totalComments: 0,
        moodDistribution: [],
        weeklyReflectionTrend: [],
        engagementByUser: [],
        postTypeDistribution: [],
        moodTrend: [],
      };
    },
    enabled: !!teamId,
  });
}
