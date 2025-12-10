import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
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
    const { appraisalId, beaconReportId } = await req.json();

    if (!appraisalId) {
      return new Response(
        JSON.stringify({ success: false, error: 'appraisalId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user has access to this appraisal
    const { data: appraisal, error: appraisalError } = await supabase
      .from('logged_appraisals')
      .select('id, user_id, team_id, beacon_report_id')
      .eq('id', appraisalId)
      .single();

    if (appraisalError || !appraisal) {
      return new Response(
        JSON.stringify({ success: false, error: 'Appraisal not found or access denied' }),
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
      console.log('Demo user - returning mock data');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Demo mode - sync simulated',
          data: { propensityScore: 75, totalViews: 5, emailOpens: 2 }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the beacon report to sync
    const reportIdToSync = beaconReportId || appraisal.beacon_report_id;

    if (!reportIdToSync) {
      // Try to find from beacon_reports table
      const { data: linkedReport } = await supabase
        .from('beacon_reports')
        .select('beacon_report_id')
        .eq('appraisal_id', appraisalId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!linkedReport?.beacon_report_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'No Beacon report linked to this appraisal' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const finalReportId = reportIdToSync;

    // Call Beacon API to fetch latest engagement data
    console.log('Fetching engagement from Beacon for report:', finalReportId);
    
    const beaconUrl = `${beaconApiUrl}/get-report-engagement?apiKey=${beaconApiKey}&reportId=${finalReportId}`;
    
    const beaconResponse = await fetch(beaconUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!beaconResponse.ok) {
      const errorText = await beaconResponse.text();
      console.error('Beacon API error:', beaconResponse.status, errorText);
      
      return new Response(
        JSON.stringify({ success: false, error: `Beacon API error: ${errorText}` }),
        { status: beaconResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const beaconData = await beaconResponse.json();
    console.log('Beacon engagement data received:', JSON.stringify(beaconData));

    // Use service role for updates to bypass RLS
    const serviceSupabase = createClient(supabaseUrl, serviceRoleKey);

    // Update beacon_reports table
    const reportUpdateData: Record<string, any> = {
      propensity_score: beaconData.propensityScore || 0,
      total_views: beaconData.totalViews || 0,
      total_time_seconds: beaconData.totalTimeSeconds || 0,
      email_opens: beaconData.emailOpenCount || beaconData.emailOpens || 0,
      is_hot_lead: beaconData.isHotLead || (beaconData.propensityScore >= 70),
      last_activity: beaconData.lastActivity || beaconData.lastViewedAt || new Date().toISOString(),
    };

    if (beaconData.firstViewedAt) {
      reportUpdateData.first_viewed_at = beaconData.firstViewedAt;
    }

    // Update beacon_reports matching this appraisal
    const { error: reportError } = await serviceSupabase
      .from('beacon_reports')
      .update(reportUpdateData)
      .eq('appraisal_id', appraisalId);

    if (reportError) {
      console.error('Error updating beacon_reports:', reportError);
    }

    // Also update the appraisal's beacon_* fields for fallback display
    const appraisalUpdateData: Record<string, any> = {
      beacon_propensity_score: beaconData.propensityScore || 0,
      beacon_total_views: beaconData.totalViews || 0,
      beacon_total_time_seconds: beaconData.totalTimeSeconds || 0,
      beacon_email_opens: beaconData.emailOpenCount || beaconData.emailOpens || 0,
      beacon_is_hot_lead: beaconData.isHotLead || (beaconData.propensityScore >= 70),
      beacon_last_activity: beaconData.lastActivity || beaconData.lastViewedAt || new Date().toISOString(),
      beacon_synced_at: new Date().toISOString(),
    };

    if (beaconData.firstViewedAt) {
      appraisalUpdateData.beacon_first_viewed_at = beaconData.firstViewedAt;
    }

    const { error: appraisalUpdateError } = await serviceSupabase
      .from('logged_appraisals')
      .update(appraisalUpdateData)
      .eq('id', appraisalId);

    if (appraisalUpdateError) {
      console.error('Error updating appraisal beacon fields:', appraisalUpdateError);
    }

    console.log('Successfully synced Beacon engagement for appraisal:', appraisalId);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Engagement data synced from Beacon',
        data: {
          propensityScore: beaconData.propensityScore || 0,
          totalViews: beaconData.totalViews || 0,
          totalTimeSeconds: beaconData.totalTimeSeconds || 0,
          emailOpens: beaconData.emailOpenCount || beaconData.emailOpens || 0,
          isHotLead: beaconData.isHotLead || (beaconData.propensityScore >= 70),
          lastActivity: beaconData.lastActivity || beaconData.lastViewedAt,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error syncing Beacon engagement:', error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
