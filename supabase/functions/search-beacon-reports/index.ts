import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { isDemoEmail } from "../_shared/demoCheck.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('search-beacon-reports function started');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
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

    const { address, ownerName, ownerEmail, teamId } = await req.json();
    
    console.log(`Searching Beacon reports for: ${address || ownerName || ownerEmail}, teamId: ${teamId}`);

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

    // Call Beacon API to search for reports - standalone endpoint per v2.0 spec (camelCase params)
    const searchParams = new URLSearchParams();
    searchParams.append('apiKey', beaconApiKey);
    searchParams.append('teamId', teamId);
    if (address) searchParams.append('address', address);
    if (ownerName) searchParams.append('ownerName', ownerName);
    if (ownerEmail) searchParams.append('ownerEmail', ownerEmail);

    const endpoint = `${beaconApiUrl}/search-reports?${searchParams.toString()}`;
    console.log('Calling Beacon search API:', endpoint);
    
    const beaconResponse = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!beaconResponse.ok) {
      // If search endpoint doesn't exist, return empty results gracefully
      if (beaconResponse.status === 404) {
        console.log('Beacon search endpoint not found - returning empty results');
        return new Response(
          JSON.stringify({ success: true, reports: [], message: 'Search not available' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const errorText = await beaconResponse.text();
      console.error('Beacon search error:', beaconResponse.status, errorText);
      
      // Handle team not synced error
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error === 'TEAM_NOT_SYNCED') {
          return new Response(
            JSON.stringify({ success: false, error: 'Team not synced to Beacon. Please enable Beacon integration first.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch {
        // Not JSON, continue with generic error
      }
      
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to search Beacon reports' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const beaconData = await beaconResponse.json();
    console.log('Beacon search response:', beaconData);

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
      JSON.stringify({ success: false, error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});