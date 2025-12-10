import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-requested-with",
};

interface RedeemRequest {
  code: string;
  teamId: string;
}

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
        JSON.stringify({ success: false, message: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // User client for auth
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Service client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, message: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { code, teamId }: RedeemRequest = await req.json();

    if (!code || !teamId) {
      return new Response(
        JSON.stringify({ success: false, message: "Voucher code and team ID are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is a team admin or platform admin
    const { data: membership } = await supabaseAdmin
      .from('team_members')
      .select('access_level')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single();

    const { data: userRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .is('revoked_at', null);

    const isPlatformAdmin = userRoles?.some(r => r.role === 'platform_admin');
    const isTeamAdmin = membership?.access_level === 'admin';

    if (!isPlatformAdmin && !isTeamAdmin) {
      return new Response(
        JSON.stringify({ success: false, message: "Only team admins can redeem vouchers" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find the voucher
    const { data: voucher, error: voucherError } = await supabaseAdmin
      .from('admin_voucher_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (voucherError || !voucher) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid voucher code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if expired
    if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ success: false, message: "This voucher has expired" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check max redemptions
    if (voucher.max_redemptions !== null && voucher.current_redemptions >= voucher.max_redemptions) {
      return new Response(
        JSON.stringify({ success: false, message: "This voucher has reached its redemption limit" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already redeemed by this team
    const { data: existingRedemption } = await supabaseAdmin
      .from('voucher_redemptions')
      .select('id')
      .eq('voucher_id', voucher.id)
      .eq('team_id', teamId)
      .single();

    if (existingRedemption) {
      return new Response(
        JSON.stringify({ success: false, message: "This voucher has already been redeemed by your team" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create redemption record
    const { error: redemptionError } = await supabaseAdmin
      .from('voucher_redemptions')
      .insert({
        voucher_id: voucher.id,
        team_id: teamId,
        redeemed_by: user.id,
      });

    if (redemptionError) {
      console.error('Error creating redemption:', redemptionError);
      return new Response(
        JSON.stringify({ success: false, message: "Failed to redeem voucher" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Increment redemption count
    await supabaseAdmin
      .from('admin_voucher_codes')
      .update({ current_redemptions: voucher.current_redemptions + 1 })
      .eq('id', voucher.id);

    // Update team license type if applicable
    if (voucher.license_type === 'admin_unlimited') {
      await supabaseAdmin
        .from('teams')
        .update({ license_type: 'admin_unlimited' })
        .eq('id', teamId);
    }

    // Log the redemption
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        action: 'voucher_redeemed',
        user_id: user.id,
        details: {
          voucher_code: voucher.code,
          voucher_name: voucher.name,
          license_type: voucher.license_type,
          team_id: teamId,
        },
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Voucher "${voucher.name}" redeemed successfully!`,
        licenseType: voucher.license_type,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in redeem-voucher:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ success: false, message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
