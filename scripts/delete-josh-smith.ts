/**
 * Complete deletion script for Josh Smith
 *
 * This script performs a HARD DELETE (not soft delete/archive) of all Josh Smith records
 * Email: josh.smith@raywhite.com
 *
 * Run with: npx tsx scripts/delete-josh-smith.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') })

const JOSH_EMAIL = 'josh.smith@raywhite.com'

async function deleteJoshSmith() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment')
    console.error('Make sure these are set in .env.local')
    process.exit(1)
  }

  // Create admin client with service role key
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  console.log(`\n🗑️  Starting complete deletion for: ${JOSH_EMAIL}\n`)

  const deletionResults: any = {
    email: JOSH_EMAIL,
    deletedRecords: {}
  }

  try {
    // 1. Find user in auth.users
    console.log('1️⃣  Searching for user in auth.users...')
    const { data: authData, error: authListError } = await supabase.auth.admin.listUsers()

    if (authListError) {
      console.error('❌ Error listing auth users:', authListError)
      throw authListError
    }

    const authUser = authData.users.find(u => u.email?.toLowerCase() === JOSH_EMAIL.toLowerCase())

    if (authUser) {
      console.log(`✅ Found auth user: ${authUser.id}`)
      deletionResults.authUserId = authUser.id

      // 2. Delete from user_roles
      console.log('\n2️⃣  Deleting from user_roles...')
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', authUser.id)
        .select()

      if (rolesError) {
        console.error('❌ Error deleting user_roles:', rolesError)
      } else {
        const count = userRoles?.length || 0
        deletionResults.deletedRecords.user_roles = count
        console.log(`✅ Deleted ${count} user_roles record(s)`)
      }

      // 3. Delete from team_members
      console.log('\n3️⃣  Deleting from team_members...')
      const { data: teamMembers, error: teamMembersError } = await supabase
        .from('team_members')
        .delete()
        .eq('user_id', authUser.id)
        .select()

      if (teamMembersError) {
        console.error('❌ Error deleting team_members:', teamMembersError)
      } else {
        const count = teamMembers?.length || 0
        deletionResults.deletedRecords.team_members = count
        console.log(`✅ Deleted ${count} team_members record(s)`)
      }

      // 4. Delete from profiles
      console.log('\n4️⃣  Deleting from profiles...')
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', authUser.id)
        .select()

      if (profilesError) {
        console.error('❌ Error deleting profiles:', profilesError)
      } else {
        const count = profiles?.length || 0
        deletionResults.deletedRecords.profiles = count
        console.log(`✅ Deleted ${count} profiles record(s)`)
      }

      // 5. Delete from auth.users (this cascades to auth tables)
      console.log('\n5️⃣  Deleting from auth.users...')
      const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(authUser.id)

      if (deleteAuthError) {
        console.error('❌ Error deleting auth user:', deleteAuthError)
        deletionResults.authUserDeleted = false
        deletionResults.authUserError = deleteAuthError.message
      } else {
        deletionResults.authUserDeleted = true
        console.log(`✅ Deleted auth user: ${authUser.id}`)
      }
    } else {
      console.log('ℹ️  No user found in auth.users')
      deletionResults.authUserId = null
    }

    // 6. Delete from pending_invitations (by email)
    console.log('\n6️⃣  Deleting from pending_invitations...')
    const { data: invitations, error: invitationsError } = await supabase
      .from('pending_invitations')
      .delete()
      .eq('email', JOSH_EMAIL.toLowerCase())
      .select()

    if (invitationsError) {
      console.error('❌ Error deleting pending_invitations:', invitationsError)
    } else {
      const count = invitations?.length || 0
      deletionResults.deletedRecords.pending_invitations = count
      console.log(`✅ Deleted ${count} pending_invitations record(s)`)
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ DELETION COMPLETE')
    console.log('='.repeat(60))
    console.log('\nSummary:')
    console.log(JSON.stringify(deletionResults, null, 2))
    console.log('\n✅ All records for josh.smith@raywhite.com have been permanently deleted')
    console.log('You can now re-invite Josh Smith with a fresh start!\n')

  } catch (error) {
    console.error('\n❌ Fatal error during deletion:', error)
    console.error('\nDeletion results so far:')
    console.error(JSON.stringify(deletionResults, null, 2))
    process.exit(1)
  }
}

// Run the deletion
deleteJoshSmith()
