import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const beaconApiKey = Deno.env.get('BEACON_API_KEY');

    // Validate API key from Beacon
    const providedApiKey = req.headers.get('X-API-Key') || req.headers.get('x-api-key');
    const webhookSource = req.headers.get('X-Webhook-Source') || req.headers.get('x-webhook-source');
    
    if (!providedApiKey || providedApiKey !== beaconApiKey) {
      console.error('Invalid or missing API key');
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log webhook source for debugging
    console.log('Webhook received from source:', webhookSource);

    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json();
    console.log('Beacon webhook received:', JSON.stringify(payload));

    const { event, externalLeadId, data } = payload;

    if (!externalLeadId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing externalLeadId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the appraisal to verify it exists and get current data
    const { data: appraisal, error: fetchError } = await supabase
      .from('logged_appraisals')
      .select('id, user_id, address, vendor_name, beacon_is_hot_lead, beacon_first_viewed_at')
      .eq('id', externalLeadId)
      .single();

    if (fetchError || !appraisal) {
      console.error('Appraisal not found:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Appraisal not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update appraisal with engagement data
    const updateData: Record<string, any> = {
      beacon_propensity_score: data.propensityScore || 0,
      beacon_total_views: data.totalViews || 0,
      beacon_total_time_seconds: data.totalTimeSeconds || 0,
      beacon_email_opens: data.emailOpenCount || 0,
      beacon_is_hot_lead: data.isHotLead || false,
      beacon_last_activity: data.lastActivity || new Date().toISOString(),
    };

    // Set first viewed at only if not already set
    if (data.firstViewedAt && !(appraisal as any).beacon_first_viewed_at) {
      updateData.beacon_first_viewed_at = data.firstViewedAt;
    }

    // Set report sent at when Beacon signals it was sent
    if (data.reportSentAt) {
      updateData.beacon_report_sent_at = data.reportSentAt;
    }

    const { error: updateError } = await supabase
      .from('logged_appraisals')
      .update(updateData)
      .eq('id', externalLeadId);

    if (updateError) {
      console.error('Failed to update appraisal:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update appraisal' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert individual engagement events if provided
    if (data.events && Array.isArray(data.events) && data.events.length > 0) {
      const eventsToInsert = data.events.map((evt: any) => ({
        appraisal_id: externalLeadId,
        event_type: evt.type || 'view',
        occurred_at: evt.occurredAt,
        duration_seconds: evt.durationSeconds || 0,
        metadata: evt.metadata || {},
      }));

      // Use upsert to avoid duplicates (based on unique constraint)
      const { error: eventsError } = await supabase
        .from('beacon_engagement_events')
        .upsert(eventsToInsert, {
          onConflict: 'appraisal_id,event_type,occurred_at',
          ignoreDuplicates: true,
        });

      if (eventsError) {
        console.error('Failed to insert engagement events:', eventsError);
        // Don't fail the whole request, just log
      } else {
        console.log(`Inserted ${eventsToInsert.length} engagement events`);
      }
    }

    // Also update listings_pipeline if appraisal was converted
    const { data: listing } = await supabase
      .from('listings_pipeline')
      .select('id')
      .eq('appraisal_id', externalLeadId)
      .maybeSingle();

    if (listing) {
      await supabase
        .from('listings_pipeline')
        .update({
          beacon_propensity_score: data.propensityScore || 0,
          beacon_is_hot_lead: data.isHotLead || false,
          beacon_last_activity: data.lastActivity || new Date().toISOString(),
        })
        .eq('id', listing.id);
    }

    // Create notification for hot lead event (only if newly hot)
    if (event === 'hot_lead' && data.isHotLead && !appraisal.beacon_is_hot_lead) {
      console.log('Creating hot lead notification for user:', appraisal.user_id);
      
      await supabase
        .from('notifications')
        .insert({
          user_id: appraisal.user_id,
          title: '🔥 Hot Lead Alert!',
          message: `${appraisal.vendor_name || 'A vendor'} at ${appraisal.address} has high engagement with their Beacon report!`,
          type: 'hot_lead',
          action_url: `/prospect-appraisals?appraisal=${externalLeadId}`,
        });
    }

    console.log(`Successfully processed ${event} event for appraisal ${externalLeadId}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
