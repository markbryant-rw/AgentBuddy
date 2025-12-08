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

    const { address, ownerName, ownerEmail } = await req.json();
    
    console.log(`Searching Beacon reports for: ${address || ownerName || ownerEmail}`);

    if (!address && !ownerName && !ownerEmail) {
      return new Response(
        JSON.stringify({ success: false, error: 'At least one search parameter required (address, ownerName, or ownerEmail)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Beacon API to search for reports
    // Note: This assumes Beacon has a search endpoint - adjust URL as needed
    const searchParams = new URLSearchParams();
    searchParams.append('api_key', beaconApiKey);
    if (address) searchParams.append('address', address);
    if (ownerName) searchParams.append('owner_name', ownerName);
    if (ownerEmail) searchParams.append('owner_email', ownerEmail);

    const endpoint = `${beaconApiUrl}/search-reports?${searchParams.toString()}`;
    console.log('Calling Beacon search API');
    
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