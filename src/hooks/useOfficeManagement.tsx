import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useOfficeManagement = () => {
  const queryClient = useQueryClient();

  const createOffice = useMutation({
    mutationFn: async (data: {
      name: string;
      slug: string;
      brand?: string;
      brand_color?: string;
      bio?: string;
      logo_url?: string;
    }) => {
      const { data: office, error } = await supabase
        .from('agencies')
        .insert({
          name: data.name,
          slug: data.slug,
          brand: data.brand,
          brand_color: data.brand_color,
          bio: data.bio,
          logo_url: data.logo_url,
          created_by: (await supabase.auth.getUser()).data.user?.id!,
        })
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await supabase.from('admin_activity_log').insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        activity_type: 'office_created',
        description: `Created office: ${data.name}`,
        metadata: { agency_id: office.id },
      });

      return office;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-overview'] });
      queryClient.invalidateQueries({ queryKey: ['agencies'] });
      toast.success('Office created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create office');
    },
  });

  const updateOffice = useMutation({
    mutationFn: async (data: {
      id: string;
      name?: string;
      brand?: string;
      brand_color?: string;
      bio?: string;
      logo_url?: string;
    }) => {
      const updateData: any = {};
      if (data.name) updateData.name = data.name;
      if (data.brand !== undefined) updateData.brand = data.brand;
      if (data.brand_color !== undefined) updateData.brand_color = data.brand_color;
      if (data.bio !== undefined) updateData.bio = data.bio;
      if (data.logo_url !== undefined) updateData.logo_url = data.logo_url;

      const { error } = await supabase
        .from('agencies')
        .update(updateData)
        .eq('id', data.id);

      if (error) throw error;

      // Log activity
      await supabase.from('admin_activity_log').insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        activity_type: 'office_updated',
        description: `Updated office: ${data.name || data.id}`,
        metadata: { agency_id: data.id },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-overview'] });
      queryClient.invalidateQueries({ queryKey: ['agencies'] });
      toast.success('Office updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update office');
    },
  });

  const archiveOffice = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('agencies')
        .update({ is_archived: true })
        .eq('id', id);

      if (error) throw error;

      // Log activity
      await supabase.from('admin_activity_log').insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        activity_type: 'office_archived',
        description: `Archived office ${id}`,
        metadata: { agency_id: id },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-overview'] });
      toast.success('Office archived successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to archive office');
    },
  });

  return {
    createOffice,
    updateOffice,
    archiveOffice,
  };
};
