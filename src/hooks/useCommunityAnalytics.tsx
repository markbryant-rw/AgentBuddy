import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, subWeeks, format } from 'date-fns';

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
      const startDate = subWeeks(startOfWeek(new Date()), weeksBack);

      // Get team member count
      const { data: teamMembers } = await supabase
        .from('profiles')
        .select('id')
        .eq('primary_team_id', teamId || '');

      const teamMemberCount = teamMembers?.length || 1;

      // Get weekly reflection completion for current week
      const weekStart = startOfWeek(new Date());
      const { data: weeklyReflections } = await supabase
        .from('social_posts')
        .select('user_id')
        .eq('post_type', 'weekly_reflection')
        .gte('created_at', weekStart.toISOString());

      const reflectionCompletionRate = teamMemberCount > 0 
        ? (weeklyReflections?.length || 0) / teamMemberCount * 100 
        : 0;

      // Get all posts in date range with reaction and comment counts
      const { data: posts } = await supabase
        .from('social_posts')
        .select(`
          *,
          profiles!social_posts_user_id_fkey(display_name),
          post_reactions(count),
          post_comments(count)
        `)
        .gte('created_at', startDate.toISOString());

      const totalPosts = posts?.length || 0;
      
      // Calculate totals from aggregated data
      const totalReactions = posts?.reduce((sum, post: any) => {
        const reactionCount = post.post_reactions?.[0]?.count || 0;
        return sum + reactionCount;
      }, 0) || 0;
      
      const totalComments = posts?.reduce((sum, post: any) => {
        const commentCount = post.post_comments?.[0]?.count || 0;
        return sum + commentCount;
      }, 0) || 0;

      // Mood distribution
      const moodMap = new Map<string, number>();
      posts?.forEach(post => {
        if (post.mood) {
          moodMap.set(post.mood, (moodMap.get(post.mood) || 0) + 1);
        }
      });
      const moodDistribution = Array.from(moodMap.entries()).map(([mood, count]) => ({ mood, count }));

      // Weekly reflection trend (last N weeks)
      const weeklyReflectionTrend = [];
      for (let i = 0; i < weeksBack; i++) {
        const weekStartDate = subWeeks(startOfWeek(new Date()), i);
        const weekEndDate = startOfWeek(new Date(weekStartDate));
        weekEndDate.setDate(weekEndDate.getDate() + 7);

        const { data: weekReflections } = await supabase
          .from('social_posts')
          .select('id')
          .eq('post_type', 'weekly_reflection')
          .gte('created_at', weekStartDate.toISOString())
          .lt('created_at', weekEndDate.toISOString());

        const count = weekReflections?.length || 0;
        const rate = teamMemberCount > 0 ? (count / teamMemberCount) * 100 : 0;

        weeklyReflectionTrend.unshift({
          week: format(weekStartDate, 'MMM d'),
          count,
          rate,
        });
      }

      // Engagement by user
      const userEngagementMap = new Map<string, { postCount: number; reactionCount: number; userName: string }>();
      
      posts?.forEach((post: any) => {
        const userId = post.user_id;
        if (!userEngagementMap.has(userId)) {
          userEngagementMap.set(userId, { 
            postCount: 0, 
            reactionCount: 0,
            userName: post.profiles?.display_name || 'Unknown User'
          });
        }
        const userData = userEngagementMap.get(userId)!;
        userData.postCount++;
        const reactionCount = post.post_reactions?.[0]?.count || 0;
        userData.reactionCount += reactionCount;
      });

      const engagementByUser = Array.from(userEngagementMap.entries())
        .map(([userId, data]) => ({
          userId,
          userName: data.userName,
          postCount: data.postCount,
          reactionCount: data.reactionCount,
        }))
        .sort((a, b) => b.postCount - a.postCount)
        .slice(0, 10);

      // Post type distribution
      const typeMap = new Map<string, number>();
      posts?.forEach(post => {
        const type = post.post_type || 'update';
        typeMap.set(type, (typeMap.get(type) || 0) + 1);
      });
      const postTypeDistribution = Array.from(typeMap.entries()).map(([type, count]) => ({ type, count }));

      // Mood trend over time (weekly aggregation)
      const moodTrendMap = new Map<string, Map<string, number>>();
      posts?.forEach(post => {
        if (post.mood) {
          const weekKey = format(startOfWeek(new Date(post.created_at)), 'MMM d');
          if (!moodTrendMap.has(weekKey)) {
            moodTrendMap.set(weekKey, new Map());
          }
          const weekMoods = moodTrendMap.get(weekKey)!;
          weekMoods.set(post.mood, (weekMoods.get(post.mood) || 0) + 1);
        }
      });

      const moodTrend: { date: string; mood: string; count: number }[] = [];
      moodTrendMap.forEach((moods, date) => {
        moods.forEach((count, mood) => {
          moodTrend.push({ date, mood, count });
        });
      });

      return {
        reflectionCompletionRate,
        totalPosts,
        totalReactions,
        totalComments,
        moodDistribution,
        weeklyReflectionTrend,
        engagementByUser,
        postTypeDistribution,
        moodTrend,
      };
    },
    enabled: !!teamId,
  });
}
