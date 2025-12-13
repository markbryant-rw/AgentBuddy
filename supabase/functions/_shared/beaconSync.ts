import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Triggers a Beacon team sync (initial registration only).
 * Sends just team_id + team_name + apiKey.
 * No member syncing - Beacon manages agent profiles internally.
 */
export const triggerBeaconTeamSync = async (
  supabase: SupabaseClient,
  teamId: string
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
      console.log('Beacon integration not enabled for team, skipping sync');
      return;
    }

    console.log('Triggering Beacon team sync for team:', teamId);

    // Get Beacon API configuration
    const beaconApiUrl = Deno.env.get('BEACON_API_URL');
    const beaconApiKey = Deno.env.get('BEACON_API_KEY');

    if (!beaconApiUrl || !beaconApiKey) {
      console.log('Beacon API not configured, skipping sync');
      return;
    }

    // Fetch team data (just name, no members)
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      console.error('Team not found for Beacon sync:', teamError);
      return;
    }

    // Call Beacon API to register/sync team (no members array)
    const endpoint = `${beaconApiUrl}/sync-team-from-agentbuddy`;
    console.log('Calling Beacon API for team sync:', endpoint);

    const beaconResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Environment': 'production',
      },
      body: JSON.stringify({
        apiKey: beaconApiKey,
        team_id: teamId,
        team_name: team.name,
        // No members array - Beacon manages agent profiles internally
      }),
    });

    if (!beaconResponse.ok) {
      const errorText = await beaconResponse.text();
      console.error('Beacon API team sync error:', errorText);
    } else {
      const beaconData = await beaconResponse.json();
      console.log('Beacon team sync successful:', beaconData);
    }
  } catch (error) {
    console.error('Error triggering Beacon team sync:', error);
    // Don't throw - background sync failure shouldn't affect main operation
  }
};
