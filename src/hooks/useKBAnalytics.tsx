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

  // Stub: Missing columns in KB tables
  const { data: completionRates, isLoading: loadingCompletion } = useQuery({
    queryKey: ['kb-completion-rates', team?.id],
    queryFn: async () => {
      console.log('useKBAnalytics completionRates: Stubbed - returning empty array');
      return [] as PlaybookCompletion[];
    },
    enabled: !!team,
  });

  const { data: mostViewed, isLoading: loadingViewed } = useQuery({
    queryKey: ['kb-most-viewed', team?.id],
    queryFn: async () => {
      console.log('useKBAnalytics mostViewed: Stubbed - returning empty array');
      return [] as MostViewed[];
    },
    enabled: !!team,
  });

  const { data: outdatedContent, isLoading: loadingOutdated } = useQuery({
    queryKey: ['kb-outdated', team?.id],
    queryFn: async () => {
      console.log('useKBAnalytics outdatedContent: Stubbed - returning empty array');
      return [] as OutdatedContent[];
    },
    enabled: !!team,
  });

  const { data: overallStats } = useQuery({
    queryKey: ['kb-overall-stats', team?.id, user?.id],
    queryFn: async () => {
      console.log('useKBAnalytics overallStats: Stubbed - returning zeros');
      return {
        totalPlaybooks: 0,
        totalCards: 0,
        userCompletedCards: 0,
        teamCompletionRate: 0
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
