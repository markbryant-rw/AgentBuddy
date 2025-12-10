import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-requested-with",
};

// Plan seat configuration
const PLAN_SEATS: Record<string, number> = {
  'prod_TZ4A0HrJuZxQJa': 1, // Solo
  'prod_TZ4An7JchtyYF1': 3, // Team
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      throw new Error("Missing environment variables");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { teamId } = await req.json();

    if (!teamId) {
      return new Response(
        JSON.stringify({ error: "Team ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get team details
    const { data: team, error: teamError } = await supabaseAdmin
      .from('teams')
      .select('license_type, extra_seats_purchased, subscription_owner_id, agency_id')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return new Response(
        JSON.stringify({ error: "Team not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for admin_unlimited license
    if (team.license_type === 'admin_unlimited') {
      return new Response(
        JSON.stringify({
          canAdd: true,
          currentSeats: 0,
          maxSeats: 999,
          availableSeats: 999,
          isUnlimited: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Count current team members
    const { count: memberCount } = await supabaseAdmin
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId);

    // Count pending invitations
    const { count: pendingCount } = await supabaseAdmin
      .from('pending_invitations')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .eq('status', 'pending');

    // Get subscription info for team owner or agency
    let baseSeats = 0;
    
    // Try to get subscription from team's subscription owner
    if (team.subscription_owner_id) {
      const { data: ownerProfile } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .eq('id', team.subscription_owner_id)
        .single();

      if (ownerProfile?.email) {
        // Check Stripe subscription - this would require Stripe integration
        // For now, use default based on team existence
        baseSeats = 3; // Default to team plan if owner exists
      }
    }

    // If no subscription found, check if it's a solo user
    if (baseSeats === 0) {
      baseSeats = 1; // Default to solo plan
    }

    const extraSeats = team.extra_seats_purchased || 0;
    const maxSeats = baseSeats + extraSeats;
    const currentSeats = (memberCount || 0) + (pendingCount || 0);
    const availableSeats = Math.max(0, maxSeats - currentSeats);

    return new Response(
      JSON.stringify({
        canAdd: currentSeats < maxSeats,
        currentSeats,
        maxSeats,
        availableSeats,
        isUnlimited: false,
        extraSeats,
        baseSeats,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in check-seat-availability:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
