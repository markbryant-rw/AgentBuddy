import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const beaconApiUrl = Deno.env.get('BEACON_API_URL');
    const beaconApiKey = Deno.env.get('BEACON_API_KEY');

    if (!beaconApiUrl || !beaconApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Beacon integration not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get request body
    const { teamId, includeLinked = false } = await req.json();

    if (!teamId) {
      return new Response(
        JSON.stringify({ success: false, error: 'teamId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is a member of the team
    const { data: membership, error: membershipError } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (membershipError || !membership) {
      return new Response(
        JSON.stringify({ success: false, error: 'Not a member of this team' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Skip for demo users
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    if (profile?.email === 'demo@agentbuddy.co') {
      console.log('Demo user - returning mock data');
      return new Response(
        JSON.stringify({ 
          success: true, 
          reports: [],
          message: 'Demo mode - no reports available'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Beacon's get-all-team-reports endpoint
    const beaconUrl = `${beaconApiUrl}/functions/v1/get-all-team-reports`;
    console.log('Fetching all team reports from Beacon:', beaconUrl);

    const beaconResponse = await fetch(beaconUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': beaconApiKey,
      },
      body: JSON.stringify({
        teamId,
        includeLinked,
      }),
    });

    if (!beaconResponse.ok) {
      const errorText = await beaconResponse.text();
      console.error('Beacon API error:', beaconResponse.status, errorText);
      
      if (beaconResponse.status === 400 && errorText.includes('TEAM_NOT_SYNCED')) {
        return new Response(
          JSON.stringify({ success: false, error: 'Team not synced with Beacon' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch reports from Beacon' }),
        { status: beaconResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const beaconData = await beaconResponse.json();
    console.log(`Fetched ${beaconData.reports?.length || 0} reports from Beacon`);

    return new Response(
      JSON.stringify({
        success: true,
        reports: beaconData.reports || [],
        totalCount: beaconData.totalCount || beaconData.reports?.length || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error fetching Beacon reports:', error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
