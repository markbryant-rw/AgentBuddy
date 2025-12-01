import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from '../_shared/cors.ts';



interface FixDataRequest {
  strategy: 'move_users' | 'remove_teams' | 'duplicate_teams';
  affectedUserIds?: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user has platform_admin role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .is('revoked_at', null);

    const isPlatformAdmin = roles?.some((r) => r.role === 'platform_admin');

    if (!isPlatformAdmin) {
      return new Response(JSON.stringify({ error: 'Only platform admins can fix cross-office data' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { strategy, affectedUserIds }: FixDataRequest = await req.json();

    console.log(`Fixing cross-office data with strategy: ${strategy}`);

    // Get cross-office assignments
    const { data: crossOfficeData, error: checkError } = await supabase
      .rpc('get_cross_office_assignments');

    if (checkError) {
      console.error('Error checking cross-office assignments:', checkError);
      return new Response(JSON.stringify({ error: 'Failed to check data' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!crossOfficeData || crossOfficeData.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No cross-office assignments found', fixed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let fixedCount = 0;
    const auditDetails: any[] = [];

    // Filter by specific user IDs if provided
    const dataToFix = affectedUserIds
      ? crossOfficeData.filter((item: any) => affectedUserIds.includes(item.user_id))
      : crossOfficeData;

    for (const item of dataToFix) {
      try {
        if (strategy === 'move_users') {
          // Strategy A: Move users to match their teams
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ office_id: item.team_office_id })
            .eq('id', item.user_id);

          if (updateError) throw updateError;

          auditDetails.push({
            action: 'moved_user_to_team_office',
            user_id: item.user_id,
            user_name: item.user_name,
            from_office: item.user_office_name,
            to_office: item.team_office_name,
          });
          fixedCount++;
        } else if (strategy === 'remove_teams') {
          // Strategy B: Remove team assignments
          const { error: deleteError } = await supabase
            .from('team_members')
            .delete()
            .eq('user_id', item.user_id)
            .eq('team_id', item.team_id);

          if (deleteError) throw deleteError;

          // Set primary_team_id to null if this was their primary team
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ primary_team_id: null })
            .eq('id', item.user_id)
            .eq('primary_team_id', item.team_id);

          if (updateError) throw updateError;

          auditDetails.push({
            action: 'removed_team_assignment',
            user_id: item.user_id,
            user_name: item.user_name,
            team_name: item.team_name,
            reason: 'cross_office_assignment',
          });
          fixedCount++;
        } else if (strategy === 'duplicate_teams') {
          // Strategy C: Create teams in user's office
          const { data: existingTeam, error: teamError } = await supabase
            .from('teams')
            .select('name, team_code')
            .eq('id', item.team_id)
            .single();

          if (teamError) throw teamError;

          // Check if team already exists in user's office
          const { data: duplicateCheck } = await supabase
            .from('teams')
            .select('id')
            .eq('name', existingTeam.name)
            .eq('agency_id', item.user_office_id)
            .single();

          let newTeamId: string;

          if (duplicateCheck) {
            newTeamId = duplicateCheck.id;
          } else {
            // Create new team in user's office
            const { data: newTeam, error: createError } = await supabase
              .from('teams')
              .insert({
                name: existingTeam.name,
                agency_id: item.user_office_id,
                created_by: user.id,
                team_code: existingTeam.team_code + '_NEW',
              })
              .select()
              .single();

            if (createError) throw createError;
            newTeamId = newTeam.id;
          }

          // Update team membership
          const { error: updateMemberError } = await supabase
            .from('team_members')
            .update({ team_id: newTeamId })
            .eq('user_id', item.user_id)
            .eq('team_id', item.team_id);

          if (updateMemberError) throw updateMemberError;

          // Update primary_team_id if needed
          const { error: updateProfileError } = await supabase
            .from('profiles')
            .update({ primary_team_id: newTeamId })
            .eq('id', item.user_id)
            .eq('primary_team_id', item.team_id);

          if (updateProfileError) throw updateProfileError;

          auditDetails.push({
            action: 'duplicated_team',
            user_id: item.user_id,
            user_name: item.user_name,
            old_team_id: item.team_id,
            new_team_id: newTeamId,
            office: item.user_office_name,
          });
          fixedCount++;
        }
      } catch (error) {
        console.error(`Error fixing data for user ${item.user_id}:`, error);
        auditDetails.push({
          action: 'error',
          user_id: item.user_id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Log to audit_logs
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'fix_cross_office_data',
      details: {
        strategy,
        fixed_count: fixedCount,
        details: auditDetails,
      },
    });

    console.log(`Fixed ${fixedCount} cross-office assignments`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Fixed ${fixedCount} cross-office assignments`,
        fixed: fixedCount,
        details: auditDetails,
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
