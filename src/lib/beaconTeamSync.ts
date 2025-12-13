import { supabase } from '@/integrations/supabase/client';

interface BeaconMemberChange {
  action: 'add' | 'remove' | 'update' | 'rename';
  member: {
    user_id: string;
    email: string;
    full_name: string;
    phone?: string;
    is_team_leader: boolean;
  };
}

/**
 * Sends an incremental team member change to Beacon via edge function.
 * Use this for individual member add/remove/update operations.
 */
export const sendBeaconMemberChange = async (
  teamId: string,
  change: BeaconMemberChange
): Promise<void> => {
  try {
    // Check if Beacon integration is enabled for this team
    const { data: integrationSettings } = await supabase
      .from('integration_settings')
      .select('enabled')
      .eq('team_id', teamId)
      .eq('integration_name', 'beacon')
      .maybeSingle();

    if (!integrationSettings?.enabled) {
      console.log('Beacon integration not enabled for team, skipping member change');
      return;
    }

    console.log(`Sending Beacon member change: ${change.action} for ${change.member.email}`);
    
    const { error } = await supabase.functions.invoke('beacon-member-webhook', {
      body: { teamId, ...change },
    });

    if (error) {
      console.error('Beacon member change failed:', error);
      // Fallback to full sync on error
      console.log('Falling back to full team sync...');
      await triggerBeaconTeamSync(teamId);
    } else {
      console.log('Beacon member change sent successfully');
    }
  } catch (error) {
    console.error('Error sending Beacon member change:', error);
    // Don't throw - background sync failure shouldn't affect main operation
  }
};

/**
 * Triggers a full Beacon team sync.
 * Use this for:
 * - Initial integration enable
 * - Manual resync
 * - Error recovery/fallback
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

    console.log('Triggering full Beacon team sync for team:', teamId);
    
    const { error } = await supabase.functions.invoke('sync-beacon-team', {
      body: { teamId },
    });

    if (error) {
      console.error('Beacon full team sync failed:', error);
    } else {
      console.log('Beacon full team sync triggered successfully');
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
