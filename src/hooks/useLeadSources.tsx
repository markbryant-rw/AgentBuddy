import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

  const { data: leadSources = [], isLoading } = useQuery({
    queryKey: ["leadSources", activeOffice?.id],
    queryFn: async () => {
      console.log('useLeadSources: Stubbed - returning empty array');
      return [] as LeadSource[];
    },
    enabled: !!activeOffice?.id,
  });

  const activeLeadSources = leadSources.filter((source) => source.is_active);

  const addLeadSource = useMutation({
    mutationFn: async (newSource: { value: string; label: string }) => {
      console.log('addLeadSource: Stubbed', newSource);
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leadSources"] });
      toast({ title: "Success", description: "Lead source added successfully" });
    },
  });

  const updateLeadSource = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<LeadSource> }) => {
      console.log('updateLeadSource: Stubbed', { id, updates });
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leadSources"] });
      toast({ title: "Success", description: "Lead source updated successfully" });
    },
  });

  const deleteLeadSource = useMutation({
    mutationFn: async (id: string) => {
      console.log('deleteLeadSource: Stubbed', id);
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leadSources"] });
      toast({ title: "Success", description: "Lead source deleted successfully" });
    },
  });

  const reorderLeadSources = useMutation({
    mutationFn: async (reorderedSources: { id: string; sort_order: number }[]) => {
      console.log('reorderLeadSources: Stubbed', reorderedSources);
      return null;
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
