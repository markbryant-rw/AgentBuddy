import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function useCardProgress(cardId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: progress } = useQuery({
    queryKey: ['card-progress', cardId, user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data } = await supabase
        .from('kb_card_views')
        .select('*')
        .eq('card_id', cardId)
        .eq('user_id', user.id)
        .maybeSingle();

      return data;
    },
    enabled: !!user && !!cardId,
  });

  const markViewed = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('kb_card_views')
        .upsert({
          card_id: cardId,
          user_id: user.id,
          viewed_at: new Date().toISOString(),
        }, {
          onConflict: 'card_id,user_id',
          ignoreDuplicates: false,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card-progress', cardId] });
      queryClient.invalidateQueries({ queryKey: ['playbook-cards'] });
    },
  });

  const markComplete = useMutation({
    mutationFn: async (completed: boolean) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('kb_card_views')
        .upsert({
          card_id: cardId,
          user_id: user.id,
          completed,
          completed_at: completed ? new Date().toISOString() : null,
          viewed_at: new Date().toISOString(),
        }, {
          onConflict: 'card_id,user_id',
          ignoreDuplicates: false,
        });

      if (error) throw error;
    },
    onSuccess: (_, completed) => {
      queryClient.invalidateQueries({ queryKey: ['card-progress', cardId] });
      queryClient.invalidateQueries({ queryKey: ['playbook-cards'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-base-categories'] });
      toast.success(completed ? 'Card marked as complete' : 'Card marked as incomplete');
    },
    onError: (error) => {
      console.error('Error updating card progress:', error);
      toast.error('Failed to update progress');
    },
  });

  return {
    progress,
    isCompleted: progress?.completed || false,
    markViewed: markViewed.mutate,
    markComplete: markComplete.mutate,
  };
}
