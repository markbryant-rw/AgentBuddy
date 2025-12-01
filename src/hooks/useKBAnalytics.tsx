import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTeam } from "@/hooks/useTeam";

interface PlaybookCompletion {
  id: string;
  title: string;
  total_cards: number;
  completed_cards: number;
  completion_rate: number;
}

interface MostViewed {
  id: string;
  title: string;
  unique_viewers: number;
  total_views: number;
  avg_time_spent: number;
}

interface OutdatedContent {
  id: string;
  title: string;
  updated_at: string;
  days_since_update: number;
  view_count_30d: number;
}

export function useKBAnalytics() {
  const { user } = useAuth();
  const { team } = useTeam();

  // Completion rates by playbook
  const { data: completionRates, isLoading: loadingCompletion } = useQuery({
    queryKey: ['kb-completion-rates', team?.id],
    queryFn: async () => {
      if (!team) return [];

      const { data: playbooks } = await supabase
        .from('knowledge_base_playbooks')
        .select('id, title')
        .eq('team_id', team.id)
        .eq('is_published', true);

      if (!playbooks) return [];

      const results: PlaybookCompletion[] = [];

      for (const playbook of playbooks) {
        const { data: cards } = await supabase
          .from('knowledge_base_cards')
          .select('id')
          .eq('playbook_id', playbook.id);

        const totalCards = cards?.length || 0;

        const { data: completedViews } = await supabase
          .from('kb_card_views')
          .select('card_id')
          .eq('completed', true)
          .in('card_id', cards?.map(c => c.id) || []);

        const uniqueCompleted = new Set(completedViews?.map(v => v.card_id)).size;

        results.push({
          id: playbook.id,
          title: playbook.title,
          total_cards: totalCards,
          completed_cards: uniqueCompleted,
          completion_rate: totalCards > 0 ? (uniqueCompleted / totalCards) * 100 : 0
        });
      }

      return results;
    },
    enabled: !!team,
  });

  // Most viewed playbooks
  const { data: mostViewed, isLoading: loadingViewed } = useQuery({
    queryKey: ['kb-most-viewed', team?.id],
    queryFn: async () => {
      if (!team) return [];

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: playbooks } = await supabase
        .from('knowledge_base_playbooks')
        .select('id, title')
        .eq('team_id', team.id)
        .eq('is_published', true);

      if (!playbooks) return [];

      const results: MostViewed[] = [];

      for (const playbook of playbooks) {
        const { data: cards } = await supabase
          .from('knowledge_base_cards')
          .select('id')
          .eq('playbook_id', playbook.id);

        const cardIds = cards?.map(c => c.id) || [];

        const { data: views } = await supabase
          .from('kb_card_views')
          .select('user_id, time_spent_seconds')
          .in('card_id', cardIds)
          .gte('viewed_at', thirtyDaysAgo.toISOString());

        const uniqueViewers = new Set(views?.map(v => v.user_id)).size;
        const totalViews = views?.length || 0;
        const avgTimeSpent = views?.length ? 
          views.reduce((sum, v) => sum + (v.time_spent_seconds || 0), 0) / views.length : 0;

        results.push({
          id: playbook.id,
          title: playbook.title,
          unique_viewers: uniqueViewers,
          total_views: totalViews,
          avg_time_spent: avgTimeSpent
        });
      }

      return results.sort((a, b) => b.total_views - a.total_views).slice(0, 10);
    },
    enabled: !!team,
  });

  // Outdated content
  const { data: outdatedContent, isLoading: loadingOutdated } = useQuery({
    queryKey: ['kb-outdated', team?.id],
    queryFn: async () => {
      if (!team) return [];

      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: playbooks } = await supabase
        .from('knowledge_base_playbooks')
        .select('id, title, updated_at')
        .eq('team_id', team.id)
        .eq('is_published', true)
        .lt('updated_at', ninetyDaysAgo.toISOString());

      if (!playbooks) return [];

      const results: OutdatedContent[] = [];

      for (const playbook of playbooks) {
        const { data: cards } = await supabase
          .from('knowledge_base_cards')
          .select('id')
          .eq('playbook_id', playbook.id);

        const cardIds = cards?.map(c => c.id) || [];

        const { count: viewCount } = await supabase
          .from('kb_card_views')
          .select('*', { count: 'exact', head: true })
          .in('card_id', cardIds)
          .gte('viewed_at', thirtyDaysAgo.toISOString());

        const updatedAt = new Date(playbook.updated_at);
        const daysSinceUpdate = Math.floor((Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));

        results.push({
          id: playbook.id,
          title: playbook.title,
          updated_at: playbook.updated_at,
          days_since_update: daysSinceUpdate,
          view_count_30d: viewCount || 0
        });
      }

      return results;
    },
    enabled: !!team,
  });

  // Overall stats
  const { data: overallStats } = useQuery({
    queryKey: ['kb-overall-stats', team?.id, user?.id],
    queryFn: async () => {
      if (!team || !user) return null;

      const { count: totalPlaybooks } = await supabase
        .from('knowledge_base_playbooks')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', team.id)
        .eq('is_published', true);

      const { data: allCards } = await supabase
        .from('knowledge_base_cards')
        .select('id, playbook_id')
        .in('playbook_id', 
          (await supabase
            .from('knowledge_base_playbooks')
            .select('id')
            .eq('team_id', team.id)
            .eq('is_published', true)).data?.map(p => p.id) || []
        );

      const totalCards = allCards?.length || 0;
      const cardIds = allCards?.map(c => c.id) || [];

      const { count: completedCards } = await supabase
        .from('kb_card_views')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('completed', true)
        .in('card_id', cardIds);

      const teamCompletionRate = totalCards > 0 ? ((completedCards || 0) / totalCards) * 100 : 0;

      return {
        totalPlaybooks: totalPlaybooks || 0,
        totalCards,
        userCompletedCards: completedCards || 0,
        teamCompletionRate
      };
    },
    enabled: !!team && !!user,
  });

  return {
    completionRates,
    mostViewed,
    outdatedContent,
    overallStats,
    isLoading: loadingCompletion || loadingViewed || loadingOutdated
  };
}
