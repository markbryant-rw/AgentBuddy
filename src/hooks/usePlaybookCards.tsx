import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Card {
  id: string;
  title: string;
  content: string;
  category_id: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

interface CardProgress {
  viewed_at: string;
  completed: boolean;
}

export function usePlaybookCards(playbookId: string | undefined) {
  const { user } = useAuth();

  const { data: cards, isLoading } = useQuery({
    queryKey: ['playbook-cards', playbookId],
    queryFn: async () => {
      if (!playbookId) return [];

      // For now, return cards from knowledge_base_cards filtered by category
      const { data, error } = await supabase
        .from('knowledge_base_cards')
        .select('id, title, content, category_id, tags, created_at, updated_at')
        .eq('category_id', playbookId)
        .order('created_at');

      if (error) throw error;

      // Get progress for all cards
      if (user && data && data.length > 0) {
        const cardIds = data.map(card => card.id);
        const { data: progressData } = await supabase
          .from('kb_card_views')
          .select('card_id, viewed_at, completed')
          .eq('user_id', user.id)
          .in('card_id', cardIds);

        const progressMap = new Map<string, CardProgress>();
        progressData?.forEach(p => {
          progressMap.set(p.card_id, {
            viewed_at: p.viewed_at || new Date().toISOString(),
            completed: p.completed || false,
          });
        });

        return data.map(card => ({
          ...card,
          progress: progressMap.get(card.id),
        }));
      }

      return data || [];
    },
    enabled: !!playbookId,
  });

  return {
    cards,
    isLoading,
  };
}
