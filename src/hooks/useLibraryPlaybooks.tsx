import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Playbook {
  id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  estimated_minutes: number | null;
  is_published: boolean;
  card_count?: number;
  completion_rate?: number;
}

export function useLibraryPlaybooks(libraryId: string) {
  const { user } = useAuth();

  const { data: playbooks, isLoading } = useQuery({
    queryKey: ['library-playbooks', libraryId, user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Fetch playbooks for this library
      const { data: playbooks, error: playbooksError } = await supabase
        .from('knowledge_base_playbooks')
        .select(`
          id,
          title,
          description,
          cover_image,
          estimated_minutes,
          is_published
        `)
        .eq('category_id', libraryId)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (playbooksError) throw playbooksError;

      // Get card counts and completion rates for each playbook
      const playbooksWithStats = await Promise.all(
        (playbooks || []).map(async (playbook) => {
          const { count } = await supabase
            .from('knowledge_base_cards')
            .select('*', { count: 'exact', head: true })
            .eq('playbook_id', playbook.id);

          // Get card IDs for this playbook
          const { data: cardIds } = await supabase
            .from('knowledge_base_cards')
            .select('id')
            .eq('playbook_id', playbook.id);

          const cardIdArray = cardIds?.map(c => c.id) || [];

          // Get user's completion rate
          const { data: views } = cardIdArray.length > 0
            ? await supabase
                .from('kb_card_views')
                .select('completed')
                .eq('user_id', user.id)
                .in('card_id', cardIdArray)
            : { data: [] };

          const totalCards = count || 0;
          const completedCards = views?.filter(v => v.completed).length || 0;
          const completion_rate = totalCards > 0 
            ? Math.round((completedCards / totalCards) * 100) 
            : 0;

          return {
            ...playbook,
            card_count: totalCards,
            completion_rate,
          };
        })
      );

      return playbooksWithStats as Playbook[];
    },
    enabled: !!user && !!libraryId,
  });

  return {
    playbooks,
    isLoading,
  };
}
