import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Owner {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  is_primary: boolean;
  beacon_owner_id?: string;
}

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

    // Get request body - supports both single owner (legacy) and multi-owner format
    const { externalLeadId, ownerName, ownerEmail, ownerPhone, owners } = await req.json();

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

    // Build owners array for Beacon API
    let ownersPayload: Array<{ name: string; email?: string; phone?: string; isPrimary: boolean }> = [];
    
    if (owners && Array.isArray(owners) && owners.length > 0) {
      // Multi-owner format
      ownersPayload = owners.map((o: Owner) => ({
        name: o.name,
        email: o.email || '',
        phone: o.phone || '',
        isPrimary: o.is_primary || false,
      }));
    } else if (ownerName) {
      // Legacy single-owner format
      ownersPayload = [{
        name: ownerName,
        email: ownerEmail || '',
        phone: ownerPhone || '',
        isPrimary: true,
      }];
    }

    if (ownersPayload.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No owner data provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Beacon's sync-owner-from-agentbuddy endpoint with multi-owner support
    const beaconUrl = `${beaconApiUrl}/sync-owner-from-agentbuddy`;
    console.log('Syncing owners to Beacon:', beaconUrl, { externalLeadId, ownerCount: ownersPayload.length });

    const beaconResponse = await fetch(beaconUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: beaconApiKey,
        externalLeadId,
        owners: ownersPayload,
        // Also send primary owner for backward compatibility
        ownerName: ownersPayload.find(o => o.isPrimary)?.name || ownersPayload[0]?.name,
        ownerEmail: ownersPayload.find(o => o.isPrimary)?.email || ownersPayload[0]?.email,
        ownerPhone: ownersPayload.find(o => o.isPrimary)?.phone || ownersPayload[0]?.phone,
      }),
    });

    if (!beaconResponse.ok) {
      const errorText = await beaconResponse.text();
      console.error('Beacon API error:', beaconResponse.status, errorText);
      
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to sync owners to Beacon' }),
        { status: beaconResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const beaconData = await beaconResponse.json();
    console.log('Owners synced to Beacon:', beaconData);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Owner contact details synced to Beacon',
        ownerCount: ownersPayload.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error syncing owners to Beacon:', error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});