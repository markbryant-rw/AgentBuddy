import { supabase } from '@/integrations/supabase/client';

/**
 * Triggers a Beacon team sync when team membership changes.
 * This is a non-blocking operation - failures are logged but don't affect the main operation.
 * 
 * Sync triggers automatically on:
 * - Team member added
 * - Team member removed
 * - Invitation accepted
 * - Beacon integration enabled
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
      // Don't throw - this is a background sync, shouldn't block the main action
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
