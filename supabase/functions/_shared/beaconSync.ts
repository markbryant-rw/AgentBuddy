import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Triggers a Beacon team sync when team membership changes.
 * This is a non-blocking operation - failures are logged but don't affect the main operation.
 * 
 * @param supabase - Supabase client (must have service role for cross-function calls)
 * @param teamId - The team to sync
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

    // Fetch team data
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      console.error('Team not found for Beacon sync:', teamError);
      return;
    }

    // Fetch team members with their profiles
    const { data: members, error: membersError } = await supabase
      .from('team_members')
      .select(`
        id,
        user_id,
        access_level,
        profiles:user_id (
          id,
          email,
          full_name,
          mobile,
          avatar_url
        )
      `)
      .eq('team_id', teamId);

    if (membersError) {
      console.error('Failed to fetch team members for Beacon sync:', membersError);
      return;
    }

    // Format members for Beacon API
    const formattedMembers = (members || []).map(member => {
      const profile = member.profiles as any;
      return {
        user_id: member.user_id,
        member_id: member.id,
        email: profile?.email || '',
        full_name: profile?.full_name || '',
        phone: profile?.mobile || '',
        avatar_url: profile?.avatar_url || '',
        is_team_leader: member.access_level === 'admin',
      };
    });

    // Call Beacon API to sync team
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
        members: formattedMembers,
      }),
    });

    if (!beaconResponse.ok) {
      const errorText = await beaconResponse.text();
      console.error('Beacon API sync error:', errorText);
      // Don't throw - this is a background sync
    } else {
      const beaconData = await beaconResponse.json();
      console.log('Beacon team sync successful:', beaconData);
    }
  } catch (error) {
    console.error('Error triggering Beacon team sync:', error);
    // Don't throw - background sync failure shouldn't affect main operation
  }
};
