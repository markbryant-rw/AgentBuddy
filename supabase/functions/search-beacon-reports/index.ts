import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { isDemoEmail } from "../_shared/demoCheck.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
};

// Self-healing: Auto-sync team to Beacon when not synced
async function autoSyncTeamToBeacon(
  teamId: string,
  beaconApiUrl: string,
  beaconApiKey: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<boolean> {
  console.log('autoSyncTeamToBeacon: Auto-syncing team', teamId);
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Fetch team data
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      console.error('autoSyncTeamToBeacon: Team not found:', teamError);
      return false;
    }

    // Fetch team members with profile info
    const { data: members, error: membersError } = await supabase
      .from('team_members')
      .select(`
        user_id,
        access_level,
        profiles:user_id (
          email,
          full_name,
          mobile
        )
      `)
      .eq('team_id', teamId);

    if (membersError) {
      console.error('autoSyncTeamToBeacon: Failed to fetch members:', membersError);
      return false;
    }

    // Format members for Beacon API
    const formattedMembers = (members || [])
      .filter((m: any) => m.profiles)
      .map((m: any) => ({
        email: m.profiles.email,
        name: m.profiles.full_name || m.profiles.email,
        phone: m.profiles.mobile || '',
        role: m.access_level || 'member',
      }));

    console.log('autoSyncTeamToBeacon: Syncing', formattedMembers.length, 'members');

    // Call Beacon sync endpoint
    const syncResponse = await fetch(`${beaconApiUrl}/sync-team-from-agentbuddy`, {
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

    if (!syncResponse.ok) {
      const errorText = await syncResponse.text();
      console.error('autoSyncTeamToBeacon: Beacon sync failed:', errorText);
      return false;
    }

    console.log('autoSyncTeamToBeacon: Team synced successfully');
    return true;
  } catch (error) {
    console.error('autoSyncTeamToBeacon: Error:', error);
    return false;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('search-beacon-reports function started');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const beaconApiUrl = Deno.env.get('BEACON_API_URL');
    const beaconApiKey = Deno.env.get('BEACON_API_KEY');

    if (!beaconApiUrl || !beaconApiKey) {
      console.error('Missing Beacon API configuration');
      return new Response(
        JSON.stringify({ success: false, error: 'Beacon integration not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return empty for demo users
    if (isDemoEmail(user.email)) {
      console.log('Demo user - returning empty search results');
      return new Response(
        JSON.stringify({ success: true, demo: true, reports: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { address, ownerName, ownerEmail, teamId, linkedStatus } = await req.json();
    
    console.log(`Searching Beacon reports for: ${address || ownerName || ownerEmail}, teamId: ${teamId}, linkedStatus: ${linkedStatus || 'all'}`);

    if (!teamId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Team ID is required for searching reports' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!address && !ownerName && !ownerEmail) {
      return new Response(
        JSON.stringify({ success: false, error: 'At least one search parameter required (address, ownerName, or ownerEmail)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build search params
    const searchParams = new URLSearchParams();
    searchParams.append('apiKey', beaconApiKey);
    searchParams.append('teamId', teamId);
    if (address) searchParams.append('address', address);
    if (ownerName) searchParams.append('ownerName', ownerName);
    if (ownerEmail) searchParams.append('ownerEmail', ownerEmail);
    if (linkedStatus) searchParams.append('linkedStatus', linkedStatus);

    const endpoint = `${beaconApiUrl}/search-reports?${searchParams.toString()}`;
    console.log('Calling Beacon search API');
    
    let beaconResponse = await fetch(endpoint, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    // Self-healing: If team not synced, attempt auto-sync once, otherwise return friendly error
    if (!beaconResponse.ok && beaconResponse.status === 400) {
      const errorText = await beaconResponse.text();
      console.log('Beacon search error:', errorText);
      
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error === 'TEAM_NOT_SYNCED') {
          console.log('Team not synced - attempting auto-sync...');
          
          const syncSuccess = await autoSyncTeamToBeacon(
            teamId,
            beaconApiUrl,
            beaconApiKey,
            supabaseUrl,
            supabaseKey
          );
          
          if (syncSuccess) {
            console.log('Auto-sync successful, retrying search...');
            beaconResponse = await fetch(endpoint, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
            });
          } else {
            console.log('Auto-sync failed; returning friendly error');
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: 'TEAM_SYNC_FAILED',
                message: 'Beacon could not sync this team (likely missing a team leader).'
              }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      } catch {
        // Not JSON or other error; fall through to generic handler
      }
    }

    if (!beaconResponse.ok) {
      // If search endpoint doesn't exist, return empty results gracefully
      if (beaconResponse.status === 404) {
        console.log('Beacon search endpoint not found - returning empty results');
        return new Response(
          JSON.stringify({ success: true, reports: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.error('Beacon search error:', beaconResponse.status);
      return new Response(
        JSON.stringify({ success: false, error: 'Could not search reports' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const beaconData = await beaconResponse.json();
    console.log('Beacon search found', beaconData.reports?.length || 0, 'reports');

    return new Response(
      JSON.stringify({
        success: true,
        reports: beaconData.reports || [],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error searching Beacon reports:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Search temporarily unavailable' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
