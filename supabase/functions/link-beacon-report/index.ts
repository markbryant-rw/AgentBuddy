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

    const { 
      appraisalId, 
      propertyId,
      reportId, 
      propertySlug, 
      reportType,
      // Additional property info for direct linking (without appraisal)
      address,
      teamId,
    } = await req.json();
    
    console.log(`Linking Beacon report - appraisalId: ${appraisalId}, propertyId: ${propertyId}, reportId: ${reportId}`);

    // Require either appraisalId OR (propertyId + address + teamId)
    if (!appraisalId && (!propertyId || !address || !teamId)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Either appraisalId or (propertyId, address, teamId) is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!reportId && !propertySlug) {
      return new Response(
        JSON.stringify({ success: false, error: 'Either reportId or propertySlug is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let effectivePropertyId = propertyId;
    let effectiveAddress = address;
    let effectiveTeamId = teamId;
    let appraisal: any = null;

    // If appraisalId provided, fetch appraisal data
    if (appraisalId) {
      const { data: appraisalData, error: appraisalError } = await supabase
        .from('logged_appraisals')
        .select('*')
        .eq('id', appraisalId)
        .single();

      if (appraisalError || !appraisalData) {
        console.error('Appraisal not found:', appraisalError);
        return new Response(
          JSON.stringify({ success: false, error: 'Appraisal not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      appraisal = appraisalData;
      effectivePropertyId = appraisal.property_id || propertyId;
      effectiveAddress = appraisal.address;
      effectiveTeamId = appraisal.team_id;
    }

    // Call Beacon API to link the report - team-centric authentication
    const endpoint = `${beaconApiUrl}/link-report-to-agentbuddy`;
    console.log('Calling Beacon API:', endpoint);
    
    // Build payload with team-centric auth (not agent email based)
    // Include stable agentbuddyPropertyId for property-level linking
    const beaconPayload: Record<string, string> = {
      apiKey: beaconApiKey,
      teamId: effectiveTeamId,
      externalLeadId: appraisalId || effectivePropertyId,
      agentbuddyPropertyId: effectivePropertyId, // Stable property UUID for cross-reference
      address: effectiveAddress,
    };

    // Add optional vendor fields from appraisal if available
    // NOTE: Beacon API expects vendorName/vendorEmail/vendorPhone (not ownerName)
    if (appraisal) {
      if (appraisal.vendor_name) beaconPayload.vendorName = appraisal.vendor_name;
      if (appraisal.vendor_email) beaconPayload.vendorEmail = appraisal.vendor_email;
      if (appraisal.vendor_mobile) beaconPayload.vendorPhone = appraisal.vendor_mobile;
    }
    
    // Either reportId or propertySlug
    if (reportId) {
      beaconPayload.reportId = reportId;
    } else if (propertySlug) {
      beaconPayload.propertySlug = propertySlug;
      if (reportType) beaconPayload.reportType = reportType;
    }

    const beaconResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Environment': 'production',
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
    console.log('Beacon link response:', JSON.stringify(beaconData, null, 2));

    if (!beaconData.success) {
      return new Response(
        JSON.stringify({ success: false, error: beaconData.error || 'Beacon API error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract fields using camelCase (Beacon v2.0 response format)
    const linkedReportId = beaconData.reportId;
    const linkedReportType = beaconData.reportType || 'market_appraisal';
    const editUrl = beaconData.urls?.edit || beaconData.reportUrl;
    const personalizedUrl = beaconData.urls?.personalizedLink || beaconData.personalizedUrl;
    const beaconPropertySlug = beaconData.propertySlug; // Property-level cross-reference

    // Validate we got the required reportId
    if (!linkedReportId) {
      console.error('Beacon response missing reportId. Full response:', JSON.stringify(beaconData, null, 2));
      return new Response(
        JSON.stringify({ success: false, error: 'Beacon response missing report ID' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log warning if propertySlug is missing - this prevents property-level linking
    if (!beaconPropertySlug) {
      console.warn('WARNING: Beacon response missing propertySlug - property-level linking will not work');
      console.warn('Full Beacon response:', JSON.stringify(beaconData, null, 2));
    }

    console.log('Extracted report data:', { linkedReportId, linkedReportType, editUrl, personalizedUrl, beaconPropertySlug });

    // Insert or update report in beacon_reports table with property_id
    const { data: existingReport } = await supabase
      .from('beacon_reports')
      .select('id')
      .eq('beacon_report_id', linkedReportId)
      .maybeSingle();

    if (!existingReport) {
      const { error: insertError } = await supabase
        .from('beacon_reports')
        .insert({
          appraisal_id: appraisalId || null,
          property_id: effectivePropertyId,
          beacon_report_id: linkedReportId,
          report_type: linkedReportType,
          report_url: editUrl,
          personalized_url: personalizedUrl,
          created_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('Failed to insert beacon report:', insertError);
      }
    } else {
      // Update existing report with property_id if missing
      const { error: updateError } = await supabase
        .from('beacon_reports')
        .update({
          property_id: effectivePropertyId,
          appraisal_id: appraisalId || null,
        })
        .eq('id', existingReport.id);

      if (updateError) {
        console.error('Failed to update beacon report:', updateError);
      }
    }

    // Store beacon_property_slug on the properties table for property-level linking
    if (beaconPropertySlug && effectivePropertyId) {
      const { error: propertyUpdateError } = await supabase
        .from('properties')
        .update({ beacon_property_slug: beaconPropertySlug })
        .eq('id', effectivePropertyId);

      if (propertyUpdateError) {
        console.error('Failed to update property with beacon_property_slug:', propertyUpdateError);
      } else {
        console.log('Stored beacon_property_slug on property:', beaconPropertySlug);
      }
    }

    // Update the appraisal with report info if appraisalId provided
    if (appraisalId) {
      const { error: updateError } = await supabase
        .from('logged_appraisals')
        .update({
          beacon_report_id: linkedReportId,
          beacon_report_url: editUrl,
          beacon_personalized_url: personalizedUrl,
          beacon_synced_at: new Date().toISOString(),
        })
        .eq('id', appraisalId);

      if (updateError) {
        console.error('Failed to update appraisal:', updateError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: beaconData.message || 'Report linked successfully',
        reportId: linkedReportId,
        propertyId: effectivePropertyId,
        propertySlug: beaconPropertySlug, // Return for UI reference
        reportUrl: editUrl,
        personalizedUrl: personalizedUrl,
        address: beaconData.address,
        reportType: linkedReportType,
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