import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';



Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    console.log('Starting user profile repair...');

    // Get all auth users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error listing auth users:', authError);
      throw new Error(`Failed to list auth users: ${authError.message}`);
    }

    console.log(`Found ${authData.users.length} auth users`);

    // Get all existing profiles
    const { data: existingProfiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id');

    if (profileError) {
      console.error('Error fetching profiles:', profileError);
      throw new Error(`Failed to fetch profiles: ${profileError.message}`);
    }

    const profileIds = new Set(existingProfiles?.map(p => p.id) ?? []);
    console.log(`Found ${profileIds.size} existing profiles`);

    // Find users without profiles
    const brokenUsers = authData.users.filter(u => !profileIds.has(u.id));
    console.log(`Found ${brokenUsers.length} users without profiles`);

    if (brokenUsers.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No broken profiles found',
          repaired_count: 0,
          repaired_users: [],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Repair each broken user
    const repairs = [];
    const errors = [];

    for (const user of brokenUsers) {
      try {
        console.log(`Repairing user: ${user.id}`);
        
        const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
        const inviteCode = `${fullName.substring(0, 2).toUpperCase()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
        const teamCode = `TEAM-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

        // Step 1: Create profile first (without primary_team_id)
        const { error: profileInsertError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: fullName,
            invite_code: inviteCode,
            user_type: 'agent',
            is_active: true,
          });

        if (profileInsertError) {
          console.error(`Error creating profile for user ${user.id}:`, profileInsertError.message);
          throw new Error(`Failed to create profile: ${profileInsertError.message}`);
        }

        console.log(`Created profile for user ${user.id}`);

        // Step 2: Create personal team (now created_by reference is valid)
        const { data: team, error: teamError } = await supabaseAdmin
          .from('teams')
          .insert({
            name: `${fullName} - Personal`,
            created_by: user.id,
            team_type: 'standard',
            team_code: teamCode,
            is_auto_created: true,
          })
          .select('id')
          .single();

        if (teamError) {
          console.error(`Error creating team for user ${user.id}:`, teamError.message);
          throw new Error(`Failed to create team: ${teamError.message}`);
        }

        console.log(`Created team ${team.id} for user ${user.id}`);

        // Step 3: Create team membership
        const { error: memberError } = await supabaseAdmin
          .from('team_members')
          .insert({
            team_id: team.id,
            user_id: user.id,
            access_level: 'edit',
            is_primary_team: true,
            member_type: 'agent',
          });

        if (memberError) {
          console.error(`Error creating team membership for user ${user.id}:`, memberError.message);
          throw new Error(`Failed to create team membership: ${memberError.message}`);
        }

        console.log(`Created team membership for user ${user.id}`);

        // Step 4: Update profile with primary_team_id
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ primary_team_id: team.id })
          .eq('id', user.id);

        if (updateError) {
          console.error(`Error updating profile primary_team_id for user ${user.id}:`, updateError.message);
          throw new Error(`Failed to update profile: ${updateError.message}`);
        }

        console.log(`Updated profile with primary_team_id for user ${user.id}`);

        repairs.push({
          user_id: user.id,
          email: user.email,
          full_name: fullName,
          profile_created: true,
          team_id: team.id,
          team_name: `${fullName} - Personal`,
          invite_code: inviteCode,
        });

        console.log(`Successfully repaired user ${user.id}`);
      } catch (error) {
        console.error(`Failed to repair user ${user.id}:`, error instanceof Error ? error.message : String(error));
        errors.push({
          user_id: user.id,
          email: user.email,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Repaired ${repairs.length} user profiles`,
        repaired_count: repairs.length,
        repaired_users: repairs,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Repair function error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
