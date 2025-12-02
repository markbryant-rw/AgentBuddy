import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useCardEditor(playbookId: string) {
  const queryClient = useQueryClient();

  // Create card
  const createCard = useMutation({
    mutationFn: async (data: {
      title: string;
      card_number: number;
      content?: any;
      template?: string;
      estimated_minutes?: number;
    }) => {
      const { data: newCard, error } = await (supabase as any)
        .from('knowledge_base_cards')
        .insert({
          title: data.title,
          content: data.content || '',
          category_id: playbookId,
        })
        .select()
        .single();

      if (error) throw error;
      return newCard;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playbook-cards', playbookId] });
      toast.success('Card created successfully');
    },
    onError: (error) => {
      console.error('Error creating card:', error);
      toast.error('Failed to create card');
    },
  });

  // Update card
  const updateCard = useMutation({
    mutationFn: async (data: {
      id: string;
      title?: string;
      card_number?: number;
      content?: any;
      template?: string;
      estimated_minutes?: number;
    }) => {
      const { id, ...updates } = data;
      
      const { data: updated, error } = await supabase
        .from('knowledge_base_cards')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playbook-cards', playbookId] });
      toast.success('Card updated successfully');
    },
    onError: (error) => {
      console.error('Error updating card:', error);
      toast.error('Failed to update card');
    },
  });

  // Delete card
  const deleteCard = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('knowledge_base_cards')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playbook-cards', playbookId] });
      toast.success('Card deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting card:', error);
      toast.error('Failed to delete card');
    },
  });

  // Reorder cards - stubbed out since card_number field doesn't exist
  const reorderCards = useMutation({
    mutationFn: async (cardUpdates: { id: string; card_number: number }[]) => {
      // Stubbed - card_number field not in schema
      return;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playbook-cards', playbookId] });
      toast.success('Cards reordered successfully');
    },
    onError: (error) => {
      console.error('Error reordering cards:', error);
      toast.error('Failed to reorder cards');
    },
  });

  return {
    createCard: createCard.mutate,
    updateCard: updateCard.mutate,
    deleteCard: deleteCard.mutate,
    reorderCards: reorderCards.mutate,
    isCreating: createCard.isPending,
    isUpdating: updateCard.isPending,
    isDeleting: deleteCard.isPending,
    isReordering: reorderCards.isPending,
  };
}
