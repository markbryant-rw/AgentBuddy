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
    console.log('link-beacon-report function started');
    
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

    // Return mock response for demo users
    if (isDemoEmail(user.email)) {
      console.log('Demo user - returning mock link response');
      return new Response(
        JSON.stringify({
          success: true,
          demo: true,
          message: 'Report linking is simulated in demo mode',
          report_id: 'demo-linked-report',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { appraisalId, reportId, propertySlug, reportType } = await req.json();
    
    console.log(`Linking Beacon report for appraisal: ${appraisalId}`);

    if (!appraisalId) {
      return new Response(
        JSON.stringify({ success: false, error: 'appraisalId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!reportId && !propertySlug) {
      return new Response(
        JSON.stringify({ success: false, error: 'Either reportId or propertySlug is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // Call Beacon API to link the report
    const endpoint = `${beaconApiUrl}/link-report-to-agentbuddy`;
    console.log('Calling Beacon API:', endpoint);
    
    const beaconPayload: Record<string, string> = {
      apiKey: beaconApiKey,
      lead_id: appraisalId,
      owner_name: appraisal.vendor_name || 'Property Owner',
    };

    // Add optional fields
    if (appraisal.vendor_email) beaconPayload.owner_email = appraisal.vendor_email;
    if (appraisal.vendor_mobile) beaconPayload.owner_mobile = appraisal.vendor_mobile;
    
    // Either reportId or propertySlug
    if (reportId) {
      beaconPayload.report_id = reportId;
    } else if (propertySlug) {
      beaconPayload.property_slug = propertySlug;
      if (reportType) beaconPayload.report_type = reportType;
    }

    const beaconResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(beaconPayload),
    });

    if (!beaconResponse.ok) {
      const errorText = await beaconResponse.text();
      console.error('Beacon API error:', beaconResponse.status, errorText);
      
      if (beaconResponse.status === 404) {
        return new Response(
          JSON.stringify({ success: false, error: 'Report not found in Beacon' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to link Beacon report' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const beaconData = await beaconResponse.json();
    console.log('Beacon link response:', beaconData);

    if (!beaconData.success) {
      return new Response(
        JSON.stringify({ success: false, error: beaconData.error || 'Beacon API error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert or update report in beacon_reports table
    const { data: existingReport } = await supabase
      .from('beacon_reports')
      .select('id')
      .eq('appraisal_id', appraisalId)
      .eq('beacon_report_id', beaconData.report_id)
      .maybeSingle();

    if (!existingReport) {
      const { error: insertError } = await supabase
        .from('beacon_reports')
        .insert({
          appraisal_id: appraisalId,
          beacon_report_id: beaconData.report_id,
          report_type: beaconData.report_type || 'market_appraisal',
          report_url: beaconData.report_url,
          personalized_url: beaconData.report_url,
          created_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('Failed to insert beacon report:', insertError);
      }
    }

    // Update the appraisal with report info
    const { error: updateError } = await supabase
      .from('logged_appraisals')
      .update({
        beacon_report_id: beaconData.report_id,
        beacon_report_url: beaconData.report_url,
        beacon_personalized_url: beaconData.report_url,
        beacon_synced_at: new Date().toISOString(),
      })
      .eq('id', appraisalId);

    if (updateError) {
      console.error('Failed to update appraisal:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: beaconData.message || 'Report linked to AgentBuddy lead',
        reportId: beaconData.report_id,
        reportUrl: beaconData.report_url,
        address: beaconData.address,
        reportType: beaconData.report_type,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error linking Beacon report:', error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});