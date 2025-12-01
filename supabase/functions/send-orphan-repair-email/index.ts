import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RepairEmailRequest {
  userId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate the requesting user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !authUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the requesting user is a platform admin
    const { data: adminRole, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", authUser.id)
      .eq("role", "platform_admin")
      .is("revoked_at", null)
      .single();

    if (roleError || !adminRole) {
      return new Response(
        JSON.stringify({ error: "Only platform admins can trigger orphan account repairs" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { userId }: RepairEmailRequest = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the most recent audit log entry for this user's repair
    const { data: auditLog, error: auditError } = await supabase
      .from("audit_logs")
      .select("details")
      .eq("action", "orphan_account_repair")
      .contains("details", { repaired_user_id: userId })
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (auditError || !auditLog) {
      return new Response(
        JSON.stringify({ error: "No repair record found for this user" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const repairDetails = auditLog.details as any;
    const token = repairDetails.token;
    const email = repairDetails.email;

    // Get user profile and office/team details
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(`
        full_name,
        office:agencies!profiles_office_id_fkey(name),
        team:teams!inner(name)
      `)
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "User profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const officeName = (profile.office as any)?.[0]?.name || "your office";
    const teamName = (profile.team as any)?.[0]?.name || "your team";
    const userName = profile.full_name || email;

    // Get inviter details
    const { data: inviter } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", repairDetails.invited_by)
      .single();

    const inviterName = inviter?.full_name || "Your Team Lead";

    // Construct invitation URL
    const appUrl = Deno.env.get("APP_URL") || supabaseUrl.replace("supabase.co", "lovable.app");
    const inviteUrl = `${appUrl}/auth/accept-invite?token=${token}`;

    // Send email via Resend
    const emailResult = await resend.emails.send({
      from: "AgentBuddy <onboarding@resend.dev>",
      to: [email],
      subject: `Complete Your Account Setup at ${officeName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Complete Your Account Setup</h1>
          </div>
          
          <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hi ${userName},</p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              We noticed you haven't completed your account setup yet. ${inviterName} has invited you to join <strong>${teamName}</strong> at <strong>${officeName}</strong>.
            </p>
            
            <p style="font-size: 16px; margin-bottom: 30px;">
              Click the button below to set your password and activate your account:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; display: inline-block;">
                Complete Account Setup
              </a>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              This link will expire in 7 days. If you have any questions, please contact your team administrator.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #9ca3af; margin: 0;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${inviteUrl}" style="color: #667eea; word-break: break-all;">${inviteUrl}</a>
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResult);

    // Log the email send
    await supabase.from("invitation_activity_log").insert({
      activity_type: "orphan_repair_email_sent",
      recipient_email: email,
      actor_id: authUser.id,
      metadata: {
        user_id: userId,
        email_id: emailResult.data?.id,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Repair email sent to ${email}`,
        emailId: emailResult.data?.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error sending orphan repair email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
