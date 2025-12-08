import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-requested-with",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEMO_AGENCY_ID = "a0000000-0000-0000-0000-000000000001";
const DEMO_TEAM_ID = "b0000000-0000-0000-0000-000000000001";

// Fake team member IDs
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

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting demo data reset...");
    const startTime = Date.now();

    // Ensure fake team members exist before reset
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

    // Call the reset function
    const { error } = await adminClient.rpc("reset_demo_data");

    if (error) {
      console.error("Reset error:", error);
      throw error;
    }

    const duration = Date.now() - startTime;
    console.log(`Demo data reset completed in ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Demo data reset successfully",
        duration_ms: duration,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Reset demo data error:", error);
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
