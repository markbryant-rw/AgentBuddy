import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const beaconApiUrl = Deno.env.get('BEACON_API_URL');
    const beaconApiKey = Deno.env.get('BEACON_API_KEY');

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's team
    const { data: teamMember } = await supabase
      .from('team_members')
      .select('team_id, teams(id, name, license_type)')
      .eq('user_id', user.id)
      .single();

    if (!teamMember?.teams) {
      return new Response(JSON.stringify({ error: 'No team found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle teams as object (single relation)
    const teamsData = teamMember.teams as unknown as { id: string; name: string; license_type: string | null };
    const team = teamsData;

    // Check if team has admin_unlimited license - return immediately without API call
    if (team.license_type === 'admin_unlimited') {
      console.log('Team has admin_unlimited license, returning unlimited status');
      return new Response(JSON.stringify({
        creditsRemaining: 'unlimited',
        subscriptionStatus: 'active',
        planName: 'Founder Unlimited',
        licenseType: 'admin_unlimited',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if Beacon integration is enabled for this team
    const { data: integrationSettings } = await supabase
      .from('integration_settings')
      .select('enabled')
      .eq('team_id', team.id)
      .eq('integration_name', 'beacon')
      .single();

    if (!integrationSettings?.enabled) {
      return new Response(JSON.stringify({
        creditsRemaining: 0,
        subscriptionStatus: 'inactive',
        planName: 'Not Connected',
        licenseType: null,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For non-unlimited teams, fetch from Beacon API
    if (!beaconApiUrl || !beaconApiKey) {
      console.error('Missing Beacon API configuration');
      return new Response(JSON.stringify({
        error: 'Beacon API not configured',
        creditsRemaining: 0,
        subscriptionStatus: 'unknown',
        planName: 'Unknown',
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Call Beacon API to get subscription status
    console.log('Fetching subscription status from Beacon API for team:', team.id);
    
    const beaconResponse = await fetch(`${beaconApiUrl}/get-subscription-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': beaconApiKey,
      },
      body: JSON.stringify({
        agentbuddyTeamId: team.id,
      }),
    });

    if (!beaconResponse.ok) {
      const errorText = await beaconResponse.text();
      console.error('Beacon API error:', beaconResponse.status, errorText);
      
      // Return fallback with team license info
      return new Response(JSON.stringify({
        creditsRemaining: 0,
        subscriptionStatus: 'unknown',
        planName: team.license_type || 'Standard',
        licenseType: team.license_type,
        error: 'Could not fetch from Beacon',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const beaconData = await beaconResponse.json();
    console.log('Beacon subscription data:', beaconData);

    return new Response(JSON.stringify({
      creditsRemaining: beaconData.creditsRemaining ?? 0,
      subscriptionStatus: beaconData.subscriptionStatus ?? 'active',
      planName: beaconData.planName ?? 'Standard',
      licenseType: team.license_type,
      monthlyCredits: beaconData.monthlyCredits,
      creditResetDate: beaconData.creditResetDate,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in fetch-beacon-subscription:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      creditsRemaining: 0,
      subscriptionStatus: 'error',
      planName: 'Error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
