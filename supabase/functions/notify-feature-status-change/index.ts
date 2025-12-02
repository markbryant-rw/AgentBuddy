import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getCorsHeaders } from '../_shared/cors.ts';

const STATUS_MESSAGES: Record<string, { title: string; message: string; emoji: string }> = {
  triage: { title: "Feature Under Review", emoji: "🔍", message: "Your feature request is being reviewed by our team" },
  in_progress: { title: "Feature In Development", emoji: "🚀", message: "We've started working on your feature request" },
  needs_review: { title: "Feature Ready for Review", emoji: "✅", message: "The feature is ready for your review" },
  completed: { title: "Feature Implemented!", emoji: "🎉", message: "Great news! Your feature request has been implemented" },
  archived: { title: "Feature Archived", emoji: "📁", message: "Your feature request has been archived" },
};

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    const { featureId, newStatus, adminNotes, position } = await req.json();

    console.log('Processing feature status change:', { featureId, newStatus, adminNotes, position });

    // Fetch feature details including requester info
    const { data: feature, error: featureError } = await supabaseClient
      .from('feature_requests')
      .select('id, title, user_id, status')
      .eq('id', featureId)
      .single();

    if (featureError || !feature) {
      console.error('Error fetching feature:', featureError);
      throw new Error('Feature request not found');
    }

    const previousStatus = feature.status;

    // Prepare update data
    const updateData: any = {
      status: newStatus,
      admin_notes: adminNotes || null,
    };

    if (newStatus === 'archived') {
      updateData.archived_at = new Date().toISOString();
      updateData.archived_reason = adminNotes || 'manual';
    }

    if (position !== undefined) {
      updateData.position = position;
    }

    // Update feature status
    const { data: updatedFeature, error: updateError } = await supabaseClient
      .from('feature_requests')
      .update(updateData)
      .eq('id', featureId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating feature:', updateError);
      throw updateError;
    }

    console.log('Feature updated successfully:', updatedFeature);

    // Only send notifications if status actually changed
    if (previousStatus !== newStatus) {
      // Fetch requester's profile
      const { data: requester, error: requesterError } = await supabaseClient
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', feature.user_id)
        .single();

      if (requesterError) {
        console.error('Error fetching requester:', requesterError);
      }

      const statusInfo = STATUS_MESSAGES[newStatus] || { 
        title: "Feature Status Updated", 
        emoji: "📢", 
        message: `Your feature request status has been updated to ${newStatus}` 
      };

      // Create in-app notification
      if (requester) {
        const notificationMessage = adminNotes 
          ? `${statusInfo.message}. Admin note: "${adminNotes}"`
          : statusInfo.message;

        const { error: notifError } = await supabaseClient
          .from('notifications')
          .insert({
            user_id: requester.id,
            type: 'feature_status_update',
            title: `${statusInfo.title} ${statusInfo.emoji}`,
            message: notificationMessage,
            action_url: '/feedback-centre?tab=features',
          });

        if (notifError) {
          console.error('Error creating notification:', notifError);
        } else {
          console.log('In-app notification created for user:', requester.id);
        }

        // Send email notification
        if (resend && requester.email) {
          try {
            const emailHtml = `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; }
                    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
                    .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; background: #d1fae5; color: #065f46; font-weight: 600; }
                    .admin-comment { background: #fff; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
                    .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
                    .button { display: inline-block; background: #059669; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1 style="margin: 0;">${statusInfo.emoji} ${statusInfo.title}</h1>
                    </div>
                    <div class="content">
                      <p>Hi ${requester.full_name || 'there'},</p>
                      <p>${statusInfo.message}</p>
                      <p><strong>Feature Request:</strong> "${feature.title}"</p>
                      <p><strong>New Status:</strong> <span class="status-badge">${newStatus.replace('_', ' ').toUpperCase()}</span></p>
                      ${adminNotes ? `
                        <div class="admin-comment">
                          <strong>Admin Note:</strong><br>
                          ${adminNotes}
                        </div>
                      ` : ''}
                      <p style="margin-top: 30px;">
                        <a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || ''}/feedback-centre?tab=features" class="button">View Feature Request</a>
                      </p>
                    </div>
                    <div class="footer">
                      <p>Best regards,<br>The AgentBuddy Team</p>
                    </div>
                  </div>
                </body>
              </html>
            `;

            const { error: emailError } = await resend.emails.send({
              from: 'AgentBuddy <noreply@resend.dev>',
              to: [requester.email],
              subject: `${statusInfo.emoji} ${statusInfo.title} - "${feature.title}"`,
              html: emailHtml,
            });

            if (emailError) {
              console.error('Error sending email:', emailError);
            } else {
              console.log('Email sent successfully to:', requester.email);
            }
          } catch (emailErr) {
            console.error('Email sending failed:', emailErr);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, feature: updatedFeature }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Function error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
