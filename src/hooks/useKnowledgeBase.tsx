import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  description: string | null;
  color_theme: string;
  icon: string | null;
  sort_order: number;
  playbooks?: Playbook[];
}

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

export function useKnowledgeBase() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch categories with playbooks
  const { data: categories, isLoading } = useQuery({
    queryKey: ['knowledge-base-categories', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get user's team
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .single();

      if (!teamMember) return [];

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('knowledge_base_categories')
        .select('*')
        .eq('team_id', teamMember.team_id)
        .order('sort_order');

      if (categoriesError) throw categoriesError;

      // Fetch playbooks for each category
      const categoriesWithPlaybooks = await Promise.all(
        (categoriesData || []).map(async (category) => {
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
            .eq('category_id', category.id)
            .eq('is_published', true)
            .order('created_at', { ascending: false });

          if (playbooksError) throw playbooksError;

          // Get card counts for each playbook
          const playbooksWithCounts = await Promise.all(
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

          return {
            ...category,
            playbooks: playbooksWithCounts,
          };
        })
      );

      return categoriesWithPlaybooks as Category[];
    },
    enabled: !!user,
  });

  // Create library
  const createLibrary = useMutation({
    mutationFn: async (data: Partial<Category>) => {
      if (!user) throw new Error('Not authenticated');

      const { data: teamMember } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .single();

      if (!teamMember) throw new Error('No team found');

      const { data: category, error } = await supabase
        .from('knowledge_base_categories')
        .insert([{
          name: data.name || 'New Category',
          description: data.description,
          color_theme: data.color_theme || 'systems',
          icon: data.icon,
          sort_order: data.sort_order || 0,
          team_id: teamMember.team_id,
        }])
        .select()
        .single();

      if (error) throw error;
      return category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base-categories'] });
      queryClient.invalidateQueries({ queryKey: ['libraries'] });
      toast.success('Category created successfully');
    },
    onError: (error) => {
      console.error('Error creating category:', error);
      toast.error('Failed to create category');
    },
  });

  // Update library
  const updateLibrary = useMutation({
    mutationFn: async (data: { id: string; name?: string; description?: string | null; icon?: string | null; color_theme?: string; sort_order?: number }) => {
      const { id, ...updates } = data;
      
      const { data: library, error } = await supabase
        .from('knowledge_base_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return library;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base-categories'] });
      queryClient.invalidateQueries({ queryKey: ['libraries'] });
      queryClient.invalidateQueries({ queryKey: ['libraries-management'] });
      toast.success('Library updated successfully');
    },
    onError: (error) => {
      console.error('Error updating library:', error);
      toast.error('Failed to update library');
    },
  });

  // Delete library
  const deleteLibrary = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('knowledge_base_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base-categories'] });
      queryClient.invalidateQueries({ queryKey: ['libraries'] });
      queryClient.invalidateQueries({ queryKey: ['libraries-management'] });
      toast.success('Library deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting library:', error);
      toast.error('Failed to delete library');
    },
  });

  // Reorder libraries
  const reorderLibraries = useMutation({
    mutationFn: async (updates: { id: string; sort_order: number }[]) => {
      const promises = updates.map(({ id, sort_order }) =>
        supabase
          .from('knowledge_base_categories')
          .update({ sort_order })
          .eq('id', id)
      );

      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) throw errors[0].error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base-categories'] });
      queryClient.invalidateQueries({ queryKey: ['libraries'] });
      queryClient.invalidateQueries({ queryKey: ['libraries-management'] });
      toast.success('Libraries reordered successfully');
    },
    onError: (error) => {
      console.error('Error reordering libraries:', error);
      toast.error('Failed to reorder libraries');
    },
  });

  return {
    categories,
    isLoading,
    createCategory: createLibrary.mutate,
    createLibrary: createLibrary.mutate,
    updateLibrary: updateLibrary.mutate,
    deleteLibrary: deleteLibrary.mutate,
    reorderLibraries: reorderLibraries.mutate,
  };
}
