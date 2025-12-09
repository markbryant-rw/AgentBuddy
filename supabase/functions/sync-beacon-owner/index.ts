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

    // Get request body - only contact details, NOT address
    const { externalLeadId, ownerName, ownerEmail, ownerPhone } = await req.json();

    if (!externalLeadId) {
      return new Response(
        JSON.stringify({ success: false, error: 'externalLeadId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the appraisal exists and user has access
    const { data: appraisal, error: appraisalError } = await supabase
      .from('logged_appraisals')
      .select('id, team_id, beacon_report_id')
      .eq('id', externalLeadId)
      .single();

    if (appraisalError || !appraisal) {
      return new Response(
        JSON.stringify({ success: false, error: 'Appraisal not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Skip for demo users
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    if (profile?.email === 'demo@agentbuddy.co') {
      console.log('Demo user - skipping sync');
      return new Response(
        JSON.stringify({ success: true, message: 'Demo mode - sync skipped' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Beacon's sync-owner-from-agentbuddy endpoint - standalone endpoint per v2.0 spec
    const beaconUrl = `${beaconApiUrl}/sync-owner-from-agentbuddy`;
    console.log('Syncing owner to Beacon:', beaconUrl, { externalLeadId, ownerName, ownerEmail, ownerPhone });

    const beaconResponse = await fetch(beaconUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: beaconApiKey,
        externalLeadId,
        ownerName,
        ownerEmail,
        ownerPhone,
        // Note: We do NOT send address - per v2.0 spec, address changes are too complex
      }),
    });

    if (!beaconResponse.ok) {
      const errorText = await beaconResponse.text();
      console.error('Beacon API error:', beaconResponse.status, errorText);
      
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to sync owner to Beacon' }),
        { status: beaconResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const beaconData = await beaconResponse.json();
    console.log('Owner synced to Beacon:', beaconData);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Owner contact details synced to Beacon',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error syncing owner to Beacon:', error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
