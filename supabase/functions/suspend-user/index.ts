import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('Authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has permission (platform_admin only)
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .is('revoked_at', null);

    const isPlatformAdmin = roles?.some(r => r.role === 'platform_admin');
    if (!isPlatformAdmin) {
      console.error('User lacks platform_admin role');
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { targetUserId, suspend } = await req.json();

    if (!targetUserId || typeof suspend !== 'boolean') {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent suspending yourself
    if (targetUserId === user.id) {
      return new Response(
        JSON.stringify({ error: 'Cannot suspend your own account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update profile status
    const newStatus = suspend ? 'suspended' : 'active';
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ status: newStatus })
      .eq('id', targetUserId);

    if (updateError) {
      console.error('Failed to update profile status:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update user status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the action
    await supabaseClient.from('audit_logs').insert({
      user_id: user.id,
      action: suspend ? 'user_suspended' : 'user_reactivated',
      target_user_id: targetUserId,
      details: { new_status: newStatus }
    });

    console.log(`User ${targetUserId} ${suspend ? 'suspended' : 'reactivated'}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in suspend-user:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
