import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { getCorsHeaders, corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is platform admin
    const { data: roles, error: rolesError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'platform_admin')
      .is('revoked_at', null);

    if (rolesError || !roles || roles.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Only platform admins can stop impersonation' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { impersonatedUserId } = await req.json();

    // Find the active impersonation session
    const { data: activeSession, error: sessionError } = await supabaseClient
      .from('admin_impersonation_log')
      .select('id, started_at')
      .eq('admin_id', user.id)
      .eq('impersonated_user_id', impersonatedUserId)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (sessionError || !activeSession) {
      console.error('No active impersonation session found:', sessionError);
      return new Response(
        JSON.stringify({ error: 'No active impersonation session found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update the session with end time
    const { error: updateError } = await supabaseClient
      .from('admin_impersonation_log')
      .update({
        ended_at: new Date().toISOString(),
      })
      .eq('id', activeSession.id);

    if (updateError) {
      console.error('Failed to update impersonation log:', updateError);
    }

    // Log to audit_logs
    await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'stop_impersonation',
        target_user_id: impersonatedUserId,
        details: {
          session_id: activeSession.id,
          duration_minutes: Math.round((Date.now() - new Date(activeSession.started_at).getTime()) / 60000),
        },
      });

    return new Response(
      JSON.stringify({
        success: true,
        sessionDurationMinutes: Math.round((Date.now() - new Date(activeSession.started_at).getTime()) / 60000),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in stop-impersonation:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to stop impersonation' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
