import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from '../_shared/cors.ts';

interface RepairRequest {
  userId: string;
  officeId: string;
  teamId: string | null;
  role: 'office_manager' | 'team_leader' | 'salesperson' | 'assistant';
  resetPassword?: boolean;
  isSoloAgent?: boolean;
}

function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing environment variables");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify admin permissions
    const authToken = authHeader.replace('Bearer ', '');
    const supabaseAnon = createClient(
      supabaseUrl, 
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(authToken);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has admin role
    const { data: adminRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['platform_admin', 'office_manager'])
      .is('revoked_at', null);

    if (!adminRoles || adminRoles.length === 0) {
      return new Response(
        JSON.stringify({ error: "Only admins can repair users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { userId, officeId, teamId, role, resetPassword, isSoloAgent }: RepairRequest = await req.json();

    if (!userId || !officeId || !role) {
      return new Response(
        JSON.stringify({ error: "userId, officeId, and role are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate teamId unless solo agent
    if (!isSoloAgent && !teamId) {
      return new Response(
        JSON.stringify({ error: "teamId is required for non-solo agents" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let temporaryPassword: string | null = null;

    // Verify user exists and is orphaned
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, office_id, primary_team_id')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle Solo Agent - create or get personal team
    let actualTeamId = teamId;
    
    if (isSoloAgent) {
      const { data: personalTeam, error: personalTeamError } = await supabaseAdmin
        .rpc('ensure_personal_team', {
          user_id_param: userId,
          user_full_name: profile.full_name || profile.email.split('@')[0],
          office_id_param: officeId
        });

      if (personalTeamError || !personalTeam) {
        console.error('Failed to ensure personal team:', personalTeamError);
        return new Response(
          JSON.stringify({ error: `Failed to create personal team: ${personalTeamError?.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      actualTeamId = personalTeam;
      console.log(`✅ Ensured personal team for solo agent: ${personalTeam}`);
    }

    // Check if user is actually orphaned
    const { data: existingMembership } = await supabaseAdmin
      .from('team_members')
      .select('id')
      .eq('user_id', userId)
      .eq('team_id', actualTeamId)
      .maybeSingle();

    console.log(`Repairing user ${userId}:`, {
      has_office: !!profile.office_id,
      has_primary_team: !!profile.primary_team_id,
      has_team_membership: !!existingMembership,
      target_office: officeId,
      target_team: actualTeamId,
      is_solo_agent: isSoloAgent
    });

    // Step 1: Update office_id if missing
    if (!profile.office_id) {
      const { error: updateOfficeError } = await supabaseAdmin
        .from('profiles')
        .update({ office_id: officeId })
        .eq('id', userId);

      if (updateOfficeError) {
        console.error('Failed to update office_id:', updateOfficeError);
        return new Response(
          JSON.stringify({ error: `Failed to set office: ${updateOfficeError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log(`✅ Updated office_id to ${officeId}`);
    }

    // Step 2: Create team membership if missing
    if (!existingMembership) {
      const accessLevel = role === 'team_leader' ? 'admin' : 'edit';
      
      const { error: membershipError } = await supabaseAdmin
        .from('team_members')
        .insert({
          user_id: userId,
          team_id: actualTeamId,
          access_level: accessLevel
        });

      if (membershipError) {
        console.error('Failed to create team membership:', membershipError);
        return new Response(
          JSON.stringify({ error: `Failed to add to team: ${membershipError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log(`✅ Created team membership with access level: ${accessLevel}`);
    }

    // Step 3: Update primary_team_id if missing
    if (!profile.primary_team_id) {
      const { error: updatePrimaryTeamError } = await supabaseAdmin
        .from('profiles')
        .update({ primary_team_id: actualTeamId })
        .eq('id', userId);

      if (updatePrimaryTeamError) {
        console.error('Failed to update primary_team_id:', updatePrimaryTeamError);
        return new Response(
          JSON.stringify({ error: `Failed to set primary team: ${updatePrimaryTeamError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log(`✅ Updated primary_team_id to ${actualTeamId}`);
    }

    // Step 4: Ensure role is assigned
    const { data: existingRole } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role', role)
      .is('revoked_at', null)
      .maybeSingle();

    if (!existingRole) {
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: userId,
          role: role,
          assigned_by: user.id
        });

      if (roleError) {
        console.error('Failed to assign role:', roleError);
        // Don't fail the whole repair if role assignment fails
      } else {
        console.log(`✅ Assigned role: ${role}`);
      }
    }

    // Log the repair action
    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      action: 'user_repaired',
      target_user_id: userId,
      details: {
        repaired_user_email: profile.email,
        office_id: officeId,
        team_id: actualTeamId,
        role: role,
        is_solo_agent: isSoloAgent,
        repaired_fields: {
          office_id: !profile.office_id,
          primary_team_id: !profile.primary_team_id,
          team_membership: !existingMembership
        }
      }
    });

    // Step 5: Reset password if requested (includes restoring email and clearing bans)
    if (resetPassword) {
      // Check if auth user email was changed to @deleted.local
      const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
      
      if (authUserError) {
        console.error('Failed to get auth user:', authUserError);
      } else if (authUser?.user) {
        // Restore email if it was changed to @deleted.local
        if (authUser.user.email && authUser.user.email.endsWith('@deleted.local')) {
          console.log(`🔄 Restoring email for user ${userId}`);
          await supabaseAdmin.auth.admin.updateUserById(userId, {
            email: profile.email,
          });
        }

        // Clear any bans by updating ban_duration
        const userMetadata = authUser.user as any;
        if (userMetadata.banned_until) {
          console.log(`🔓 Clearing ban (was banned until ${userMetadata.banned_until})`);
          await supabaseAdmin.auth.admin.updateUserById(userId, {
            ban_duration: 'none',
          });
        }
      }

      // Generate and set temporary password
      temporaryPassword = generateTemporaryPassword();
      
      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: temporaryPassword }
      );

      if (passwordError) {
        console.error('Failed to reset password:', passwordError.message);
        // Don't fail the whole repair if password reset fails
      } else {
        console.log(`✅ Temporary password set for user`);
      }
    }

    console.log(`✅ User ${userId} repaired successfully`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `User ${profile.email} has been repaired`,
        user: {
          id: userId,
          email: profile.email,
          full_name: profile.full_name
        },
        temporaryPassword: temporaryPassword
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('Error in repair-user:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);