import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface Office {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  brand_color: string | null;
  logo_url: string | null;
}

export const useOfficeSwitcher = () => {
  const { user, hasRole } = useAuth();
  const queryClient = useQueryClient();

  const isPlatformAdmin = hasRole('platform_admin');
  const isOfficeManager = hasRole('office_manager');

  // Fetch all offices (for platform admins)
  const { data: allOffices = [], isLoading: isLoadingAllOffices } = useQuery({
    queryKey: ['all-offices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agencies')
        .select('id, name, slug, brand, brand_color, logo_url')
        .eq('is_archived', false)
        .order('name');

      if (error) throw error;
      return data as Office[];
    },
    enabled: isPlatformAdmin,
  });

  // Fetch assigned offices (for office managers)
  const { data: assignedOffices = [], isLoading: isLoadingAssignedOffices } = useQuery({
    queryKey: ['assigned-offices', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('office_manager_assignments')
        .select(`
          office_id,
          agencies:office_id (
            id,
            name,
            slug,
            brand,
            brand_color,
            logo_url
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      return (data?.map((a: any) => a.agencies).filter(Boolean) || []) as Office[];
    },
    enabled: isOfficeManager && !isPlatformAdmin,
  });

  // Get available offices based on role
  const availableOffices = isPlatformAdmin ? allOffices : assignedOffices;
  const isLoadingOffices = isPlatformAdmin ? isLoadingAllOffices : isLoadingAssignedOffices;

  // Fetch active office from profile
  const { data: activeOffice, isLoading: isLoadingActiveOffice } = useQuery({
    queryKey: ['active-office', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('active_office_id, office_id')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      // Use active_office_id if set, otherwise fall back to office_id for regular users
      const officeId = data?.active_office_id || data?.office_id;
      if (!officeId) return null;

      // Fetch office details
      const { data: office, error: officeError } = await supabase
        .from('agencies')
        .select('id, name, slug, brand, brand_color, logo_url')
        .eq('id', officeId)
        .single();

      if (officeError) throw officeError;
      return office as Office;
    },
    enabled: !!user,
  });

  // Switch office mutation
  const switchOfficeMutation = useMutation({
    mutationFn: async (officeId: string) => {
      const { data, error } = await supabase.functions.invoke('switch-office', {
        body: { officeId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['active-office'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['office-stats'] });
      queryClient.invalidateQueries({ queryKey: ['team-hierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      queryClient.invalidateQueries({ queryKey: ['all-offices'] });
      queryClient.invalidateQueries({ queryKey: ['assigned-offices'] });
      queryClient.invalidateQueries({ queryKey: ['office-teams-users'] });
      queryClient.invalidateQueries({ queryKey: ['data-health'] });
      queryClient.refetchQueries({ type: 'active' });
      toast.success(`Switched to ${data.office.name}`);
    },
    onError: (error: Error) => {
      console.error('Failed to switch office:', error);
      toast.error('Failed to switch office: ' + error.message);
    },
  });

  return {
    availableOffices,
    activeOffice,
    isLoading: isLoadingOffices || isLoadingActiveOffice,
    switchOffice: switchOfficeMutation.mutate,
    isSwitching: switchOfficeMutation.isPending,
    canSwitchOffices: (isPlatformAdmin || isOfficeManager) && availableOffices.length > 0,
  };
};