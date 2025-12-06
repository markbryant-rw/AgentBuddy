import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTeam } from '@/hooks/useTeam';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface BeaconReportResponse {
  success: boolean;
  existing: boolean;
  reportId: string;
  ownerId: string;
  urls: {
    edit: string;
    publicLink: string;
    personalizedLink: string;
  };
}

export const useBeaconIntegration = () => {
  const queryClient = useQueryClient();
  const { team } = useTeam();
  const { user } = useAuth();

  // Check if Beacon is enabled for the team
  const { data: integrationSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['integration-settings', team?.id, 'beacon'],
    queryFn: async () => {
      if (!team?.id) return null;

      const { data, error } = await supabase
        .from('integration_settings')
        .select('*')
        .eq('team_id', team.id)
        .eq('integration_name', 'beacon')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!team?.id,
  });

  const isBeaconEnabled = integrationSettings?.enabled ?? false;

  // Toggle Beacon integration for team
  const toggleBeaconIntegration = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!team?.id || !user?.id) throw new Error('Team or user not found');

      const { data, error } = await supabase
        .from('integration_settings')
        .upsert({
          team_id: team.id,
          integration_name: 'beacon',
          enabled,
          connected_at: enabled ? new Date().toISOString() : null,
          connected_by: enabled ? user.id : null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'team_id,integration_name',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ['integration-settings', team?.id] });
      toast.success(enabled ? 'Beacon integration enabled' : 'Beacon integration disabled');
    },
    onError: (error) => {
      console.error('Failed to toggle Beacon:', error);
      toast.error('Failed to update integration settings');
    },
  });

  // Create a Beacon report for an appraisal
  const createBeaconReport = useMutation({
    mutationFn: async (appraisalId: string) => {
      const { data, error } = await supabase.functions.invoke('create-beacon-report', {
        body: { appraisalId },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to create report');
      return data as BeaconReportResponse;
    },
    onSuccess: (data, appraisalId) => {
      queryClient.invalidateQueries({ queryKey: ['logged_appraisals'] });
      toast.success('Beacon report created successfully');
    },
    onError: (error) => {
      console.error('Failed to create Beacon report:', error);
      toast.error('Failed to create Beacon report');
    },
  });

  return {
    isBeaconEnabled,
    isLoadingSettings,
    integrationSettings,
    toggleBeaconIntegration,
    createBeaconReport,
    isCreatingReport: createBeaconReport.isPending,
  };
};
