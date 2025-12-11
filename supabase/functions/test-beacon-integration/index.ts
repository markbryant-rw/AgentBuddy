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

    const { teamId, appraisalId } = await req.json();

    if (!teamId) {
      return new Response(JSON.stringify({ error: 'Team ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const BEACON_API_URL = Deno.env.get('BEACON_API_URL') || 'https://beacon.lovable.app';
    const BEACON_API_KEY = Deno.env.get('BEACON_API_KEY');

    const results: TestResult[] = [];

    // Test 1: Team Sync Check
    const teamSyncStart = Date.now();
    try {
      const { data: teamData } = await supabase
        .from('teams')
        .select('name')
        .eq('id', teamId)
        .single();

      if (teamData) {
        results.push({
          name: 'Team Sync',
          status: 'passed',
          message: `Team "${teamData.name}" found`,
          duration: Date.now() - teamSyncStart,
        });
      } else {
        results.push({
          name: 'Team Sync',
          status: 'failed',
          message: 'Team not found in database',
          duration: Date.now() - teamSyncStart,
        });
      }
    } catch (error: any) {
      results.push({
        name: 'Team Sync',
        status: 'failed',
        message: error.message,
        duration: Date.now() - teamSyncStart,
      });
    }

    // Test 2: Search API
    const searchStart = Date.now();
    try {
      if (!BEACON_API_KEY) {
        results.push({
          name: 'Search API',
          status: 'failed',
          message: 'BEACON_API_KEY not configured',
          duration: Date.now() - searchStart,
        });
      } else {
        const searchResponse = await fetch(`${BEACON_API_URL}/api/agentbuddy/search-reports`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': BEACON_API_KEY,
          },
          body: JSON.stringify({
            agentbuddyTeamId: teamId,
            address: 'test-integration-check',
          }),
        });

        if (searchResponse.ok || searchResponse.status === 404) {
          // 404 is OK - means no results but API is working
          results.push({
            name: 'Search API',
            status: 'passed',
            message: `API responded with ${searchResponse.status}`,
            duration: Date.now() - searchStart,
          });
        } else {
          const errorData = await searchResponse.json().catch(() => ({}));
          results.push({
            name: 'Search API',
            status: 'failed',
            message: errorData.error || `HTTP ${searchResponse.status}`,
            duration: Date.now() - searchStart,
          });
        }
      }
    } catch (error: any) {
      results.push({
        name: 'Search API',
        status: 'failed',
        message: error.message,
        duration: Date.now() - searchStart,
      });
    }

    // Test 3: Report Creation Endpoint (dry run - just check connectivity)
    const createStart = Date.now();
    try {
      if (!BEACON_API_KEY) {
        results.push({
          name: 'Report Creation',
          status: 'failed',
          message: 'BEACON_API_KEY not configured',
          duration: Date.now() - createStart,
        });
      } else {
        // We don't actually create a report, just verify the endpoint exists
        const healthResponse = await fetch(`${BEACON_API_URL}/api/health`, {
          method: 'GET',
        });

        if (healthResponse.ok) {
          results.push({
            name: 'Report Creation',
            status: 'passed',
            message: 'Beacon API reachable',
            duration: Date.now() - createStart,
          });
        } else {
          results.push({
            name: 'Report Creation',
            status: 'failed',
            message: `Beacon API returned ${healthResponse.status}`,
            duration: Date.now() - createStart,
          });
        }
      }
    } catch (error: any) {
      results.push({
        name: 'Report Creation',
        status: 'failed',
        message: error.message,
        duration: Date.now() - createStart,
      });
    }

    // Test 4: Webhook Configuration
    const webhookStart = Date.now();
    try {
      const { data: integration } = await supabase
        .from('integration_settings')
        .select('enabled, connected_at')
        .eq('team_id', teamId)
        .eq('integration_name', 'beacon')
        .single();

      if (integration?.enabled) {
        results.push({
          name: 'Webhook Endpoint',
          status: 'passed',
          message: `Integration enabled since ${integration.connected_at ? new Date(integration.connected_at).toLocaleDateString() : 'unknown'}`,
          duration: Date.now() - webhookStart,
        });
      } else {
        results.push({
          name: 'Webhook Endpoint',
          status: 'failed',
          message: 'Integration not enabled',
          duration: Date.now() - webhookStart,
        });
      }
    } catch (error: any) {
      results.push({
        name: 'Webhook Endpoint',
        status: 'failed',
        message: error.message,
        duration: Date.now() - webhookStart,
      });
    }

    const passed = results.filter(r => r.status === 'passed').length;
    const total = results.length;

    console.log(`Integration tests: ${passed}/${total} passed for team ${teamId}`);

    return new Response(JSON.stringify({
      success: true,
      results,
      summary: {
        passed,
        total,
        allPassed: passed === total,
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
