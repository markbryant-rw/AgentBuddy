import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from '../_shared/cors.ts';



interface NotificationRequest {
  transactionId: string;
  eventType: 'created' | 'moved_to_unconditional';
  transactionAddress: string;
  teamId: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { transactionId, eventType, transactionAddress, teamId }: NotificationRequest = 
      await req.json();

    console.log('Transaction notification:', { transactionId, eventType, teamId });

    // Get all team members
    const { data: teamMembers, error: membersError } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', teamId);

    if (membersError) throw membersError;
    
    const recipientIds = teamMembers.map(tm => tm.user_id);
    console.log(`Notifying ${recipientIds.length} team members`);

    // Prepare notification content based on event type
    let title = '';
    let message = '';
    let type = 'transaction_update';
    let actionUrl = `/transaction-coordinating?transaction=${transactionId}`;

    if (eventType === 'created') {
      title = '🏠 New Listing Created';
      message = `${transactionAddress} has been added to your team's transactions`;
      type = 'transaction_created';
    } else if (eventType === 'moved_to_unconditional') {
      title = '🎉 Listing Moved to Unconditional!';
      message = `${transactionAddress} is now unconditional - great work team!`;
      type = 'transaction_unconditional';
    }

    // Calculate expiration (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create notifications for all team members
    const notifications = recipientIds.map(userId => ({
      user_id: userId,
      type,
      title,
      message,
      read: false,
      target_type: 'transaction',
      target_id: transactionId,
      expires_at: expiresAt.toISOString(),
      display_as_banner: eventType === 'moved_to_unconditional', // Show banner for unconditional
      metadata: {
        transaction_id: transactionId,
        transaction_address: transactionAddress,
        event_type: eventType,
        team_id: teamId,
        action_url: actionUrl,
        action_label: 'View Transaction',
      },
    }));

    // Insert notifications
    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (insertError) throw insertError;

    console.log(`Successfully created ${notifications.length} notifications`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notificationCount: notifications.length,
        eventType,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error sending transaction notification:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
