import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { toast } from 'sonner';
import { createServiceProviderNotification, createOfficeManagerReviewTask } from '@/lib/notifications';

interface CreateProviderData {
  category_id?: string;
  full_name: string;
  company_name?: string;
  phone?: string;
  email?: string;
  website?: string;
  notes?: string;
  visibility_level?: 'office' | 'team' | 'private';
  needs_review?: boolean;
  duplicate_of?: string;
}

interface UpdateProviderData extends Partial<CreateProviderData> {
  id: string;
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
        (supabase as any).from('teams').select('agency_id').eq('id', team.id).single(),
        (supabase as any).from('profiles').select('full_name').eq('id', user.id).single(),
      ]);

      if (!teamData?.agency_id) {
        throw new Error('Office not found for team');
      }

      const insertPayload: any = {
        name: data.full_name,
        company: data.company_name || null,
        phone: data.phone || null,
        email: data.email || null,
        website: data.website || null,
        notes: data.notes || null,
        category_id: data.category_id || null,
        agency_id: teamData.agency_id,
        created_by: user.id,
      };

      const { data: provider, error } = await (supabase as any)
        .from('service_providers')
        .insert(insertPayload)
        .select(`
          *,
          provider_categories (name)
        `)
        .single();

      if (error) throw error;

      const categoryName = provider.provider_categories?.name || null;

      await createServiceProviderNotification(
        provider.id,
        provider.name,
        categoryName,
        profile?.full_name || 'A team member',
        user.id,
        teamData.agency_id
      );

      if (data.needs_review && data.duplicate_of) {
        const { data: existingProvider } = await (supabase as any)
          .from('service_providers')
          .select('name')
          .eq('id', data.duplicate_of)
          .single();

        if (existingProvider) {
          await createOfficeManagerReviewTask(
            provider.name,
            provider.id,
            existingProvider.name,
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
      const updatePayload: any = {
        name: data.full_name,
        company: data.company_name,
        phone: data.phone,
        email: data.email,
        website: data.website,
        notes: data.notes,
        category_id: data.category_id,
      };

      const { data: provider, error } = await (supabase as any)
        .from('service_providers')
        .update(updatePayload)
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
      const { error } = await (supabase as any)
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
