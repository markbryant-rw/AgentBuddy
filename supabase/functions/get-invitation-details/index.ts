import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, corsHeaders } from '../_shared/cors.ts';



serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { token } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch invitation with service-role permissions (bypasses RLS)
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('pending_invitations')
      .select('id, email, role, full_name, team_id, office_id, invited_by, expires_at, status')
      .eq('token', token)
      .single();

    if (invitationError || !invitation) {
      console.error('Invitation fetch error:', invitationError);
      return new Response(
        JSON.stringify({ error: 'Invalid invitation link' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate invitation status
    if (invitation.status === 'accepted') {
      return new Response(
        JSON.stringify({ error: 'This invitation has already been used' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (invitation.status === 'revoked') {
      return new Response(
        JSON.stringify({ error: 'This invitation has been revoked' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'This invitation has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch inviter details with service-role permissions
    const { data: inviterProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email')
      .eq('id', invitation.invited_by)
      .single();

    // Return invitation details with inviter info
    return new Response(
      JSON.stringify({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        full_name: invitation.full_name,
        team_id: invitation.team_id,
        office_id: invitation.office_id,
        invited_by: invitation.invited_by,
        expires_at: invitation.expires_at,
        inviter: inviterProfile || { full_name: null, email: 'Unknown' },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-invitation-details:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
