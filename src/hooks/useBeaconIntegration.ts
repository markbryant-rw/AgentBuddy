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
  reportType?: string;
  localReportId?: string;
}

export type BeaconReportType = 'market_appraisal' | 'proposal' | 'update';

export const REPORT_TYPE_LABELS: Record<BeaconReportType, string> = {
  market_appraisal: 'Market Appraisal',
  proposal: 'Proposal',
  update: 'Update',
};

export const REPORT_TYPE_ICONS: Record<BeaconReportType, string> = {
  market_appraisal: '📊',
  proposal: '📝',
  update: '🔄',
};

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

  // Sync team to Beacon
  const syncTeamToBeacon = async (teamId: string) => {
    try {
      const { error } = await supabase.functions.invoke('sync-beacon-team', {
        body: { teamId },
      });
      if (error) {
        console.error('Failed to sync team to Beacon:', error);
      }
    } catch (err) {
      console.error('Error syncing team to Beacon:', err);
    }
  };

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

      // Sync team to Beacon when enabling
      if (enabled && team?.id) {
        await syncTeamToBeacon(team.id);
      }

      return data;
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ['integration-settings', team?.id] });
      toast.success(enabled 
        ? 'Beacon enabled! $25/month includes 3 reports.' 
        : 'Beacon integration disabled'
      );
    },
    onError: (error) => {
      console.error('Failed to toggle Beacon:', error);
      toast.error('Failed to update integration settings');
    },
  });

  // Create a Beacon report for an appraisal
  const createBeaconReport = useMutation({
    mutationFn: async ({ appraisalId, reportType = 'market_appraisal' }: { appraisalId: string; reportType?: BeaconReportType }) => {
      console.log('createBeaconReport: Starting mutation', { appraisalId, reportType });
      
      const { data, error } = await supabase.functions.invoke('create-beacon-report', {
        body: { appraisalId, reportType },
      });

      console.log('createBeaconReport: Response', { data, error });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to create report');
      return data as BeaconReportResponse;
    },
    onSuccess: (data, { reportType }) => {
      queryClient.invalidateQueries({ queryKey: ['logged_appraisals'] });
      queryClient.invalidateQueries({ queryKey: ['beacon_reports'] });
      
      const typeLabel = REPORT_TYPE_LABELS[reportType || 'market_appraisal'];
      toast.success(`${typeLabel} draft created! Publishing will use 1 team credit.`);
      
      // Open the Beacon report edit page in a new tab
      if (data.urls?.edit) {
        window.open(data.urls.edit, '_blank');
      }
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