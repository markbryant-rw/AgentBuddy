import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
};

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    console.error('Token refresh failed');
    return null;
  }

  return response.json();
}

async function createOrUpdateCalendarEvent(
  accessToken: string,
  calendarId: string,
  event: {
    summary: string;
    description?: string;
    start: string;
    end?: string;
    allDay?: boolean;
    location?: string;
  }
) {
  const eventBody: any = {
    summary: event.summary,
    description: event.description || '',
    location: event.location || '',
  };

  if (event.allDay) {
    eventBody.start = { date: event.start };
    eventBody.end = { date: event.end || event.start };
  } else {
    eventBody.start = { dateTime: event.start, timeZone: 'Pacific/Auckland' };
    eventBody.end = { dateTime: event.end || new Date(new Date(event.start).getTime() + 60 * 60 * 1000).toISOString(), timeZone: 'Pacific/Auckland' };
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventBody),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('Failed to create event:', error);
    return null;
  }

  return response.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { type, data } = await req.json();
    console.log('Sync request:', { type, userId: user.id });

    // Get connection and settings
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: connection, error: connError } = await adminClient
      .from('google_calendar_connections')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (connError || !connection) {
      return new Response(JSON.stringify({ error: 'Google Calendar not connected' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: settings } = await adminClient
      .from('calendar_sync_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Check if sync is enabled for this type
    if (type === 'planner' && !settings?.sync_daily_planner) {
      return new Response(JSON.stringify({ skipped: true, reason: 'Planner sync disabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (type === 'appraisal' && !settings?.sync_appraisals) {
      return new Response(JSON.stringify({ skipped: true, reason: 'Appraisal sync disabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (type === 'transaction' && !settings?.sync_transactions) {
      return new Response(JSON.stringify({ skipped: true, reason: 'Transaction sync disabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Refresh token if expired
    let accessToken = connection.access_token;
    if (new Date(connection.token_expires_at) < new Date()) {
      console.log('Token expired, refreshing...');
      const refreshed = await refreshAccessToken(connection.refresh_token);
      if (!refreshed) {
        return new Response(JSON.stringify({ error: 'Failed to refresh token' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      accessToken = refreshed.access_token;
      
      await adminClient
        .from('google_calendar_connections')
        .update({
          access_token: refreshed.access_token,
          token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
    }

    if (!connection.calendar_id) {
      return new Response(JSON.stringify({ error: 'No calendar ID found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create the calendar event
    let event;
    if (type === 'planner') {
      const plannerItem = data;
      const startTime = plannerItem.time 
        ? `${plannerItem.date}T${plannerItem.time}:00`
        : `${plannerItem.date}T09:00:00`;
      
      event = {
        summary: `📋 ${plannerItem.title}`,
        description: plannerItem.description || plannerItem.notes || '',
        start: startTime,
        allDay: !plannerItem.time,
      };
    } else if (type === 'appraisal') {
      const appraisal = data;
      event = {
        summary: `🏠 Appraisal: ${appraisal.address}`,
        description: `Vendor: ${appraisal.vendor_name || 'N/A'}\nPhone: ${appraisal.vendor_mobile || 'N/A'}\n\n${appraisal.notes || ''}`,
        start: appraisal.appraisal_date,
        location: appraisal.address,
        allDay: true,
      };
    } else if (type === 'transaction') {
      const transaction = data;
      const events = [];
      
      if (transaction.settlement_date) {
        events.push({
          summary: `💰 Settlement: ${transaction.address}`,
          description: `Settlement day for ${transaction.address}`,
          start: transaction.settlement_date,
          location: transaction.address,
          allDay: true,
        });
      }
      if (transaction.unconditional_date) {
        events.push({
          summary: `✅ Unconditional: ${transaction.address}`,
          description: `Unconditional date for ${transaction.address}`,
          start: transaction.unconditional_date,
          location: transaction.address,
          allDay: true,
        });
      }
      if (transaction.listing_expires_date) {
        events.push({
          summary: `⚠️ Listing Expires: ${transaction.address}`,
          description: `Listing expiry for ${transaction.address}`,
          start: transaction.listing_expires_date,
          location: transaction.address,
          allDay: true,
        });
      }

      console.log(`Creating ${events.length} transaction events for ${transaction.address}`);

      // Create all transaction events
      const results = [];
      for (const evt of events) {
        console.log('Creating event:', evt.summary, 'on', evt.start);
        const result = await createOrUpdateCalendarEvent(accessToken, connection.calendar_id, evt);
        if (result) {
          console.log('Event created successfully:', result.id);
          results.push(result);
        } else {
          console.log('Event creation failed for:', evt.summary);
        }
      }

      return new Response(JSON.stringify({ success: true, eventsCreated: results.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (event) {
      const result = await createOrUpdateCalendarEvent(accessToken, connection.calendar_id, event);
      if (!result) {
        return new Response(JSON.stringify({ error: 'Failed to create event' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ success: true, event: result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Sync error:', error);
    return new Response(JSON.stringify({ error: 'Sync failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
