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

  // OAuth-style Connect to Beacon (enables + auto-syncs)
  const connectToBeacon = useMutation({
    mutationFn: async () => {
      if (!team?.id || !user?.id) throw new Error('Team or user not found');

      // Step 1: Enable the integration
      const { data, error } = await supabase
        .from('integration_settings')
        .upsert({
          team_id: team.id,
          integration_name: 'beacon',
          enabled: true,
          connected_at: new Date().toISOString(),
          connected_by: user.id,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'team_id,integration_name',
        })
        .select()
        .single();

      if (error) throw error;

      // Step 2: Auto-sync team to Beacon
      await syncTeamToBeacon.mutateAsync(team.id);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-settings', team?.id] });
      toast.success('Connected to Beacon! Your team is ready to create reports.');
    },
    onError: (error) => {
      console.error('Failed to connect to Beacon:', error);
      toast.error('Failed to connect to Beacon');
    },
  });

  // Disconnect from Beacon
  const disconnectBeacon = useMutation({
    mutationFn: async () => {
      if (!team?.id) throw new Error('Team not found');

      const { error } = await supabase
        .from('integration_settings')
        .update({
          enabled: false,
          updated_at: new Date().toISOString(),
        })
        .eq('team_id', team.id)
        .eq('integration_name', 'beacon');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-settings', team?.id] });
      toast.success('Disconnected from Beacon');
    },
    onError: (error) => {
      console.error('Failed to disconnect from Beacon:', error);
      toast.error('Failed to disconnect');
    },
  });

  // Legacy toggle (kept for backward compatibility)
  const toggleBeaconIntegration = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (enabled) {
        return connectToBeacon.mutateAsync();
      } else {
        return disconnectBeacon.mutateAsync();
      }
    },
    onError: (error) => {
      console.error('Failed to toggle Beacon:', error);
      toast.error('Failed to update integration settings');
    },
  });

  // Create a Beacon report - supports both appraisal-based and property-based creation
  const createBeaconReport = useMutation({
    mutationFn: async ({ 
      appraisalId, 
      propertyId,
      reportType = 'appraisal',
      // Direct params for creating without appraisal
      address,
      suburb,
      owners,
      teamId,
    }: { 
      appraisalId?: string; 
      propertyId?: string;
      reportType?: BeaconReportType;
      address?: string;
      suburb?: string;
      owners?: Array<{ id: string; name: string; email?: string; phone?: string; is_primary: boolean }>;
      teamId?: string;
    }) => {
      console.log('createBeaconReport: Starting mutation', { appraisalId, propertyId, reportType });
      
      const { data, error } = await supabase.functions.invoke('create-beacon-report', {
        body: { 
          appraisalId, 
          propertyId,
          reportType,
          address,
          suburb,
          owners,
          teamId,
        },
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

  // Fetch all team reports for Historic Import
  const fetchAllTeamReports = async (teamId: string) => {
    console.log('fetchAllTeamReports:', { teamId });
    
    const { data, error } = await supabase.functions.invoke('fetch-all-beacon-reports', {
      body: { teamId, includeLinked: false },
    });

    if (error) throw error;
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch reports');
    }
    
    return data.reports || [];
  };

  // Sync owner contact details to Beacon
  const syncOwnerToBeacon = useMutation({
    mutationFn: async ({ externalLeadId, ownerName, ownerEmail, ownerPhone }: {
      externalLeadId: string;
      ownerName?: string;
      ownerEmail?: string;
      ownerPhone?: string;
    }) => {
      console.log('syncOwnerToBeacon:', { externalLeadId, ownerName, ownerEmail, ownerPhone });
      
      const { data, error } = await supabase.functions.invoke('sync-beacon-owner', {
        body: { externalLeadId, ownerName, ownerEmail, ownerPhone },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to sync owner');
      return data;
    },
    onSuccess: () => {
      toast.success('Vendor details synced to Beacon');
    },
    onError: (error) => {
      console.error('Failed to sync owner to Beacon:', error);
      toast.error('Failed to sync vendor details');
    },
  });

  return {
    isBeaconEnabled,
    isLoadingSettings,
    integrationSettings,
    toggleBeaconIntegration,
    connectToBeacon,
    isConnecting: connectToBeacon.isPending,
    disconnectBeacon,
    isDisconnecting: disconnectBeacon.isPending,
    createBeaconReport,
    isCreatingReport: createBeaconReport.isPending,
    linkBeaconReport,
    isLinkingReport: linkBeaconReport.isPending,
    searchBeaconReports,
    fetchAllTeamReports,
    syncOwnerToBeacon,
    isSyncingOwner: syncOwnerToBeacon.isPending,
    syncTeamToBeacon,
    isSyncingTeam: syncTeamToBeacon.isPending,
    teamId: team?.id,
  };
};