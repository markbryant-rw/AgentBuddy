import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
 * Sends an incremental team member change to Beacon via webhook.
 * Use this for individual member add/remove/update operations.
 * Falls back to full sync if the webhook fails.
 */
export const sendBeaconMemberChange = async (
  supabase: SupabaseClient,
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
      console.log('Beacon integration not enabled for team, skipping member change webhook');
      return;
    }

    const beaconApiUrl = Deno.env.get('BEACON_API_URL');
    const beaconApiKey = Deno.env.get('BEACON_API_KEY');

    if (!beaconApiUrl || !beaconApiKey) {
      console.log('Beacon API not configured, skipping member change webhook');
      return;
    }

    console.log(`Sending Beacon member change webhook: ${change.action} for ${change.member.email}`);

    const endpoint = `${beaconApiUrl}/webhook-team-member-change`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Environment': 'production',
      },
      body: JSON.stringify({
        apiKey: beaconApiKey,
        team_id: teamId,
        action: change.action,
        member: change.member,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Beacon member change webhook failed:', errorText);
      // Fallback to full sync on error
      console.log('Falling back to full team sync...');
      await triggerBeaconTeamSync(supabase, teamId);
    } else {
      const data = await response.json();
      console.log('Beacon member change webhook successful:', data);
    }
  } catch (error) {
    console.error('Error sending Beacon member change webhook:', error);
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

    console.log('Triggering full Beacon team sync for team:', teamId);

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
    console.log('Calling Beacon API for full team sync:', endpoint);

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
      console.error('Beacon API full sync error:', errorText);
    } else {
      const beaconData = await beaconResponse.json();
      console.log('Beacon full team sync successful:', beaconData);
    }
  } catch (error) {
    console.error('Error triggering Beacon team sync:', error);
    // Don't throw - background sync failure shouldn't affect main operation
  }
};
