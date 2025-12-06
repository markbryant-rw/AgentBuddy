import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    const { appraisalId } = await req.json();
    console.log(`Creating Beacon report for appraisal: ${appraisalId}`);

    // Fetch appraisal data
    const { data: appraisal, error: appraisalError } = await supabase
      .from('logged_appraisals')
      .select('*')
      .eq('id', appraisalId)
      .single();

    if (appraisalError || !appraisal) {
      console.error('Appraisal not found:', appraisalError);
      return new Response(
        JSON.stringify({ success: false, error: 'Appraisal not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if report already exists
    if (appraisal.beacon_report_id) {
      return new Response(
        JSON.stringify({
          success: true,
          existing: true,
          reportId: appraisal.beacon_report_id,
          urls: {
            edit: appraisal.beacon_report_url,
            publicLink: appraisal.beacon_report_url,
            personalizedLink: appraisal.beacon_personalized_url,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Beacon API to create report
    console.log('Calling Beacon API:', `${beaconApiUrl}/create-report-from-agentbuddy`);
    const beaconResponse = await fetch(`${beaconApiUrl}/create-report-from-agentbuddy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: beaconApiKey,
        agentEmail: user.email,
        address: appraisal.address,
        ownerName: appraisal.vendor_name || 'Property Owner',
        ownerEmail: appraisal.vendor_email || '',
        ownerMobile: appraisal.vendor_mobile || '',
        externalLeadId: appraisalId,
        specs: {},
        highlights: [],
        notes: appraisal.notes || '',
      }),
    });

    if (!beaconResponse.ok) {
      const errorText = await beaconResponse.text();
      console.error('Beacon API error:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create Beacon report' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const beaconData = await beaconResponse.json();
    console.log('Beacon response:', beaconData);

    if (!beaconData.success) {
      return new Response(
        JSON.stringify({ success: false, error: beaconData.error || 'Beacon API error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update appraisal with Beacon report data
    const { error: updateError } = await supabase
      .from('logged_appraisals')
      .update({
        beacon_report_id: beaconData.reportId,
        beacon_report_url: beaconData.urls?.edit || beaconData.urls?.publicLink,
        beacon_personalized_url: beaconData.urls?.personalizedLink,
        beacon_synced_at: new Date().toISOString(),
      })
      .eq('id', appraisalId);

    if (updateError) {
      console.error('Failed to update appraisal:', updateError);
      // Report was created but we failed to save - still return success
    }

    return new Response(
      JSON.stringify({
        success: true,
        existing: beaconData.existing || false,
        reportId: beaconData.reportId,
        ownerId: beaconData.ownerId,
        urls: beaconData.urls,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error creating Beacon report:', error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
