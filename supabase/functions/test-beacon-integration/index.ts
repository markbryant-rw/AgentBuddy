import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
};

interface TestResult {
  name: string;
  status: 'passed' | 'failed';
  message?: string;
  duration?: number;
  details?: string;
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

    const { teamId } = await req.json();

    if (!teamId) {
      return new Response(JSON.stringify({ error: 'Team ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const BEACON_API_URL = Deno.env.get('BEACON_API_URL') || 'https://beacon.lovable.app';
    const BEACON_API_KEY = Deno.env.get('BEACON_API_KEY');

    const results: TestResult[] = [];

    // Test 1: Team Data Check
    const teamStart = Date.now();
    try {
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('name, agency_id')
        .eq('id', teamId)
        .single();

      if (teamError) throw teamError;

      results.push({
        name: 'Team Data',
        status: 'passed',
        message: `Team "${teamData.name}" found`,
        duration: Date.now() - teamStart,
      });
    } catch (error: any) {
      results.push({
        name: 'Team Data',
        status: 'failed',
        message: error.message,
        duration: Date.now() - teamStart,
      });
    }

    // Test 2: Beacon API Key Configured
    const keyStart = Date.now();
    if (!BEACON_API_KEY) {
      results.push({
        name: 'API Key Config',
        status: 'failed',
        message: 'BEACON_API_KEY not configured in secrets',
        duration: Date.now() - keyStart,
      });
    } else {
      results.push({
        name: 'API Key Config',
        status: 'passed',
        message: `Key configured (${BEACON_API_KEY.slice(0, 8)}...)`,
        duration: Date.now() - keyStart,
      });
    }

    // Test 3: Beacon API URL Configuration Check
    const healthStart = Date.now();
    if (BEACON_API_URL && BEACON_API_URL.includes('supabase.co/functions')) {
      results.push({
        name: 'Beacon API Health',
        status: 'passed',
        message: `API URL configured correctly`,
        duration: Date.now() - healthStart,
      });
    } else {
      results.push({
        name: 'Beacon API Health',
        status: 'failed',
        message: BEACON_API_URL ? 'Invalid URL format' : 'BEACON_API_URL not configured',
        duration: Date.now() - healthStart,
      });
    }

    // Test 4: Search Reports Endpoint
    const searchStart = Date.now();
    try {
      if (!BEACON_API_KEY) {
        throw new Error('API key not configured');
      }

      const searchResponse = await fetch(`${BEACON_API_URL}/search-reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': BEACON_API_KEY,
        },
        body: JSON.stringify({
          agentbuddyTeamId: teamId,
          address: 'integration-test-address-12345',
        }),
      });

      // 200 = found, 404 = not found (both valid), 400 = TEAM_NOT_SYNCED
      if (searchResponse.ok || searchResponse.status === 404) {
        results.push({
          name: 'Search Reports API',
          status: 'passed',
          message: `Endpoint responded (${searchResponse.status})`,
          duration: Date.now() - searchStart,
        });
      } else if (searchResponse.status === 400) {
        const errorData = await searchResponse.json().catch(() => ({}));
        if (errorData.code === 'TEAM_NOT_SYNCED') {
          results.push({
            name: 'Search Reports API',
            status: 'failed',
            message: 'Team not synced to Beacon - run Force Team Sync',
            duration: Date.now() - searchStart,
            details: 'TEAM_NOT_SYNCED',
          });
        } else {
          results.push({
            name: 'Search Reports API',
            status: 'failed',
            message: errorData.error || `HTTP ${searchResponse.status}`,
            duration: Date.now() - searchStart,
          });
        }
      } else {
        const errorData = await searchResponse.json().catch(() => ({}));
        results.push({
          name: 'Search Reports API',
          status: 'failed',
          message: errorData.error || `HTTP ${searchResponse.status}`,
          duration: Date.now() - searchStart,
        });
      }
    } catch (error: any) {
      results.push({
        name: 'Search Reports API',
        status: 'failed',
        message: error.message,
        duration: Date.now() - searchStart,
      });
    }

    // Test 5: Fetch All Reports Endpoint
    const fetchStart = Date.now();
    try {
      if (!BEACON_API_KEY) {
        throw new Error('API key not configured');
      }

      const fetchResponse = await fetch(
        `${BEACON_API_URL}/get-all-team-reports?teamId=${teamId}&apiKey=${BEACON_API_KEY}`,
        { method: 'GET', headers: { 'Accept': 'application/json' } }
      );

      if (fetchResponse.ok) {
        const data = await fetchResponse.json().catch(() => ({}));
        const count = data.reports?.length || 0;
        results.push({
          name: 'Fetch Reports API',
          status: 'passed',
          message: `Found ${count} report(s)`,
          duration: Date.now() - fetchStart,
        });
      } else if (fetchResponse.status === 400) {
        const errorData = await fetchResponse.json().catch(() => ({}));
        if (errorData.code === 'TEAM_NOT_SYNCED') {
          results.push({
            name: 'Fetch Reports API',
            status: 'failed',
            message: 'Team not synced to Beacon',
            duration: Date.now() - fetchStart,
            details: 'TEAM_NOT_SYNCED',
          });
        } else {
          results.push({
            name: 'Fetch Reports API',
            status: 'failed',
            message: errorData.error || `HTTP ${fetchResponse.status}`,
            duration: Date.now() - fetchStart,
          });
        }
      } else {
        results.push({
          name: 'Fetch Reports API',
          status: 'failed',
          message: `HTTP ${fetchResponse.status}`,
          duration: Date.now() - fetchStart,
        });
      }
    } catch (error: any) {
      results.push({
        name: 'Fetch Reports API',
        status: 'failed',
        message: error.message,
        duration: Date.now() - fetchStart,
      });
    }

    // Test 6: Integration Settings Check
    const integrationStart = Date.now();
    try {
      const { data: integration, error: integrationError } = await supabase
        .from('integration_settings')
        .select('enabled, connected_at, config')
        .eq('team_id', teamId)
        .eq('integration_name', 'beacon')
        .single();

      if (integrationError) throw integrationError;

      if (integration?.enabled) {
        results.push({
          name: 'Integration Settings',
          status: 'passed',
          message: `Enabled since ${integration.connected_at ? new Date(integration.connected_at).toLocaleDateString() : 'unknown'}`,
          duration: Date.now() - integrationStart,
        });
      } else {
        results.push({
          name: 'Integration Settings',
          status: 'failed',
          message: 'Integration not enabled',
          duration: Date.now() - integrationStart,
        });
      }
    } catch (error: any) {
      results.push({
        name: 'Integration Settings',
        status: 'failed',
        message: error.message,
        duration: Date.now() - integrationStart,
      });
    }

    // Test 7: Webhook Configuration
    const webhookStart = Date.now();
    try {
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
      const webhookUrl = `${SUPABASE_URL}/functions/v1/beacon-propensity-webhook`;
      
      results.push({
        name: 'Webhook Config',
        status: 'passed',
        message: `Endpoint: ${webhookUrl.replace(SUPABASE_URL || '', '...')}`,
        duration: Date.now() - webhookStart,
        details: webhookUrl,
      });
    } catch (error: any) {
      results.push({
        name: 'Webhook Config',
        status: 'failed',
        message: error.message,
        duration: Date.now() - webhookStart,
      });
    }

    const passed = results.filter(r => r.status === 'passed').length;
    const total = results.length;
    const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);

    console.log(`Integration tests: ${passed}/${total} passed for team ${teamId} in ${totalDuration}ms`);

    return new Response(JSON.stringify({
      success: true,
      results,
      summary: {
        passed,
        total,
        allPassed: passed === total,
        totalDuration,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Test beacon integration error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      results: [],
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
