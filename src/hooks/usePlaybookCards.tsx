import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Card {
  id: string;
  card_number: number;
  title: string;
  content_type: string;
  content_rich: any;
  video_url: string | null;
  video_provider: string | null;
  video_transcript: string | null;
  video_key_moments: any;
  steps: any;
  checklist_items: any;
  attachments: any;
  estimated_minutes: number | null;
  created_at: string;
  updated_at: string;
}

interface CardProgress {
  viewed_at: string;
  completed: boolean;
  completed_at: string | null;
  time_spent_seconds: number;
}

export function usePlaybookCards(playbookId: string | undefined) {
  const { user } = useAuth();

  const { data: cards, isLoading } = useQuery({
    queryKey: ['playbook-cards', playbookId],
    queryFn: async () => {
      if (!playbookId) return [];

      const { data, error } = await supabase
        .from('knowledge_base_cards')
        .select('*')
        .eq('playbook_id', playbookId)
        .order('card_number');

      if (error) throw error;

      // Get progress for all cards
      if (user) {
        const cardIds = data.map(card => card.id);
        const { data: progressData } = await supabase
          .from('kb_card_views')
          .select('card_id, viewed_at, completed, completed_at, time_spent_seconds')
          .eq('user_id', user.id)
          .in('card_id', cardIds);

        const progressMap = new Map<string, CardProgress>();
        progressData?.forEach(p => {
          progressMap.set(p.card_id, p);
        });

        return data.map(card => ({
          ...card,
          progress: progressMap.get(card.id),
        }));
      }

      return data;
    },
    enabled: !!playbookId,
  });

  return {
    cards,
    isLoading,
  };
}
