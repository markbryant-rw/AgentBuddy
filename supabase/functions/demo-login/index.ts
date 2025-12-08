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

      // Create profile
      await adminClient.from("profiles").upsert({
        id: userId,
        email: DEMO_EMAIL,
        full_name: "Demo User",
        office_id: DEMO_AGENCY_ID,
        active_role: "salesperson",
        avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=demo",
      });

      // Assign to team
      await adminClient.from("team_members").upsert({
        user_id: userId,
        team_id: DEMO_TEAM_ID,
        access_level: "admin",
      });

      // Assign roles (salesperson, team_leader, office_manager for full demo access)
      await adminClient.from("user_roles").upsert([
        { user_id: userId, role: "salesperson" },
        { user_id: userId, role: "team_leader" },
        { user_id: userId, role: "office_manager" },
      ], { onConflict: "user_id,role" });

      // Seed demo data for this user
      await adminClient.rpc("seed_demo_data");
    } else {
      userId = demoUser.id;
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
