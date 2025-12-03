import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useOfficeSwitcher } from "@/hooks/useOfficeSwitcher";
import { supabase } from "@/integrations/supabase/client";

export interface LeadSource {
  id: string;
  agency_id: string | null;
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

  // Fetch platform defaults + office-specific sources
  const { data: leadSources = [], isLoading } = useQuery({
    queryKey: ["leadSources", activeOffice?.id],
    queryFn: async () => {
      // Get platform defaults (agency_id IS NULL) and office-specific
      const { data, error } = await supabase
        .from("lead_sources")
        .select("*")
        .or(`agency_id.is.null${activeOffice?.id ? `,agency_id.eq.${activeOffice.id}` : ''}`)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      
      // Office-specific sources with same value override platform defaults
      const sources = data as LeadSource[];
      const officeValues = new Set(
        sources.filter(s => s.agency_id === activeOffice?.id).map(s => s.value)
      );
      
      // Return office sources + platform defaults that aren't overridden
      return sources.filter(s => 
        s.agency_id === activeOffice?.id || 
        (s.agency_id === null && !officeValues.has(s.value))
      );
    },
  });

  const activeLeadSources = leadSources.filter((source) => source.is_active);
  
  // Separate platform vs office sources for management UI
  const platformSources = leadSources.filter(s => s.agency_id === null);
  const officeSources = leadSources.filter(s => s.agency_id !== null);

  const addLeadSource = useMutation({
    mutationFn: async (newSource: { value: string; label: string; agency_id?: string | null }) => {
      const maxOrder = Math.max(...leadSources.map(s => s.sort_order), 0);
      const { data, error } = await supabase
        .from("lead_sources")
        .insert([{ 
          ...newSource, 
          sort_order: maxOrder + 1,
          agency_id: newSource.agency_id ?? null 
        }])
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
    platformSources,
    officeSources,
    isLoading,
    activeOfficeId: activeOffice?.id,
    addLeadSource: addLeadSource.mutateAsync,
    updateLeadSource: updateLeadSource.mutateAsync,
    deleteLeadSource: deleteLeadSource.mutateAsync,
    reorderLeadSources: reorderLeadSources.mutateAsync,
  };
};
