import { BookOpen, MessageSquare, TrendingUp, Target } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { StatCard } from '@/components/ui/stat-card';
import { Skeleton } from '@/components/ui/skeleton';

export function GrowQuickStats() {
  const { user } = useAuth();
  const { team } = useTeam();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['grow-quick-stats', user?.id, team?.id],
    queryFn: async () => {
      if (!user?.id || !team?.id) {
        return {
          learningPathsActive: 0,
          knowledgeBaseItems: 0,
          coachingSessions: 0,
          skillProgress: 0,
        };
      }

      const { data: conversations } = await (supabase as any)
        .from('coaching_conversations')
        .select('id')
        .eq('user_id', user.id);

      const { data: playbooks } = await (supabase as any)
        .from('knowledge_base_playbooks')
        .select('id')
        .eq('team_id', team.id)
        .eq('is_published', true);

      const { data: completedCards } = await (supabase as any)
        .from('kb_card_views')
        .select('card_id')
        .eq('user_id', user.id)
        .eq('completed', true);

      const { data: totalCards } = await (supabase as any)
        .from('knowledge_base_cards')
        .select('id')
        .in(
          'playbook_id',
          (playbooks || []).map((p: any) => p.id)
        );

      const completed = completedCards?.length || 0;
      const total = totalCards?.length || 0;
      const skillProgress = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        learningPathsActive: 0,
        knowledgeBaseItems: playbooks?.length || 0,
        coachingSessions: conversations?.length || 0,
        skillProgress,
      };
    },
    enabled: !!user?.id && !!team?.id,
  });

  const quickStats = [
    {
      label: 'Active Learning Paths',
      value: stats?.learningPathsActive || 0,
      icon: Target,
    },
    {
      label: 'Knowledge Base Items',
      value: stats?.knowledgeBaseItems || 0,
      icon: BookOpen,
    },
    {
      label: 'Coaching Sessions',
      value: stats?.coachingSessions || 0,
      icon: MessageSquare,
    },
    {
      label: 'Skill Progress',
      value: `${stats?.skillProgress || 0}%`,
      icon: TrendingUp,
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-fluid-md">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-fluid-md">
      {quickStats.map((stat) => (
        <StatCard
          key={stat.label}
          workspace="grow"
          icon={stat.icon}
          label={stat.label}
          value={stat.value}
        />
      ))}
    </div>
  );
}
