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

// Beacon expects: appraisal, proposal, campaign
export type BeaconReportType = 'appraisal' | 'proposal' | 'campaign';

export const REPORT_TYPE_LABELS: Record<BeaconReportType, string> = {
  appraisal: 'Market Appraisal',
  proposal: 'Proposal',
  campaign: 'Campaign Update',
};

export const REPORT_TYPE_ICONS: Record<BeaconReportType, string> = {
  appraisal: '📊',
  proposal: '📝',
  campaign: '🔄',
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

  // Sync team to Beacon - exposed as mutation for manual re-sync
  const syncTeamToBeacon = useMutation({
    mutationFn: async (teamId: string) => {
      console.log('syncTeamToBeacon: Starting sync for team', teamId);
      const { data, error } = await supabase.functions.invoke('sync-beacon-team', {
        body: { teamId },
      });
      
      if (error) {
        console.error('Failed to sync team to Beacon:', error);
        throw error;
      }
      
      console.log('syncTeamToBeacon: Response', data);
      return data;
    },
    onSuccess: () => {
      toast.success('Team synced with Beacon successfully');
    },
    onError: (error) => {
      console.error('Error syncing team to Beacon:', error);
      toast.error('Failed to sync team with Beacon');
    },
  });

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
        await syncTeamToBeacon.mutateAsync(team.id);
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
    mutationFn: async ({ appraisalId, reportType = 'appraisal' }: { appraisalId: string; reportType?: BeaconReportType }) => {
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
      
      const typeLabel = REPORT_TYPE_LABELS[reportType || 'appraisal'];
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

  // Link an existing Beacon report to an appraisal
  const linkBeaconReport = useMutation({
    mutationFn: async ({ appraisalId, reportId, propertySlug, reportType }: { 
      appraisalId: string; 
      reportId?: string; 
      propertySlug?: string;
      reportType?: string;
    }) => {
      console.log('linkBeaconReport: Starting mutation', { appraisalId, reportId, propertySlug });
      
      const { data, error } = await supabase.functions.invoke('link-beacon-report', {
        body: { appraisalId, reportId, propertySlug, reportType },
      });

      console.log('linkBeaconReport: Response', { data, error });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to link report');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logged_appraisals'] });
      queryClient.invalidateQueries({ queryKey: ['beacon_reports'] });
      toast.success('Beacon report linked successfully!');
    },
    onError: (error: Error) => {
      console.error('Failed to link Beacon report:', error);
      if (error.message.includes('not found')) {
        toast.error('Report not found in Beacon');
      } else {
        toast.error('Failed to link Beacon report');
      }
    },
  });

  // Search for existing Beacon reports
  const searchBeaconReports = async (params: { address?: string; ownerName?: string; ownerEmail?: string }) => {
    if (!team?.id) {
      console.error('searchBeaconReports: No team ID available');
      throw new Error('Team not found');
    }
    
    console.log('searchBeaconReports:', { ...params, teamId: team.id });
    
    const { data, error } = await supabase.functions.invoke('search-beacon-reports', {
      body: { ...params, teamId: team.id },
    });

    if (error) throw error;
    
    // Handle team not synced error
    if (!data.success && data.error?.includes('not synced')) {
      throw new Error('Team not synced to Beacon. Please enable Beacon integration first.');
    }
    
    return data?.reports || [];
  };

  return {
    isBeaconEnabled,
    isLoadingSettings,
    integrationSettings,
    toggleBeaconIntegration,
    createBeaconReport,
    isCreatingReport: createBeaconReport.isPending,
    linkBeaconReport,
    isLinkingReport: linkBeaconReport.isPending,
    searchBeaconReports,
    syncTeamToBeacon,
    isSyncingTeam: syncTeamToBeacon.isPending,
    teamId: team?.id,
  };
};