import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export type AchievementType = 
  | '5-day-streak' | '10-day-streak' | '30-day-streak' | '100-day-streak'
  | 'target-master' | 'improver' | 'consistent' | 'top-performer'
  | 'personal-best' | 'overachiever';

interface Achievement {
  id: string;
  user_id: string;
  achievement_type: AchievementType;
  earned_at: string;
  metadata?: any;
}

const ACHIEVEMENT_CONFIG: Record<AchievementType, { icon: string; title: string; description: string; rarity?: string }> = {
  '5-day-streak': { icon: '🔥', title: '5-Day Streak', description: '5 consecutive business days logged' },
  '10-day-streak': { icon: '🔥🔥', title: '10-Day Streak', description: '10 consecutive business days logged' },
  '30-day-streak': { icon: '🔥🔥🔥', title: '30-Day Streak', description: '30 consecutive business days logged', rarity: 'rare' },
  '100-day-streak': { icon: '💎', title: '100-Day Streak', description: '100 consecutive business days logged', rarity: 'legendary' },
  'target-master': { icon: '🎯', title: 'Target Master', description: 'Hit weekly target 4 weeks in a row', rarity: 'rare' },
  'improver': { icon: '📈', title: 'Improver', description: '20% increase in CCH month-over-month' },
  'consistent': { icon: '⭐', title: 'Consistent', description: 'No missed logging days in a month' },
  'top-performer': { icon: '👑', title: 'Top Performer', description: '#1 in team for the week', rarity: 'rare' },
  'personal-best': { icon: '💪', title: 'Personal Best', description: 'New record for daily CCH' },
  'overachiever': { icon: '🚀', title: 'Overachiever', description: '150% of weekly target', rarity: 'rare' },
};

export function useAchievements() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: achievements = [], isLoading } = useQuery({
    queryKey: ['achievements', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_achievements' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false });

      if (error) throw error;
      return (data as unknown) as Achievement[];
    },
    enabled: !!user,
  });

  const unlockAchievement = useMutation({
    mutationFn: async ({ type, metadata }: { type: AchievementType; metadata?: any }) => {
      if (!user) throw new Error('Not authenticated');

      // Check if already earned
      const existing = achievements.find(a => a.achievement_type === type);
      if (existing) return existing;

      const { data, error } = await supabase
        .from('user_achievements' as any)
        .insert({
          user_id: user.id,
          achievement_type: type,
          metadata,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['achievements', user?.id] });
      const config = ACHIEVEMENT_CONFIG[variables.type];
      
      // Show toast notification
      toast.success(`${config.icon} Achievement Unlocked: ${config.title}`, {
        description: config.description,
      });

      // Create achievement auto-post
      const { useSocialPreferences } = await import('./useSocialPreferences');
      const { useCreatePost } = await import('./useSocialPosts');
      
      // Get user preferences for default visibility
      const { data: profile } = await supabase
        .from('profiles')
        .select('social_preferences')
        .eq('id', user?.id || '')
        .single();

      const defaultVisibility = (profile?.social_preferences &&
        typeof profile.social_preferences === 'object' &&
        'defaultPostVisibility' in profile.social_preferences)
        ? profile.social_preferences.defaultPostVisibility || 'public'
        : 'public';

      // Create the achievement post
      const achievementMessages: Record<AchievementType, string> = {
        '5-day-streak': '🔥 5 days of consistency! Just hit my 5-day logging streak!',
        '10-day-streak': '🔥🔥 Double digits! 10 consecutive business days logged and going strong!',
        '30-day-streak': '🔥🔥🔥 30 days of consistency! A full month of daily logging - this is becoming a habit!',
        '100-day-streak': '💎 Legendary 100-day streak! This is what dedication looks like. 100 consecutive business days!',
        'target-master': '🎯 Target Master unlocked! Hit my weekly targets 4 weeks in a row!',
        'improver': '📈 Improver badge earned! 20% increase in CCH month-over-month. Growth mindset in action!',
        'consistent': '⭐ Consistency is key! No missed logging days this entire month!',
        'top-performer': '👑 Top Performer! #1 on the team this week. Hard work pays off!',
        'personal-best': '💪 New personal record! Just set my highest daily CCH ever!',
        'overachiever': '🚀 Overachiever status unlocked! Hit 150% of my weekly target!',
      };

      await supabase
        .from('social_posts' as any)
        .insert({
          user_id: user?.id,
          content: achievementMessages[variables.type],
          post_type: 'achievement',
          visibility: defaultVisibility,
          metadata: { achievement_type: variables.type, ...variables.metadata },
        });

      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
    },
  });

  const checkNewAchievements = async (context: {
    streak: number;
    todayCCH: number;
    weeklyCCH: number;
    weeklyTarget: number;
    isTeamTop?: boolean;
  }) => {
    const toUnlock: AchievementType[] = [];

    // Streak achievements
    if (context.streak >= 100 && !achievements.find(a => a.achievement_type === '100-day-streak')) {
      toUnlock.push('100-day-streak');
    } else if (context.streak >= 30 && !achievements.find(a => a.achievement_type === '30-day-streak')) {
      toUnlock.push('30-day-streak');
    } else if (context.streak >= 10 && !achievements.find(a => a.achievement_type === '10-day-streak')) {
      toUnlock.push('10-day-streak');
    } else if (context.streak >= 5 && !achievements.find(a => a.achievement_type === '5-day-streak')) {
      toUnlock.push('5-day-streak');
    }

    // Overachiever
    if (context.weeklyTarget > 0 && (context.weeklyCCH / context.weeklyTarget) >= 1.5) {
      if (!achievements.find(a => a.achievement_type === 'overachiever')) {
        toUnlock.push('overachiever');
      }
    }

    // Top performer
    if (context.isTeamTop && !achievements.find(a => a.achievement_type === 'top-performer')) {
      toUnlock.push('top-performer');
    }

    // Unlock all new achievements
    for (const type of toUnlock) {
      await unlockAchievement.mutateAsync({ type, metadata: context });
    }

    return toUnlock;
  };

  const getNextMilestones = () => {
    const milestones: Array<{ type: AchievementType; progress: number; total: number }> = [];
    
    // This would require additional context about current stats
    // Placeholder for now
    return milestones;
  };

  return {
    achievements,
    isLoading,
    unlockAchievement: unlockAchievement.mutateAsync,
    checkNewAchievements,
    getNextMilestones,
    getAchievementConfig: (type: AchievementType) => ACHIEVEMENT_CONFIG[type],
  };
}
