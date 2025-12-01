import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOfficeSwitcher } from "@/hooks/useOfficeSwitcher";

export interface LeadSource {
  id: string;
  agency_id: string;
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
  const { activeOffice } = useOfficeSwitcher();

  // Fetch lead sources for office
  const { data: leadSources = [], isLoading } = useQuery({
    queryKey: ["leadSources", activeOffice?.id],
    queryFn: async () => {
      if (!activeOffice?.id) return [];
      
      const { data, error } = await supabase
        .from("lead_source_options")
        .select("*")
        .eq("agency_id", activeOffice.id)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as LeadSource[];
    },
    enabled: !!activeOffice?.id,
  });

  // Get only active lead sources
  const activeLeadSources = leadSources.filter((source) => source.is_active);

  // Add lead source
  const addLeadSource = useMutation({
    mutationFn: async (newSource: { value: string; label: string }) => {
      if (!activeOffice?.id) throw new Error("No office selected");

      const maxOrder = leadSources.length > 0 
        ? Math.max(...leadSources.map((s) => s.sort_order))
        : 0;

      const { data, error } = await supabase
        .from("lead_source_options")
        .insert([
          {
            agency_id: activeOffice.id,
            value: newSource.value,
            label: newSource.label,
            sort_order: maxOrder + 1,
            is_active: true,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leadSources"] });
      toast({
        title: "Success",
        description: "Lead source added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update lead source
  const updateLeadSource = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<LeadSource> }) => {
      const { data, error } = await supabase
        .from("lead_source_options")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leadSources"] });
      toast({
        title: "Success",
        description: "Lead source updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete lead source
  const deleteLeadSource = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("lead_source_options")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leadSources"] });
      toast({
        title: "Success",
        description: "Lead source deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reorder lead sources
  const reorderLeadSources = useMutation({
    mutationFn: async (reorderedSources: { id: string; sort_order: number }[]) => {
      const updates = reorderedSources.map((source) =>
        supabase
          .from("lead_source_options")
          .update({ sort_order: source.sort_order })
          .eq("id", source.id)
      );

      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leadSources"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
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
