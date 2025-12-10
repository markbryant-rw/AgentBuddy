// Phase 1: Security Hardening - Enhanced with input sanitization and token hashing
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { Resend } from "https://esm.sh/resend@2.0.0";
import { sanitizeInput, sanitizeEmail, generateSecureToken, hashToken, ErrorCodes, createErrorResponse, createSuccessResponse } from '../_shared/security.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface InviteRequest {
  email: string;
  role: 'admin' | 'member';
  full_name?: string;
}

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('=== Team Invite Function Called (Security Enhanced) ===');

  try {
    // Check environment variables
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (!resendApiKey) {
      console.error('RESEND_API_KEY is not configured');
      return new Response(
        JSON.stringify(createErrorResponse(
          ErrorCodes.INTERNAL_ERROR,
          'Email service not configured. Please contact your administrator to set up RESEND_API_KEY.',
          500
        )),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify(createErrorResponse(ErrorCodes.UNAUTHORIZED, "Unauthorized")),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      console.error("User is not an admin");
      return new Response(
        JSON.stringify(createErrorResponse(ErrorCodes.FORBIDDEN, "Forbidden - Admin access required")),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check rate limits (20/hour, 100/day, 500/month)
    const { data: rateLimitCheck, error: rateLimitError } = await supabase
      .rpc('check_invitation_rate_limit', { _user_id: user.id });

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError);
      // Allow request to proceed if rate limit check fails (fail open for now)
    } else if (rateLimitCheck && !rateLimitCheck.allowed) {
      console.log('Rate limit exceeded:', rateLimitCheck.reason);
      return new Response(
        JSON.stringify(createErrorResponse(
          ErrorCodes.RATE_LIMIT_EXCEEDED,
          rateLimitCheck.message,
          429,
          {
            retry_after: rateLimitCheck.retry_after,
            reason: rateLimitCheck.reason
          }
        )),
        { 
          status: 429, 
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': rateLimitCheck.retry_after?.toString() || '3600'
          }
        }
      );
    }

    const { email, role, full_name }: InviteRequest = await req.json();
    
    // Phase 1: Sanitize all inputs
    const sanitizedEmail = sanitizeEmail(email);
    const sanitizedFullName = full_name ? sanitizeInput(full_name) : null;
    
    console.log("Processing invitation request:", { 
      email: sanitizedEmail, 
      role, 
      full_name: sanitizedFullName, 
      userId: user.id 
    });

    // Get the sender's team_id
    const { data: teamMember, error: teamError } = await supabase
      .from('team_members')
      .select('team_id, teams(name)')
      .eq('user_id', user.id)
      .single();

    if (teamError || !teamMember) {
      console.error("Team lookup error:", teamError);
      return new Response(
        JSON.stringify(createErrorResponse(ErrorCodes.INVALID_TEAM, "User is not part of a team")),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const teamId = teamMember.team_id;
    const teamName = (teamMember.teams as any)?.name || 'My Team';
    console.log("User team:", teamId, "Team name:", teamName);

    // Validate email
    if (!sanitizedEmail || !sanitizedEmail.includes('@')) {
      return new Response(
        JSON.stringify(createErrorResponse(ErrorCodes.INVALID_EMAIL, "Invalid email address")),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('email', sanitizedEmail)
      .maybeSingle();

    if (existingProfile) {
      console.log('User already exists:', sanitizedEmail);
      return new Response(
        JSON.stringify(createErrorResponse(
          ErrorCodes.USER_EXISTS,
          "User already exists. Please use the 'Add Existing User' option instead.",
          400,
          {
            suggestion: "Use the 'Add Existing User' tab to add them directly to your team",
            user_name: existingProfile.full_name
          }
        )),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Phase 1: Generate cryptographically secure token
    const inviteToken = generateSecureToken();
    const tokenHash = await hashToken(inviteToken);
    
    // Calculate expiry (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Phase 1: Store invitation with hashed token
    const { error: insertError } = await supabase
      .from('pending_invitations')
      .insert({
        email: sanitizedEmail,
        invited_by: user.id,
        role,
        team_id: teamId,
        token: inviteToken, // Store plaintext for now (will be deprecated)
        token_hash: tokenHash, // Store hash for verification
        expires_at: expiresAt.toISOString(),
        full_name: sanitizedFullName,
      });

    if (insertError) {
      console.error("Error storing invitation:", insertError);
      return new Response(
        JSON.stringify(createErrorResponse(ErrorCodes.DATABASE_ERROR, "Failed to create invitation", 500)),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get inviter's name
    const { data: inviterProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    const inviterName = inviterProfile?.full_name || inviterProfile?.email || 'Your team leader';

    // Create signup URL with invite token
    const signupUrl = `https://agentbuddy.co/auth?tab=signup&invite_code=${inviteToken}`;

    // Phase 1: Sanitize content for email to prevent XSS
    const sanitizedTeamName = sanitizeInput(teamName);
    const sanitizedInviterName = sanitizeInput(inviterName);

    // Send email via Resend
    console.log('Attempting to send invitation email');
    const emailResponse = await resend.emails.send({
      from: "Agent Buddy <noreply@agentbuddy.co>",
      to: [sanitizedEmail],
      subject: `You've been invited to join ${sanitizedTeamName} on AgentBuddy`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                border-radius: 10px 10px 0 0;
                text-align: center;
              }
              .content {
                background: #f9fafb;
                padding: 30px;
                border-radius: 0 0 10px 10px;
              }
              .button {
                display: inline-block;
                background: #667eea;
                color: white;
                padding: 14px 28px;
                text-decoration: none;
                border-radius: 6px;
                margin: 20px 0;
                font-weight: 600;
              }
              .info-box {
                background: white;
                border-left: 4px solid #667eea;
                padding: 15px;
                margin: 20px 0;
              }
              .footer {
                text-align: center;
                color: #6b7280;
                font-size: 14px;
                margin-top: 30px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>🎯 You're Invited!</h1>
            </div>
            <div class="content">
              <p>Hi there!</p>
              <p><strong>${sanitizedInviterName}</strong> has invited you to join <strong>${sanitizedTeamName}</strong> on AgentBuddy.</p>
              
              <div class="info-box">
                <p><strong>Your Role:</strong> ${role === 'admin' ? '👑 Admin' : '👤 Team Member'}</p>
                <p style="margin: 0;"><strong>What this means:</strong> ${role === 'admin' 
                  ? 'You\'ll have full access to manage the team, track KPIs, oversee listings, collaborate with your team, and leverage AI coaching tools to drive success.' 
                  : 'You\'ll be able to log your KPIs, manage your listings, collaborate with your team, access AI coaching, and track your progress all in one place.'}</p>
              </div>

              <p>Click the button below to create your account and get started:</p>
              
              <div style="text-align: center;">
                <a href="${signupUrl}" class="button">Accept Invitation</a>
              </div>

              <p style="font-size: 14px; color: #6b7280;">
                Or copy and paste this link into your browser:<br>
                <a href="${signupUrl}" style="color: #667eea;">${signupUrl}</a>
              </p>

              <p style="font-size: 14px; color: #ef4444; margin-top: 30px;">
                ⏰ This invitation expires in 7 days.
              </p>

              <div class="footer">
                <p>If you didn't expect this invitation, you can safely ignore this email.</p>
                <p>AgentBuddy - Your Real Estate Sales Hub</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (emailResponse.error) {
      console.error("Resend API error:", emailResponse.error);
      throw new Error(`Email sending failed: ${emailResponse.error.message || 'Unknown error'}`);
    }

    console.log("Email sent successfully:", emailResponse);

    // Phase 1: Record metric for monitoring
    await supabase.rpc('record_health_metric', {
      p_metric_type: 'invitation_sent',
      p_metric_value: {
        user_id: user.id,
        team_id: teamId,
        email: sanitizedEmail,
        timestamp: new Date().toISOString()
      }
    });

    return new Response(
      JSON.stringify(createSuccessResponse({
        message: "Invitation sent successfully",
        invite_code: inviteToken
      })),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Error in send-team-invite function:", error);
    return new Response(
      JSON.stringify(createErrorResponse(
        ErrorCodes.INTERNAL_ERROR,
        error.message || "Internal server error",
        500
      )),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
