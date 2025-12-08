import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const siteUrl = Deno.env.get('SITE_URL') || 'https://www.agentbuddy.co';

  if (error) {
    console.error('OAuth error:', error);
    return Response.redirect(`${siteUrl}/setup?tab=integrations&calendar=error`);
  }

  if (!code || !state) {
    console.error('Missing code or state');
    return Response.redirect(`${siteUrl}/setup?tab=integrations&calendar=error`);
  }

  try {
    const { userId } = JSON.parse(atob(state));
    console.log('Processing callback for user:', userId);

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-calendar-callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      return Response.redirect(`${siteUrl}/setup?tab=integrations&calendar=error`);
    }

    const tokens = await tokenResponse.json();
    console.log('Token exchange successful');

    // Create AgentBuddy calendar
    const calendarResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: 'AgentBuddy',
        description: 'Synced events from AgentBuddy - Real Estate CRM',
        timeZone: 'Pacific/Auckland',
      }),
    });

    let calendarId = null;
    if (calendarResponse.ok) {
      const calendar = await calendarResponse.json();
      calendarId = calendar.id;
      console.log('Created AgentBuddy calendar:', calendarId);
    } else {
      // Calendar might already exist, try to find it
      const listResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: { 'Authorization': `Bearer ${tokens.access_token}` },
      });
      if (listResponse.ok) {
        const list = await listResponse.json();
        const existing = list.items?.find((c: any) => c.summary === 'AgentBuddy');
        if (existing) {
          calendarId = existing.id;
          console.log('Found existing AgentBuddy calendar:', calendarId);
        }
      }
    }

    // Save tokens to database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    const { error: upsertError } = await supabase
      .from('google_calendar_connections')
      .upsert({
        user_id: userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt.toISOString(),
        calendar_id: calendarId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (upsertError) {
      console.error('Failed to save tokens:', upsertError);
      return Response.redirect(`${siteUrl}/setup?tab=integrations&calendar=error`);
    }

    // Create default sync settings
    await supabase
      .from('calendar_sync_settings')
      .upsert({
        user_id: userId,
        sync_daily_planner: true,
        sync_appraisals: true,
        sync_transactions: true,
      }, { onConflict: 'user_id' });

    console.log('Google Calendar connected successfully for user:', userId);
    return Response.redirect(`${siteUrl}/setup?tab=integrations&calendar=success`);
  } catch (error) {
    console.error('Callback error:', error);
    return Response.redirect(`${siteUrl}/setup?tab=integrations&calendar=error`);
  }
});
