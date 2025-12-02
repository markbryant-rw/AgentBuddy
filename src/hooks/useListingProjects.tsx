import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useProjectTemplates } from './useProjectTemplates';
import { toast } from 'sonner';

interface Listing {
  id: string;
  address: string;
  status: string;
  team_id: string;
  expected_month: string;
}

export const useListingProjects = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { getTemplateByStage } = useProjectTemplates();

  const createProjectFromListing = useMutation({
    mutationFn: async ({ listing, newStatus }: { listing: Listing; newStatus: string }) => {
      // Stub: template_usage_log and project_templates tables don't exist
      console.log('createProjectFromListing: Stubbed', { listing, newStatus });
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      toast.success('Project created from listing');
    },
    onError: (error) => {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
    },
  });

  return {
    createProjectFromListing: createProjectFromListing.mutate,
    isCreating: createProjectFromListing.isPending,
  };
};
