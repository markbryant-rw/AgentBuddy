import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-requested-with",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEMO_EMAIL = "demo@agentbuddy.co";
const DEMO_PASSWORD = "DemoUser2024!";
const DEMO_AGENCY_ID = "a0000000-0000-0000-0000-000000000001";
const DEMO_TEAM_ID = "b0000000-0000-0000-0000-000000000001";

// Fake team member IDs (static for predictable data distribution)
const FAKE_TEAM_MEMBERS = [
  {
    id: "c0000000-0000-0000-0000-000000000001",
    email: "sarah.mitchell@demo.agentbuddy.co",
    full_name: "Sarah Mitchell",
    avatar_seed: "sarah",
    roles: ["salesperson", "team_leader"],
    access_level: "admin",
  },
  {
    id: "c0000000-0000-0000-0000-000000000002",
    email: "mike.thompson@demo.agentbuddy.co",
    full_name: "Mike Thompson",
    avatar_seed: "mike",
    roles: ["salesperson"],
    access_level: "admin",
  },
  {
    id: "c0000000-0000-0000-0000-000000000003",
    email: "emma.chen@demo.agentbuddy.co",
    full_name: "Emma Chen",
    avatar_seed: "emma",
    roles: ["salesperson"],
    access_level: "admin",
  },
  {
    id: "c0000000-0000-0000-0000-000000000004",
    email: "tane.williams@demo.agentbuddy.co",
    full_name: "Tane Williams",
    avatar_seed: "tane",
    roles: ["assistant"],
    access_level: "admin",
  },
];

