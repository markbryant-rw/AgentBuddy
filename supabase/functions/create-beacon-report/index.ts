import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { isDemoEmail } from "../_shared/demoCheck.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
};

interface Owner {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  is_primary: boolean;
  beacon_owner_id?: string;
}

// Helper function to sync team to Beacon
async function syncTeamToBeacon(
  teamId: string,
  beaconApiUrl: string,
  beaconApiKey: string,
  supabase: any
): Promise<boolean> {
  console.log('syncTeamToBeacon: Starting sync for team:', teamId);
  
  try {
    // Fetch team data
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      console.error('syncTeamToBeacon: Team not found:', teamError);
      return false;
    }

    // Fetch team members with profile info
    const { data: members, error: membersError } = await supabase
      .from('team_members')
      .select(`
        user_id,
        access_level,
        profiles:user_id (
          email,
          full_name,
          mobile
        )
      `)
      .eq('team_id', teamId);

    if (membersError) {
      console.error('syncTeamToBeacon: Failed to fetch members:', membersError);
      return false;
    }

    // Format members for Beacon API
    const formattedMembers = (members || [])
      .filter((m: any) => m.profiles)
      .map((m: any) => ({
        email: m.profiles.email,
        name: m.profiles.full_name || m.profiles.email,
        phone: m.profiles.mobile || '',
        role: m.access_level || 'member',
      }));

    console.log('syncTeamToBeacon: Syncing', formattedMembers.length, 'members to Beacon');

    // Call Beacon sync endpoint
    const syncEndpoint = `${beaconApiUrl}/sync-team-from-agentbuddy`;
    const syncResponse = await fetch(syncEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Environment': 'production',
      },
      body: JSON.stringify({
        apiKey: beaconApiKey,
        team_id: teamId,
        team_name: team.name,
        members: formattedMembers,
      }),
    });

    if (!syncResponse.ok) {
      const errorText = await syncResponse.text();
      console.error('syncTeamToBeacon: Beacon sync failed:', errorText);
      return false;
    }

    const syncData = await syncResponse.json();
    console.log('syncTeamToBeacon: Sync successful:', syncData);
    return true;
  } catch (error) {
    console.error('syncTeamToBeacon: Error:', error);
    return false;
  }
}

