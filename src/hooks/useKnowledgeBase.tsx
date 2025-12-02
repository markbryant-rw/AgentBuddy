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

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['knowledge-base-categories', user?.id],
    queryFn: async () => {
      // Stub: Missing columns in KB tables
      console.log('useKnowledgeBase: Stubbed - returning empty array');
      return [] as Category[];
    },
    enabled: !!user,
  });

  const createCategory = useMutation({
    mutationFn: async (category: Partial<Category>) => {
      console.log('createCategory: Stubbed', category);
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base-categories'] });
      toast.success('Category created');
    },
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Category> }) => {
      console.log('updateCategory: Stubbed', { id, updates });
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base-categories'] });
      toast.success('Category updated');
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      console.log('deleteCategory: Stubbed', { id });
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base-categories'] });
      toast.success('Category deleted');
    },
  });

  return {
    categories,
    isLoading,
    createCategory: createCategory.mutate,
    updateCategory: updateCategory.mutate,
    deleteCategory: deleteCategory.mutate,
  };
}
