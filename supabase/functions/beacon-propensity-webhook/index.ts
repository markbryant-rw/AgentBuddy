import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-webhook-source, x-idempotency-key',
};

// Map Beacon selling plans to readable text
const SELLING_PLANS_MAP: Record<string, string> = {
  'next_3_months': 'Thinking of selling in the next 3 months',
  'next_6_months': 'Thinking of selling in the next 6 months',
  'next_12_months': 'Thinking of selling in the next 12 months',
  'not_sure': 'Not sure about timing',
  'just_curious': 'Just curious about property value',
};

const WANTS_MORE_INFO_MAP: Record<string, string> = {
  'recent_sales': 'Recent sales in my area',
  'market_trends': 'Market trends and timing advice',
  'property_improvements': 'Property improvements to maximize value',
  'selling_process': 'Information about the selling process',
};

function formatBeaconSurveyNote(data: any): string {
  const feedbackDate = data.feedbackSubmittedAt 
    ? new Date(data.feedbackSubmittedAt).toLocaleDateString('en-NZ', { month: 'short', day: 'numeric', year: 'numeric' })
    : new Date().toLocaleDateString('en-NZ', { month: 'short', day: 'numeric', year: 'numeric' });
  
  const lines: string[] = [`📋 Beacon Survey Response (${feedbackDate})`];
  lines.push('');
  
  if (data.usefulnessRating) {
    lines.push(`⭐ Rating: ${data.usefulnessRating}/5 stars`);
  }
  
  if (data.sellingPlans) {
    const planText = SELLING_PLANS_MAP[data.sellingPlans] || data.sellingPlans;
    lines.push(`📅 Selling Plans: ${planText}`);
  }
  
  if (data.wantsMoreInfo && data.wantsMoreInfo.length > 0) {
    const infoItems = data.wantsMoreInfo.map((item: string) => WANTS_MORE_INFO_MAP[item] || item);
    lines.push(`📚 Wants More Info: ${infoItems.join(', ')}`);
  }
  
  if (data.questionsComments) {
    lines.push(`💬 Comments: "${data.questionsComments}"`);
  }
  
  // Add high intent indicator
  const isHighIntent = data.sellingPlans === 'next_3_months' || data.sellingPlans === 'next_6_months';
  if (isHighIntent) {
    lines.push('');
    lines.push('🔥 High Intent Lead');
  }
  
  return lines.join('\n');
}

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
    const idempotencyKey = req.headers.get('X-Idempotency-Key') || req.headers.get('x-idempotency-key');
    
    if (!providedApiKey || providedApiKey !== beaconApiKey) {
      console.error('Invalid or missing API key');
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Webhook received from source:', webhookSource, 'idempotency:', idempotencyKey);

    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json();
    console.log('Beacon webhook received:', JSON.stringify(payload));

    const { event, externalLeadId, data, timestamp } = payload;
    
    // Beacon sends reportType in data, not at top level
    const reportType = data?.reportType || 'appraisal';

    // Handle feedback_submitted event - Create appraisal note with survey data
    if (event === 'feedback_submitted') {
      console.log('Processing feedback_submitted event for lead:', externalLeadId);
      
      if (!externalLeadId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing externalLeadId for feedback_submitted' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch the appraisal to verify it exists and get user_id for notification
      const { data: appraisal, error: fetchError } = await supabase
        .from('logged_appraisals')
        .select('id, user_id, address, vendor_name')
        .eq('id', externalLeadId)
        .single();

      if (fetchError || !appraisal) {
        console.error('Appraisal not found for feedback:', fetchError);
        return new Response(
          JSON.stringify({ success: false, error: 'Appraisal not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Format survey as readable note
      const noteContent = formatBeaconSurveyNote(data);

      // Insert into appraisal_notes
      const { error: noteError } = await supabase
        .from('appraisal_notes')
        .insert({
          appraisal_id: externalLeadId,
          author_id: null, // System-generated
          source: 'beacon_survey',
          content: noteContent,
          metadata: data, // Store raw survey data
        });

      if (noteError) {
        console.error('Failed to create appraisal note:', noteError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create note' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Created appraisal note from Beacon survey for:', externalLeadId);

      // Create notification for high-intent leads
      const isHighIntent = data.sellingPlans === 'next_3_months' || data.sellingPlans === 'next_6_months';
      if (isHighIntent) {
        await supabase
          .from('notifications')
          .insert({
            user_id: appraisal.user_id,
            title: '🔥 High Intent Survey Response!',
            message: `${appraisal.vendor_name || 'A vendor'} at ${appraisal.address} submitted a survey indicating they want to sell soon!`,
            type: 'beacon_survey',
            action_url: `/prospect-appraisals?appraisal=${externalLeadId}`,
          });
        console.log('Created high intent notification for user:', appraisal.user_id);
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Survey feedback saved as note' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle owner_added event - Beacon created a new owner, update appraisal
    if (event === 'owner_added') {
      console.log('Processing owner_added event for lead:', externalLeadId);
      
      if (!externalLeadId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing externalLeadId for owner_added' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update appraisal with owner info from Beacon
      const ownerUpdate: Record<string, any> = {};
      if (data?.ownerName) ownerUpdate.vendor_name = data.ownerName;
      if (data?.ownerEmail) ownerUpdate.vendor_email = data.ownerEmail;
      if (data?.ownerPhone) ownerUpdate.vendor_mobile = data.ownerPhone;

      if (Object.keys(ownerUpdate).length > 0) {
        const { error: updateError } = await supabase
          .from('logged_appraisals')
          .update(ownerUpdate)
          .eq('id', externalLeadId);

        if (updateError) {
          console.error('Failed to update appraisal with owner info:', updateError);
        } else {
          console.log('Updated appraisal with owner info from Beacon');
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Owner info synced' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle report_sent event - update sent_at timestamp
    if (event === 'report_sent') {
      console.log('Processing report_sent event for lead:', externalLeadId);
      
      if (!externalLeadId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing externalLeadId for report_sent' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const sentAt = data?.sentAt || new Date().toISOString();

      // Update the specific beacon_report
      const reportTypeMap: Record<string, string> = {
        'appraisal': 'market_appraisal',
        'proposal': 'proposal',
        'campaign': 'update',
      };
      const mappedReportType = reportTypeMap[reportType] || 'market_appraisal';

      await supabase
        .from('beacon_reports')
        .update({ sent_at: sentAt })
        .eq('appraisal_id', externalLeadId)
        .eq('report_type', mappedReportType);

      // Also update the appraisal's beacon_report_sent_at
      await supabase
        .from('logged_appraisals')
        .update({ beacon_report_sent_at: sentAt })
        .eq('id', externalLeadId);

      return new Response(
        JSON.stringify({ success: true, message: 'Report sent timestamp updated' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!externalLeadId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing externalLeadId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the appraisal to verify it exists
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

    // Map Beacon reportType to our report_type values
    const reportTypeMap: Record<string, string> = {
      'appraisal': 'market_appraisal',
      'proposal': 'proposal',
      'campaign': 'update',
    };
    const mappedReportType = reportTypeMap[reportType] || 'market_appraisal';

    // Find the most recent report matching externalLeadId + reportType
    const { data: matchingReport } = await supabase
      .from('beacon_reports')
      .select('*')
      .eq('appraisal_id', externalLeadId)
      .eq('report_type', mappedReportType)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Update the specific beacon_report if found
    if (matchingReport) {
      const reportUpdateData: Record<string, any> = {
        propensity_score: data.propensityScore || 0,
        total_views: data.totalViews || 0,
        total_time_seconds: data.totalTimeSeconds || 0,
        email_opens: data.emailOpenCount || 0,
        is_hot_lead: data.isHotLead || (data.propensityScore >= 70),
        last_activity: data.lastActivity || data.lastViewedAt || new Date().toISOString(),
      };

      // Set first viewed at only if provided and not already set
      if (data.firstViewedAt && !matchingReport.first_viewed_at) {
        reportUpdateData.first_viewed_at = data.firstViewedAt;
      }

      // Set report sent at when Beacon signals it was sent
      if (data.reportSentAt && !matchingReport.sent_at) {
        reportUpdateData.sent_at = data.reportSentAt;
      }

      // Handle proposal events
      if (event === 'proposal_accepted' && data.proposalAcceptedAt) {
        reportUpdateData.proposal_accepted_at = data.proposalAcceptedAt;
      }
      if (event === 'proposal_declined') {
        if (data.proposalDeclinedAt) reportUpdateData.proposal_declined_at = data.proposalDeclinedAt;
        if (data.proposalDeclineReason) reportUpdateData.proposal_decline_reason = data.proposalDeclineReason;
      }
      if (event === 'campaign_started' && data.campaignStartedAt) {
        reportUpdateData.campaign_started_at = data.campaignStartedAt;
      }
      if (data.daysOnMarket !== undefined) {
        reportUpdateData.days_on_market = data.daysOnMarket;
      }

      const { error: reportUpdateError } = await supabase
        .from('beacon_reports')
        .update(reportUpdateData)
        .eq('id', matchingReport.id);

      if (reportUpdateError) {
        console.error('Failed to update beacon_report:', reportUpdateError);
      } else {
        console.log(`Updated beacon_report ID: ${matchingReport.id} for type: ${mappedReportType}`);
      }
    } else {
      // Auto-create beacon_reports record if we have reportId from webhook
      if (payload.reportId) {
        console.log(`Auto-creating beacon_reports record for appraisal ${externalLeadId}`);
        const { error: insertError } = await supabase
          .from('beacon_reports')
          .insert({
            appraisal_id: externalLeadId,
            beacon_report_id: payload.reportId,
            report_url: payload.reportUrl || null,
            personalized_url: payload.personalizedUrl || null,
            report_type: mappedReportType,
            propensity_score: data.propensityScore || 0,
            total_views: data.totalViews || 0,
            total_time_seconds: data.totalTimeSeconds || 0,
            email_opens: data.emailOpenCount || 0,
            is_hot_lead: data.isHotLead || (data.propensityScore >= 70),
            first_viewed_at: data.firstViewedAt || null,
            last_activity: data.lastActivity || data.lastViewedAt || new Date().toISOString(),
            sent_at: data.reportSentAt || null,
          });

        if (insertError) {
          console.error('Failed to auto-create beacon_report:', insertError);
        } else {
          console.log(`Auto-created beacon_report for appraisal ${externalLeadId} type ${mappedReportType}`);
        }
      } else {
        console.log(`No matching report found and no reportId provided for appraisal ${externalLeadId} type ${mappedReportType}`);
      }
    }

    // Calculate aggregate metrics from ALL reports for this appraisal
    const { data: allReports } = await supabase
      .from('beacon_reports')
      .select('*')
      .eq('appraisal_id', externalLeadId);

    let bestPropensity = 0;
    let totalViews = 0;
    let totalTimeSeconds = 0;
    let totalEmailOpens = 0;
    let anyHotLead = false;
    let latestActivity: string | null = null;
    let earliestFirstViewed: string | null = null;

    if (allReports && allReports.length > 0) {
      for (const report of allReports) {
        if ((report.propensity_score || 0) > bestPropensity) {
          bestPropensity = report.propensity_score || 0;
        }
        totalViews += report.total_views || 0;
        totalTimeSeconds += report.total_time_seconds || 0;
        totalEmailOpens += report.email_opens || 0;
        if (report.is_hot_lead) anyHotLead = true;
        if (report.last_activity && (!latestActivity || report.last_activity > latestActivity)) {
          latestActivity = report.last_activity;
        }
        if (report.first_viewed_at && (!earliestFirstViewed || report.first_viewed_at < earliestFirstViewed)) {
          earliestFirstViewed = report.first_viewed_at;
        }
      }
    } else {
      // Fallback to current event data if no reports found
      bestPropensity = data.propensityScore || 0;
      totalViews = data.totalViews || 0;
      totalTimeSeconds = data.totalTimeSeconds || 0;
      totalEmailOpens = data.emailOpenCount || 0;
      anyHotLead = data.isHotLead || (data.propensityScore >= 70);
      latestActivity = data.lastActivity || data.lastViewedAt || new Date().toISOString();
      earliestFirstViewed = data.firstViewedAt;
    }

    const appraisalUpdateData: Record<string, any> = {
      beacon_propensity_score: bestPropensity,
      beacon_total_views: totalViews,
      beacon_total_time_seconds: totalTimeSeconds,
      beacon_email_opens: totalEmailOpens,
      beacon_is_hot_lead: anyHotLead,
      beacon_last_activity: latestActivity,
    };

    // Set first viewed at only if not already set
    if (earliestFirstViewed && !(appraisal as any).beacon_first_viewed_at) {
      appraisalUpdateData.beacon_first_viewed_at = earliestFirstViewed;
    }

    // Set report sent at when Beacon signals it was sent
    if (data.reportSentAt) {
      appraisalUpdateData.beacon_report_sent_at = data.reportSentAt;
    }

    const { error: updateError } = await supabase
      .from('logged_appraisals')
      .update(appraisalUpdateData)
      .eq('id', externalLeadId);

    if (updateError) {
      console.error('Failed to update appraisal:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update appraisal' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert individual engagement events with idempotency (upsert with unique constraint)
    if (data.events && Array.isArray(data.events) && data.events.length > 0) {
      const eventsToInsert = data.events.map((evt: any) => ({
        appraisal_id: externalLeadId,
        event_type: evt.type || 'view',
        occurred_at: evt.occurredAt,
        duration_seconds: evt.durationSeconds || 0,
        metadata: { 
          ...(evt.metadata || {}), 
          reportType: mappedReportType,
          linkUrl: evt.linkUrl,
          linkLabel: evt.linkLabel,
        },
      }));

      // Use upsert with ON CONFLICT to handle idempotency
      const { error: eventsError } = await supabase
        .from('beacon_engagement_events')
        .upsert(eventsToInsert, {
          onConflict: 'appraisal_id,event_type,occurred_at',
          ignoreDuplicates: true,
        });

      if (eventsError) {
        console.error('Failed to insert engagement events:', eventsError);
      } else {
        console.log(`Processed ${eventsToInsert.length} engagement events`);
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
          beacon_propensity_score: bestPropensity,
          beacon_is_hot_lead: anyHotLead,
          beacon_last_activity: latestActivity,
        })
        .eq('id', listing.id);
    }

    // Create notifications for important events
    const wasHotLead = appraisal.beacon_is_hot_lead;
    
    // Hot lead notification (only if newly hot)
    if (event === 'hot_lead' && anyHotLead && !wasHotLead) {
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

    // Proposal accepted notification
    if (event === 'proposal_accepted') {
      await supabase
        .from('notifications')
        .insert({
          user_id: appraisal.user_id,
          title: '✅ Proposal Accepted!',
          message: `${appraisal.vendor_name || 'The vendor'} at ${appraisal.address} has accepted your proposal!`,
          type: 'proposal_accepted',
          action_url: `/prospect-appraisals?appraisal=${externalLeadId}`,
        });
    }

    // Proposal declined notification
    if (event === 'proposal_declined') {
      await supabase
        .from('notifications')
        .insert({
          user_id: appraisal.user_id,
          title: '❌ Proposal Declined',
          message: `${appraisal.vendor_name || 'The vendor'} at ${appraisal.address} declined the proposal${data.proposalDeclineReason ? `: ${data.proposalDeclineReason}` : ''}.`,
          type: 'proposal_declined',
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