// Helper function to create fake team members with auth.users entries
async function ensureFakeTeamMembers(adminClient: any) {
  console.log("Creating/updating fake team members with auth.users entries...");
  
  for (const member of FAKE_TEAM_MEMBERS) {
    // First, create auth.users entry (required by profiles FK constraint)
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email: member.email,
      password: "FakeUser2024!Disabled",
      email_confirm: true,
      user_metadata: {
        full_name: member.full_name,
        is_demo: true,
        is_fake_member: true,
      },
      // Use the predefined ID to match seed_demo_data references
      id: member.id,
    });
    
    if (authError) {
      // User might already exist, try to get their ID
      if (authError.message?.includes("already been registered")) {
        console.log(`Auth user ${member.full_name} already exists`);
      } else {
        console.error(`Auth user error for ${member.full_name}:`, authError);
        continue; // Skip this member if auth creation fails
      }
    } else {
      console.log(`Auth user created for ${member.full_name}: ${authUser?.user?.id}`);
    }

    // Create profile (should now work since auth.users entry exists)
    const { error: profileError } = await adminClient.from("profiles").upsert({
      id: member.id,
      email: member.email,
      full_name: member.full_name,
      office_id: DEMO_AGENCY_ID,
      primary_team_id: DEMO_TEAM_ID,
      active_role: member.roles[0],
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.avatar_seed}`,
    }, { onConflict: "id" });
    
    if (profileError) {
      console.error(`Profile error for ${member.full_name}:`, profileError);
    } else {
      console.log(`Profile created/updated for ${member.full_name}`);
    }

    // Add to team
    const { error: teamMemberError } = await adminClient.from("team_members").upsert({
      user_id: member.id,
      team_id: DEMO_TEAM_ID,
      access_level: member.access_level,
    }, { onConflict: "user_id,team_id" });
    
    if (teamMemberError) {
      console.error(`Team member error for ${member.full_name}:`, teamMemberError);
    }

    // Assign roles
    for (const role of member.roles) {
      const { error: roleError } = await adminClient.from("user_roles").upsert({
        user_id: member.id,
        role: role,
      }, { onConflict: "user_id,role" });
      
      if (roleError) {
        console.error(`Role error for ${member.full_name} (${role}):`, roleError);
      }
    }
  }
  
  console.log("Fake team members setup complete");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);

    // Check if demo user exists
    const { data: existingUser } = await adminClient.auth.admin.listUsers();
    const demoUser = existingUser?.users?.find(u => u.email === DEMO_EMAIL);

    let userId: string;

    if (!demoUser) {
      console.log("Creating demo user...");
      
      // Create demo user
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: "Demo User",
          is_demo: true,
        },
      });

      if (createError) throw createError;
      userId = newUser.user.id;

      // Create demo agency
      const { error: agencyError } = await adminClient.from("agencies").upsert({
        id: DEMO_AGENCY_ID,
        name: "Auckland Premier Realty",
        slug: "auckland-premier-realty",
        created_by: userId,
        brand: "Ray White",
        brand_color: "#FFD100",
      }, { onConflict: "id" });
      
      if (agencyError) console.error("Agency error:", agencyError);

      // Create demo team
      const { error: teamError } = await adminClient.from("teams").upsert({
        id: DEMO_TEAM_ID,
        name: "Sales Stars",
        agency_id: DEMO_AGENCY_ID,
        created_by: userId,
      }, { onConflict: "id" });
      
      if (teamError) console.error("Team error:", teamError);

      // Create demo user profile with primary_team_id
      const { error: profileError } = await adminClient.from("profiles").upsert({
        id: userId,
        email: DEMO_EMAIL,
        full_name: "Demo User",
        office_id: DEMO_AGENCY_ID,
        primary_team_id: DEMO_TEAM_ID,
        active_role: "salesperson",
        avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=demo",
      }, { onConflict: "id" });
      
      if (profileError) console.error("Profile error:", profileError);

      // Assign demo user to team
      const { error: teamMemberError } = await adminClient.from("team_members").upsert({
        user_id: userId,
        team_id: DEMO_TEAM_ID,
        access_level: "admin",
      }, { onConflict: "user_id,team_id" });
      
      if (teamMemberError) console.error("Team member error:", teamMemberError);

      // Assign roles to demo user (salesperson, team_leader, office_manager for full testing)
      const { error: rolesError } = await adminClient.from("user_roles").upsert([
        { user_id: userId, role: "salesperson" },
        { user_id: userId, role: "team_leader" },
        { user_id: userId, role: "office_manager" },
      ], { onConflict: "user_id,role" });
      
      if (rolesError) console.error("Roles error:", rolesError);

      // Create fake team members
      await ensureFakeTeamMembers(adminClient);

      // Seed demo data
      console.log("Seeding demo data...");
      const { error: seedError } = await adminClient.rpc("seed_demo_data", { p_demo_user_id: userId });
      if (seedError) {
        console.error("Seed demo data error:", seedError);
      } else {
        console.log("Demo data seeded successfully");
      }
    } else {
      userId = demoUser.id;
      console.log("Demo user exists, ensuring setup is complete...");
      
      // Ensure demo user has primary_team_id set
      const { error: profileUpdateError } = await adminClient.from("profiles").update({
        primary_team_id: DEMO_TEAM_ID,
        office_id: DEMO_AGENCY_ID,
      }).eq("id", userId);
      
      if (profileUpdateError) {
        console.error("Profile update error:", profileUpdateError);
      } else {
        console.log("Demo user profile updated with primary_team_id");
      }
      
      // Ensure demo user is in team_members
      const { error: teamMemberError } = await adminClient.from("team_members").upsert({
        user_id: userId,
        team_id: DEMO_TEAM_ID,
        access_level: "admin",
      }, { onConflict: "user_id,team_id" });
      
      if (teamMemberError) console.error("Team member upsert error:", teamMemberError);
      
      // Ensure fake team members exist
      await ensureFakeTeamMembers(adminClient);
      
      // Check if demo data exists, seed if not
      const { count: appraisalCount, error: countError } = await adminClient
        .from("logged_appraisals")
        .select("*", { count: "exact", head: true })
        .eq("team_id", DEMO_TEAM_ID);
      
      if (countError) {
        console.error("Count error:", countError);
      }
      
      console.log(`Found ${appraisalCount || 0} appraisals for demo team`);
      
      if (!appraisalCount || appraisalCount === 0) {
        console.log("No demo data found, seeding...");
        const { error: seedError } = await adminClient.rpc("seed_demo_data", { p_demo_user_id: userId });
        if (seedError) {
          console.error("Seed demo data error:", seedError);
        } else {
          console.log("Demo data seeded successfully");
        }
      } else {
        console.log("Demo data already exists, skipping seed");
      }
    }

    // Sign in the demo user
    const { data: session, error: signInError } = await anonClient.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });

    if (signInError) throw signInError;

    return new Response(
      JSON.stringify({
        success: true,
        message: "Demo login successful",
        session: session,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Demo login error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
