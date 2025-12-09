import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Auth client to verify user
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } }
    });

    // Service role client for database operations (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is platform admin
    const { data: roles, error: rolesError } = await supabaseAdmin
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

    // Find the active impersonation session using service role
    const { data: activeSession, error: sessionError } = await supabaseAdmin
      .from('admin_impersonation_log')
      .select('id, started_at')
      .eq('admin_id', user.id)
      .eq('impersonated_user_id', impersonatedUserId)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessionError) {
      console.error('Error finding impersonation session:', sessionError);
    }

    if (activeSession) {
      // Update the session with end time
      const { error: updateError } = await supabaseAdmin
        .from('admin_impersonation_log')
        .update({
          ended_at: new Date().toISOString(),
        })
        .eq('id', activeSession.id);

      if (updateError) {
        console.error('Failed to update impersonation log:', updateError);
      }

      const durationMinutes = Math.round((Date.now() - new Date(activeSession.started_at).getTime()) / 60000);

      // Log to audit_logs using service role
      const { error: auditError } = await supabaseAdmin
        .from('audit_logs')
        .insert({
          user_id: user.id,
          action: 'stop_impersonation',
          target_user_id: impersonatedUserId,
          details: {
            session_id: activeSession.id,
            duration_minutes: durationMinutes,
          },
        });

      if (auditError) {
        console.error('Failed to create audit log:', auditError);
      }

      console.log(`Impersonation stopped after ${durationMinutes} minutes`);

      return new Response(
        JSON.stringify({
          success: true,
          sessionDurationMinutes: durationMinutes,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // No active session found - still return success (client-side cleanup)
    console.log('No active impersonation session found, but returning success for client cleanup');
    return new Response(
      JSON.stringify({
        success: true,
        message: 'No active session found, but impersonation ended on client',
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
