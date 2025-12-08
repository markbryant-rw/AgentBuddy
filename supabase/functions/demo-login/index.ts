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
    access_level: "member",
  },
  {
    id: "c0000000-0000-0000-0000-000000000003",
    email: "emma.chen@demo.agentbuddy.co",
    full_name: "Emma Chen",
    avatar_seed: "emma",
    roles: ["salesperson"],
    access_level: "member",
  },
  {
    id: "c0000000-0000-0000-0000-000000000004",
    email: "tane.williams@demo.agentbuddy.co",
    full_name: "Tane Williams",
    avatar_seed: "tane",
    roles: ["assistant"],
    access_level: "member",
  },
];

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
      await adminClient.from("agencies").upsert({
        id: DEMO_AGENCY_ID,
        name: "Auckland Premier Realty",
        slug: "auckland-premier-realty",
        created_by: userId,
        is_demo: true,
        brand: "Ray White",
        brand_color: "#FFD100",
      });

      // Create demo team
      await adminClient.from("teams").upsert({
        id: DEMO_TEAM_ID,
        name: "Sales Stars",
        agency_id: DEMO_AGENCY_ID,
        created_by: userId,
        is_demo: true,
      });

      // Create demo user profile
      await adminClient.from("profiles").upsert({
        id: userId,
        email: DEMO_EMAIL,
        full_name: "Demo User",
        office_id: DEMO_AGENCY_ID,
        active_role: "salesperson",
        avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=demo",
      });

      // Assign demo user to team
      await adminClient.from("team_members").upsert({
        user_id: userId,
        team_id: DEMO_TEAM_ID,
        access_level: "admin",
      });

      // Assign roles to demo user (salesperson, team_leader, office_manager for full testing)
      await adminClient.from("user_roles").upsert([
        { user_id: userId, role: "salesperson" },
        { user_id: userId, role: "team_leader" },
        { user_id: userId, role: "office_manager" },
      ], { onConflict: "user_id,role" });

      // Create fake team member profiles
      console.log("Creating fake team members...");
      for (const member of FAKE_TEAM_MEMBERS) {
        // Create profile (no auth.users record - they can't log in)
        await adminClient.from("profiles").upsert({
          id: member.id,
          email: member.email,
          full_name: member.full_name,
          office_id: DEMO_AGENCY_ID,
          active_role: member.roles[0],
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.avatar_seed}`,
        });

        // Add to team
        await adminClient.from("team_members").upsert({
          user_id: member.id,
          team_id: DEMO_TEAM_ID,
          access_level: member.access_level,
        });

        // Assign roles
        for (const role of member.roles) {
          await adminClient.from("user_roles").upsert({
            user_id: member.id,
            role: role,
          }, { onConflict: "user_id,role" });
        }
      }

      // Seed demo data
      console.log("Seeding demo data...");
      await adminClient.rpc("seed_demo_data", { p_demo_user_id: userId });
    } else {
      userId = demoUser.id;
      
      // Ensure fake team members exist
      for (const member of FAKE_TEAM_MEMBERS) {
        const { data: existingProfile } = await adminClient
          .from("profiles")
          .select("id")
          .eq("id", member.id)
          .single();
          
        if (!existingProfile) {
          console.log(`Creating missing fake team member: ${member.full_name}`);
          await adminClient.from("profiles").upsert({
            id: member.id,
            email: member.email,
            full_name: member.full_name,
            office_id: DEMO_AGENCY_ID,
            active_role: member.roles[0],
            avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.avatar_seed}`,
          });

          await adminClient.from("team_members").upsert({
            user_id: member.id,
            team_id: DEMO_TEAM_ID,
            access_level: member.access_level,
          });

          for (const role of member.roles) {
            await adminClient.from("user_roles").upsert({
              user_id: member.id,
              role: role,
            }, { onConflict: "user_id,role" });
          }
        }
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
