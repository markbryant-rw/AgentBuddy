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
        JSON.stringify({ error: 'Only platform admins can unpause agencies' }),
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

    // Check agency exists and is paused
    const { data: agency, error: agencyError } = await supabaseAdmin
      .from('agencies')
      .select('id, name, account_status, pause_date, scheduled_deletion_date')
      .eq('id', agencyId)
      .single();

    if (agencyError || !agency) {
      return new Response(
        JSON.stringify({ error: 'Agency not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (agency.account_status !== 'paused') {
      return new Response(
        JSON.stringify({ error: 'Agency is not paused' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Reactivate agency
    const { error: updateError } = await supabaseAdmin
      .from('agencies')
      .update({
        account_status: 'active',
        pause_date: null,
        scheduled_deletion_date: null
      })
      .eq('id', agencyId);

    if (updateError) {
      console.error('Failed to unpause agency:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to unpause agency' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log to audit_logs
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'account_reactivated',
        table_name: 'agencies',
        record_id: agencyId,
        agency_id: agencyId,
        details: {
          agency_name: agency.name,
          reason: reason || 'No reason provided',
          was_paused_at: agency.pause_date,
          was_scheduled_for_deletion: agency.scheduled_deletion_date
        }
      });

    console.log(`Agency ${agency.name} reactivated by ${user.email}`);

    return new Response(
      JSON.stringify({
        success: true,
        agencyId,
        agencyName: agency.name
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in unpause-agency:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
