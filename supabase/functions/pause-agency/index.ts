import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create authenticated client to verify user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Auth client to verify user
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Service role client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify platform admin role
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .is('revoked_at', null);

    const isPlatformAdmin = roles?.some(r => r.role === 'platform_admin');
    if (!isPlatformAdmin) {
      return new Response(
        JSON.stringify({ error: 'Only platform admins can pause agencies' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { agencyId, reason } = await req.json();
    if (!agencyId) {
      return new Response(
        JSON.stringify({ error: 'agencyId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check agency exists and is active
    const { data: agency, error: agencyError } = await supabaseAdmin
      .from('agencies')
      .select('id, name, account_status')
      .eq('id', agencyId)
      .single();

    if (agencyError || !agency) {
      return new Response(
        JSON.stringify({ error: 'Agency not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (agency.account_status === 'paused') {
      return new Response(
        JSON.stringify({ error: 'Agency is already paused' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate deletion date (30 days from now)
    const pauseDate = new Date();
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 30);

    // Update agency status
    const { error: updateError } = await supabaseAdmin
      .from('agencies')
      .update({
        account_status: 'paused',
        pause_date: pauseDate.toISOString(),
        scheduled_deletion_date: deletionDate.toISOString()
      })
      .eq('id', agencyId);

    if (updateError) {
      console.error('Failed to pause agency:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to pause agency' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log to audit_logs
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'account_paused',
        table_name: 'agencies',
        record_id: agencyId,
        agency_id: agencyId,
        details: {
          agency_name: agency.name,
          reason: reason || 'No reason provided',
          scheduled_deletion_date: deletionDate.toISOString()
        }
      });

    console.log(`Agency ${agency.name} paused by ${user.email}. Deletion scheduled for ${deletionDate.toISOString()}`);

    return new Response(
      JSON.stringify({
        success: true,
        agencyId,
        agencyName: agency.name,
        pauseDate: pauseDate.toISOString(),
        scheduledDeletionDate: deletionDate.toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in pause-agency:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
