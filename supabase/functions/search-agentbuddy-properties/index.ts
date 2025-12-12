import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with, x-api-key',
};

/**
 * Property-level search endpoint for Beacon to call
 * Enables bi-directional linking by allowing Beacon to find AgentBuddy properties by address
 * 
 * Request body:
 * - apiKey: string (required) - Beacon API key for authentication
 * - teamId: string (required) - AgentBuddy team UUID
 * - address: string (optional) - Address to search for
 * - suburb: string (optional) - Suburb to filter by
 * - beaconPropertySlug: string (optional) - Find by existing Beacon link
 * 
 * Response:
 * - properties: Array of matching properties with lifecycle info
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('search-agentbuddy-properties function started');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const expectedApiKey = Deno.env.get('BEACON_FEEDBACK_API_KEY'); // Reuse feedback key for Beacon-to-AB calls

    if (!expectedApiKey) {
      console.error('Missing API key configuration');
      return new Response(
        JSON.stringify({ success: false, error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { apiKey, teamId, address, suburb, beaconPropertySlug } = body;

    // Validate API key
    if (!apiKey || apiKey !== expectedApiKey) {
      console.error('Invalid API key');
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!teamId) {
      return new Response(
        JSON.stringify({ success: false, error: 'teamId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!address && !beaconPropertySlug) {
      return new Response(
        JSON.stringify({ success: false, error: 'Either address or beaconPropertySlug is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify team exists
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      console.error('Team not found:', teamError);
      return new Response(
        JSON.stringify({ success: false, error: 'Team not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build properties query
    let propertiesQuery = supabase
      .from('properties')
      .select('id, address, suburb, region, latitude, longitude, beacon_property_slug, team_id, created_at')
      .eq('team_id', teamId);

    // Search by beacon slug if provided
    if (beaconPropertySlug) {
      propertiesQuery = propertiesQuery.eq('beacon_property_slug', beaconPropertySlug);
    } 
    // Otherwise search by address (fuzzy match)
    else if (address) {
      // Normalize address for search
      const normalizedAddress = address.toLowerCase().trim();
      propertiesQuery = propertiesQuery.ilike('address', `%${normalizedAddress}%`);
    }

    // Add suburb filter if provided
    if (suburb) {
      propertiesQuery = propertiesQuery.ilike('suburb', `%${suburb}%`);
    }

    const { data: properties, error: propertiesError } = await propertiesQuery.limit(20);

    if (propertiesError) {
      console.error('Error querying properties:', propertiesError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to search properties' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enrich with lifecycle stage info for each property
    const enrichedProperties = await Promise.all((properties || []).map(async (property) => {
      // Get appraisal info
      const { data: appraisals } = await supabase
        .from('logged_appraisals')
        .select('id, stage, outcome, intent, appraisal_date, vendor_name, vendor_email, vendor_mobile')
        .eq('property_id', property.id)
        .order('appraisal_date', { ascending: false })
        .limit(1);

      // Get listing/opportunity info
      const { data: listings } = await supabase
        .from('listings_pipeline')
        .select('id, stage, warmth, estimated_value, likelihood')
        .eq('property_id', property.id)
        .limit(1);

      // Get transaction info
      const { data: transactions } = await supabase
        .from('transactions')
        .select('id, stage, sale_price, settlement_date')
        .eq('property_id', property.id)
        .limit(1);

      // Get beacon reports count
      const { count: beaconReportsCount } = await supabase
        .from('beacon_reports')
        .select('id', { count: 'exact', head: true })
        .eq('property_id', property.id);

      // Get owners from the latest appraisal
      const latestAppraisal = appraisals?.[0];
      const owners = latestAppraisal ? [{
        name: latestAppraisal.vendor_name || '',
        email: latestAppraisal.vendor_email || '',
        phone: latestAppraisal.vendor_mobile || '',
      }] : [];

      // Determine current lifecycle stage
      let lifecycleStage = 'unknown';
      if (transactions?.length) {
        lifecycleStage = 'transaction';
      } else if (listings?.length) {
        lifecycleStage = 'opportunity';
      } else if (appraisals?.length) {
        lifecycleStage = 'appraisal';
      }

      return {
        agentbuddyPropertyId: property.id,
        address: property.address,
        suburb: property.suburb,
        region: property.region,
        latitude: property.latitude,
        longitude: property.longitude,
        beaconPropertySlug: property.beacon_property_slug,
        isLinkedToBeacon: !!property.beacon_property_slug,
        lifecycleStage,
        beaconReportsCount: beaconReportsCount || 0,
        appraisal: latestAppraisal ? {
          id: latestAppraisal.id,
          stage: latestAppraisal.stage,
          outcome: latestAppraisal.outcome,
          intent: latestAppraisal.intent,
          date: latestAppraisal.appraisal_date,
        } : null,
        opportunity: listings?.[0] ? {
          id: listings[0].id,
          stage: listings[0].stage,
          warmth: listings[0].warmth,
          estimatedValue: listings[0].estimated_value,
          likelihood: listings[0].likelihood,
        } : null,
        transaction: transactions?.[0] ? {
          id: transactions[0].id,
          stage: transactions[0].stage,
          salePrice: transactions[0].sale_price,
          settlementDate: transactions[0].settlement_date,
        } : null,
        owners,
        createdAt: property.created_at,
      };
    }));

    console.log(`Found ${enrichedProperties.length} properties matching search`);

    return new Response(
      JSON.stringify({
        success: true,
        teamId,
        teamName: team.name,
        properties: enrichedProperties,
        total: enrichedProperties.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in search-agentbuddy-properties:', error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
