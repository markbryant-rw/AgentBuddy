import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export interface LeadSource {
  id: string;
  value: string;
  label: string;
  is_active: boolean;
  is_default?: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const useLeadSources = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: leadSources = [], isLoading } = useQuery({
    queryKey: ["leadSources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_sources")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as LeadSource[];
    },
  });

  const activeLeadSources = leadSources.filter((source) => source.is_active);

  const addLeadSource = useMutation({
    mutationFn: async (newSource: { value: string; label: string }) => {
      const maxOrder = Math.max(...leadSources.map(s => s.sort_order), 0);
      const { data, error } = await supabase
        .from("lead_sources")
        .insert([{ ...newSource, sort_order: maxOrder + 1 }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leadSources"] });
      toast({ title: "Success", description: "Lead source added successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateLeadSource = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<LeadSource> }) => {
      const { data, error } = await supabase
        .from("lead_sources")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leadSources"] });
      toast({ title: "Success", description: "Lead source updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteLeadSource = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("lead_sources")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leadSources"] });
      toast({ title: "Success", description: "Lead source deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const reorderLeadSources = useMutation({
    mutationFn: async (reorderedSources: { id: string; sort_order: number }[]) => {
      const updates = reorderedSources.map(({ id, sort_order }) =>
        supabase
          .from("lead_sources")
          .update({ sort_order })
          .eq("id", id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leadSources"] });
    },
  });

  return {
    leadSources,
    activeLeadSources,
    isLoading,
    addLeadSource: addLeadSource.mutateAsync,
    updateLeadSource: updateLeadSource.mutateAsync,
    deleteLeadSource: deleteLeadSource.mutateAsync,
    reorderLeadSources: reorderLeadSources.mutateAsync,
  };
};
