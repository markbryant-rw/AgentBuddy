import { supabase } from '@/integrations/supabase/client';

/**
 * Triggers a Beacon team sync (initial registration only).
 * Sends just team_id + team_name.
 * No member syncing - Beacon manages agent profiles internally.
 */
export const triggerBeaconTeamSync = async (teamId: string): Promise<void> => {
  try {
    // Check if Beacon integration is enabled for this team
    const { data: integrationSettings } = await supabase
      .from('integration_settings')
      .select('enabled')
      .eq('team_id', teamId)
      .eq('integration_name', 'beacon')
      .maybeSingle();

    if (!integrationSettings?.enabled) {
      console.log('Beacon integration not enabled for team, skipping sync');
      return;
    }

    console.log('Triggering Beacon team sync for team:', teamId);
    
    const { error } = await supabase.functions.invoke('sync-beacon-team', {
      body: { teamId },
    });

    if (error) {
      console.error('Beacon team sync failed:', error);
    } else {
      console.log('Beacon team sync triggered successfully');
    }
  } catch (error) {
    console.error('Error triggering Beacon team sync:', error);
    // Don't throw - background sync failure shouldn't affect main operation
  }
};

/**
 * Checks if Beacon integration is enabled for a team
 */
export const isBeaconEnabledForTeam = async (teamId: string): Promise<boolean> => {
  try {
    const { data } = await supabase
      .from('integration_settings')
      .select('enabled')
      .eq('team_id', teamId)
      .eq('integration_name', 'beacon')
      .maybeSingle();

    return data?.enabled ?? false;
  } catch (error) {
    console.error('Error checking Beacon status:', error);
    return false;
  }
};
