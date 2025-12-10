import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email } = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log(`Starting complete deletion for user: ${email}`)

    const normalizedEmail = email.toLowerCase().trim()
    const deletedData: any = {
      email: normalizedEmail,
      deletedRecords: {}
    }

    // 1. Find user in auth.users
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()
    const authUser = authUsers?.users.find(u => u.email?.toLowerCase() === normalizedEmail)

    if (authUser) {
      console.log(`Found auth user: ${authUser.id}`)
      deletedData.authUserId = authUser.id

      // Delete from user_roles
      const { data: userRoles, error: rolesDeleteError } = await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', authUser.id)
        .select()

      if (rolesDeleteError) {
        console.error('Error deleting user_roles:', rolesDeleteError)
      } else {
        deletedData.deletedRecords.user_roles = userRoles?.length || 0
        console.log(`Deleted ${userRoles?.length || 0} user_roles records`)
      }

      // Delete from profiles
      const { data: profiles, error: profilesDeleteError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', authUser.id)
        .select()

      if (profilesDeleteError) {
        console.error('Error deleting profiles:', profilesDeleteError)
      } else {
        deletedData.deletedRecords.profiles = profiles?.length || 0
        console.log(`Deleted ${profiles?.length || 0} profiles records`)
      }

      // Delete from auth.users (this should cascade to other auth tables)
      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(authUser.id)

      if (deleteAuthError) {
        console.error('Error deleting auth user:', deleteAuthError)
        deletedData.authUserDeleted = false
        deletedData.authUserError = deleteAuthError.message
      } else {
        deletedData.authUserDeleted = true
        console.log(`Deleted auth user: ${authUser.id}`)
      }
    } else {
      console.log(`No auth user found for email: ${normalizedEmail}`)
      deletedData.authUserId = null
    }

    // 2. Delete from pending_invitations (by email)
    const { data: invitations, error: invitationsDeleteError } = await supabaseAdmin
      .from('pending_invitations')
      .delete()
      .eq('email', normalizedEmail)
      .select()

    if (invitationsDeleteError) {
      console.error('Error deleting pending_invitations:', invitationsDeleteError)
    } else {
      deletedData.deletedRecords.pending_invitations = invitations?.length || 0
      console.log(`Deleted ${invitations?.length || 0} pending_invitations records`)
    }

    // 3. Check for any orphaned team memberships (if user had a profile)
    if (authUser) {
      const { data: teamMembers, error: teamMembersDeleteError } = await supabaseAdmin
        .from('team_members')
        .delete()
        .eq('user_id', authUser.id)
        .select()

      if (teamMembersDeleteError) {
        console.error('Error deleting team_members:', teamMembersDeleteError)
      } else {
        deletedData.deletedRecords.team_members = teamMembers?.length || 0
        console.log(`Deleted ${teamMembers?.length || 0} team_members records`)
      }
    }

    console.log('Complete deletion finished:', deletedData)

    return new Response(
      JSON.stringify({
        success: true,
        message: `All records for ${normalizedEmail} have been completely deleted`,
        details: deletedData
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in delete-user-complete:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
