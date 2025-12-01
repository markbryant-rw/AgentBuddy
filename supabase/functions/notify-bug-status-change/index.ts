import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { getCorsHeaders, corsHeaders } from '../_shared/cors.ts';



serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { bugId, newStatus, adminComment } = await req.json();

    console.log('Updating bug:', { bugId, newStatus, adminComment });

    // Prepare update data
    const updateData: any = {
      status: newStatus,
      admin_comments: adminComment || null,
    };

    // Add fixed_at timestamp when status changes to 'fixed'
    if (newStatus === 'fixed') {
      updateData.fixed_at = new Date().toISOString();
    }

    // Update bug status
    const { data: bug, error: updateError } = await supabaseClient
      .from('bug_reports')
      .update(updateData)
      .eq('id', bugId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating bug:', updateError);
      throw updateError;
    }

    console.log('Bug updated successfully:', bug);

    // Trigger satisfaction request if marked as fixed
    if (newStatus === 'fixed') {
      console.log('Triggering satisfaction request for bug:', bugId);
      try {
        const satisfactionResponse = await supabaseClient.functions.invoke('request-bug-satisfaction', {
          body: { bugId }
        });
        
        if (satisfactionResponse.error) {
          console.error('Error requesting satisfaction:', satisfactionResponse.error);
        } else {
          console.log('Satisfaction request sent successfully');
        }
      } catch (satisfactionError) {
        console.error('Failed to trigger satisfaction request:', satisfactionError);
        // Don't fail the main request if satisfaction trigger fails
      }
    }

    return new Response(
      JSON.stringify({ success: true, bug }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Function error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? error.stack : undefined;
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorDetails,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
