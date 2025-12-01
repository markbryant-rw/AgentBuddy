import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { bugId } = await req.json();
    console.log('Requesting satisfaction for bug:', bugId);

    // Fetch bug details
    const { data: bug, error: bugError } = await supabaseClient
      .from('bug_reports')
      .select('user_id, summary')
      .eq('id', bugId)
      .single();

    if (bugError || !bug) {
      throw new Error('Bug not found');
    }

    // Mark satisfaction as requested
    const { error: updateError } = await supabaseClient
      .from('bug_reports')
      .update({
        satisfaction_requested_at: new Date().toISOString(),
      })
      .eq('id', bugId);

    if (updateError) throw updateError;

    // Create notification for the reporter
    const { error: notifError } = await supabaseClient
      .from('notifications')
      .insert({
        user_id: bug.user_id,
        type: 'bug_satisfaction_request',
        title: 'Bug Fixed - Your Feedback Needed',
        message: `The bug you reported has been marked as fixed: "${bug.summary.substring(0, 50)}...". Can you confirm the fix is working?`,
        metadata: { bug_id: bugId },
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        read: false,
        display_as_banner: false,
      });

    if (notifError) throw notifError;

    console.log('Satisfaction request sent successfully');

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in request-bug-satisfaction:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
});
