import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from '../_shared/cors.ts';



interface SwitchOfficeRequest {
  officeId: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { officeId }: SwitchOfficeRequest = await req.json();

    if (!officeId) {
      return new Response(
        JSON.stringify({ error: 'Office ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Attempting to switch to office ${officeId}`);

    // Check if user has platform_admin role
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .is('revoked_at', null);

    if (rolesError) {
      console.error('Error fetching user roles:', rolesError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify permissions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isPlatformAdmin = roles?.some((r) => r.role === 'platform_admin');

    // If not platform admin, check office_manager_assignments
    if (!isPlatformAdmin) {
      const { data: assignment, error: assignmentError } = await supabase
        .from('office_manager_assignments')
        .select('id')
        .eq('user_id', user.id)
        .eq('office_id', officeId)
        .single();

      if (assignmentError || !assignment) {
        console.log('User does not have access to this office');
        return new Response(
          JSON.stringify({ error: 'You do not have access to this office' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Verify office exists
    const { data: office, error: officeError } = await supabase
      .from('agencies')
      .select('id, name')
      .eq('id', officeId)
      .single();

    if (officeError || !office) {
      console.error('Office not found:', officeError);
      return new Response(
        JSON.stringify({ error: 'Office not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update user's active_office_id
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        active_office_id: officeId,
        last_office_switch_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating active office:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to switch office' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the action
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'office_switched',
      details: {
        office_id: officeId,
        office_name: office.name,
      },
    });

    console.log(`Successfully switched to office ${office.name}`);

    return new Response(
      JSON.stringify({
        success: true,
        office: {
          id: office.id,
          name: office.name,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