// Helper function to call Beacon API with auto-retry on "Agent not found"
async function callBeaconWithRetry(
  endpoint: string,
  payload: any,
  teamId: string,
  beaconApiUrl: string,
  beaconApiKey: string,
  supabase: any
): Promise<{ response: Response; retried: boolean }> {
  console.log('callBeaconWithRetry: Making initial request to', endpoint);
  
  // First attempt
  let response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Environment': 'production',
    },
    body: JSON.stringify(payload),
  });

  // If successful, return immediately
  if (response.ok) {
    return { response, retried: false };
  }

  // Check if it's an "Agent not found" error
  const errorText = await response.text();
  console.log('callBeaconWithRetry: First attempt failed:', errorText);

  if (errorText.toLowerCase().includes('agent not found')) {
    console.log('callBeaconWithRetry: Agent not found - triggering team sync...');
    
    // Sync team to Beacon
    const syncSuccess = await syncTeamToBeacon(teamId, beaconApiUrl, beaconApiKey, supabase);
    
    if (syncSuccess) {
      console.log('callBeaconWithRetry: Team sync successful, retrying original request...');
      
      // Retry the original call
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Environment': 'production',
        },
        body: JSON.stringify(payload),
      });
      
      return { response, retried: true };
    } else {
      console.error('callBeaconWithRetry: Team sync failed, cannot retry');
      // Return a synthetic error response since we consumed the original
      return {
        response: new Response(JSON.stringify({ error: 'Agent not found and team sync failed' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }),
        retried: true,
      };
    }
  }

  // For other errors, return synthetic response with the error text
  return {
    response: new Response(errorText, { status: response.status }),
    retried: false,
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('create-beacon-report function started');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const beaconApiUrl = Deno.env.get('BEACON_API_URL');
    const beaconApiKey = Deno.env.get('BEACON_API_KEY');

    console.log('BEACON_API_URL configured:', !!beaconApiUrl, beaconApiUrl ? beaconApiUrl.substring(0, 50) : 'not set');
    console.log('BEACON_API_KEY configured:', !!beaconApiKey);

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

    // Return mock response for demo users - no external API call
    if (isDemoEmail(user.email)) {
      console.log('Demo user - returning mock Beacon report');
      const mockReportId = `demo-report-${Date.now()}`;
      return new Response(
        JSON.stringify({
          success: true,
          demo: true,
          existing: false,
          reportId: mockReportId,
          ownerId: 'demo-owner',
          urls: {
            edit: '#demo-edit',
            publicLink: '#demo-public',
            personalizedLink: '#demo-personalized',
          },
          message: 'Beacon reports are simulated in demo mode',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { 
      appraisalId, 
      propertyId,
      reportType: rawReportType = 'appraisal',
      // Direct params for creating without appraisal
      address,
      suburb,
      owners: directOwners,
      teamId: directTeamId,
    } = await req.json();
    
    // Map AgentBuddy report types to Beacon's expected values
    // Beacon accepts: appraisal, proposal, campaign
    const typeMapping: Record<string, string> = {
      'market_appraisal': 'appraisal',
      'appraisal': 'appraisal',
      'proposal': 'proposal',
      'update': 'campaign',
      'campaign': 'campaign',
    };
    const reportType = typeMapping[rawReportType] || 'appraisal';
    
    console.log(`Creating Beacon report - appraisalId: ${appraisalId}, propertyId: ${propertyId}, type: ${reportType}`);

    let appraisal: any = null;
    let effectivePropertyId = propertyId;
    let effectiveTeamId = directTeamId;
    let effectiveAddress = address;
    let effectiveSuburb = suburb;
    let effectiveOwners = directOwners || [];

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
      effectiveTeamId = appraisal.team_id;
      effectiveAddress = appraisal.address;
      effectiveSuburb = appraisal.suburb;
      effectiveOwners = (appraisal.owners as Owner[]) || [];
      
      // Fall back to legacy vendor fields
      if (effectiveOwners.length === 0 && appraisal.vendor_name) {
        effectiveOwners = [{
          id: crypto.randomUUID(),
          name: appraisal.vendor_name,
          email: appraisal.vendor_email || '',
          phone: appraisal.vendor_mobile || '',
          is_primary: true,
        }];
      }
    }

    // Validate required fields
    if (!effectiveAddress || !effectiveTeamId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: address and teamId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build owners array for Beacon
    const primaryOwner = effectiveOwners.find((o: Owner) => o.is_primary) || effectiveOwners[0];
    
    // Format owners for Beacon API (camelCase)
    const beaconOwners = effectiveOwners.map((o: Owner) => ({
      name: o.name,
      email: o.email || '',
      phone: o.phone || '',
      isPrimary: o.is_primary,
    }));

    // Call Beacon API with auto-retry on "Agent not found"
    const endpoint = `${beaconApiUrl}/create-report-from-agentbuddy`;
    console.log('Calling Beacon API:', endpoint);
    
    const beaconPayload = {
      apiKey: beaconApiKey,
      agentEmail: user.email,
      address: effectiveAddress,
      suburb: effectiveSuburb || '',
      owners: beaconOwners,
      ownerName: primaryOwner?.name || 'Property Owner',
      ownerEmail: primaryOwner?.email || '',
      ownerMobile: primaryOwner?.phone || '',
      externalLeadId: appraisalId || effectivePropertyId,
      agentbuddyPropertyId: effectivePropertyId, // Stable property UUID for cross-reference
      reportType: reportType,
      team_id: effectiveTeamId,
    };

    const { response: beaconResponse, retried } = await callBeaconWithRetry(
      endpoint,
      beaconPayload,
      effectiveTeamId,
      beaconApiUrl,
      beaconApiKey,
      supabase
    );

    if (retried) {
      console.log('Request was retried after team sync');
    }

    if (!beaconResponse.ok) {
      const errorText = await beaconResponse.text();
      console.error('Beacon API error:', errorText);
      console.error('Beacon API status:', beaconResponse.status);
      console.error('Beacon payload was:', JSON.stringify(beaconPayload, null, 2));
      
      // Parse error for more specific message
      let errorDetail = 'Failed to create Beacon report';
      try {
        const parsedError = JSON.parse(errorText);
        if (parsedError.error) errorDetail = parsedError.error;
        if (parsedError.details) errorDetail += `: ${parsedError.details}`;
      } catch {
        if (errorText) errorDetail = errorText;
      }
      
      return new Response(
        JSON.stringify({ success: false, error: errorDetail }),
        { status: beaconResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // Extract property slug from Beacon response for property-level linking
    const beaconPropertySlug = beaconData.propertySlug;
    
    // Check if Beacon returned existing: true (report already exists)
    const isExistingReport = beaconData.existing === true;
    let newReport: any = null;

    // Check if we already have this report in our beacon_reports table
    const { data: existingReport } = await supabase
      .from('beacon_reports')
      .select('id')
      .eq('beacon_report_id', beaconData.reportId)
      .maybeSingle();

    if (existingReport) {
      // Update existing record with latest URLs (in case they changed)
      const { data: updatedReport, error: updateError } = await supabase
        .from('beacon_reports')
        .update({
          report_url: beaconData.urls?.edit || beaconData.urls?.publicLink,
          personalized_url: beaconData.urls?.personalizedLink,
          property_id: effectivePropertyId,
          appraisal_id: appraisalId || null,
        })
        .eq('id', existingReport.id)
        .select()
        .single();

      if (updateError) {
        console.error('Failed to update existing beacon report:', updateError);
      } else {
        newReport = updatedReport;
        console.log('Updated existing beacon_reports record:', existingReport.id);
      }
    } else {
      // Insert new report into beacon_reports table
      const { data: insertedReport, error: insertError } = await supabase
        .from('beacon_reports')
        .insert({
          appraisal_id: appraisalId || null,
          property_id: effectivePropertyId,
          beacon_report_id: beaconData.reportId,
          report_type: reportType,
          report_url: beaconData.urls?.edit || beaconData.urls?.publicLink,
          personalized_url: beaconData.urls?.personalizedLink,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error('Failed to insert beacon report:', insertError);
      } else {
        newReport = insertedReport;
        console.log('Inserted new beacon_reports record');
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

    // Also update the appraisal with latest report info for backwards compatibility (if appraisalId provided)
    if (appraisalId) {
      const { error: updateError } = await supabase
        .from('logged_appraisals')
        .update({
          beacon_report_id: beaconData.reportId,
          beacon_report_url: beaconData.urls?.edit || beaconData.urls?.publicLink,
          beacon_personalized_url: beaconData.urls?.personalizedLink,
          beacon_report_created_at: new Date().toISOString(),
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
        existing: isExistingReport, // Pass through Beacon's existing flag
        reportId: beaconData.reportId,
        ownerId: beaconData.ownerId,
        urls: beaconData.urls,
        reportType: reportType,
        propertySlug: beaconPropertySlug,
        localReportId: newReport?.id,
        ownerCount: beaconOwners.length,
        teamSynced: retried,
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
