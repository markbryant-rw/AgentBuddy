import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { toast } from 'sonner';
import { createServiceProviderNotification, createOfficeManagerReviewTask } from '@/lib/notifications';

interface CreateProviderData {
  category_id?: string;
  team_category_id?: string;
  full_name: string;
  company_name?: string;
  phone?: string;
  email?: string;
  website?: string;
  notes?: string;
  visibility_level?: 'office' | 'team' | 'private';
  avatar_url?: string;
  logo_url?: string;
  needs_review?: boolean;
  duplicate_of?: string;
}

interface UpdateProviderData extends Partial<CreateProviderData> {
  id: string;
  avatar_url?: string | null;
  logo_url?: string | null;
}

export const useProviderCRUD = () => {
  const { user } = useAuth();
  const { team } = useTeam();
  const queryClient = useQueryClient();

  const createProvider = useMutation({
    mutationFn: async (data: CreateProviderData) => {
      if (!user || !team) throw new Error('User or team not found');

      // Fetch agency_id and user's full name
      const [{ data: teamData }, { data: profile }] = await Promise.all([
        supabase.from('teams').select('agency_id').eq('id', team.id).single(),
        supabase.from('profiles').select('full_name').eq('id', user.id).single(),
      ]);

      if (!teamData?.agency_id) {
        throw new Error('Office not found for team');
      }

      const { data: provider, error } = await supabase
        .from('service_providers')
        .insert({
          ...data,
          team_id: team.id,
          created_by: user.id,
        })
        .select(`
          *,
          provider_categories (name),
          team_provider_categories (name)
        `)
        .single();

      if (error) throw error;

      // Trigger notification to office members
      const categoryName = 
        provider.provider_categories?.name || 
        provider.team_provider_categories?.name || 
        null;

      await createServiceProviderNotification(
        provider.id,
        provider.full_name,
        categoryName,
        profile?.full_name || 'A team member',
        user.id,
        teamData.agency_id
      );

      // If flagged for review, create office manager task
      if (data.needs_review && data.duplicate_of) {
        const { data: existingProvider } = await supabase
          .from('service_providers')
          .select('full_name')
          .eq('id', data.duplicate_of)
          .single();

        if (existingProvider) {
          await createOfficeManagerReviewTask(
            provider.full_name,
            provider.id,
            existingProvider.full_name,
            data.duplicate_of,
            'High similarity detected',
            teamData.agency_id
          );
        }
      }

      return provider;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-providers'] });
      toast.success('Provider added successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to add provider: ' + error.message);
    },
  });

  const updateProvider = useMutation({
    mutationFn: async ({ id, ...data }: UpdateProviderData) => {
      const { data: provider, error } = await supabase
        .from('service_providers')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return provider;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-providers'] });
      toast.success('Provider updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update provider: ' + error.message);
    },
  });

  const deleteProvider = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('service_providers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-providers'] });
      toast.success('Provider deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete provider: ' + error.message);
    },
  });

  return {
    createProvider,
    updateProvider,
    deleteProvider,
  };
};
